/**
 * Checks that listing a gallery does not block on decoding images.
 *
 * Both listings pass `cachedOnly: true`, so a cold gallery is supposed to answer
 * from the index alone and let the background warmer fill URLs in afterwards.
 * That guarantee is easy to lose by accident, because the row holding a card's
 * placement metadata is the same row holding its pixels: any metadata read that
 * goes through `idbGet('images', id)` hydrates the image, once per card, inside
 * the response. `cachedOnly` still holds, and nothing looks wrong — the listing
 * just quietly got O(gallery) base64 decodes slower.
 *
 * The parity harness cannot see this. Its scenario has three 70-byte images, and
 * the cost is a read pattern rather than a behavioural difference.
 *
 * On a cold cache the check is exact: `cachedOnly` cannot produce a single URL, so
 * every `image_url` must come back empty while every `png_bytes` must be correct.
 * A populated URL means something encoded synchronously.
 *
 * One route per process, because the data-URL cache and the warm queue are module
 * state. Listing a gallery enqueues warming for every card it returned, so a
 * second route in the same process sees a warm cache and would pass no matter what
 * it does.
 *
 *   node tools/bench-gallery.mjs --route=gallery|explore [--count=40]
 */
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { installHost, PNG_1X1 } from './parity/host.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const ROUTE = arg('route', 'gallery');
const COUNT = Number(arg('count', 40));
const SESSION = 'bench_session';

if (ROUTE !== 'gallery' && ROUTE !== 'explore') {
  console.error(`[bench] unknown --route=${ROUTE} (expected "gallery" or "explore")`);
  process.exit(1);
}

const handles = installHost({ promptsDir: path.join(root, 'prompts') });

// Seed a gallery straight into storage, in the on-disk shape the store writes.
// Going through the API would mean running COUNT real jobs, and the point here is
// to measure the read path.
const images = {};
const cards = {};
const pngB64 = Buffer.from(PNG_1X1).toString('base64');
for (let i = 0; i < COUNT; i += 1) {
  const id = `bench-image-${String(i).padStart(4, '0')}`;
  handles.storage.set(`inx_nximg_${id}`, pngB64);
  images[id] = {
    id,
    has_png: true,
    png_bytes: PNG_1X1.length,
    storage: 'indexeddb',
    storage_key: `inx_nximg_${id}`,
    location: {
      version: 1,
      image_id: id,
      session_id: SESSION,
      character_id: 'bench_char',
      character_name: 'Bench',
      chat_id: 'bench_chat',
      chat_name: 'Bench Chat',
      message_index: i,
      shot_index: 0,
      paragraph: 0,
      y_percent: 50,
      content_hash: `hash_${i}`,
    },
  };
  cards[id] = {
    id,
    job_id: `bench-job-${i}`,
    session_id: SESSION,
    folder_key: 'bench_char|bench_chat',
    shot_index: 0,
    paragraph: 0,
    y_percent: 50,
    message_index: i,
    message_role: 'char',
    content_hash: `hash_${i}`,
    character_id: 'bench_char',
    character_name: 'Bench',
    chat_id: 'bench_chat',
    chat_name: 'Bench Chat',
    main_prompt: 'a bench',
    negative_prompt: '',
    characters: [],
    created_at: 1_760_000_000 + i,
    meta_json: JSON.stringify({ image_id: id, session_id: SESSION }),
  };
}
handles.storage.set('inx_nxstore_images', images);
handles.storage.set('inx_nxstore_cards', cards);

const esbuild = await import('esbuild');
const built = await esbuild.build({
  entryPoints: [path.join(root, 'src/main.ts')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  write: false,
  minify: false,
  loader: { '.txt': 'text' },
  define: { __PLUGIN_ID__: '"inlay-nexus-native"', __PLUGIN_VERSION__: '"2.0.0"' },
});
vm.runInThisContext(built.outputFiles[0].text, { filename: 'inlay-nexus-2.0.js' });

const N = globalThis.__INLAY_NATIVE__;
await N.ready();

const pngReads = () => {
  let n = 0;
  for (const [key, count] of handles.perf.readsByKey) {
    if (key.startsWith('inx_nximg_')) n += count;
  }
  return n;
};

const failures = [];

const url = ROUTE === 'gallery'
  ? `/v1/gallery?session_id=${SESSION}&limit=${COUNT}`
  : `/v1/gallery/explore?limit=${COUNT}`;

// Per-card index lookups. A row's placement sidecar, its mapped location fields
// and its `png_bytes` all live on one image row, so a listing should read that
// row once per card. Reading it three times is not a hydration bug and parity
// cannot see it — the response is identical — but it is a lookup and a microtask
// hop per card, paid on every gallery open.
//
// None of it reaches storage (these are in-memory index reads), so the Map is the
// only place left to count. Bench ids are distinctive enough to filter on.
// Exact, not a ratio: the count is deterministic. A gallery row costs its card
// row, its image index row, and the two `resolveImageUrl` cache probes (one
// inline in the row, one from `attachImageUrls`). The explorer reads all cards in
// one pass, so it pays no per-card card lookup.
const LOOKUP_BUDGET = ROUTE === 'gallery' ? 4 : 3;

const mapGet = Map.prototype.get;
let idLookups = 0;
Map.prototype.get = function patchedGet(key) {
  if (typeof key === 'string' && key.startsWith('bench-image-')) idLookups += 1;
  return mapGet.call(this, key);
};

const decodesBefore = pngReads();
const res = await N.fetch(url, { method: 'GET' });
const decodedDuring = pngReads() - decodesBefore;
Map.prototype.get = mapGet;

const items = res?.items ?? [];
const eagerUrls = items.filter((c) => c.image_url).length;
const bytesOk = items.filter((c) => Number(c.png_bytes) === PNG_1X1.length).length;

console.log(`[bench] ${COUNT} images, cold cache, ${url}`);
console.log(`[bench] ${items.length} item(s), ${eagerUrls} eager URL(s), ${bytesOk} with png_bytes`);

if (items.length !== COUNT) failures.push(`returned ${items.length} of ${COUNT} cards`);
// Byte counts must survive without pixels — that is the metadata path working.
if (bytesOk !== COUNT) failures.push(`${COUNT - bytesOk} card(s) lost png_bytes; the index path is broken`);
// `cachedOnly` means a cold listing cannot have encoded anything.
if (eagerUrls > 0) failures.push(`encoded ${eagerUrls} image(s) synchronously on a cold cache`);
// The decisive number. Warming runs at concurrency 2 and may land a few decodes
// while the response is still being assembled, but it must not scale with the
// gallery: anything near `COUNT` means the response itself is hydrating per row.
if (decodedDuring > COUNT / 4) {
  failures.push(`decoded ${decodedDuring} of ${COUNT} PNG(s) before responding — the response is hydrating per row`);
}
console.log(`[bench] ${decodedDuring} PNG(s) decoded before the response resolved`);
console.log(`[bench] ${idLookups} per-card index lookup(s) (${(idLookups / COUNT).toFixed(2)} per card)`);
if (idLookups > LOOKUP_BUDGET * COUNT) {
  failures.push(
    `${(idLookups / COUNT).toFixed(2)} index lookup(s) per card, budget ${LOOKUP_BUDGET}`
    + ' — a listing row is reading the same index row more than once',
  );
}

if (failures.length) {
  for (const f of failures) console.error(`[bench] FAIL: ${f}`);
  process.exit(1);
}
console.log('[bench] ok — a cold gallery lists without blocking on any image decode');
process.exit(0);

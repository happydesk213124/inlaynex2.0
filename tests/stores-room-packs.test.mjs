import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';

import { CARD_PACK_KEY, ROOM_INDEX_KEY } from '../.test-build/char-ref-keys.mjs';
import {
  cardsForSession,
  flushPersist,
  idbDelete,
  idbPut,
  resetStores,
  roomRows,
  storeSize,
} from '../.test-build/stores.mjs';

function createKv() {
  const map = new Map();
  const reads = [];
  return {
    map,
    reads,
    async getItem(key) {
      reads.push(key);
      return map.has(key) ? map.get(key) : null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
  };
}

function installHost(kv) {
  const host = {
    async getLocalPluginStorage() {
      return kv;
    },
    pluginStorage: kv,
    async requestPluginPermission() {},
  };
  globalThis.risuai = host;
  return host;
}

function card(id, sessionId, extra = {}) {
  return { id, session_id: sessionId, shot_index: 0, created_at: 1000, ...extra };
}

/** The pack as stored, parsed however the kv chose to keep it. */
function pack(kv, sid) {
  const raw = kv.map.get(CARD_PACK_KEY(sid));
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

afterEach(() => {
  resetStores();
  delete globalThis.risuai;
});

test('cards are stored one room at a time, not in one gallery-wide row', async () => {
  resetStores();
  const kv = createKv();
  installHost(kv);

  await idbPut('cards', card('c1', 'risu_aaaa'));
  await idbPut('cards', card('c2', 'risu_aaaa'));
  await idbPut('cards', card('c3', 'risu_bbbb'));
  await flushPersist();

  assert.deepEqual(Object.keys(pack(kv, 'risu_aaaa').cards).sort(), ['c1', 'c2']);
  assert.deepEqual(Object.keys(pack(kv, 'risu_bbbb').cards), ['c3']);
  // The old whole-gallery row must not grow back.
  assert.equal(kv.map.has('inx_nxstore_cards'), false);
});

// This is the reason for the split: opening a chat used to read every room's
// metadata. Reading one pack and nothing else is the whole benefit.
test('opening a room reads that room pack only', async () => {
  const kv = createKv();
  installHost(kv);
  await idbPut('cards', card('c1', 'risu_aaaa'));
  await idbPut('cards', card('c2', 'risu_bbbb'));
  await flushPersist();

  resetStores();
  installHost(kv);
  kv.reads.length = 0;
  const rows = await cardsForSession('risu_aaaa');

  assert.deepEqual(rows.map((r) => r.id), ['c1']);
  assert.ok(kv.reads.includes(CARD_PACK_KEY('risu_aaaa')));
  assert.equal(kv.reads.includes(CARD_PACK_KEY('risu_bbbb')), false, 'the other room stayed closed');
});

test('the room index counts every room without opening a pack', async () => {
  const kv = createKv();
  installHost(kv);
  await idbPut('cards', card('c1', 'risu_aaaa'));
  await idbPut('cards', card('c2', 'risu_bbbb'));
  await idbPut('cards', card('c3', 'risu_bbbb'));
  await flushPersist();

  resetStores();
  installHost(kv);
  await cardsForSession('risu_zzzz');

  assert.equal(storeSize('cards'), 3);
  assert.deepEqual(roomRows().map((r) => r.session_id).sort(), ['risu_aaaa', 'risu_bbbb']);
  assert.equal(kv.reads.includes(CARD_PACK_KEY('risu_aaaa')), false);
});

// The dangerous case for a pack layout: a write rewrites the whole pack, so a
// room that is only half loaded would lose the rest. Every mutation loads the
// room first, which is what this proves.
test('deleting one card keeps the rest of a room that was never opened', async () => {
  const kv = createKv();
  installHost(kv);
  await idbPut('cards', card('c1', 'risu_aaaa'));
  await idbPut('cards', card('c2', 'risu_aaaa'));
  await idbPut('cards', card('c3', 'risu_aaaa'));
  await flushPersist();

  resetStores();
  installHost(kv);
  await idbDelete('cards', 'c2');
  await flushPersist();

  assert.deepEqual(Object.keys(pack(kv, 'risu_aaaa').cards).sort(), ['c1', 'c3']);
  assert.equal(roomRows()[0].cards, 2);
});

test('an emptied room drops its pack and leaves the index', async () => {
  const kv = createKv();
  installHost(kv);
  await idbPut('cards', card('c1', 'risu_aaaa'));
  await flushPersist();

  await idbDelete('cards', 'c1');
  await flushPersist();

  assert.equal(kv.map.has(CARD_PACK_KEY('risu_aaaa')), false);
  assert.deepEqual(roomRows(), []);
});

// Existing installs have everything in the two old rows. They are split once,
// then emptied rather than deleted: psGet falls back to the 1.x save-file key
// when a device key is missing, so a deleted key would be re-found every boot.
test('the old gallery-wide rows are split into packs on first open', async () => {
  const kv = createKv();
  installHost(kv);
  kv.map.set('inx_nxstore_cards', {
    c1: { id: 'c1', session_id: 'risu_aaaa', created_at: 10 },
    c2: { id: 'c2', session_id: 'risu_bbbb', created_at: 20 },
  });
  kv.map.set('inx_nxstore_images', {
    c1: { id: 'c1', location: { session_id: 'risu_aaaa', character_id: 'ch1', chat_id: 'k1' }, has_png: true, png_bytes: 40 },
    c2: { id: 'c2', location: { session_id: 'risu_bbbb' }, has_png: true, png_bytes: 60 },
  });

  const rows = await cardsForSession('risu_aaaa');

  assert.deepEqual(rows.map((r) => r.id), ['c1']);
  assert.deepEqual(Object.keys(pack(kv, 'risu_aaaa').images), ['c1']);
  assert.deepEqual(Object.keys(pack(kv, 'risu_bbbb').cards), ['c2']);
  assert.equal(storeSize('images'), 2);

  const room = roomRows().find((r) => r.session_id === 'risu_aaaa');
  assert.equal(room.png_bytes, 40);
  assert.equal(room.character_id, 'ch1');
  assert.equal(room.chat_id, 'k1');

  // Emptied, not removed.
  assert.equal(kv.map.has('inx_nxstore_cards'), true);
  assert.deepEqual(Object.keys(JSON.parse(JSON.stringify(kv.map.get('inx_nxstore_cards')))), []);
});

test('a second open does not split again', async () => {
  const kv = createKv();
  installHost(kv);
  kv.map.set('inx_nxstore_cards', { c1: { id: 'c1', session_id: 'risu_aaaa', created_at: 10 } });
  await cardsForSession('risu_aaaa');
  await flushPersist();
  const indexAfterFirst = JSON.stringify(kv.map.get(ROOM_INDEX_KEY));

  resetStores();
  installHost(kv);
  await idbPut('cards', card('c9', 'risu_cccc'));
  await flushPersist();

  // The split does not run, so room aaaa is untouched and still in the index.
  assert.deepEqual(Object.keys(pack(kv, 'risu_aaaa').cards), ['c1']);
  assert.ok(indexAfterFirst.includes('risu_aaaa'));
  assert.equal(storeSize('cards'), 2);
});

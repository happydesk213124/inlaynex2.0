/**
 * The parity scenario: one deterministic pass over the whole public surface.
 *
 * Every step's result (or thrown error) is appended to a transcript. The legacy
 * backend and the 2.0 backend must produce the same normalised transcript.
 *
 * Add a step whenever a route or bridge method gains behaviour — this file is the
 * executable definition of "feature parity".
 */
import { DEFAULT_LLM_REPLY, PNG_1X1 } from './host.mjs';
// The 1.x reader, used as an oracle for both targets so the assertion does not
// depend on the code under test.
import { parseStoreZip } from '../../reference/gallery-zip.js';

const b64 = (bytes) => Buffer.from(bytes).toString('base64');
const PNG_DATA_URL = `data:image/png;base64,${b64(PNG_1X1)}`;

/**
 * Unpacks an export response into something worth comparing.
 *
 * The raw base64 cannot be compared, not even by length: the manifest carries
 * wall-clock timestamps, and `created_at` is fractional seconds whose digit
 * count varies run to run, so the ZIP is a byte or two different every time.
 * Decoding it lets the comparer apply its normal rules to the fields inside,
 * which asserts the manifest's actual contents rather than a byte count.
 */
const describeExport = (res) => {
  if (!res || typeof res.zip_base64 !== 'string' || !res.zip_base64) {
    return { ok: res?.ok ?? null, count: res?.count ?? null, zip: null };
  }
  const entries = parseStoreZip(new Uint8Array(Buffer.from(res.zip_base64, 'base64')));
  const manifest = entries.has('manifest.json')
    ? JSON.parse(Buffer.from(entries.get('manifest.json')).toString('utf8'))
    : null;
  return {
    ok: res.ok ?? null,
    count: res.count ?? null,
    // Entry names, plus sizes for the images only — the manifest's own size is
    // timestamp-dependent, and its contents are compared directly below.
    names: [...entries.keys()].sort(),
    imageBytes: [...entries.keys()]
      .filter((n) => n !== 'manifest.json')
      .sort()
      .map((n) => entries.get(n).length),
    manifest,
  };
};

export async function runScenario(N, handles) {
  const transcript = [];
  let step = 0;

  /** Records the outcome of `fn` under `name`, capturing errors as data. */
  const rec = async (name, fn) => {
    step += 1;
    try {
      const value = await fn();
      transcript.push({ step, name, ok: true, value });
      return value;
    } catch (error) {
      transcript.push({
        step,
        name,
        ok: false,
        error: { message: String(error?.message ?? error), status: error?.status ?? null, data: error?.data ?? null },
      });
      return null;
    }
  };

  const get = (p) => N.fetch(p, { method: 'GET' });
  const post = (p, body) => N.fetch(p, { method: 'POST', body });
  const put = (p, body) => N.fetch(p, { method: 'PUT', body });

  const waitForJob = async (jobId) => {
    for (let i = 0; i < 200; i += 1) {
      await new Promise((r) => setTimeout(r, 25));
      const res = await get(`/v1/jobs/${jobId}`);
      if (res?.state === 'done' || res?.state === 'error' || res?.state === 'cancelled') return res;
    }
    return { state: 'timeout' };
  };

  // ── boot ────────────────────────────────────────────────────────────────
  await rec('ready', () => N.ready());
  // Shape, not value: a 2.0 is expected to report a different version than 1.3.
  // `tools/audit.mjs` asserts the exact string in the built bundle.
  await rec('bridge.VERSION', () => (/^\d+\.\d+\.\d+$/.test(String(N.VERSION)) ? 'semver' : `bad:${N.VERSION}`));
  await rec('health', () => get('/v1/health'));
  await rec('healthz', () => get('/healthz'));
  await rec('readyz', () => get('/readyz'));

  // ── settings ────────────────────────────────────────────────────────────
  await rec('settings.initial', () => get('/v1/settings'));
  await rec('settings.put', () => put('/v1/settings', {
    llm: {
      source: 'custom',
      provider: 'openai',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-test',
      api_key: 'sk-parity',
      temperature: 0.4,
      max_tokens: 2048,
      reasoning_effort: 'medium',
    },
    nai: {
      backend: 'nai',
      api_key: 'pst-parity',
      model: 'nai-diffusion-4-5-full',
      width: 832,
      height: 1216,
      steps: 23,
      cfg_scale: 5,
      sampler: 'k_euler_ancestral',
      apply_quality_tags: true,
    },
    card: { power: true, image_max: 1, image_min: 1, character_max: 4, execute: 'auto' },
  }));
  await rec('settings.after_put', () => get('/v1/settings'));
  // Legacy boolean still accepted; 2.0 migrates true→"short" (see compare natural_base).
  await rec('settings.update_alias', () => post('/v1/settings/update', { card: { natural_base: true } }));
  await rec('settings.natural_base_after_bool', async () => {
    const s = await get('/v1/settings');
    return { natural_base: s?.settings?.card?.natural_base };
  });
  await rec('settings.natural_base_set_detailed', () => post('/v1/settings/update', { card: { natural_base: 'detailed' } }));
  await rec('settings.natural_base_after_detailed', async () => {
    const s = await get('/v1/settings');
    return { natural_base: s?.settings?.card?.natural_base };
  });
  // 2.0-only card flags (compare drops them vs 1.x). Prove defaults stay off.
  await rec('settings.card_flags_2x', async () => {
    const s = await get('/v1/settings');
    const card = s?.settings?.card ?? {};
    return {
      inline_chat_images: card.inline_chat_images === true,
      inline_msg_actions: card.inline_msg_actions === true,
      inline_chat_dom_radius: Number(card.inline_chat_dom_radius ?? 4),
      progress_toast: card.progress_toast === true,
      viewer_minimize_mode: String(card.viewer_minimize_mode || 'icon'),
      llm_json_retry: card.llm_json_retry === true,
      nai5_first: card.nai5_first === true,
      nai5_only: card.nai5_only === true,
      nai4_fallback: card.nai4_fallback === true,
      nai5_speech: card.nai5_speech === true,
      studio_seed_lock: card.studio_seed_lock === true,
      studio_folds: card.studio_folds && typeof card.studio_folds === 'object' ? card.studio_folds : {},
      nai_use_coords: card.nai_use_coords !== false,
      v5_natural_lang: card.v5_natural_lang === 'ja' ? 'ja' : 'en',
      secondary_preset_id: String(card.secondary_preset_id || ''),
      comic_gen: card.comic_gen === 'on',
      comic_llm_batch: String(card.comic_llm_batch || 'once'),
      comic_schedule: String(card.comic_schedule || 'overlap'),
      comic_max_pages: Number(card.comic_max_pages ?? 2),
      comic_gen_ratio: Number(card.comic_gen_ratio ?? 50),
      comic_coords: String(card.comic_coords || 'llm'),
    };
  });
  // 2.4.7: leftover human_focus is forced to none (1.x kept human_focus).
  await rec('settings.uc_preset_none', async () => {
    const s = await get('/v1/settings');
    return { none: s?.settings?.nai?.uc_preset === 'none' };
  });
  await rec('settings.export', () => get('/v1/settings/export'));

  // ── curation.strict_ids (2.0-only surface; 1.x has no curation panel at
  // all, so the route itself is expected to 404 on the old backend — see
  // NEW_ONLY_STEPS in compare.mjs). Enable then immediately reset so no
  // later step runs with curation on.
  await rec('curation.strict_ids.enable', async () => {
    const patch = await post('/v1/curation/settings', { mode: 'two_stage', strict_ids: true });
    const after = await get('/v1/settings');
    return { patch_ok: patch?.ok ?? null, mode: after?.settings?.curation?.mode ?? null, strict_ids: after?.settings?.curation?.strict_ids ?? null };
  });
  await rec('curation.strict_ids.reset', async () => {
    const patch = await post('/v1/curation/settings', { mode: 'off', strict_ids: false });
    const after = await get('/v1/settings');
    return { patch_ok: patch?.ok ?? null, mode: after?.settings?.curation?.mode ?? null, strict_ids: after?.settings?.curation?.strict_ids ?? null };
  });

  // ── prompts ─────────────────────────────────────────────────────────────
  const promptList = await rec('prompts.list', () => get('/v1/prompts'));
  await rec('prompts.get_tagger', () => get('/v1/prompts/tagger'));
  await rec('prompts.put_tagger', () => put('/v1/prompts/tagger', { text: 'PARITY TAGGER OVERRIDE' }));
  await rec('prompts.get_tagger_after_put', () => get('/v1/prompts/tagger'));
  await rec('prompts.reset_tagger', () => post('/v1/prompts/tagger/reset', {}));
  await rec('prompts.get_tagger_after_reset', () => get('/v1/prompts/tagger'));
  await rec('prompts.keys', () =>
    (promptList?.prompts ?? [])
      .map((p) => p.key)
      .filter((k) => !String(k).startsWith('curation_') && k !== 'command_reroll' && k !== 'lorefilter_scan'),
  );
  await rec('lorefilter.get_empty', () => get('/v1/characters/lorefilter?character_id=char_parity'));
  await rec('lorefilter.set', () => post('/v1/characters/lorefilter', {
    character_id: 'char_parity',
    selected: ['t:alice'],
  }));
  await rec('lorefilter.get_after_set', () => get('/v1/characters/lorefilter?character_id=char_parity'));
  await rec('chars.import_picker_persona', () => get('/v1/characters/import-picker?kind=persona'));
  await rec('chars.import_fill_empty', () => post('/v1/characters/import-fill', { picks: [] }));

  // ── characters: shared surname must not merge ───────────────────────────
  await rec('chars.create_shared_surname', () => post('/v1/characters', {
    session_id: 'sess_identity',
    characters: [
      { id: 'jinwoo', name: 'HAN JINWOO', aliases: ['HAN', 'JINWOO', 'HAN JINWOO'], appearance: 'boy, black hair', attire: 'suit' },
      { id: 'mina', name: 'HAN MINA', aliases: ['HAN', 'MINA', 'HAN MINA'], appearance: 'girl, brown hair', attire: 'dress' },
    ],
  }));
  await rec('chars.get_identity', () => get('/v1/characters?session_id=sess_identity'));
  await rec('chars.unify', () => post('/v1/characters/unify', {
    target_session_id: 'sess_identity', source_session_ids: [], include_target: true,
  }));
  await rec('chars.get_after_unify', () => get('/v1/characters?session_id=sess_identity'));

  // ── characters: global scope + toggles ─────────────────────────────────
  await rec('chars.create_global', () => post('/v1/characters', {
    session_id: 'sess_identity',
    scope: '__global__',
    character: { id: 'g-aria', name: '아리아', aliases: ['아리아', 'Aria'], appearance: '1girl, blonde hair', attire: 'armor' },
  }));
  await rec('chars.global_toggles_set', () => post('/v1/characters/global-toggles', {
    character_id: 'char_parity', disabled_globals: ['아리아'],
  }));
  await rec('chars.get_with_char_id', () => get('/v1/characters?session_id=sess_identity&character_id=char_parity'));
  await rec('chars.global_toggles_clear', () => post('/v1/characters/global-toggles', {
    character_id: 'char_parity', disabled_globals: [],
  }));
  await rec('chars.triggered', () => post('/v1/characters/triggered', {
    message: '카페에서 아리아가 HAN JINWOO를 불렀다',
    session_id: 'sess_identity',
    character_id: 'char_parity',
    source_session_ids: [],
  }));
  await rec('chat.restore_chrome', () => post('/v1/chat/restore-chrome', {}));

  // ── unified roster patching across root chats ─────────────────────────
  for (const [sessionId, id, appearance] of [
    ['sess_chat_a', 'chat-a-nim', 'old chat A marker'],
    ['sess_chat_b', 'chat-b-nim', 'old chat B marker'],
  ]) {
    await rec(`chars.seed_${sessionId}`, async () => {
      const saved = await post('/v1/characters', {
        session_id: sessionId,
        characters: [{ id, name: '니메리엘', aliases: ['니메리엘', 'Nimeriel'], appearance, attire: 'white dress' }],
      });
      const char = (saved?.characters || []).find((c) => c.name === '니메리엘') || saved?.characters?.[0];
      // 2.0: "hat" must not match inside "chat" — marker stays appearance, dress stays attire.
      return {
        ...saved,
        wear_ok:
          String(char?.appearance || '').includes(appearance)
          && String(char?.attire || '').includes('white dress')
          && !String(char?.attire || '').includes('marker'),
      };
    });
  }
  await rec('chars.unified_patch', () => post('/v1/characters', {
    session_id: 'sess_unified',
    root_session_ids: ['sess_chat_a', 'sess_chat_b'],
    characters: [{
      id: 'chat-a-nim', name: '니메리엘', aliases: ['니메리엘', 'Nimeriel'],
      appearance: '1girl, vivid violet eyes, long silver hair', attire: 'blue dress',
      scope: 'sess_chat_a',
    }],
  }));
  await rec('chars.chat_a_after_patch', () => get('/v1/characters?session_id=sess_chat_a'));
  await rec('chars.chat_b_after_patch', () => get('/v1/characters?session_id=sess_chat_b'));

  // A chat that never had her must NOT gain her.
  await rec('chars.seed_chat_c', () => post('/v1/characters', {
    session_id: 'sess_chat_c',
    characters: [{ id: 'chat-c-other', name: '다른캐릭', aliases: ['다른캐릭'], appearance: '1girl, brown hair', attire: 'coat' }],
  }));
  await rec('chars.unified_patch_single', () => post('/v1/characters', {
    session_id: 'sess_unified',
    root_session_ids: ['sess_chat_a', 'sess_chat_b', 'sess_chat_c'],
    character: {
      id: 'chat-a-nim', name: '니메리엘', aliases: ['니메리엘', 'Nimeriel'],
      appearance: '1girl, vivid violet eyes, long silver hair', attire: 'blue dress',
      scope: 'sess_chat_a',
    },
  }));
  await rec('chars.chat_c_untouched', () => get('/v1/characters?session_id=sess_chat_c'));

  // ── legacy appearance API ──────────────────────────────────────────────
  await rec('appearance.get', () => get('/v1/appearance/sess_chat_a'));
  await rec('appearance.post', () => post('/v1/appearance/sess_appear', {
    appearance: { '테스트': '1girl, red hair' },
  }));
  await rec('appearance.get_after_post', () => get('/v1/appearance/sess_appear'));

  // ── job pipeline (tag → generate → cards) ─────────────────────────────
  const job = await rec('job.create', () => post('/v1/jobs/create', {
    session_id: 'sess_main',
    character_id: 'char_main',
    character_name: '패리티봇',
    chat_id: 'chat_main',
    chat_name: '패리티 채팅',
    assistant_text: '태양이 망치를 들었다. 불꽃이 튀었다.',
    message_index: 1,
    message_role: 'char',
    content_hash: 'hash_main',
    char_index: 0,
    chat_index: 0,
    recent_messages: [{ role: 'user', content: '무엇을 하고 있어?' }],
    lorebook: [
      { comment: '작업장', content: '오래된 대장간이다.', key: '망치', always: false },
    ],
    lore_trigger_keys: ['망치'],
    character_description: '대장장이 캐릭터',
    persona_description: '방문자',
  }));
  const jobResult = await rec('job.wait', () => waitForJob(job?.job_id));
  await rec('job.card_count', () => (jobResult?.result?.cards ?? []).length);
  // 2.0: default person_tag_weight=3 wraps cast count as N::1boy:: (1.x was plain).
  await rec('job.person_tag_emphasis', () => {
    const main = String(jobResult?.result?.cards?.[0]?.main_prompt || '');
    return {
      emphasized: /^3::1boy::/.test(main) || /^3::1girl/.test(main),
      prefix: main.slice(0, 24),
    };
  });
  await rec('job.uc_preset_none', () => {
    const neg = String(jobResult?.result?.cards?.[0]?.negative_prompt || '');
    return {
      clean: !/(?:^|,)\s*(?:@_@|mismatched pupils|glowing eyes)\s*(?:,|$)/i.test(neg),
    };
  });
  const busyDup = await rec('job.busy_duplicate', () => post('/v1/jobs/create', {
    session_id: 'sess_main', content_hash: 'hash_main', message_index: 1, assistant_text: '태양이 망치를 들었다.',
  }));

  // ── gallery ───────────────────────────────────────────────────────────
  const gallery = await rec('gallery.list', () => get('/v1/gallery?session_id=sess_main&limit=40'));
  await rec('gallery.card_aspect', () => {
    const aspects = (gallery?.items || []).map((row) => String(row?.aspect || ''));
    return {
      first: aspects[0] || '',
      all_canvas: aspects.every((a) => a === 'portrait' || a === 'square' || a === 'landscape'),
    };
  });
  const cardId = gallery?.items?.[0]?.id;
  await rec('gallery.first_card_is_data_url', () => String(gallery?.items?.[0]?.image_url ?? '').slice(0, 22));
  await rec('gallery.display_url_scheme', () => {
    const u = String(gallery?.items?.[0]?.image_url ?? '');
    if (/^blob:/i.test(u)) return 'blob';
    if (/^data:image\//i.test(u)) return 'data';
    return 'other';
  });
  // 2.0 asks for a newest-first window and names the hashes it is about to
  // paint, so an old shot still attaches without listing the whole session.
  await rec('gallery.window_reports_total', () => {
    const all = gallery?.items?.length ?? -1;
    return { total: gallery?.total, matches_items: gallery?.total === all, window_oldest_at: gallery?.window_oldest_at };
  });
  await rec('gallery.window_excludes_beyond_limit', async () => {
    const limit = 1;
    const win = await get(`/v1/gallery?session_id=sess_main&limit=${limit}`);
    const total = Number(win?.total);
    const items = win?.items?.length ?? -1;
    return {
      items,
      total,
      // The window returns min(limit, total), and reports an edge only when it
      // stopped short of the session — that edge is what a merge prunes against.
      window_capped: items === Math.min(limit, total),
      edge_only_when_short: (typeof win?.window_oldest_at === 'number') === (total > limit),
    };
  });
  await rec('gallery.hash_outside_window_still_ships', async () => {
    // limit=0: nothing from the window, only what the hash asks for.
    const byHash = await get('/v1/gallery?session_id=sess_main&limit=0&hashes=hash_main');
    const other = await get('/v1/gallery?session_id=sess_main&limit=0&hashes=no_such_hash');
    return {
      hashed_rows: byHash?.items?.length ?? -1,
      all_match: (byHash?.items || []).every((r) => r.content_hash === 'hash_main'),
      unknown_hash_rows: other?.items?.length ?? -1,
    };
  });
  await rec('gallery.explore', () => get('/v1/gallery/explore?limit=200'));
  await rec('gallery.favorites_empty', () => get('/v1/gallery/favorites'));
  await rec('gallery.favorites_set', () => post('/v1/gallery/favorites', { ids: cardId ? [cardId] : [] }));
  await rec('gallery.favorites_after_set', () => get('/v1/gallery/favorites'));

  // ── bridge image helpers ──────────────────────────────────────────────
  await rec('bridge.resolveImageUrl', () => String(N.resolveImageUrl?.(gallery?.items?.[0]) ?? '').slice(0, 22));
  await rec('bridge.ensureImageUrl', async () => String((await N.ensureImageUrl?.(cardId)) ?? '').slice(0, 22));
  await rec('bridge.warmImages', () => N.warmImages?.(cardId ? [cardId] : []).then(() => 'ok'));
  await rec('images.json', () => get(`/v1/images/${cardId}.json`));

  // ── card editing + reroll ─────────────────────────────────────────────
  // Finish the overlapping job before reroll so 1.x/2.0 do not race on busy locks
  // (2.0 finishes the duplicate faster; without this wait, cards.reroll is busy on 1.x only).
  await rec('job.wait_busy_duplicate', () => waitForJob(busyDup?.job_id));
  // 2.0-only soft-stop route (1.x 404 → NEW_ONLY_STEPS). Idle session → stopped:0.
  await rec('job.stop_idle', () => post('/v1/jobs/stop', { session_id: 'sess_stop_idle' }));

  await rec('cards.nai_prompt', () => get(`/v1/cards/${cardId}/nai-prompt`));
  await rec('cards.nai_from_image_empty', () => post('/v1/cards/nai-from-image', {}));
  await rec('cards.tags', () => post(`/v1/cards/${cardId}/tags`, {
    main_prompt: 'PARITY EDITED PROMPT',
    negative_prompt: 'parity negative',
    characters: [{ name: '태양', prompt: 'boy, black hair', action: 'standing' }],
  }));
  // 2.0-only: shot-tag command rewrite fills fields (look-lock keeps caption).
  handles.setLlmReply?.(JSON.stringify({
    setup: 'CMD SETUP TAGS',
    negative_prompt: 'cmd neg',
    characters: [{ index: 0, name: '태양', prompt: 'CHANGED LOOK', action: 'waving', uc: '' }],
  }));
  await rec('cards.command_rewrite', async () => {
    const res = await post(`/v1/cards/${cardId}/command-rewrite`, {
      instruction: 'make happier',
      look_locked: [true],
      main_prompt: 'PARITY EDITED PROMPT',
      negative_prompt: 'parity negative',
      characters: [{ name: '태양', prompt: 'boy, black hair', action: 'standing' }],
    });
    return {
      ok: res?.ok ?? null,
      look_kept: String(res?.characters?.[0]?.prompt || '').includes('black hair'),
      action: String(res?.characters?.[0]?.action || ''),
      has_setup: String(res?.main_prompt || '').includes('CMD SETUP')
        || String(res?.main_prompt || '').length > 0,
    };
  });
  // Restore default tagger JSON so later jobs are unaffected.
  handles.setLlmReply?.(DEFAULT_LLM_REPLY);
  await rec('cards.gallery_after_tags', () => get('/v1/gallery?session_id=sess_main&limit=40'));
  // 2.0-only: studio commit writes tags (and optional canvas bytes) on the same card id.
  await rec('cards.studio_commit', () => post(`/v1/cards/${cardId}/studio-commit`, {
    main_prompt: 'STUDIO COMMIT',
    negative_prompt: 'studio neg',
    characters: [{ name: '태양', prompt: 'boy, black hair', action: 'sitting' }],
  }));
  const reroll = await rec('cards.reroll', () => post(`/v1/cards/${cardId}/reroll`, { mode: 'nai' }));
  const rerolledId = reroll?.card?.id;
  await rec('cards.reroll_with_overrides', () => post(`/v1/cards/${rerolledId}/reroll`, {
    mode: 'nai',
    overrides: { main_prompt: '', negative_prompt: '', characters: [] },
  }));
  await rec('messages.reroll', () => post('/v1/messages/reroll', {
    session_id: 'sess_main', content_hash: 'hash_main', message_index: 1,
  }));

  // ── hash rebind + unlink ──────────────────────────────────────────────
  const galleryForRebind = await rec('gallery.before_rebind', () => get('/v1/gallery?session_id=sess_main&limit=40'));
  await rec('gallery.rebind_hash', () => post('/v1/gallery/rebind-hash', {
    session_id: 'sess_main',
    card_ids: (galleryForRebind?.items ?? []).map((i) => i.id),
    to_hash: 'hash_main_v2',
    assistant_preview: '태양이 망치를 들었다.',
  }));
  await rec('gallery.after_rebind', () => get('/v1/gallery?session_id=sess_main&limit=40'));
  await rec('gallery.unlink', () => post('/v1/gallery/unlink', {
    session_id: 'sess_main', content_hash: 'hash_main_v2', message_index: 1,
  }));
  await rec('gallery.after_unlink', () => get('/v1/gallery?session_id=sess_main&limit=40'));

  // ── zip export / import round trip ────────────────────────────────────
  const exported = await post('/v1/gallery/export', { all: true });
  await rec('gallery.export', () => describeExport(exported));
  await rec('gallery.export_shape', () => ({
    ok: exported?.ok ?? null,
    count: exported?.count ?? null,
    hasZip: typeof exported?.zip_base64 === 'string' && exported.zip_base64.length > 0,
    filename: typeof exported?.filename === 'string' ? exported.filename.replace(/\d{10,}/, '<TS>') : null,
  }));
  await rec('gallery.import', () => post('/v1/gallery/import', {
    zip_base64: exported?.zip_base64 ?? '', prefer_new_ids: true,
  }));
  await rec('gallery.explore_after_import', () => get('/v1/gallery/explore?limit=200'));

  // ── reference image + vibe transfer ───────────────────────────────────
  await rec('nai.reference_status_empty', () => get('/v1/nai/reference'));
  await rec('nai.reference_set', () => post('/v1/nai/reference', { image_b64: PNG_DATA_URL }));
  await rec('nai.reference_status', () => get('/v1/nai/reference'));
  await rec('bridge.refPreviewUrl', () => String(N.refPreviewUrl?.() ?? '').slice(0, 22));
  await rec('nai.vibe_set', () => post('/v1/nai/vibe', {
    image_b64: PNG_DATA_URL, information_extracted: 1, strength: 0.6,
  }));
  await rec('nai.vibe_status', () => get('/v1/nai/vibe'));
  await rec('bridge.vibePreviewUrl', () => String(N.vibePreviewUrl?.() ?? '').slice(0, 22));
  await rec('nai.vibe_clear', () => post('/v1/nai/vibe/clear', {}));
  await rec('nai.vibe_after_clear', () => get('/v1/nai/vibe'));
  await rec('nai.reference_clear', () => post('/v1/nai/reference/clear', {}));
  await rec('nai.reference_after_clear', () => get('/v1/nai/reference'));

  // ── connectivity tests + autotag ──────────────────────────────────────
  await rec('models.test', () => post('/v1/models/test', {}));
  await rec('models.test_with_override', () => post('/v1/models/test', {
    llm: { source: 'custom', provider: 'openai', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-test', api_key: 'sk-parity' },
  }));
  await rec('nai.test', () => post('/v1/nai/test', {}));
  await rec('nai.quota', () => get('/v1/nai/quota'));
  await rec('nai.probe', () => post('/v1/nai/probe', {}));
  await rec('autotag', () => post('/v1/autotag', { image_b64: PNG_DATA_URL, threshold: 0.2 }));

  // ── ComfyUI backend path ──────────────────────────────────────────────
  await rec('comfy.configure', () => put('/v1/settings', {
    nai: {
      backend: 'comfy',
      comfy_url: 'http://127.0.0.1:8188',
      comfy_workflow_json: JSON.stringify({
        3: { class_type: 'KSampler', inputs: { seed: 0, steps: 20 } },
        6: { class_type: 'CLIPTextEncode', inputs: { text: '[[pos]]' } },
        7: { class_type: 'CLIPTextEncode', inputs: { text: '[[neg]]' } },
        9: { class_type: 'SaveImage', inputs: { images: ['8', 0] } },
      }),
    },
  }));
  await rec('comfy.test', () => post('/v1/nai/test', {}));
  await rec('comfy.restore_nai', () => put('/v1/settings', { nai: { backend: 'nai' } }));

  // ── LLM via Risu main/aux ─────────────────────────────────────────────
  await rec('llm.source_main', () => put('/v1/settings', { llm: { source: 'main' } }));
  await rec('llm.test_main', () => post('/v1/models/test', {}));
  await rec('llm.source_aux', () => put('/v1/settings', { llm: { source: 'aux' } }));
  await rec('llm.test_aux', () => post('/v1/models/test', {}));
  await rec('llm.source_custom', () => put('/v1/settings', { llm: { source: 'custom' } }));

  // ── folder delete + card delete ───────────────────────────────────────
  // Generate a fresh card so there is a real folder to delete.
  const folderJob = await rec('job.create_for_folder', () => post('/v1/jobs/create', {
    session_id: 'sess_folder',
    character_id: 'char_folder',
    character_name: '폴더봇',
    chat_id: 'chat_folder',
    chat_name: '폴더 채팅',
    assistant_text: '태양이 다시 망치를 들었다.',
    message_index: 3,
    message_role: 'char',
    content_hash: 'hash_folder',
    lorebook: [],
  }));
  await rec('job.wait_for_folder', () => waitForJob(folderJob?.job_id));
  const exploreForDelete = await rec('gallery.explore_for_delete', () => get('/v1/gallery/explore?limit=200'));
  // Folder rows expose `key`; only item rows carry `folder_key`.
  await rec('gallery.explore_folder_keys', () => (exploreForDelete?.folders ?? []).map((f) => f.key).sort());

  // Card delete path: remove the freshly generated sess_folder card by id.
  const galleryForCardDelete = await rec('gallery.before_card_delete', () => get('/v1/gallery?session_id=sess_folder&limit=40'));
  await rec('gallery.unlink_duplicate_hash_isolated', async () => {
    const cardIds = new Set((galleryForCardDelete?.items ?? []).map((i) => i.id));
    const result = await post('/v1/gallery/unlink', {
      session_id: 'sess_folder',
      content_hash: 'hash_folder',
      message_index: 99,
    });
    const after = await get('/v1/gallery?session_id=sess_folder&limit=40');
    const kept = (after?.items ?? []).some((row) =>
      cardIds.has(row.id)
      && String(row.content_hash || '') === 'hash_folder'
      && Number(row.message_index) === 3);
    return { unlinked: Number(result?.unlinked || 0), kept };
  });
  await rec('gallery.delete_cards', () => post('/v1/gallery/delete', {
    card_ids: (galleryForCardDelete?.items ?? []).map((i) => i.id),
  }));
  await rec('gallery.after_card_delete', () => get('/v1/gallery?session_id=sess_folder&limit=40'));

  // Folder delete path: drop the main chat's folder, which still holds cards.
  const folderKey = (exploreForDelete?.folders ?? []).find((f) => f.key === 'char_main|chat_main')?.key;
  await rec('gallery.delete_folder_key_present', () => typeof folderKey === 'string' && folderKey.length > 0);
  await rec('gallery.delete_folder', () => post('/v1/gallery/delete', { folder_key: folderKey }));
  await rec('gallery.explore_after_folder_delete', () => get('/v1/gallery/explore?limit=200'));

  // ── settings import / reset ───────────────────────────────────────────
  const exportForImport = await rec('settings.export_for_import', () => get('/v1/settings/export'));
  await rec('settings.import', () => post('/v1/settings/import', { json: exportForImport?.json ?? '{}' }));
  await rec('settings.reset', () => post('/v1/settings/reset', {}));
  await rec('settings.after_reset', () => get('/v1/settings'));

  // ── style presets ─────────────────────────────────────────────────────
  await rec('presets.save', () => put('/v1/settings', {
    card: {
      presets: [
        { id: 'p1', name: '패리티프리셋', positive: 'best quality', negative: 'lowres' },
        { id: 'p2', name: '두번째', positive: 'masterpiece', negative: 'worst quality' },
      ],
      active_preset_id: 'p2',
      custom_pos: 'masterpiece',
      custom_neg: 'worst quality',
    },
  }));
  await rec('presets.after_save', () => get('/v1/settings'));

  // Reroll replays the saved image (mock PNG base is "parity cafe"). The
  // active preset must not replace that base — see INTENTIONAL_DIFF_STEPS.
  await rec('presets.save_swap_markers', () => put('/v1/settings', {
    card: {
      presets: [
        { id: 'p1', name: '패리티프리셋', positive: 'parity_style_alpha', negative: 'lowres' },
        { id: 'p2', name: '두번째', positive: 'parity_style_beta', negative: 'worst quality' },
      ],
      active_preset_id: 'p2',
    },
  }));
  const styleJob = await rec('presets.style_job_create', () => post('/v1/jobs/create', {
    session_id: 'sess_style',
    character_id: 'char_style',
    character_name: '스타일봇',
    chat_id: 'chat_style',
    chat_name: '스타일 채팅',
    assistant_text: '햇살이 창으로 들어왔다.',
    message_index: 1,
    message_role: 'char',
    content_hash: 'hash_style',
    char_index: 0,
    chat_index: 0,
    recent_messages: [{ role: 'user', content: '날씨가 좋아.' }],
  }));
  const styleJobResult = await rec('presets.style_job_wait', () => waitForJob(styleJob?.job_id));
  const styleCardId = styleJobResult?.result?.cards?.[0]?.id;
  await rec('presets.style_before_swap', () => (
    styleCardId ? get(`/v1/gallery?session_id=sess_style&limit=5`) : { items: [] }
  ));
  await rec('presets.activate_alpha', () => put('/v1/settings', {
    card: { active_preset_id: 'p1' },
  }));
  const styleReroll = await rec('presets.reroll_after_swap', () => (
    styleCardId ? post(`/v1/cards/${styleCardId}/reroll`, { mode: 'nai' }) : { ok: false }
  ));
  const afterMain = String(styleReroll?.card?.main_prompt || '');
  await rec('presets.reroll_swaps_style', () => ({
    kept_file: afterMain.includes('parity cafe'),
    ignored_preset: !afterMain.includes('parity_style_alpha'),
    swapped: false,
  }));

  // A reroll builds its prompt for one family (V5 natural / speech / family
  // preset) and must send that family's model with it. 1.x dropped the route and
  // fell back to the model tab, so a V5-only prompt was generated on V4.5.
  const rerolledStyleId = styleReroll?.card?.id;
  await rec('presets.nai5_only_on', () => put('/v1/settings', { card: { nai5_only: true } }));
  const naiGenBefore = handles.naiRequests.filter((r) => r.kind === 'generate').length;
  await rec('presets.reroll_nai5_only', () => (
    rerolledStyleId ? post(`/v1/cards/${rerolledStyleId}/reroll`, { mode: 'nai' }) : { ok: false }
  ));
  await rec('presets.reroll_keeps_v5_model', () => {
    const sent = handles.naiRequests.filter((r) => r.kind === 'generate').slice(naiGenBefore);
    const model = String(sent[sent.length - 1]?.body?.model || '');
    return {
      sent: sent.length,
      model,
      v5: model.includes('nai-diffusion-5'),
      keeps_file: model.includes('nai-diffusion-4-5') && !model.includes('nai-diffusion-5'),
    };
  });
  await rec('presets.nai5_only_off', () => put('/v1/settings', { card: { nai5_only: false } }));

  // nai5_first + stored complexity=simple must reroll on V4, not fall through
  // to V5 because the reconstructed shot omitted complexity.
  const simpleReply = JSON.parse(DEFAULT_LLM_REPLY);
  simpleReply.scenes[0].shots[0].complexity = 'simple';
  handles.setLlmReply?.(JSON.stringify(simpleReply));
  await rec('presets.nai5_first_on', () => put('/v1/settings', { card: { nai5_first: true, nai5_only: false } }));
  const firstJob = await rec('presets.first_simple_job', () => post('/v1/jobs/create', {
    session_id: 'sess_first_simple',
    character_id: 'char_style',
    character_name: '스타일봇',
    chat_id: 'chat_first_simple',
    chat_name: '선택권 채팅',
    assistant_text: '망치를 들었다.',
    message_index: 1,
    message_role: 'char',
    content_hash: 'hash_first_simple',
    char_index: 0,
    chat_index: 0,
    recent_messages: [{ role: 'user', content: '작업하자.' }],
  }));
  const firstWait = await rec('presets.first_simple_wait', () => waitForJob(firstJob?.job_id));
  const firstSimpleId = firstWait?.result?.cards?.[0]?.id;
  const naiGenBeforeSimple = handles.naiRequests.filter((r) => r.kind === 'generate').length;
  await rec('presets.reroll_simple_complexity', () => (
    firstSimpleId ? post(`/v1/cards/${firstSimpleId}/reroll`, { mode: 'nai' }) : { ok: false }
  ));
  await rec('presets.reroll_keeps_v4_from_complexity', () => {
    const sent = handles.naiRequests.filter((r) => r.kind === 'generate').slice(naiGenBeforeSimple);
    const model = String(sent[sent.length - 1]?.body?.model || '');
    return {
      sent: sent.length,
      model,
      v4: model.includes('nai-diffusion-4') && !model.includes('nai-diffusion-5'),
    };
  });
  handles.setLlmReply?.(DEFAULT_LLM_REPLY);
  await rec('presets.nai5_first_off', () => put('/v1/settings', { card: { nai5_first: false } }));

  // 2.4.20: a V5 bubble rides the speaker's own character caption, not the end of
  // main. Read it off the outbound NAI payload rather than the card, because the
  // stored caption is deliberately kept speech-free for the tag editor.
  const speechReply = JSON.parse(DEFAULT_LLM_REPLY);
  speechReply.scenes[0].shots[0].characters[0].speech = '안돼!!';
  handles.setLlmReply?.(JSON.stringify(speechReply));
  await rec('speech.on', () => put('/v1/settings', {
    card: { nai5_speech: true, nai5_only: true },
  }));
  const speechGenBefore = handles.naiRequests.filter((r) => r.kind === 'generate').length;
  const speechJob = await rec('speech.job_create', () => post('/v1/jobs/create', {
    session_id: 'sess_speech',
    character_id: 'char_style',
    character_name: '스타일봇',
    chat_id: 'chat_speech',
    chat_name: '대사 채팅',
    assistant_text: '태양이 소리쳤다.',
    message_index: 1,
    message_role: 'char',
    content_hash: 'hash_speech',
    char_index: 0,
    chat_index: 0,
    recent_messages: [{ role: 'user', content: '멈춰.' }],
  }));
  await rec('speech.job_wait', () => waitForJob(speechJob?.job_id));
  await rec('speech.bubble_on_caption', () => {
    const sent = handles.naiRequests.filter((r) => r.kind === 'generate').slice(speechGenBefore);
    const caption = sent[sent.length - 1]?.body?.parameters?.v4_prompt?.caption ?? {};
    const charCaptions = (caption.char_captions ?? []).map((c) => String(c?.char_caption || ''));
    return {
      sent: sent.length,
      main_has_bubble: String(caption.base_caption || '').includes('speechbubble'),
      char1_ends_with_bubble: /speechbubble, korean text:안돼!!$/.test(charCaptions[0] || ''),
      bubbles: charCaptions.filter((c) => c.includes('speechbubble')).length,
    };
  });
  handles.setLlmReply?.(DEFAULT_LLM_REPLY);
  await rec('speech.off', () => put('/v1/settings', {
    card: { nai5_speech: false, nai5_only: false },
  }));

  // ── character delete cascade ──────────────────────────────────────────
  await rec('chars.delete_cascade', () => post('/v1/characters', {
    session_id: 'sess_chat_a',
    root_session_ids: ['sess_chat_a', 'sess_chat_b'],
    root_delete: [{ id: 'chat-a-nim', name: '니메리엘', aliases: ['니메리엘', 'Nimeriel'] }],
    characters: [],
  }));
  await rec('chars.chat_a_after_delete', () => get('/v1/characters?session_id=sess_chat_a'));
  await rec('chars.chat_b_after_delete', () => get('/v1/characters?session_id=sess_chat_b'));

  // ── error paths ───────────────────────────────────────────────────────
  await rec('error.unknown_get', () => get('/v1/does-not-exist'));
  await rec('error.unknown_post', () => post('/v1/nope', {}));
  await rec('error.bad_method', () => N.fetch('/v1/settings', { method: 'DELETE' }));
  await rec('error.missing_prompt', () => get('/v1/prompts/not_a_prompt'));
  await rec('error.missing_job', () => get('/v1/jobs/nonexistent-job-id'));
  await rec('error.missing_card_tags', () => post('/v1/cards/nonexistent/tags', { main_prompt: 'x' }));

  // ── debug surface ─────────────────────────────────────────────────────
  await rec('debug.snapshot_shape', async () => {
    const d = await get('/v1/debug');
    // Only the stable shape is asserted here. `by_stage` is derived from the last
    // 80 events, and the old backend filled that window with storage writes, so
    // which stages appear is an artefact of persistence volume rather than
    // behaviour. Stage coverage is asserted instead by the comparer's event-log
    // summary, which requires every stage the old run logged to still be logged.
    return {
      hasEvents: Array.isArray(d?.events) && d.events.length > 0,
      hasStages: Object.keys(d?.by_stage ?? {}).length > 0,
      env: d?.env ?? null,
      countKeys: Object.keys(d?.counts ?? {}).sort(),
    };
  });
  await rec('debug.bridge_shape', () => {
    const d = N.debug?.();
    return { hasEvents: Array.isArray(d?.events) && d.events.length > 0 };
  });
  await rec('debug.clear', () => post('/v1/debug/clear', {}));
  await rec('debug.after_clear', async () => {
    const d = await get('/v1/debug');
    return { events: Array.isArray(d?.events) ? d.events.length <= 2 : null };
  });

  // ── 2.5 storage migration ─────────────────────────────────────────────
  // Last, because it runs the retention passes and stamps the store — both of
  // which would change what the steps above see.
  //
  // In this run there is nothing to move: every shot the scenario generated
  // already went straight to the gallery module, so `total` is 0. What this
  // asserts is the route plumbing and that a run with no failures stamps and
  // stops offering itself. Moving actual bytes is covered by the unit tests,
  // which can seed a legacy row directly.
  await rec('storage.migrate_before', async () => {
    const info = await get('/v1/storage/migrate/status');
    return { ok: info?.ok, running: info?.status?.running, phase: info?.status?.phase };
  });
  await rec('storage.migrate_run', async () => {
    const started = await post('/v1/storage/migrate', {});
    let status = started?.status;
    for (let i = 0; i < 200 && status?.running; i += 1) {
      await new Promise((r) => setTimeout(r, 25));
      status = (await get('/v1/storage/migrate/status'))?.status;
    }
    return {
      started: started?.started === true,
      total: started?.total ?? null,
      phase: status?.phase ?? null,
      failed: status?.failed ?? null,
      running: status?.running ?? null,
    };
  });
  await rec('storage.migrate_after', async () => {
    const info = await get('/v1/storage/migrate/status');
    return { migrated_version: info?.migrated_version ?? null, pending_images: info?.pending_images ?? null };
  });
  await rec('storage.migrate_cancel_idle', () => post('/v1/storage/migrate/cancel', {}));

  // ── outbound traffic assertions ───────────────────────────────────────
  transcript.push({
    step: step + 1,
    name: 'host.traffic',
    ok: true,
    value: {
      llmRequestCount: handles.llmRequests.length > 0,
      naiGenerateCount: handles.naiRequests.filter((r) => r.kind === 'generate').length > 0,
      unmocked: handles.unmocked,
      storageKeys: [...handles.storage.keys()].map((k) => k.replace(/^inx_nximg_.*/, 'inx_nximg_*')).sort()
        .filter((k, i, a) => a.indexOf(k) === i),
    },
  });
  transcript.push({
    step: step + 2,
    name: 'host.gallery_pixels',
    ok: true,
    value: [...handles.storage.keys()].some((k) => /^inx_nximg_/.test(k)) ? 'plugin' : 'module',
  });

  return transcript;
}

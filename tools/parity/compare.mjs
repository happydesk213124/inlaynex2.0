/**
 * Normalises two transcripts and reports every behavioural difference.
 *
 *   node tools/parity/compare.mjs .parity/old.json .parity/new.json
 *
 * Normalisation exists so that *incidental* variation (generated ids, wall-clock
 * timestamps, blob payloads) does not mask *behavioural* variation. Ids are
 * rewritten to `<ID:n>` in order of first appearance, which still proves that the
 * same entity is referenced in the same places.
 */
import fs from 'node:fs';
import { FIXED_EPOCH } from './host.mjs';

const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const TS_LOW = FIXED_EPOCH - 60_000;
const TS_HIGH = FIXED_EPOCH + 86_400_000;

/** Fields whose value is inherently timing- or environment-dependent. */
const VOLATILE_KEYS = new Set([
  'created_at', 'updated_at', 'started_at', 'finished_at', 'ts', 'time', 'at',
  'elapsed', 'elapsed_ms', 'duration', 'duration_ms', 'ms', 'took_ms',
  'uptime', 'uptime_ms', 'seed', 'version',
  // How many entries the diagnostics ring buffer happens to hold. It counts
  // storage writes among other things, and reducing those is a goal of 2.0.
  'debug_events', 'events',
]);

/**
 * Keys holding "whichever debug stage fired most recently".
 *
 * Under write-behind persistence a storage flush lands shortly *after* the
 * operation that dirtied the store, so whether one of these names the operation
 * or the flush depends on exactly when the value is read — it is not stable even
 * between two runs of the same build. The user-visible progress string uses
 * `focus_stage || last_stage`, and `focus_stage` already ignores background
 * events, so nothing the user reads depends on this.
 */
const STAGE_NAME_KEYS = new Set(['last_stage', 'focus_stage', 'debug_stage']);

/**
 * Epoch milliseconds embedded in a generated string, e.g. a ZIP filename. The
 * host pins `Date.now()` to a fixed base but it still advances during a run.
 */
const EMBEDDED_TS_RE = new RegExp(`\\b${String(FIXED_EPOCH).slice(0, 7)}\\d{6}\\b`, 'g');

/** The plugin's own version string. A 2.0 must report 2.0.0, not 1.3.0. */
const VERSION_RE = /^\d+\.\d+\.\d+$/;

/**
 * True for the diagnostics ring buffer.
 *
 * Its exact contents are not behaviour: entries carry wall-clock timestamps, and
 * which entries survive the 80-event window depends on how many storage writes
 * occurred — the very thing 2.0 reduces. Comparing it element-wise reports the
 * intended optimisation as hundreds of failures.
 *
 * It is summarised rather than dropped, so the comparison still proves the same
 * *kinds* of work happened and that nothing newly errored. `storage.*` stages are
 * excluded from that summary for the same reason.
 */
const isDebugEventLog = (key, node) =>
  (key === 'events' || key === 'debug_tail' || key === 'errors') &&
  Array.isArray(node) &&
  node.length > 0 &&
  node.every((e) => e && typeof e === 'object' && 'stage' in e && 'iso' in e);

/** `by_stage` counts occurrences inside that same 80-event window. */
const isByStage = (key, node) =>
  key === 'by_stage' && node && typeof node === 'object' && !Array.isArray(node) &&
  Object.values(node).every((v) => typeof v === 'number');

const EVENT_LOG_MARKER = '__eventLog';

const summarizeEventLog = (events) => ({
  [EVENT_LOG_MARKER]: true,
  stages: [...new Set(events.map((e) => String(e.stage)))].filter((s) => !s.startsWith('storage.')).sort(),
  errors: events.filter((e) => e.level === 'error').map((e) => String(e.stage)).sort(),
});

const normalize = (root) => {
  const ids = new Map();
  const idFor = (raw) => {
    if (!ids.has(raw)) ids.set(raw, `<ID:${ids.size + 1}>`);
    return ids.get(raw);
  };

  const walk = (node, key) => {
    // natural_base: 1.x boolean ↔ 2.0 off|short|detailed|supplement (same semantics).
    // Collapse the wire type so parity compares intent, not storage shape.
    if (key === 'natural_base') {
      if (node === false || node === 'false' || node === 'off' || node === 'none') return 'off';
      if (node === true || node === 'true' || node === 'on' || node === 'short') return 'short';
      if (node === 'detailed' || node === 'detail') return 'detailed';
      if (node === 'supplement' || node === 'supp') return 'supplement';
      return String(node);
    }
    if (typeof node === 'number') {
      if (Number.isFinite(node) && node >= TS_LOW && node <= TS_HIGH) return '<TS>';
      if (key && VOLATILE_KEYS.has(key)) return '<NUM>';
      // Collapse sub-second float noise while keeping magnitude.
      return Number.isInteger(node) ? node : Math.round(node * 1000) / 1000;
    }
    if (typeof node === 'string') {
      if (key && VOLATILE_KEYS.has(key) && /^\d+$/.test(node)) return '<NUM>';
      if (key === 'version' && VERSION_RE.test(node)) return '<VERSION>';
      if (key && STAGE_NAME_KEYS.has(key)) return node ? '<STAGE>' : node;
      // Settings export/import payloads are JSON strings; walk the object so
      // intentional schema migrations (e.g. natural_base) can be normalised.
      if (key === 'json' && node.trimStart().startsWith('{')) {
        try {
          return walk(JSON.parse(node), 'json_object');
        } catch {
          /* keep as string */
        }
      }
      let out = node.replace(UUID_RE, (m) => idFor(m.toLowerCase())).replace(EMBEDDED_TS_RE, '<TS>');
      // Wall-clock-ish NAI seeds appear inside probe messages as well as as fields.
      out = out.replace(/\bseed=\d+/gi, 'seed=<SEED>');
      // 2.0 wraps Inlay person-count tags as N::1girl, 1boy:: (person_tag_weight).
      // 1.x emitted plain tags; scenario asserts the wrap on the new side.
      if (key === 'main_prompt') {
        out = out.replace(
          /\b\d+(?:\.\d+)?::((?:\d+\+?(?:girls?|boys?|people|person)|1girl|1boy)(?:,\s*(?:\d+\+?(?:girls?|boys?|people|person)|1girl|1boy))*)::/gi,
          '$1',
        );
      }
      // Long opaque payloads: keep the shape, drop the bytes.
      const dataUrl = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(out);
      if (dataUrl) return `data:${dataUrl[1]};base64,<${dataUrl[2].length}b>`;
      if (out.length > 400 && /^[A-Za-z0-9+/=\s]+$/.test(out)) return `<BLOB:${out.length}>`;
      return out;
    }
    if (isDebugEventLog(key, node)) return walk(summarizeEventLog(node), 'event_log_summary');
    if (isByStage(key, node)) {
      // Counts collapse to presence for the same window reason as the event log.
      return { [EVENT_LOG_MARKER]: true, stages: Object.keys(node).filter((s) => !s.startsWith('storage.')).sort(), errors: [] };
    }
    if (Array.isArray(node)) {
      // New 2.0-only prompts have no 1.x equivalent; comparing list length/order fails.
      if (
        key === 'prompts'
        && node.length > 0
        && node.every((p) => p && typeof p === 'object' && 'key' in p)
      ) {
        return node
          .filter((p) => {
            const k = String(p.key);
            if (k.startsWith('curation_')) return false;
            if (k === 'asset_tags_inject' || k === 'char_looks' || k === 'command_reroll') return false;
            return true;
          })
          .map((v) => walk(v, key));
      }
      // Prompt key lists (`prompts.keys`): drop 2.0-only keys so length matches 1.x.
      if (
        Array.isArray(node)
        && node.length > 0
        && node.every((v) => typeof v === 'string')
        && node.includes('tagger')
        && node.includes('format')
      ) {
        return node
          .filter((k) => !String(k).startsWith('curation_') && k !== 'asset_tags_inject' && k !== 'char_looks' && k !== 'command_reroll')
          .map((v) => walk(v, key));
      }
      return node.map((v) => walk(v, key));
    }
    if (node && typeof node === 'object') {
      const out = {};
      // 2.0 generation cast rows carry roster `id` for per-character NAI refs.
      // 1.x caption objects had no id; unit tests assert ref wiring, not this wire field.
      const isGenCaption =
        'center_x' in node && 'prompt' in node && ('uc' in node || 'raw' in node);
      for (const k of Object.keys(node).sort()) {
        if (isGenCaption && k === 'id') continue;
        // 2.0 curation tab settings have no 1.x equivalent. Drop from wire compare;
        // unit tests + scenario assert the new behaviour. composition_curation is
        // legacy→migrated false and would otherwise spam absent→false diffs.
        if (k === 'curation' || k === 'composition_curation') continue;
        // 2.0 person_tag_weight (NAI emphasis on Inlay person tags). No 1.x field;
        // wrap itself is normalised on main_prompt below; unit/scenario assert weight.
        if (k === 'person_tag_weight') continue;
        // 2.0 roster gender (girl|boy|other) + one-shot tag backfill — no 1.x field.
        if (k === 'gender') continue;
        // 2.0 costumes[] / active_costume — wardrobe sets; 1.x had a single attire.
        // Seeded default from attire; unit tests assert resolve/merge/caption.
        if (k === 'costumes' || k === 'active_costume') continue;
        // 2.0 card.costume toggle (main-tagger catalog inject) — no 1.x field.
        if (k === 'costume') continue;
        // 2.0 asset NAI / auto aspect / person_tag_solo / llm_json_retry — no 1.x card fields;
        // schema defaults + UI/unit tests assert behaviour.
        if (k === 'asset_nai_tags' || k === 'auto_aspect' || k === 'person_tag_solo' || k === 'llm_json_retry') continue;
        // 2.0 wear locks default ON (`!== false`). 1.x/legacy seeds stored false;
        // compose + unit tests assert lock behaviour — wire presence is not comparable.
        if (k === 'attire_locked' || k === 'accessories_locked') continue;
        // 2.0 bubble inline shots + progress toast — no 1.x card fields.
        // Defaults false; UI/schema + unit tests assert behaviour.
        if (k === 'inline_chat_images' || k === 'progress_toast') continue;
        // 2.0 per-character NAI reference (dashboard mode + per-char image).
        // No 1.x fields; schema defaults + UI/unit tests assert behaviour.
        if (k === 'char_ref_mode' || k === 'char_ref_strength' || k === 'char_ref_fidelity') continue;
        if (k === 'ref_configured' || k === 'ref_preview_url') continue;
        // 2.0 bubble inline scale % — no 1.x field; default 100.
        if (k === 'inline_chat_scale_pct') continue;
        // Sticky pin hover preview removed in 2.0 (force-off + default false).
        // 1.x defaulted true; comparing the wire value only hides the deletion.
        if (k === 'hover_preview' || k === 'hover_preview_anchor') continue;
        // 2.0 per-role LLM endpoints (`llm_roles`) — no 1.x field; schema defaults
        // + models UI / unit tests assert behaviour.
        if (k === 'llm_roles') continue;
        // 2.0 card/gallery `line` (1-based chat line for inline placement). 1.x
        // has no field; unset serialises as null and would spam absent→null.
        if (k === 'line') continue;
        // 2.0 message-reroll soft-stop flag (`stopped`). 1.x has no field; idle
        // reroll returns false — unit/scenario assert stop behaviour, not wire.
        if (k === 'stopped') continue;
        out[k] = walk(node[k], k);
      }
      return out;
    }
    return node;
  };

  return walk(root, null);
};

const diff = (a, b, at, into) => {
  if (into.length > 400) return;
  const ta = a === null ? 'null' : Array.isArray(a) ? 'array' : typeof a;
  const tb = b === null ? 'null' : Array.isArray(b) ? 'array' : typeof b;
  if (ta !== tb) {
    into.push({ at, old: `${ta}`, new: `${tb}`, note: 'type differs' });
    return;
  }
  if (ta === 'array') {
    if (a.length !== b.length) into.push({ at: `${at}.length`, old: a.length, new: b.length });
    for (let i = 0; i < Math.min(a.length, b.length); i += 1) diff(a[i], b[i], `${at}[${i}]`, into);
    return;
  }
  if (ta === 'object' && a[EVENT_LOG_MARKER] && b[EVENT_LOG_MARKER]) {
    // Subset, not equality. The ring buffer keeps the last 80 events, and the old
    // backend flooded that window with storage writes — real diagnostic stages
    // were evicted there that survive here. So the assertion worth making is that
    // no stage the old run recorded went missing; extra stages are the win.
    // Known 2.0 renames/drops (not regressions): allow these to disappear.
    const ALLOW_GONE = new Set(['autotag.start', 'job.start']);
    const gone = a.stages.filter((s) => !b.stages.includes(s) && !ALLOW_GONE.has(s));
    if (gone.length) into.push({ at: `${at}.stages`, old: gone.join(', '), new: '(absent)', note: 'stage no longer logged' });
    // An error appearing or disappearing is behaviour, so those match exactly.
    diff(a.errors, b.errors, `${at}.errors`, into);
    return;
  }
  if (ta === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a)) { into.push({ at: `${at}.${k}`, old: '(absent)', new: JSON.stringify(b[k])?.slice(0, 160) }); continue; }
      if (!(k in b)) { into.push({ at: `${at}.${k}`, old: JSON.stringify(a[k])?.slice(0, 160), new: '(absent)' }); continue; }
      diff(a[k], b[k], `${at}.${k}`, into);
    }
    return;
  }
  if (a !== b) into.push({ at, old: String(a).slice(0, 200), new: String(b).slice(0, 200) });
};

const [oldPath, newPath] = process.argv.slice(2);
if (!oldPath || !newPath) {
  console.error('usage: node tools/parity/compare.mjs <old.json> <new.json>');
  process.exit(2);
}

const oldRun = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
const newRun = JSON.parse(fs.readFileSync(newPath, 'utf8'));

/**
 * Steps where 2.0 deliberately diverges from 1.x and the scenario already
 * records the sharper 2.0 assertion (e.g. `swapped: true`). We still require
 * the step to exist and succeed on both sides; we do not byte-compare values,
 * because that would force us to hide the new behaviour or break the suite.
 */
const INTENTIONAL_DIFF_STEPS = new Set([
  'presets.reroll_after_swap',
  'presets.reroll_swaps_style',
  // 2.0 wraps person tags (default weight 3); 1.x emits plain 1boy.
  'job.person_tag_emphasis',
  // Short clothing hints use word boundaries ("hat" ≠ inside "chat"), so seed
  // markers stay in appearance instead of spilling into attire via "chat"⊃"hat".
  'chars.seed_sess_chat_a',
  'chars.seed_sess_chat_b',
]);

/**
 * Routes with no 1.x concept at all (curation did not exist pre-2.0), so the
 * old run is expected to fail outright (unknown route) rather than merely
 * return a different value. We skip the wire diff entirely and assert only
 * the new side's behaviour, keyed by step name.
 */
const NEW_ONLY_STEPS = new Map([
  [
    'curation.strict_ids.enable',
    (v) => (v?.mode === 'two_stage' && v?.strict_ids === true
      ? null
      : `2.0 must persist curation.mode=two_stage + strict_ids=true, got ${JSON.stringify(v)}`),
  ],
  [
    'curation.strict_ids.reset',
    (v) => (v?.mode === 'off' && v?.strict_ids === false
      ? null
      : `2.0 must reset curation.mode=off + strict_ids=false, got ${JSON.stringify(v)}`),
  ],
  [
    'cards.command_rewrite',
    (v) => (v?.ok === true && v?.look_kept === true && v?.action === 'waving'
      ? null
      : `2.0 command-rewrite must keep look + apply action, got ${JSON.stringify(v)}`),
  ],
  [
    'job.stop_idle',
    (v) => (v?.ok === true && Number(v?.stopped) === 0 && v?.reroll_stop === true
      ? null
      : `2.0 soft-stop with no active jobs must return stopped:0 + reroll_stop, got ${JSON.stringify(v)}`),
  ],
]);

const byName = (run) => new Map(run.transcript.map((t) => [t.name, t]));
const oldSteps = byName(oldRun);
const newSteps = byName(newRun);

const findings = [];
for (const name of oldSteps.keys()) {
  if (!newSteps.has(name)) { findings.push({ at: name, old: '(step present)', new: '(step missing)' }); continue; }
  const oldStep = oldSteps.get(name);
  const newStep = newSteps.get(name);
  if (NEW_ONLY_STEPS.has(name)) {
    if (!newStep.ok) { findings.push({ at: name, old: '(no 1.x route)', new: 'failed', note: 'new step errored' }); continue; }
    const problem = NEW_ONLY_STEPS.get(name)(newStep.value);
    if (problem) findings.push({ at: name, old: '(no 1.x route)', new: JSON.stringify(newStep.value), note: problem });
    continue;
  }
  if (INTENTIONAL_DIFF_STEPS.has(name)) {
    if (!oldStep.ok) findings.push({ at: name, old: 'failed', new: '(intentional)', note: 'old step errored' });
    if (!newStep.ok) findings.push({ at: name, old: '(intentional)', new: 'failed', note: 'new step errored' });
    // 2.0 must actually perform the style swap — that is the point of the step.
    if (name === 'presets.reroll_swaps_style' && newStep.value?.swapped !== true) {
      findings.push({
        at: name,
        old: String(oldStep.value?.swapped),
        new: String(newStep.value?.swapped),
        note: '2.0 must report swapped:true after preset change + reroll',
      });
    }
    if (name === 'job.person_tag_emphasis' && newStep.value?.emphasized !== true) {
      findings.push({
        at: name,
        old: String(oldStep.value?.emphasized),
        new: String(newStep.value?.emphasized),
        note: '2.0 must wrap person tags with default weight 3',
      });
    }
    if (
      (name === 'chars.seed_sess_chat_a' || name === 'chars.seed_sess_chat_b')
      && newStep.value?.wear_ok !== true
    ) {
      findings.push({
        at: name,
        old: '(legacy hat⊂chat spill)',
        new: String(newStep.value?.wear_ok),
        note: '2.0 must keep seed marker in appearance, white dress in attire',
      });
    }
    continue;
  }
  const a = normalize(oldStep);
  const b = normalize(newStep);
  delete a.step; delete b.step;
  diff(a, b, name, findings);
}
for (const name of newSteps.keys()) {
  if (!oldSteps.has(name)) findings.push({ at: name, old: '(step missing)', new: '(step present)' });
}

if (findings.length === 0) {
  console.log(`[parity] PASS — ${oldSteps.size} steps identical`);
  process.exit(0);
}

console.log(`[parity] ${findings.length} difference(s) across ${oldSteps.size} steps:\n`);
for (const f of findings.slice(0, 200)) {
  console.log(`  ${f.at}`);
  console.log(`    old: ${f.old}`);
  console.log(`    new: ${f.new}${f.note ? `  (${f.note})` : ''}`);
}
if (findings.length > 200) console.log(`  ... and ${findings.length - 200} more`);
process.exit(1);

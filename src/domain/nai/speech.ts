/**
 * V5 speech → main tags. Default presets suppress bubbles (`-3::spoken bubble, text::`);
 * strip that on speech shots or the bubble never shows.
 */
import { cleanLookSlot } from '../character/looks-fields.ts';
import { cleanText } from '../../core/util/text.ts';

const SPEECH_SUPPRESS_RE = /spoken\s*bubble|speech\s*bubble|speechbubble|\btext\b/i;

/** Drop emphasis groups that exist only to hide speech bubbles. */
export function stripSpokenBubbleSuppression(positive: string): string {
  const src = String(positive || '');
  if (!src) return src;
  return src
    .replace(/(-?\d+(?:\.\d+)?)::([^:]*?)::/g, (full, weight: string, inner: string) => {
      const tokens = inner.split(',').map((t) => t.trim()).filter(Boolean);
      const kept = tokens.filter((t) => !SPEECH_SUPPRESS_RE.test(t));
      if (kept.length === tokens.length) return full;
      if (!kept.length) return '';
      return `${weight}::${kept.join(', ')}::`;
    })
    .replace(/,\s*,/g, ',')
    .replace(/^\s*,\s*|\s*,\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function speechLangTag(text: string, langRaw: unknown): string {
  const lang = cleanText(langRaw, 40).toLowerCase();
  if (lang === 'ja' || lang === 'jp' || lang === 'japanese' || lang === 'japanesetext') {
    return 'japanesetext';
  }
  if (lang === 'en' || lang === 'english' || lang === 'englishtext') return 'englishtext';
  if (lang === 'ko' || lang === 'kr' || lang === 'korean' || lang === 'koreantext') {
    return 'koreantext';
  }
  if (/[\u3040-\u30ff]/.test(text)) return 'japanesetext';
  if (/[\uac00-\ud7a3]/.test(text)) return 'koreantext';
  return 'englishtext';
}

function personChunk(stored: {
  hair_color?: unknown;
  height?: unknown;
  gender?: unknown;
  sex?: unknown;
  original?: unknown;
} | null | undefined): string {
  const hair = cleanLookSlot(stored?.hair_color, 80);
  const genderRaw = cleanText(stored?.gender ?? stored?.sex, 20).toLowerCase();
  const girl = genderRaw === 'boy' || genderRaw === 'm' || genderRaw === 'male' || genderRaw === '1boy'
    ? 'boy'
    : genderRaw === 'other'
      ? 'other'
      : 'girl';
  const height = cleanText(stored?.height, 20);
  const heightBit = /^\d{2,3}/.test(height) ? ` ${height.match(/\d{2,3}/)?.[0] || ''}cm` : '';
  const original = cleanText(stored?.original, 80);
  const body = `${hair}${hair ? ' ' : ''}${heightBit ? `${heightBit.trim()} ` : ''}${girl}`.replace(/\s+/g, ' ').trim();
  if (original) return body ? `${body}'s ${original}` : original;
  return body || 'person';
}

/** `red hair girl's makima's speechbubble, koreantext:안돼!!` — one chunk before the colon. */
export function speechMainTag(
  stored: Parameters<typeof personChunk>[0],
  speech: unknown,
  speechLang?: unknown,
): string {
  const text = cleanText(speech, 200);
  if (!text) return '';
  const who = personChunk(stored);
  const lang = speechLangTag(text, speechLang);
  return `${who}'s speechbubble, ${lang}:${text}`;
}

export function collectSpeechMainTags(
  chars: Array<{ speech?: unknown; speech_lang?: unknown; name?: unknown }>,
  resolveStored: (name: string) => Parameters<typeof personChunk>[0],
): string {
  const parts: string[] = [];
  for (const ch of chars) {
    const name = cleanText(ch.name, 200);
    const tag = speechMainTag(resolveStored(name), ch.speech, ch.speech_lang);
    if (tag) parts.push(tag);
  }
  return parts.join(', ');
}

/** Character `speech` first; else shot-level `{ speaker, text }` (or a bare string). */
export function speechTagsForShot(
  shot: { speech?: unknown } & Record<string, unknown>,
  chars: Array<{ speech?: unknown; speech_lang?: unknown; name?: unknown }>,
  resolveStored: (name: string) => Parameters<typeof personChunk>[0],
): string {
  const fromChars = collectSpeechMainTags(chars, resolveStored);
  if (fromChars) return fromChars;
  const raw = shot.speech;
  if (raw == null || raw === '') return '';
  if (typeof raw === 'string') {
    const first = chars[0];
    return speechMainTag(resolveStored(cleanText(first?.name, 200)), raw);
  }
  if (typeof raw === 'object') {
    const obj = raw as { speaker?: unknown; text?: unknown; lang?: unknown; speech_lang?: unknown };
    const speaker = cleanText(obj.speaker, 200);
    const match = speaker
      ? chars.find((c) => cleanText(c.name, 200) === speaker) || { name: speaker }
      : chars[0];
    return speechMainTag(
      resolveStored(cleanText(match?.name, 200) || speaker),
      obj.text,
      obj.lang ?? obj.speech_lang ?? match?.speech_lang,
    );
  }
  return '';
}

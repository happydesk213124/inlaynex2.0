/**
 * Comic char caption: roster looks + resolved costume (not action) + pose + bubble.
 * Dialogue uses the same `korean text:문장` form as illustration speech — quoted
 * `korean text, "문장"` is what V5 garbles on the first comic page.
 */
import type { CharacterRecord, ShotCharacter } from '../../core/types.ts';
import { cleanText } from '../../core/util/text.ts';
import { composeCharacterCaptionTags } from '../character/tags.ts';
import { speechCaptionTag } from '../nai/speech.ts';
import { resolveComicSlotCostume } from './costume.ts';

export function comicSpeechCaption(bubble: unknown, text: unknown): string {
  const tag = speechCaptionTag(text);
  if (!tag) return '';
  const kind = cleanText(bubble, 40).toLowerCase();
  if (kind === 'thought' || kind === 'think') {
    return tag.replace(/^speechbubble,/, 'thought bubble,');
  }
  if (kind === 'narration' || kind === 'narrator' || kind === 'box') {
    return tag.replace(/^speechbubble,/, 'narration box,');
  }
  return tag;
}

export function composeComicSlotCaption(
  stored: Partial<CharacterRecord> | null | undefined,
  slot: ShotCharacter & { bubble?: unknown },
): string {
  const wear = resolveComicSlotCostume(stored, slot.costume);
  const fakeStored: Partial<CharacterRecord> = {
    ...(stored || {}),
    costumes: [{
      name: '_comic',
      note: '',
      attire: wear.attire,
      accessories: wear.accessories,
    }],
    active_costume: 0,
    attire_locked: false,
    accessories_locked: false,
  };
  const looks = composeCharacterCaptionTags(fakeStored, {
    action: slot.action,
    costume: '_comic',
    appearance: slot.appearance,
    sex: slot.sex,
  });
  const speech = comicSpeechCaption(slot.bubble, slot.speech || slot.text);
  // Dialogue commas must survive; joinTags would split `korean text:안돼, 가지마`.
  if (!speech) return looks;
  return looks ? `${looks}, ${speech}` : speech;
}

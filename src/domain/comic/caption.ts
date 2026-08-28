/**
 * Comic char caption: roster looks + resolved costume (not action) + pose + bubble.
 */
import type { CharacterRecord, ShotCharacter } from '../../core/types.ts';
import { cleanText, joinTags } from '../../core/util/text.ts';
import { composeCharacterCaptionTags } from '../character/tags.ts';
import { resolveComicSlotCostume } from './costume.ts';

export function comicSpeechCaption(bubble: unknown, text: unknown): string {
  const line = cleanText(text, 400);
  if (!line) return '';
  const kind = cleanText(bubble, 40).toLowerCase();
  const bubbleTag = kind === 'thought' || kind === 'think'
    ? 'thought bubble'
    : kind === 'narration' || kind === 'narrator' || kind === 'box'
      ? 'narration box'
      : 'speech bubble';
  return `${bubbleTag}, korean text, "${line}"`;
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
  return joinTags(looks, comicSpeechCaption(slot.bubble, slot.speech || slot.text));
}

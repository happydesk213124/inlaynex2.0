/**
 * Force retag unlinks every shot on a message — illustrations and comic pages.
 * Late-saved comic rows may keep the hash on meta while location already moved,
 * so both sides must count.
 */
import { cleanText, toInt } from '../../core/util/text.ts';

/** Empty location.hash is a real unlink, not “missing → read meta”. */
export function resolveStoredContentHash(
  loc: Record<string, unknown> | null | undefined,
  meta: Record<string, unknown> | null | undefined,
): string {
  const row = loc && typeof loc === 'object' ? loc : {};
  const base = meta && typeof meta === 'object' ? meta : {};
  if (Object.prototype.hasOwnProperty.call(row, 'content_hash')) {
    return cleanText(row.content_hash, 128);
  }
  return cleanText(base.content_hash, 128);
}

export function cardMatchesMessageUnlink(args: {
  hashes: readonly unknown[];
  messageIndexes: readonly unknown[];
  wantHash: string;
  wantMessageIndex: number | null;
}): boolean {
  const wantHash = cleanText(args.wantHash, 128);
  if (wantHash) {
    for (const raw of args.hashes) {
      const h = cleanText(raw, 128);
      if (h && h === wantHash) return true;
    }
  }
  const wantMsg = args.wantMessageIndex;
  if (wantMsg != null && wantMsg >= 0) {
    for (const raw of args.messageIndexes) {
      if (toInt(raw, -1) === wantMsg) return true;
    }
  }
  return false;
}

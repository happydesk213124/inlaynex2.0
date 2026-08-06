/**
 * NovelAI image metadata → filtered tag plains for asset injection.
 */
import { asU8, isPngBytes, isWebpBytes, type BytesLike } from '../../core/util/bytes.ts';
import { promptFromNaiMetadata } from './from-metadata.ts';
import { readPngTextChunks } from './png-text.ts';
import {
  filterAssetPromptTags,
  type FilteredPromptTags,
} from './prompt-tags.ts';
import { decodeImageToRgba, extractStealthFromRgba } from './stealth.ts';
import { webpExifTextMap } from './webp-exif.ts';

export {
  filterAssetPromptTags,
  formatAssetTagsInjectBlock,
  mergeWeightMaps,
  packAssetTagGroups,
  restoreAssetTagWeights,
  splitNaiPromptTokens,
  type FilteredPromptTags,
  type PackedAssetTags,
} from './prompt-tags.ts';
export { promptFromNaiMetadata } from './from-metadata.ts';

function metaFromTextMap(map: Record<string, string>): unknown {
  const comment = map.Comment || map.comment;
  if (comment) {
    try {
      return { Comment: JSON.parse(comment), ...map };
    } catch {
      return { Comment: comment, ...map };
    }
  }
  return map;
}

/** Read NAI metadata from PNG/WebP bytes (file chunks + stealth alpha). */
export async function extractNaiMetadata(bytes: BytesLike): Promise<unknown | null> {
  const u8 = asU8(bytes);
  if (!u8.length) return null;

  // Prefer file-level metadata when present.
  if (isPngBytes(u8)) {
    const texts = await readPngTextChunks(u8);
    if (texts.Comment || texts.Description || texts.Source) {
      return metaFromTextMap(texts);
    }
  } else if (isWebpBytes(u8)) {
    const texts = webpExifTextMap(u8);
    if (texts.UserComment || texts.ImageDescription) {
      const map: Record<string, string> = {};
      if (texts.UserComment) map.Comment = texts.UserComment;
      if (texts.ImageDescription) map.Description = texts.ImageDescription;
      return metaFromTextMap(map);
    }
  }

  const decoded = await decodeImageToRgba(u8);
  if (!decoded) return null;
  return extractStealthFromRgba(decoded.rgba, decoded.width, decoded.height);
}

/** Full pipeline: image bytes → filtered plains + weight map. */
export async function tagsFromImageBytes(bytes: BytesLike): Promise<FilteredPromptTags | null> {
  const meta = await extractNaiMetadata(bytes);
  if (!meta) return null;
  const prompt = promptFromNaiMetadata(meta);
  if (!prompt.trim()) return null;
  const filtered = filterAssetPromptTags(prompt);
  return filtered.plains.length ? filtered : null;
}

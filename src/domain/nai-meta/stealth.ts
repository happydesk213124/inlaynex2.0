/**
 * NovelAI stealth_pngcomp / stealth_pnginfo LSB extractor (alpha channel).
 * Requires decoded RGBA pixels — callers decode PNG/WebP via canvas/ImageBitmap.
 */
import { asU8 } from '../../core/util/bytes.ts';

function packAlphaLsb(alpha: Uint8Array): Uint8Array {
  const usable = Math.floor(alpha.length / 8) * 8;
  const out = new Uint8Array(usable / 8);
  for (let i = 0; i < usable; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b += 1) {
      byte |= (alpha[i + b]! & 1) << (7 - b);
    }
    out[i / 8] = byte;
  }
  return out;
}

async function gunzip(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream !== 'function') return null;
  try {
    const ds = new DecompressionStream('gzip');
    const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    const stream = new Blob([ab]).stream().pipeThrough(ds);
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Decode stealth metadata from RGBA pixel buffer (row-major, 4 bytes/pixel).
 * Returns parsed JSON object or null.
 */
export async function extractStealthFromRgba(
  rgba: Uint8Array,
  width: number,
  height: number,
): Promise<unknown | null> {
  if (!rgba.length || width < 1 || height < 1) return null;
  const expected = width * height * 4;
  if (rgba.length < expected) return null;

  const alpha = new Uint8Array(width * height);
  for (let i = 0, p = 3; i < alpha.length; i += 1, p += 4) {
    alpha[i] = rgba[p]!;
  }
  const bytes = packAlphaLsb(alpha);
  if (bytes.length < 20) return null;

  const magicComp = 'stealth_pngcomp';
  const magicInfo = 'stealth_pnginfo';
  const head = String.fromCharCode(...bytes.subarray(0, magicComp.length));
  let pos = 0;
  let compressed = false;
  if (head.startsWith(magicComp)) {
    compressed = true;
    pos = magicComp.length;
  } else if (head.startsWith(magicInfo)) {
    compressed = false;
    pos = magicInfo.length;
  } else {
    return null;
  }

  if (pos + 4 > bytes.length) return null;
  const bitLen = ((bytes[pos]! << 24) | (bytes[pos + 1]! << 16) | (bytes[pos + 2]! << 8) | bytes[pos + 3]!) >>> 0;
  pos += 4;
  const byteLen = Math.floor(bitLen / 8);
  if (byteLen < 1 || pos + byteLen > bytes.length) return null;
  let payload = bytes.subarray(pos, pos + byteLen);
  if (compressed) {
    const inflated = await gunzip(payload);
    if (!inflated) return null;
    payload = inflated;
  }
  const text = new TextDecoder('utf-8', { fatal: false }).decode(payload);
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Decode image bytes to RGBA via createImageBitmap + canvas (browser / recent Node). */
export async function decodeImageToRgba(bytes: ArrayBuffer | Uint8Array): Promise<{
  rgba: Uint8Array;
  width: number;
  height: number;
} | null> {
  const u8 = asU8(bytes);
  if (!u8.length) return null;
  if (typeof createImageBitmap !== 'function') return null;

  try {
    const copy = new Uint8Array(u8.byteLength);
    copy.set(u8);
    const blob = new Blob([copy]);
    const bitmap = await createImageBitmap(blob);
    const w = bitmap.width;
    const h = bitmap.height;
    const canvas = typeof OffscreenCanvas === 'function'
      ? new OffscreenCanvas(w, h)
      : (() => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
      })();
    const ctx = (canvas as OffscreenCanvas).getContext('2d') as OffscreenCanvasRenderingContext2D | null
      ?? (canvas as HTMLCanvasElement).getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, w, h);
    bitmap.close?.();
    return { rgba: new Uint8Array(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength), width: w, height: h };
  } catch {
    return null;
  }
}

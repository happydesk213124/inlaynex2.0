/** Byte-level conversions: base64, buffer views, and image magic sniffing. */
import { sleep } from './async.ts';

/** Whatever the ported call sites hand us as raw bytes. */
export type BytesLike = ArrayBufferLike | Uint8Array | null | undefined;

/**
 * 32 KiB per `String.fromCharCode` batch. Load-bearing: bigger batches overflow
 * the argument stack on multi-MB PNGs.
 */
const BASE64_CHUNK = 0x8000;

/** Below this size the yielding variant is pure overhead, so it delegates to the sync one. */
const BASE64_ASYNC_MIN = 200_000;

/** Views any byte source as a `Uint8Array` without copying when it already is one. */
export function asU8(buf: BytesLike): Uint8Array {
  if (!buf) return new Uint8Array(0);
  if (buf instanceof Uint8Array) return buf;
  return new Uint8Array(buf);
}

/** Base64-encodes bytes on the caller's task. */
export function bytesToBase64(bytes: BytesLike): string {
  const u8 = asU8(bytes);
  let binary = '';
  for (let i = 0; i < u8.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode(...u8.subarray(i, i + BASE64_CHUNK));
  }
  return btoa(binary);
}

/** Yielding base64 — avoids freezing the plugin iframe on multi-MB PNGs. */
export async function bytesToBase64Async(bytes: BytesLike): Promise<string> {
  const u8 = asU8(bytes);
  if (u8.length < BASE64_ASYNC_MIN) return bytesToBase64(u8);
  let binary = '';
  for (let i = 0; i < u8.length; i += BASE64_CHUNK) {
    binary += String.fromCharCode(...u8.subarray(i, i + BASE64_CHUNK));
    if (i > 0 && i % (BASE64_CHUNK * 24) === 0) await sleep(0);
  }
  return btoa(binary);
}

/** Base64-encodes an ArrayBuffer, or `''` when there is nothing to encode. */
export function abToBase64(buf: BytesLike): string {
  if (!buf) return '';
  return bytesToBase64(buf);
}

/** Yielding `abToBase64`, for buffers big enough to stall the iframe. */
export async function abToBase64Async(buf: BytesLike): Promise<string> {
  if (!buf) return '';
  return bytesToBase64Async(buf);
}

/** Decodes base64 into bytes. */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Decodes base64 into an ArrayBuffer, or `null` for empty input. */
export function base64ToAb(b64: string | null | undefined): ArrayBuffer | null {
  if (!b64) return null;
  return base64ToBytes(b64).buffer as ArrayBuffer;
}

/** Copies a view into a standalone ArrayBuffer sized to the view, not its backing buffer. */
export function u8ToArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
}

/** Joins byte chunks into one buffer of a size the caller already knows. */
export function concatChunks(chunks: Iterable<Uint8Array>, total: number): Uint8Array {
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}

/** True when the bytes start with the PNG signature. */
export function isPngBytes(u8: Uint8Array | null | undefined): boolean {
  return Boolean(
    u8
    && u8.length >= 8
    && u8[0] === 0x89
    && u8[1] === 0x50
    && u8[2] === 0x4e
    && u8[3] === 0x47,
  );
}

/** True when the bytes are a RIFF container tagged WEBP. */
export function isWebpBytes(u8: Uint8Array | null | undefined): boolean {
  return Boolean(
    u8
    && u8.length >= 12
    && u8[0] === 0x52
    && u8[1] === 0x49
    && u8[2] === 0x46
    && u8[3] === 0x46
    && u8[8] === 0x57
    && u8[9] === 0x45
    && u8[10] === 0x42
    && u8[11] === 0x50,
  );
}

/** Guesses the image MIME from magic bytes, defaulting to PNG. */
export function sniffImageMime(buf: BytesLike): string {
  const u8 = asU8(buf);
  if (isWebpBytes(u8)) return 'image/webp';
  if (isPngBytes(u8)) return 'image/png';
  if (u8.length >= 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return 'image/jpeg';
  return 'image/png';
}

/** Decodes a `data:` URL payload (base64 or percent-encoded) into bytes, or `null` if unparseable. */
export function dataUrlToArrayBuffer(dataUrl: unknown): ArrayBuffer | null {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(String(dataUrl || ''));
  if (!m) return null;
  const isB64 = Boolean(m[2]);
  const payload = m[3] || '';
  try {
    if (isB64) return u8ToArrayBuffer(base64ToBytes(payload));
    return u8ToArrayBuffer(new TextEncoder().encode(decodeURIComponent(payload)));
  } catch {
    return null;
  }
}

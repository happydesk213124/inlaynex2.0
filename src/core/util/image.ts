/**
 * Canvas-backed image re-encoding.
 *
 * Every path here is optional: hosts without `createImageBitmap`, `document` or
 * `OffscreenCanvas` must still work, so each function degrades to returning the
 * input untouched rather than throwing.
 */
import { dbg } from '../debug.ts';
import {
  asU8,
  type BytesLike,
  dataUrlToArrayBuffer,
  isPngBytes,
  isWebpBytes,
  sniffImageMime,
  u8ToArrayBuffer,
} from './bytes.ts';

interface DecodedImage {
  readonly source: ImageBitmap | HTMLImageElement;
  readonly width: number;
  readonly height: number;
  close(): void;
}

type DrawnCanvas =
  | { readonly kind: 'offscreen'; readonly canvas: OffscreenCanvas }
  | { readonly kind: 'dom'; readonly canvas: HTMLCanvasElement };

/**
 * Decodes bytes to something drawable. `allowImageElement` opts into the
 * `<img>` + object-URL path, which only the WebP encoder uses.
 */
async function decodeImage(
  src: Uint8Array,
  mime: string,
  allowImageElement: boolean,
): Promise<DecodedImage | null> {
  // `Uint8Array<ArrayBufferLike>` is not a `BlobPart` because it could in theory be
  // backed by a SharedArrayBuffer. Ours never are.
  const blob = new Blob([src as unknown as ArrayBufferView<ArrayBuffer>], { type: mime });
  let source: ImageBitmap | HTMLImageElement | null = null;
  if (typeof createImageBitmap === 'function') {
    source = await createImageBitmap(blob);
  } else if (allowImageElement && typeof document !== 'undefined') {
    source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const objUrl = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        reject(new Error('image decode failed'));
      };
      img.src = objUrl;
    });
  }
  if (!source) return null;

  const decoded = source;
  // An <img> reports 0 for width/height until it is laid out, so fall back to
  // the intrinsic size.
  const natural = 'naturalWidth' in decoded
    ? { w: decoded.naturalWidth, h: decoded.naturalHeight }
    : { w: 0, h: 0 };
  return {
    source: decoded,
    width: decoded.width || natural.w || 0,
    height: decoded.height || natural.h || 0,
    close: () => {
      try {
        // An <img> has nothing to release; only ImageBitmap does.
        if ('close' in decoded) decoded.close();
      } catch {
        // Already released.
      }
    },
  };
}

/**
 * Paints the whole image into a `w`×`h` canvas. Returns `null` when no canvas
 * flavour is reachable or the 2d context is refused.
 */
function drawToCanvas(
  image: DecodedImage,
  w: number,
  h: number,
  allowOffscreen: boolean,
): DrawnCanvas | null {
  if (allowOffscreen && typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image.source, 0, 0, w, h);
    return { kind: 'offscreen', canvas };
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image.source, 0, 0, w, h);
    return { kind: 'dom', canvas };
  }
  return null;
}

/** Re-encode gallery images to WebP @ 0.8 for smaller IndexedDB + data: URLs. Falls back to original. */
export async function encodeWebpQuality(buf: BytesLike, quality = 0.8): Promise<ArrayBuffer | null> {
  const src = asU8(buf);
  if (!src.length) return null;
  if (isWebpBytes(src)) return u8ToArrayBuffer(src);
  const mime = sniffImageMime(src);
  try {
    const image = await decodeImage(src, mime, true);
    if (!image) return null;
    if (!(image.width > 0 && image.height > 0)) {
      image.close();
      return null;
    }

    const drawn = drawToCanvas(image, image.width, image.height, true);
    if (!drawn) {
      image.close();
      return null;
    }

    let encoded: ArrayBuffer | null;
    if (drawn.kind === 'offscreen') {
      const outBlob = await drawn.canvas.convertToBlob({ type: 'image/webp', quality });
      image.close();
      if (!outBlob || !outBlob.size) return null;
      encoded = await outBlob.arrayBuffer();
    } else {
      encoded = dataUrlToArrayBuffer(drawn.canvas.toDataURL('image/webp', quality));
      image.close();
    }

    if (!encoded) return null;
    const out = asU8(encoded);
    if (!isWebpBytes(out)) return null;
    // Keep original if WebP somehow larger (rare).
    if (out.length >= src.length * 0.98) return null;
    return encoded;
  } catch (err) {
    dbg('image.webp.encode.fail', { message: String((err as Error)?.message || err) }, 'warn');
    return null;
  }
}

/**
 * Re-encode to PNG for NovelAI endpoints that reject webp/jpeg (director /
 * Precise Reference encoding). Returns the original buffer when already PNG
 * or when canvas encode is unavailable.
 */
export async function ensurePngBytes(buf: BytesLike): Promise<ArrayBuffer> {
  const src = asU8(buf);
  if (!src.length) return u8ToArrayBuffer(src);
  if (isPngBytes(src)) return u8ToArrayBuffer(src);
  const mime = sniffImageMime(src);
  try {
    const image = await decodeImage(src, mime, true);
    if (!image || !(image.width > 0 && image.height > 0)) {
      image?.close();
      return u8ToArrayBuffer(src);
    }
    const drawn = drawToCanvas(image, image.width, image.height, true);
    if (!drawn) {
      image.close();
      return u8ToArrayBuffer(src);
    }
    let encoded: ArrayBuffer | null = null;
    if (drawn.kind === 'offscreen') {
      const outBlob = await drawn.canvas.convertToBlob({ type: 'image/png' });
      image.close();
      if (outBlob?.size) encoded = await outBlob.arrayBuffer();
    } else {
      encoded = dataUrlToArrayBuffer(drawn.canvas.toDataURL('image/png'));
      image.close();
    }
    if (encoded && isPngBytes(asU8(encoded))) return encoded;
  } catch (err) {
    dbg('image.png.encode.fail', { message: String((err as Error)?.message || err) }, 'warn');
  }
  return u8ToArrayBuffer(src);
}

/** NAI Precise Reference exact canvases (other sizes encode-400). */
const DIRECTOR_PORTRAIT = { w: 1024, h: 1536 } as const;
const DIRECTOR_LANDSCAPE = { w: 1536, h: 1024 } as const;
const DIRECTOR_SQUARE = { w: 1472, h: 1472 } as const;

/** Pick portrait / landscape / square from aspect (1:1 → square). */
function pickDirectorCanvas(srcW: number, srcH: number): { w: number; h: number } {
  const aspect = srcW / Math.max(1, srcH);
  // ~square band; otherwise taller→portrait, wider→landscape.
  if (aspect >= 0.9 && aspect <= 1.1) return DIRECTOR_SQUARE;
  if (aspect < 1) return DIRECTOR_PORTRAIT;
  return DIRECTOR_LANDSCAPE;
}

async function canvasToWebp(drawn: DrawnCanvas, quality: number): Promise<ArrayBuffer | null> {
  if (drawn.kind === 'offscreen') {
    const outBlob = await drawn.canvas.convertToBlob({ type: 'image/webp', quality });
    if (!outBlob?.size) return null;
    return outBlob.arrayBuffer();
  }
  const blob = await new Promise<Blob | null>((resolve) => {
    drawn.canvas.toBlob(resolve, 'image/webp', quality);
  });
  if (!blob?.size) return null;
  return blob.arrayBuffer();
}

function letterboxDirector(
  drawn: DrawnCanvas,
  image: DecodedImage,
  cw: number,
  ch: number,
): void {
  const paint = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
    const fit = Math.min(cw / image.width, ch / image.height);
    const dw = Math.max(1, Math.round(image.width * fit));
    const dh = Math.max(1, Math.round(image.height * fit));
    ctx.drawImage(image.source, Math.floor((cw - dw) / 2), Math.floor((ch - dh) / 2), dw, dh);
  };
  if (drawn.kind === 'offscreen') {
    const ctx = drawn.canvas.getContext('2d');
    if (ctx) paint(ctx);
  } else {
    const ctx = drawn.canvas.getContext('2d');
    if (ctx) paint(ctx);
  }
}

/**
 * Letterbox onto an NAI Precise Reference canvas and emit webp @ ~0.5.
 * Live probe: raw 1024² webp 400s; same image padded to 1472²/1024×1536/1536×1024
 * webp succeeds and stays small. Half-size canvases encode-400 — full size only.
 */
export async function prepareDirectorReferenceWebp(
  buf: BytesLike,
  quality = 0.5,
): Promise<ArrayBuffer> {
  const src = asU8(buf);
  if (!src.length) throw new Error('참고 이미지가 비어 있습니다');
  const mime = sniffImageMime(src);
  const image = await decodeImage(src, mime, true);
  if (!image || !(image.width > 0 && image.height > 0)) {
    image?.close();
    throw new Error('참고 이미지를 디코딩하지 못했습니다');
  }
  try {
    const { w: cw, h: ch } = pickDirectorCanvas(image.width, image.height);
    // DOM canvas preferred for webp encode reliability in the plugin host.
    const drawn = drawToCanvas(image, cw, ch, false) || drawToCanvas(image, cw, ch, true);
    if (!drawn) throw new Error('참고 이미지 캔버스를 만들지 못했습니다');
    letterboxDirector(drawn, image, cw, ch);
    const encoded = await canvasToWebp(drawn, Math.max(0.05, Math.min(1, quality)));
    if (!encoded || !isWebpBytes(asU8(encoded))) {
      throw new Error('참고 이미지를 webp로 인코딩하지 못했습니다');
    }
    dbg('image.director.webp', {
      message: `${cw}x${ch} · q${quality} · ${Math.round(encoded.byteLength / 1024)}KB · from ${mime}`,
      bytes: encoded.byteLength,
    });
    return encoded;
  } finally {
    image.close();
  }
}

export interface PreparedImage {
  readonly bytes: Uint8Array;
  readonly mime: string;
  readonly filename: string;
}

/** Shrinks a reference image to what the autotag vision LLM can accept, keeping the original on any failure. */
export async function prepareAutotagImage(imageBytes: BytesLike): Promise<PreparedImage> {
  let u8 = asU8(imageBytes);
  if (!u8.length) throw new Error('image is empty');
  // Donmai autotagger + Risu nativeFetch log path hate multi-MB pastes.
  // Downscale like Tampermonkey's canvas path (display-sized), keep PNG.
  const maxEdge = 1536;
  const maxBytes = 1_200_000;
  const mime = sniffImageMime(u8);
  const needsShrink = u8.length > maxBytes;
  try {
    // No <img> fallback and no OffscreenCanvas on this path: without
    // `createImageBitmap` + `document` the bytes go out unchanged.
    const image = await decodeImage(u8, mime, false);
    if (image && (needsShrink || image.width > maxEdge || image.height > maxEdge)) {
      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height, 1));
      const w = Math.max(1, Math.round(image.width * scale));
      const h = Math.max(1, Math.round(image.height * scale));
      const drawn = drawToCanvas(image, w, h, false);
      if (drawn?.kind === 'dom') {
        const outBlob = await new Promise<Blob | null>((resolve) => {
          drawn.canvas.toBlob(resolve, 'image/png');
        });
        if (outBlob) {
          u8 = new Uint8Array(await outBlob.arrayBuffer());
          image.close();
          return { bytes: u8, mime: 'image/png', filename: 'image.png' };
        }
      }
    }
    image?.close();
  } catch (err) {
    dbg('autotag.resize', { message: String((err as Error)?.message || err) }, 'warn');
  }
  const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';
  return { bytes: u8, mime, filename: `image.${ext}` };
}

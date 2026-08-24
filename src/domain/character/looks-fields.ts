/**
 * Roster look slots that used to live only inside `appearance`.
 * Caption still joins them into one NAI line; storage keeps them separate.
 */
import { cleanText } from '../../core/util/text.ts';

export const PENIS_SIZES = ['small penis', 'penis', 'huge penis', 'gigantic penis'] as const;
export type PenisSize = (typeof PENIS_SIZES)[number];

const PENIS_SET = new Set<string>(PENIS_SIZES);

/** Four Danbooru size tags only. Anything else → "". */
export function normalizePenisSize(raw: unknown): PenisSize | '' {
  const t = cleanText(raw, 40).toLowerCase().replace(/_/g, ' ').trim();
  if (!t) return '';
  if (PENIS_SET.has(t)) return t as PenisSize;
  if (t === 'small' || t === 'tiny') return 'small penis';
  if (t === 'normal' || t === 'average' || t === '보통') return 'penis';
  if (t === 'huge' || t === 'large' || t === '대물') return 'huge penis';
  if (t === 'gigantic' || t === 'giant') return 'gigantic penis';
  return '';
}

/** Integer years. Non-finite / out of 1–120 → null. */
export function parseAgeYears(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n)) return null;
  const years = Math.round(n);
  if (years < 1 || years > 120) return null;
  return years;
}

export function formatAgeCaption(raw: unknown): string {
  const years = parseAgeYears(raw);
  return years == null ? '' : `${years} years old`;
}

export interface ParsedHeight {
  cm: number | null;
  cue: 'petite' | 'short' | 'tall' | '';
}

/** cm first. Optional tall/short/petite. */
export function parseHeight(raw: unknown): ParsedHeight {
  const text = cleanText(raw, 80).toLowerCase();
  let cue: ParsedHeight['cue'] = '';
  if (/\bpetite\b/.test(text) || text.includes('아담')) cue = 'petite';
  else if (/\btall\b/.test(text) || text.includes('큰키') || text.includes('키큰')) cue = 'tall';
  else if (/\bshort\b/.test(text) || text.includes('작은키')) cue = 'short';
  const num = text.match(/(\d+(?:\.\d+)?)\s*cm|\b(\d{2,3})\b/);
  const cmRaw = num ? Number(num[1] || num[2]) : NaN;
  const cm = Number.isFinite(cmRaw) && cmRaw >= 80 && cmRaw <= 250 ? Math.round(cmRaw) : null;
  return { cm, cue };
}

/**
 * Caption: `170cm, tall`. Missing cm → cue only.
 * <150 → petite; girl ≥170 / boy ≥180 → tall when cue is empty.
 */
export function formatHeightCaption(
  raw: unknown,
  gender: 'girl' | 'boy' | 'other' | '' = '',
): string {
  const { cm, cue } = parseHeight(raw);
  let resolved = cue;
  if (!resolved && cm != null) {
    if (cm < 150) resolved = 'petite';
    else if (gender === 'girl' && cm >= 170) resolved = 'tall';
    else if (gender === 'boy' && cm >= 180) resolved = 'tall';
  }
  const parts: string[] = [];
  if (cm != null) parts.push(`${cm}cm`);
  if (resolved) parts.push(resolved);
  return parts.join(', ');
}

export function cleanLookSlot(raw: unknown, max = 400): string {
  return cleanText(raw, max);
}

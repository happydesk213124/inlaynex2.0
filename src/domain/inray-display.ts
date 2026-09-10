/**
 * Display-only rewrite for baked Inray tokens.
 * Stored chat stays `[[@inray::cardId::inxshot_…]]`; this regex is what the
 * user sees (center, gap, hover fullscreen chip).
 */
export const INRAY_DISPLAY_MODULE_ID = 'inlay-inray-display';
export const INRAY_DISPLAY_MODULE_NS = 'inlay.inray_display';
export const INRAY_DISPLAY_MODULE_NAME = 'Inlay Inray 디스플레이';
export const INRAY_DISPLAY_SCRIPT_COMMENT = 'inray-shot-display';

/** Capture card id and gallery asset name. */
export const INRAY_DISPLAY_IN = '\\[\\[@inray::([^:\\]]+)::(inxshot_[^\\]]+)\\]\\]';

/**
 * `$1` = card id (inspect / triple-tap), `$2` = gallery asset name.
 * After regex, Risu CBS turns `{{raw::$2}}` into a file URL (official path form).
 */
export const INRAY_DISPLAY_OUT = [
  '<style>.inray-shot[data-inlay-inline-shot]{position:relative;display:block;width:fit-content;max-width:100%;margin:1.15em auto;text-align:center}',
  '.inray-shot[data-inlay-inline-shot] img{display:block;max-width:100%;height:auto;margin:0 auto;border-radius:10px}',
  '.inray-shot .inray-fs{position:absolute;top:8px;right:8px;z-index:2;width:34px;height:34px;padding:0;border:0;border-radius:9px;background:rgba(15,18,28,.55);color:#fff;opacity:0;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .15s}',
  '.inray-shot[data-inlay-inline-shot]:hover .inray-fs,.inray-shot[data-inlay-inline-shot]:focus-within .inray-fs{opacity:1}</style>',
  '<div class="inray-shot" data-inlay-inline-shot="$1" x-inlay-inline-shot="$1">',
  '<button type="button" class="inray-fs" data-inray-fs="$1" x-inray-fs="$1" aria-label="전체화면" title="전체화면">',
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
  '</button><img class="inray-shot-img" src="{{raw::$2}}" alt=""></div>',
].join('');

export function inrayDisplayRegexScript(): {
  comment: string;
  in: string;
  out: string;
  type: 'editdisplay';
  ableFlag: boolean;
  flag: string;
} {
  return {
    comment: INRAY_DISPLAY_SCRIPT_COMMENT,
    in: INRAY_DISPLAY_IN,
    out: INRAY_DISPLAY_OUT,
    type: 'editdisplay',
    ableFlag: true,
    flag: 'g',
  };
}

/**
 * Display-only rewrite for baked Inray tokens.
 * Stored chat stays `[[@inray::cardId::inxshot_…]]`; this regex is what the
 * user sees (center, gap, hover fullscreen chip).
 */
export const INRAY_DISPLAY_MODULE_ID = 'inlay-inray-display';
export const INRAY_DISPLAY_MODULE_NS = 'inlay.inray_display';
export const INRAY_DISPLAY_MODULE_NAME = 'Inlay 디스플레이';
export const INRAY_DISPLAY_SCRIPT_COMMENT = 'inray-shot-display';

/** Capture card id and gallery asset name. */
export const INRAY_DISPLAY_IN = '\\[\\[@inray::([^:\\]]+)::(inxshot_[^\\]]+)\\]\\]';

/**
 * `$1` = card id (inspect / triple-tap), `$2` = gallery asset name.
 * After regex, Risu CBS turns `{{raw::$2}}` into a file URL (official path form).
 * `folded` writes `checked` so the host starts collapsed (top peek, not hidden).
 */
export function inrayDisplayOut(folded = false): string {
  const checked = folded ? ' checked' : '';
  return [
    '<style>.inray-shot[data-inlay-inline-shot]{position:relative;display:block;width:75%;max-width:75%;margin:1.15em auto;text-align:center}',
    '.inray-shot[data-inlay-inline-shot] img{display:block;width:100%;max-width:100%;height:auto;margin:0 auto}',
    '.inray-clip{position:relative;display:grid;grid-template-rows:1fr;width:100%;overflow:hidden;max-height:200vh;border-radius:10px;aspect-ratio:2/3;transition:grid-template-rows .42s cubic-bezier(.4,0,.2,1),max-height .42s cubic-bezier(.4,0,.2,1)}',
    '.inray-clip img{min-height:0;width:100%;height:auto}',
    '.inray-fold-cb{position:absolute;width:0;height:0;opacity:0;pointer-events:none}',
    '.inray-fold-cb:checked~.inray-clip{grid-template-rows:4.5em;max-height:4.5em;aspect-ratio:auto}',
    '.inray-fold-cb:checked~.inray-clip::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1.6em;pointer-events:none;background:linear-gradient(transparent,rgba(8,10,16,.45))}',
    '.inray-bar{position:absolute;top:8px;right:8px;z-index:2;display:flex;gap:6px;opacity:0;transition:opacity .15s}',
    '.inray-shot[data-inlay-inline-shot]:hover .inray-bar,.inray-shot[data-inlay-inline-shot]:focus-within .inray-bar,.inray-fold-cb:checked~.inray-bar{opacity:1}',
    '.inray-fold,.inray-fs{width:34px;height:34px;padding:0;border:0;border-radius:9px;background:rgba(15,18,28,.55);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1}',
    '.inray-fold::before{content:"▼"}',
    '.inray-fold-cb:checked~.inray-bar .inray-fold::before{content:"▲"}</style>',
    '<div class="inray-shot" data-inray-bake="1" x-inray-bake="1" data-inlay-inline-shot="$1" x-inlay-inline-shot="$1">',
    `<input type="checkbox" class="inray-fold-cb" id="inray-fold-$1"${checked}>`,
    '<div class="inray-bar">',
    '<label class="inray-fold" for="inray-fold-$1" title="접기 / 펼치기" aria-label="접기 / 펼치기"></label>',
    '<button type="button" class="inray-fs" data-inray-fs="$1" x-inray-fs="$1" aria-label="전체화면" title="전체화면">',
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
    '</button></div>',
    '<div class="inray-clip"><img class="inray-shot-img" src="{{raw::$2}}" alt=""></div></div>',
  ].join('');
}

export const INRAY_DISPLAY_OUT = inrayDisplayOut(false);

export function inrayDisplayRegexScript(folded = false): {
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
    out: inrayDisplayOut(folded),
    type: 'editdisplay',
    ableFlag: true,
    flag: 'g',
  };
}

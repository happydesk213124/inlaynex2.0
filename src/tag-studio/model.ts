import { composeCharacterCaptionTags } from '../domain/character/tags.ts';
import { resolveCharacter } from '../domain/character/roster.ts';
import type { CharacterInput } from '../domain/character/identity.ts';
import { QUALITY_TAGS } from '../config/defaults.ts';
import { cleanText, joinTags } from '../core/util/text.ts';
import { peelMain, resolveCharPost } from './peel.ts';

export const CHAR_SLOTS: Array<[number, number]> = [
  [0.3, 0.5], [0.7, 0.5], [0.5, 0.28], [0.22, 0.78], [0.78, 0.78], [0.5, 0.55],
];

export interface StudioChar {
  rosterId: string;
  charName: string;
  costume: string;
  costumeName: string;
  costumeTags: string;
  costumeNote: string;
  tags: string;
  post: string;
  uc: string;
  x: number;
  y: number;
  auto: boolean;
  lock: boolean;
  slim: Record<string, unknown>;
}

export interface StudioTab {
  id: string;
  kind: 'main' | 'llm' | 'char';
  label: string;
}

export interface StudioState {
  cardId: string;
  comic: boolean;
  sessionId: string;
  characterId: string;
  imageUrl: string;
  metaError: string;
  active: string;
  tabs: StudioTab[];
  main: {
    presetId: string;
    presetName: string;
    presetPrompt: string;
    post: string;
    neg: string;
    presetPane: 'pos' | 'neg';
    autoPerson: boolean;
    personMode: '' | 'off' | 'gender' | 'girls' | 'people';
    personWeight: string;
    personSolo: boolean;
    quality: boolean;
  };
  gen: {
    model: string;
    w: number;
    h: number;
    steps: string;
    cfg: number;
    rescale: number;
    sampler: string;
    scheduler: string;
    seed: number;
    seedLock: boolean;
  };
  llm: { presetId: string; presetName: string; cmd: string; cmdPost: string };
  chars: Record<string, StudioChar>;
  fold: Record<string, boolean>;
  history: Array<{ url: string; seed: number }>;
  historySel: number;
  coordMode: 'ai' | 'manual';
  coordVisible: boolean;
  leftFold: boolean;
  rightFold: boolean;
  peek: boolean;
  loop: boolean;
  busy: number;
  selChar: string;
}

export interface AssembledChar {
  no: number;
  name: string;
  prompt: string;
  uc: string;
  center_x: number;
  center_y: number;
  slim: Record<string, unknown>;
}

export interface Assembled {
  main: string;
  neg: string;
  chars: AssembledChar[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function rosterList(payload: Record<string, unknown>): CharacterInput[] {
  const session = Array.isArray(payload.characters) ? payload.characters : [];
  const global = Array.isArray(payload.global) ? payload.global : [];
  return [...session, ...global].filter((c) => c && typeof c === 'object') as CharacterInput[];
}

export function emptyState(): StudioState {
  return {
    cardId: '',
    comic: false,
    sessionId: '',
    characterId: '',
    imageUrl: '',
    metaError: '',
    active: 'main',
    tabs: [
      { id: 'main', kind: 'main', label: 'main' },
      { id: 'llm', kind: 'llm', label: 'LLM 명령수정' },
    ],
    main: {
      presetId: '',
      presetName: '',
      presetPrompt: '',
      post: '',
      neg: '',
      presetPane: 'pos',
      autoPerson: false,
      personMode: '',
      personWeight: '',
      personSolo: false,
      quality: true,
    },
    gen: {
      model: '', w: 832, h: 1216, steps: '', cfg: 5, rescale: 0,
      sampler: '', scheduler: '', seed: 0, seedLock: false,
    },
    llm: { presetId: '', presetName: '', cmd: '', cmdPost: '' },
    chars: {},
    fold: {},
    history: [],
    historySel: -1,
    coordMode: 'ai',
    coordVisible: false,
    leftFold: false,
    rightFold: true,
    peek: false,
    loop: false,
    busy: 0,
    selChar: '',
  };
}

export function charList(state: StudioState): Array<StudioChar & { tab: StudioTab; i: number; id: string }> {
  return state.tabs
    .filter((t) => t.kind === 'char')
    .map((tab, i) => ({ tab, i, id: tab.id, ...state.chars[tab.id]! }))
    .filter((c) => c && state.chars[c.id]);
}

function personTag(state: StudioState): string {
  const m = state.main;
  if (!m.autoPerson || m.personMode === 'off' || !m.personMode) return '';
  const list = charList(state).filter((c) => c.rosterId || String(c.tags || '').trim() || String(c.post || '').trim());
  const n = list.length;
  if (!n) return '';
  const wrap = (t: string) => {
    const w = Number(m.personWeight);
    return Number.isFinite(w) && w >= 1 ? `${w}::${t}::` : t;
  };
  if (m.personSolo && n === 1) return wrap('solo');
  if (m.personMode === 'people') return wrap(`${n}people`);
  if (m.personMode === 'girls') return wrap(n === 1 ? '1girl' : `${n}girls`);
  return wrap(n === 1 ? '1girl' : `${n}people`);
}

function qualityTail(state: StudioState): string {
  if (!state.main.quality) return '';
  const model = state.gen.model || '';
  const key = Object.keys(QUALITY_TAGS).find((k) => model.toLowerCase().includes(k.replace('naid', '')))
    || (model.includes('nai-diffusion-4-5') || model.includes('4.5') ? 'naid4.5f' : '')
    || (model.includes('nai-diffusion-4') ? 'naid4f' : 'naid5f');
  return String(QUALITY_TAGS[key] || QUALITY_TAGS.naid5f || '').replace(/^,/, '').trim();
}

export function assemble(state: StudioState, roster: CharacterInput[]): Assembled {
  const quality = qualityTail(state);
  const main = joinTags(personTag(state), state.main.presetPrompt, state.main.post, quality);
  const chars = charList(state).map((c) => {
    if (state.comic) {
      const prompt = joinTags(c.tags, c.post) || 'girl';
      return {
        no: c.i + 1,
        name: '',
        prompt,
        uc: c.uc,
        center_x: c.x,
        center_y: c.y,
        slim: { ...c.slim, center_x: c.x, center_y: c.y },
      };
    }
    const stored = c.charName ? resolveCharacter(c.charName, roster) : null;
    const look = composeCharacterCaptionTags(stored, { costume: c.costume || c.costumeName });
    const prompt = joinTags(look || c.tags || c.costumeTags, c.post) || 'girl';
    return {
      no: c.i + 1,
      name: c.charName || '',
      prompt,
      uc: c.uc,
      center_x: c.x,
      center_y: c.y,
      slim: {
        ...c.slim,
        name: c.charName || undefined,
        costume: c.costume || c.costumeName || undefined,
        action: c.post || undefined,
        center_x: c.x,
        center_y: c.y,
      },
    };
  }).filter((c) => c.prompt);
  return { main, neg: state.main.neg, chars };
}

export function assembleOverrides(state: StudioState, roster: CharacterInput[]): Record<string, unknown> {
  const a = assemble(state, roster);
  return {
    main_prompt: a.main,
    negative_prompt: a.neg,
    characters: a.chars.map((c) => ({
      name: state.comic ? '' : c.name,
      prompt: c.prompt,
      uc: c.uc,
      center_x: state.coordMode === 'ai' ? undefined : c.center_x,
      center_y: state.coordMode === 'ai' ? undefined : c.center_y,
      ...(state.comic ? {} : c.slim),
    })),
    seed: state.gen.seedLock && state.gen.seed > 0 ? state.gen.seed : undefined,
  };
}

let seq = 0;
export function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}${seq}`;
}

export function hydrateFromNai(args: {
  state: StudioState;
  nai: Record<string, unknown>;
  settings: Record<string, unknown>;
  rosterPayload: Record<string, unknown>;
  card: Record<string, unknown>;
}): void {
  const { state, nai, settings, rosterPayload, card } = args;
  const cardCfg = asRecord(settings.card);
  const presets = Array.isArray(cardCfg.presets) ? cardCfg.presets : [];
  const roster = rosterList(rosterPayload);
  const mainText = cleanText(nai.main_prompt, 8000);
  const peeled = peelMain(mainText, presets as Array<{ id?: unknown; name?: unknown; positive?: unknown; negative?: unknown }>);
  const hit = presets.find((p) => p && typeof p === 'object' && cleanText((p as Record<string, unknown>).id, 120) === peeled.preset.id) as Record<string, unknown> | undefined;
  state.main.presetId = peeled.preset.id;
  state.main.presetName = peeled.preset.name || cleanText(hit?.name, 200);
  state.main.presetPrompt = peeled.preset.positive || cleanText(hit?.positive, 8000);
  state.main.post = peeled.post;
  state.main.neg = peeled.preset.negative || cleanText(nai.negative_prompt, 8000);
  state.main.autoPerson = Boolean(peeled.person);
  state.main.personMode = peeled.personMode || '';
  state.main.personWeight = peeled.personWeight;
  state.main.personSolo = peeled.personSolo;
  state.main.quality = peeled.quality;

  const kind = cleanText(card.kind || asRecord(card.meta).kind, 20);
  state.comic = kind === 'comic';

  const rawChars = Array.isArray(nai.characters) ? nai.characters : [];
  state.chars = {};
  state.tabs = [
    { id: 'main', kind: 'main', label: 'main' },
    { id: 'llm', kind: 'llm', label: 'LLM 명령수정' },
  ];
  rawChars.slice(0, 6).forEach((raw, i) => {
    const ch = asRecord(raw);
    const id = nextId('c');
    const slot = CHAR_SLOTS[i] || [0.5, 0.5];
    const name = state.comic ? '' : cleanText(ch.name, 200);
    const stored = name ? resolveCharacter(name, roster) : null;
    const costumePick = ch.costume ?? asRecord(ch.raw).costume;
    const look = stored ? composeCharacterCaptionTags(stored, { costume: costumePick }) : '';
    const post = state.comic
      ? ''
      : resolveCharPost({ slim: ch, caption: ch.prompt, lookTags: look });
    const caption = cleanText(ch.prompt, 4000);
    const costumes = Array.isArray(stored?.costumes) ? stored.costumes : [];
    const cos = costumes.find((c) => cleanText(c.name, 200) === cleanText(costumePick, 200))
      || costumes[0];
    state.chars[id] = {
      rosterId: cleanText(stored?.id || stored?.name, 80),
      charName: name,
      costume: cleanText(cos?.name || costumePick, 200),
      costumeName: cleanText(cos?.name || costumePick, 200),
      costumeTags: cleanText(cos?.attire, 4000),
      costumeNote: cleanText(cos?.note, 400),
      tags: state.comic ? caption : (cleanText(stored?.appearance, 4000) || look),
      post: state.comic ? '' : post,
      uc: cleanText(ch.uc, 2000),
      x: Number(ch.center_x ?? slot[0]),
      y: Number(ch.center_y ?? slot[1]),
      auto: false,
      lock: false,
      slim: ch,
    };
    state.tabs.push({
      id,
      kind: 'char',
      label: state.comic ? `C${i + 1}` : `C${i + 1}${name ? ` ${name}` : ''}`,
    });
  });
  state.selChar = state.tabs.find((t) => t.kind === 'char')?.id || '';
  if (!state.comic && !rawChars.length) {
    /* illustration with no slots stays on main */
  }
}

export function mergedRoster(payload: Record<string, unknown>): CharacterInput[] {
  return rosterList(payload);
}

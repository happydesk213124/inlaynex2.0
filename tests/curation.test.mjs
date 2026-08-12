import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCurationTagsToShot,
  applyPerActorOptionIds,
  castForRefinePayload,
  catalogHasPresets,
  catalogSha,
  clampOptionIdsByLanes,
  countCatalogOptions,
  curationGroupsSystemMessage,
  curationPass2ContextRules,
  curationRefineSystemMessage,
  defaultCurationCatalog,
  inferCurationSlot,
  isContinuityGroup,
  maidPromptToBySlot,
  maidPromptToTags,
  matchLanePattern,
  nonContinuityGroups,
  normalizeCurationCatalog,
  parseOptionIdList,
  parsePerActorOptionIds,
  slotFromMaidPath,
  splitTagsFromOptionIds,
  tagsFromOptionIds,
  MAX_OPTIONS_PER_GROUP,
  MAX_OPTIONS_PER_GROUP_IMPORT,
} from '../.test-build/curation-catalog.mjs';
import {
  continuityBindingsForChain,
  curationPresetRefineSystemMessage,
  curationPresetsSystemMessage,
  listPresetLeaves,
  normalizeShotPresetFields,
  resolveMaidPresetSelection,
  resolvePresetChain,
} from '../.test-build/curation-presets.mjs';
import { cosineSimilarity, matchNearest, snapSceneTokens, splitSceneTagUnits } from '../.test-build/curation-match.mjs';
import {
  focusBandsForShots,
  focusFieldsForShots,
  percentSpanToOffsets,
  sliceChatFocusHint,
} from '../.test-build/curation-focus.mjs';
import { normalizeCurationMode } from '../.test-build/settings-schema.mjs';
import {
  defaultEndpointForEmbedding,
  defaultModelForEmbedding,
  shouldAutoReplaceEmbeddingEndpoint,
  shouldAutoReplaceEmbeddingModel,
} from '../.test-build/embedding-client.mjs';

test('default catalog loads with ≤10 options per group', () => {
  const cat = defaultCurationCatalog();
  assert.ok(cat.groups.length >= 3);
  for (const g of cat.groups) {
    assert.ok(g.options.length <= MAX_OPTIONS_PER_GROUP, g.id);
    assert.ok(g.options.length > 0);
  }
  assert.ok(catalogSha(cat));
  assert.ok(countCatalogOptions(cat) > 10);
});

test('normalizeCurationCatalog caps options on import', () => {
  const cat = normalizeCurationCatalog({
    name: 't',
    groups: [
      {
        id: 'g1',
        label: 'G',
        options: Array.from({ length: MAX_OPTIONS_PER_GROUP_IMPORT + 5 }, (_, i) => ({
          id: `o${i}`,
          description: `d${i}`,
          tags: `tag ${i}`,
        })),
      },
    ],
  });
  assert.equal(cat.groups[0].options.length, MAX_OPTIONS_PER_GROUP_IMPORT);
  assert.ok(MAX_OPTIONS_PER_GROUP_IMPORT >= MAX_OPTIONS_PER_GROUP);
});

test('maidPromptToTags converts weight pairs', () => {
  assert.equal(maidPromptToTags([[2, 'from side'], [2, 'facing away']]), '2::from side::, 2::facing away::');
  assert.equal(maidPromptToTags([]), '');
  assert.equal(maidPromptToTags('cowboy shot'), 'cowboy shot');
});

test('maidPromptToBySlot skips global.composition person-count', () => {
  const slots = maidPromptToBySlot({
    'global.composition': [[3, '1girl, 1boy']],
    'global.camera.view': [[2, 'from side']],
    'female.orientation.body': [[2, 'facing another']],
  });
  assert.equal(slots.base || '', '2::from side::');
  assert.doesNotMatch(slots.base || '', /1girl/);
  assert.match(slots.female || '', /facing another/);
});

test('NovelAI modifier_library imports as groups', () => {
  const cat = normalizeCurationCatalog({
    version: 6,
    modifier_library: [
      {
        id: 'camera.view',
        description: '카메라',
        options: [
          { id: 'default', description: '기본', prompt: [] },
          { id: 'from_side', description: '옆', prompt: [[2, 'from side']] },
          { id: 'from_behind', description: '뒤', prompt: [[2, 'from behind'], [2, 'facing away']] },
        ],
      },
      {
        id: 'pose.hands',
        description: '손',
        options: [
          { id: 'holding_hands', description: '손잡기', prompt: [[2, 'holding hands']] },
        ],
      },
    ],
  });
  assert.equal(cat.name, 'NovelAI catalog');
  assert.equal(cat.groups.length, 2);
  assert.equal(cat.groups[0].id, 'camera.view');
  // empty prompt option skipped
  assert.equal(cat.groups[0].options.length, 2);
  assert.equal(cat.groups[0].options[0].id, 'from_side');
  assert.equal(cat.groups[0].options[0].tags, '2::from side::');
  assert.match(cat.groups[0].options[1].tags, /from behind/);
  assert.equal(catalogHasPresets(cat), false);
});

test('NovelAI presets tree is preserved on import', () => {
  const cat = normalizeCurationCatalog({
    version: 6,
    modifier_library: [
      {
        id: 'interaction.general',
        description: '상호작용',
        options: [
          { id: 'hug_from_behind', description: '뒤에서 안기', prompt: [[2, 'hug from behind']] },
          { id: 'hug', description: '안기', prompt: [[2, 'hug']] },
        ],
      },
      {
        id: 'camera.view',
        description: '카메라',
        options: [
          { id: 'from_side', description: '옆', prompt: [[2, 'from side']] },
        ],
      },
    ],
    presets: {
      id: 'preset',
      type: 'root',
      children: [
        {
          id: '1girl_1boy',
          type: 'composition',
          prompt: { 'global.composition': [[3, '1girl, 1boy']] },
          children: [
            {
              id: 'general',
              type: 'category',
              prompt: {},
              children: [
                {
                  id: 'male_behind_female',
                  type: 'position',
                  description: '남이 여 뒤',
                  when_to_use: ['남성이 여성 뒤에 있을 때'],
                  prompt: {
                    'female.relation.depth': [[-1, 'behind another']],
                    'male.relation.depth': [[2, 'behind another']],
                  },
                  modifiers: [
                    {
                      ref: 'interaction.general',
                      include_options: ['hug_from_behind', 'hug'],
                      replace: true,
                      action: {
                        include_options: ['hug_from_behind'],
                        source: 'male',
                        target: 'female',
                      },
                    },
                  ],
                  variants: [
                    {
                      id: 'from_side',
                      prompt: {
                        'global.camera.view': [[2, 'from side'], [2, 'side-by-side']],
                      },
                    },
                  ],
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  });
  assert.equal(cat.has_presets, true);
  assert.ok(cat.presets);
  assert.equal(catalogHasPresets(cat), true);
});

test('resolveMaidPresetSelection routes path prompts to female/male/base', () => {
  const cat = normalizeCurationCatalog({
    version: 6,
    modifier_library: [
      {
        id: 'interaction.general',
        description: '상호작용',
        options: [
          { id: 'hug_from_behind', description: '뒤에서 안기', prompt: [[2, 'hug from behind']] },
        ],
      },
    ],
    presets: {
      id: 'preset',
      children: [
        {
          id: '1girl_1boy',
          type: 'composition',
          prompt: { 'global.composition': [[3, '1girl, 1boy']] },
          children: [
            {
              id: 'general',
              type: 'category',
              children: [
                {
                  id: 'male_behind_female',
                  type: 'position',
                  prompt: {
                    'female.relation.depth': [[-1, 'behind another']],
                    'male.relation.depth': [[2, 'behind another']],
                  },
                  modifiers: [
                    {
                      ref: 'interaction.general',
                      include_options: ['hug_from_behind'],
                      action: { source: 'male', target: 'female' },
                    },
                  ],
                  variants: [
                    {
                      id: 'from_side',
                      prompt: {
                        'global.camera.view': [[2, 'from side'], [2, 'side-by-side']],
                      },
                    },
                  ],
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  });

  const leaves = listPresetLeaves(cat);
  assert.ok(leaves.some((l) => l.id === 'male_behind_female'));

  const split = resolveMaidPresetSelection(cat, {
    composition_id: 'male_behind_female',
    composition_variant: 'from_side',
    curation_option_ids: ['hug_from_behind'],
  });
  assert.ok(split);
  // Inlay owns person-count tags — Maid global.composition is skipped
  assert.doesNotMatch(split.base || '', /1girl/);
  assert.doesNotMatch(split.base || '', /1boy/);
  assert.match(split.base, /from side/);
  assert.match(split.base, /side-by-side/);
  assert.match(split.female || '', /behind another/);
  assert.match(split.male || '', /behind another/);
  assert.match(split.male || '', /hug from behind/);
  assert.match(split.female || '', /hug from behind/);
  // Must NOT dump actor pose into base via group heuristic
  assert.doesNotMatch(split.base, /hug from behind/);
  assert.doesNotMatch(split.base, /behind another/);

  const shot = {
    camera: '',
    characters: [
      { name: 'A', gender: 'girl', action: '' },
      { name: 'B', gender: 'boy', action: '' },
    ],
  };
  applyCurationTagsToShot(shot, split);
  assert.match(String(shot.camera), /from side/);
  assert.match(String(shot.characters[0].action), /behind another/);
  assert.match(String(shot.characters[0].action), /hug from behind/);
  assert.match(String(shot.characters[1].action), /behind another/);
  assert.match(String(shot.characters[1].action), /hug from behind/);
});

test('flat interaction options land on char not base', () => {
  const cat = normalizeCurationCatalog({
    version: 1,
    global: { fixed_positive: '-3::grid, multiple views, zoom layer::' },
    modifier_library: [
      {
        id: 'interaction.general',
        options: [{ id: 'hug', description: '안기', prompt: [[2, 'hug']] }],
      },
    ],
    presets: {
      id: 'preset',
      children: [
        {
          id: '1girl_1boy',
          type: 'composition',
          prompt: { 'global.composition': [[3, '1girl, 1boy']] },
          children: [
            {
              id: 'general',
              type: 'category',
              children: [
                {
                  id: 'facing_each_other',
                  type: 'position',
                  prompt: {
                    'female.orientation.body': [[2, 'facing another']],
                    'male.orientation.body': [[2, 'facing another']],
                  },
                  modifiers: [{ ref: 'interaction.general', include_options: ['hug'] }],
                  variants: [
                    {
                      id: 'pov_hands',
                      prompt: { 'global.camera.view': [[2, 'pov'], [2, 'pov hands']] },
                      modifier_filter: {
                        deny: {
                          'global.interaction.general': ['hug', 'arm_around_waist'],
                        },
                      },
                    },
                    {
                      id: 'from_side',
                      prompt: { 'global.camera.view': [[2, 'from side']] },
                    },
                  ],
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  });
  assert.match(cat.fixed_positive || '', /grid/);

  const ok = resolveMaidPresetSelection(cat, {
    composition_id: 'facing_each_other',
    composition_variant: 'from_side',
    curation_option_ids: ['hug'],
  });
  assert.ok(ok);
  assert.doesNotMatch(ok.base, /hug/);
  assert.match(ok.char || '', /hug/);
  assert.match(ok.female || '', /facing another/);

  const denied = resolveMaidPresetSelection(cat, {
    composition_id: 'facing_each_other',
    composition_variant: 'pov_hands',
    curation_option_ids: ['hug'],
  });
  assert.ok(denied);
  assert.doesNotMatch(denied.char || '', /hug/);
  assert.doesNotMatch(denied.base, /hug/);
  assert.match(denied.base, /pov/);
});

test('matchLanePattern and clampOptionIdsByLanes keep one manual group', () => {
  assert.equal(matchLanePattern('manual.sexual.*', 'manual.sexual.handjob'), true);
  assert.equal(matchLanePattern('manual.arm_pose', 'manual.arm_pose'), true);
  assert.equal(matchLanePattern('manual.arm_pose', 'manual.partner_contact.x'), false);

  const cat = normalizeCurationCatalog({
    version: 1,
    modifier_lanes: {
      manual: {
        max_active_groups: 1,
        fallback_order: [
          'manual.sexual.*',
          'manual.partner_contact.*',
          'manual.arm_pose',
        ],
      },
    },
    modifier_library: [
      {
        id: 'manual.arm_pose',
        options: [{ id: 'arm_up', prompt: [[2, 'arm up']] }],
      },
      {
        id: 'manual.partner_contact.female_to_male',
        options: [{ id: 'hand_on_chest', prompt: [[2, 'hand on another\'s chest']] }],
      },
      {
        id: 'expression.general',
        options: [{ id: 'smile', prompt: [[1, 'smile']] }],
      },
    ],
  });
  assert.ok(cat.modifier_lanes?.manual);
  const kept = clampOptionIdsByLanes(cat, ['arm_up', 'hand_on_chest', 'smile']);
  // partner_contact outranks arm_pose → drop arm_up; smile unaffected
  assert.deepEqual(kept.sort(), ['hand_on_chest', 'smile'].sort());
});

test('normalizeShotPresetFields accepts alias keys', () => {
  const shot = { preset_id: 'male_behind_female', selected_variant_id: 'from_side' };
  assert.equal(normalizeShotPresetFields(shot), true);
  assert.equal(shot.composition_id, 'male_behind_female');
  assert.equal(shot.composition_variant, 'from_side');
});

test('normalizeShotPresetFields parses catalog path strings', () => {
  const shot = {
    composition_id: '1girl_1boy / general / facing_each_other',
    composition_variant: 'from_side',
  };
  assert.equal(normalizeShotPresetFields(shot), true);
  assert.equal(shot.composition_id, 'facing_each_other');
  assert.deepEqual(shot.preset_path, ['1girl_1boy', 'general', 'facing_each_other']);
});

test('curationPresetsSystemMessage includes Maid analyzer actor rules', () => {
  const cat = normalizeCurationCatalog({
    version: 1,
    modifier_library: [
      { id: 'camera.view', options: [{ id: 'from_side', prompt: [[2, 'from side']] }] },
      {
        id: 'interaction.partner.mouth_contact',
        options: [{ id: 'licking_ear', description: 'ear', prompt: [[2, 'licking ear']] }],
      },
      {
        id: 'interaction.general',
        options: [{ id: 'hug', description: 'hug', prompt: [[2, 'hug']] }],
      },
    ],
    presets: {
      id: 'preset',
      children: [
        {
          id: '1girl_1boy',
          type: 'composition',
          children: [
            {
              id: 'general',
              type: 'category',
              children: [
                {
                  id: 'facing_each_other',
                  type: 'position',
                  when_to_use: ['마주 볼 때'],
                  avoid_when: ['뒤에서 안을 때'],
                  modifiers: [{ ref: 'interaction.general', include_options: ['hug'] }],
                  variants: [{ id: 'from_side', prompt: { 'global.camera.view': [[2, 'from side']] } }],
                  children: [],
                },
              ],
            },
            {
              id: 'foreplay',
              type: 'category',
              children: [
                {
                  id: 'face_to_face_upright',
                  type: 'position',
                  when_to_use: ['상체 세워 마주볼 때'],
                  modifiers: [
                    {
                      ref: 'interaction.partner.mouth_contact',
                      include_options: ['licking_ear'],
                    },
                  ],
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  });
  const msg = curationPresetsSystemMessage(cat);
  assert.match(msg, /1girl_1boy/);
  assert.match(msg, /when:/);
  assert.match(msg, /facing_each_other/);
  assert.match(msg, /face_to_face_upright/);
  assert.match(msg, /Do NOT drop a visible partner/);
  assert.match(msg, /selection_modifiers:/);
  assert.match(msg, /interaction\.partner\.mouth_contact/);
  assert.match(msg, /interaction\.general/);
  assert.match(msg, /category: foreplay/);
  // Catalog lines carry group ids only — option ids must not appear as leaf fields.
  assert.match(msg, /selection_modifiers: interaction\.partner\.mouth_contact/);
  assert.doesNotMatch(msg, /selection_modifiers:[^\n]*licking_ear/);
  assert.match(msg, /do NOT pick a `general` leaf/);
});

test('listPresetLeaves exposes category and selectionModifiers', () => {
  const cat = normalizeCurationCatalog({
    version: 1,
    modifier_library: [
      { id: 'interaction.partner.mouth_contact', options: [{ id: 'licking_ear', prompt: [[2, 'licking ear']] }] },
    ],
    presets: {
      id: 'preset',
      children: [
        {
          id: '1girl_1boy',
          type: 'composition',
          children: [
            {
              id: 'foreplay',
              type: 'category',
              children: [
                {
                  id: 'face_to_face_upright',
                  type: 'position',
                  modifiers: [{ ref: 'interaction.partner.mouth_contact' }],
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  });
  const leaves = listPresetLeaves(cat);
  assert.equal(leaves.length, 1);
  assert.equal(leaves[0].id, 'face_to_face_upright');
  assert.equal(leaves[0].category, 'foreplay');
  assert.deepEqual(leaves[0].selectionModifiers, ['interaction.partner.mouth_contact']);
});
test('tagsFromOptionIds assembles local tags', () => {
  const cat = defaultCurationCatalog();
  const tags = tagsFromOptionIds(cat, ['cowboy_shot', 'smile']);
  assert.match(tags, /cowboy shot/);
  assert.match(tags, /smile/);
});

test('inferCurationSlot maps groups to base vs char', () => {
  assert.equal(inferCurationSlot('camera.framing'), 'base');
  assert.equal(inferCurationSlot('place.indoor'), 'base');
  assert.equal(inferCurationSlot('composition.solo'), 'base');
  assert.equal(inferCurationSlot('composition.duo'), 'char');
  assert.equal(inferCurationSlot('pose.hands'), 'char');
  assert.equal(inferCurationSlot('expression.basic'), 'char');
  assert.equal(inferCurationSlot('interaction.general'), 'char');
  assert.equal(inferCurationSlot('manual.arm_pose'), 'char');
  assert.equal(inferCurationSlot('scene.location'), 'base');
  assert.equal(inferCurationSlot('pose.hands', 'base'), 'base');
  assert.equal(inferCurationSlot('camera.view', 'char'), 'char');
});

test('splitTagsFromOptionIds separates base and actor slots', () => {
  const cat = defaultCurationCatalog();
  const { base, char, female, male } = splitTagsFromOptionIds(cat, [
    'cowboy_shot',
    'facing_each_other',
    'smile',
    'bedroom',
  ]);
  assert.match(base, /cowboy shot/);
  assert.match(base, /bedroom/);
  assert.doesNotMatch(base, /smile/);
  assert.match([char, female, male].filter(Boolean).join(', '), /facing another/);
  assert.match(splitTagsFromOptionIds(cat, ['smile']).char, /smile/);
});

test('applyCurationTagsToShot routes female/male by gender', () => {
  const shot = {
    camera: '',
    characters: [
      { name: 'A', gender: 'girl', action: '' },
      { name: 'B', gender: 'boy', action: '' },
    ],
  };
  applyCurationTagsToShot(shot, {
    base: 'cowboy shot',
    female: 'facing another',
    male: 'facing another',
    primary: 'blush',
  });
  assert.equal(shot.camera, 'cowboy shot');
  assert.match(String(shot.characters[0].action), /facing another/);
  assert.match(String(shot.characters[0].action), /blush/);
  assert.match(String(shot.characters[1].action), /facing another/);
  assert.doesNotMatch(String(shot.characters[1].action), /blush/);
});

test('applyCurationTagsToShot puts char tags on every characters[].action', () => {
  const shot = {
    camera: 'old cam',
    situation: 'old sit',
    place: 'old place',
    action: 'old shot action',
    characters: [
      { name: 'A', appearance: 'black hair', action: 'standing' },
      { name: 'B', appearance: 'brown hair', action: '' },
    ],
  };
  applyCurationTagsToShot(shot, { base: 'cowboy shot, bedroom', char: 'facing another, smile' }, {
    place: 'indoors',
  });
  assert.equal(shot.camera, 'cowboy shot, bedroom');
  assert.equal(shot.place, 'indoors');
  assert.equal(shot.situation, '');
  assert.equal(shot.action, '');
  assert.match(String(shot.characters[0].action), /standing/);
  assert.match(String(shot.characters[0].action), /facing another/);
  assert.match(String(shot.characters[0].action), /smile/);
  assert.match(String(shot.characters[1].action), /facing another/);
});

test('applyCurationTagsToShot keeps char tags on shot.action when no characters', () => {
  const shot = { camera: '', characters: [] };
  applyCurationTagsToShot(shot, { base: 'from side', char: 'blush' });
  assert.equal(shot.camera, 'from side');
  assert.equal(shot.action, 'blush');
});

test('maid path prompt maps to by_slot', () => {
  assert.equal(slotFromMaidPath('female.orientation.body'), 'female');
  assert.equal(slotFromMaidPath('global.camera.view'), 'base');
  const by = maidPromptToBySlot({
    'female.orientation.body': [[2, 'facing another']],
    'male.orientation.body': [[2, 'facing another']],
    'global.camera.view': [[2, 'from side']],
  });
  assert.match(by.female || '', /facing another/);
  assert.match(by.male || '', /facing another/);
  assert.match(by.base || '', /from side/);
});

test('normalizeCurationMode migrates legacy values', () => {
  assert.equal(normalizeCurationMode('off'), 'off');
  assert.equal(normalizeCurationMode('two_stage'), 'two_stage');
  assert.equal(normalizeCurationMode('embed_snap'), 'embed_snap');
  assert.equal(normalizeCurationMode(true), 'two_stage');
  assert.equal(normalizeCurationMode('full'), 'two_stage');
  assert.equal(normalizeCurationMode('nope'), 'off');
});

test('cosine + matchNearest prefers group and minScore', () => {
  const items = [
    { key: 'a', groupId: 'g1', optionId: 'x', tags: 'alpha', vector: [1, 0] },
    { key: 'b', groupId: 'g2', optionId: 'y', tags: 'beta', vector: [0.9, 0.1] },
  ];
  const hit = matchNearest([1, 0], items, { groupId: 'g2', minScore: 0.5 });
  assert.equal(hit?.optionId, 'y');
  assert.ok(cosineSimilarity([1, 0], [1, 0]) > 0.99);
});

test('snapSceneTokens replaces only when vector matches', () => {
  const items = [
    { key: 'a', groupId: 'pose.hands', optionId: 'hand', tags: '2::hand in panties::', slot: 'char', vector: [1, 0, 0] },
  ];
  const { tags, baseTags, charTags, snapped, kept } = snapSceneTokens(
    ['hand in panty', 'unknown pose'],
    [[1, 0, 0], null],
    items,
    0.5,
  );
  assert.equal(snapped, 1);
  assert.equal(kept, 1);
  assert.equal(tags[0], '2::hand in panties::');
  assert.equal(tags[1], 'unknown pose');
  assert.equal(charTags.join(', '), '2::hand in panties::');
  assert.equal(baseTags.join(', '), 'unknown pose');
});

test('splitSceneTagUnits keeps weight blocks', () => {
  const units = splitSceneTagUnits('cowboy shot, 2::facing another::, smile');
  assert.equal(units.length, 3);
  assert.equal(units[1], '2::facing another::');
});

test('normalizeCurationCatalog preserves Maid subjects/selection/prompt_order and continuity flags', () => {
  const cat = normalizeCurationCatalog({
    version: 6,
    subjects: { primary: { role: 'female' }, secondary: { role: 'male' } },
    selection: { max_picks: 3 },
    global: { prompt_order: ['global', 'primary', 'secondary'] },
    modifier_library: [
      { id: 'wear_state', continuity: true, options: [{ id: 'torn', prompt: [[2, 'torn clothes']] }] },
      { id: 'expression.general', options: [{ id: 'smile', prompt: [[1, 'smile']] }] },
    ],
  });
  assert.deepEqual(cat.subjects, { primary: { role: 'female' }, secondary: { role: 'male' } });
  assert.deepEqual(cat.selection, { max_picks: 3 });
  assert.deepEqual(cat.prompt_order, ['global', 'primary', 'secondary']);
  assert.equal(cat.groups.find((g) => g.id === 'wear_state').continuity, true);
  assert.ok(cat.continuity_group_ids.includes('wear_state'));
  assert.equal(isContinuityGroup(cat, 'wear_state'), true);
  assert.equal(isContinuityGroup(cat, 'expression.general'), false);
});

test('normalizeCurationCatalog also accepts a root-level continuity id list', () => {
  const cat = normalizeCurationCatalog({
    version: 1,
    continuity: ['wear_state'],
    modifier_library: [
      { id: 'wear_state', options: [{ id: 'torn', prompt: [[2, 'torn clothes']] }] },
    ],
  });
  assert.equal(isContinuityGroup(cat, 'wear_state'), true);
});

test('nonContinuityGroups drops continuity groups; pass-1/2 messages never mention them', () => {
  const cat = normalizeCurationCatalog({
    version: 1,
    modifier_library: [
      { id: 'wear_state', continuity: true, options: [{ id: 'torn', description: 'torn', prompt: [[2, 'torn clothes']] }] },
      { id: 'expression.general', options: [{ id: 'smile', description: 'smile', prompt: [[1, 'smile']] }] },
    ],
  });
  assert.deepEqual(nonContinuityGroups(cat).map((g) => g.id), ['expression.general']);
  const pass1 = curationGroupsSystemMessage(cat);
  assert.doesNotMatch(pass1, /wear_state/);
  assert.match(pass1, /expression\.general/);
  const pass2 = curationRefineSystemMessage(cat, ['wear_state', 'expression.general']);
  assert.doesNotMatch(pass2, /torn/);
  assert.match(pass2, /smile/);
});

test('curationGroupsSystemMessage / curationRefineSystemMessage branch on strict_ids', () => {
  const cat = defaultCurationCatalog();
  const loose = curationGroupsSystemMessage(cat, false);
  const strict = curationGroupsSystemMessage(cat, true);
  assert.doesNotMatch(loose, /STRICT catalog-id mode/);
  assert.match(strict, /STRICT catalog-id mode/);
  assert.match(strict, /characters\[\]\.action.*EMPTY|EMPTY.*characters/s);

  const refineLoose = curationRefineSystemMessage(cat, ['camera.framing'], { strictIds: false });
  const refineStrict = curationRefineSystemMessage(cat, ['camera.framing'], { strictIds: true });
  assert.doesNotMatch(refineLoose, /"characters":/);
  assert.match(refineStrict, /"characters":/);
  assert.match(refineStrict, /index/);
});

test('tagsFromOptionIds follows Maid prompt_order when present', () => {
  const cat = normalizeCurationCatalog({
    version: 1,
    global: { prompt_order: ['primary', 'global'] },
    modifier_library: [
      { id: 'camera.view', options: [{ id: 'from_side', prompt: [[2, 'from side']] }] },
      { id: 'pose.hands', options: [{ id: 'wave', by_slot: { primary: 'waving' } }] },
    ],
  });
  const tags = tagsFromOptionIds(cat, ['from_side', 'wave']);
  // primary-slot tag ("waving") must precede the base/global tag ("from side").
  assert.ok(tags.indexOf('waving') < tags.indexOf('from side'));
});

test('parsePerActorOptionIds accepts {index, option_ids} rows and ignores malformed entries', () => {
  const rows = parsePerActorOptionIds([
    { index: 0, option_ids: ['a', 'b'] },
    { index: 1, ids: ['c'] },
    { index: -1, option_ids: ['x'] },
    'nope',
    { option_ids: ['no-index'] },
  ]);
  assert.deepEqual(rows, [
    { index: 0, option_ids: ['a', 'b'] },
    { index: 1, option_ids: ['c'] },
  ]);
});

test('castForRefinePayload exposes index/name/gender for pass-2', () => {
  const cast = castForRefinePayload({
    characters: [
      { name: '보민', gender: 'boy', appearance: 'boy, short hair' },
      { name: 'Serin', gender: 'girl', appearance: 'girl, long hair' },
      { name: '???', appearance: '' },
    ],
  });
  assert.deepEqual(cast, [
    { index: 0, name: '보민', gender: 'boy' },
    { index: 1, name: 'Serin', gender: 'girl' },
    { index: 2, name: '???', gender: '' },
  ]);
  assert.deepEqual(castForRefinePayload({}), []);
});

test('applyPerActorOptionIds appends to that actor action only, never appearance/attire', () => {
  const cat = defaultCurationCatalog();
  const shot = {
    characters: [
      { name: 'A', appearance: 'black hair', attire: 'red dress', action: 'standing' },
      { name: 'B', appearance: 'brown hair', attire: 'suit', action: '' },
    ],
  };
  applyPerActorOptionIds(
    shot,
    [
      { index: 0, option_ids: ['smile'] },
      { index: 1, option_ids: ['blush'] },
      { index: 9, option_ids: ['smile'] }, // out of range, ignored
    ],
    cat,
  );
  assert.match(shot.characters[0].action, /standing/);
  assert.match(shot.characters[0].action, /smile/);
  assert.equal(shot.characters[0].appearance, 'black hair');
  assert.equal(shot.characters[0].attire, 'red dress');
  assert.match(shot.characters[1].action, /blush/);
  assert.equal(shot.characters[1].appearance, 'brown hair');
  assert.equal(shot.characters[1].attire, 'suit');
});

test('parseOptionIdList dedupes and accepts arrays or comma strings', () => {
  assert.deepEqual(parseOptionIdList(['a', 'b', 'a']), ['a', 'b']);
  assert.deepEqual(parseOptionIdList('a, b ,a'), ['a', 'b']);
  assert.deepEqual(parseOptionIdList(null), []);
});

test('curationPresetsSystemMessage / curationPresetRefineSystemMessage branch on strict_ids', () => {
  const cat = normalizeCurationCatalog({
    version: 1,
    modifier_library: [
      { id: 'interaction.general', options: [{ id: 'hug', description: 'hug', prompt: [[2, 'hug']] }] },
    ],
    presets: {
      id: 'preset',
      children: [
        {
          id: '1girl_1boy',
          type: 'composition',
          children: [
            {
              id: 'general',
              type: 'category',
              children: [
                {
                  id: 'facing_each_other',
                  type: 'position',
                  modifiers: [{ ref: 'interaction.general', include_options: ['hug'] }],
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  });
  const pass1Loose = curationPresetsSystemMessage(cat, false);
  const pass1Strict = curationPresetsSystemMessage(cat, true);
  assert.doesNotMatch(pass1Loose, /STRICT catalog-id mode/);
  assert.match(pass1Strict, /STRICT catalog-id mode/);

  const chain = resolvePresetChain(cat, { composition_id: 'facing_each_other' });
  const pass2Loose = curationPresetRefineSystemMessage(cat, [chain]);
  const pass2Strict = curationPresetRefineSystemMessage(cat, [chain], { strictIds: true });
  assert.doesNotMatch(pass2Loose, /"characters":/);
  assert.match(pass2Strict, /"characters":/);
  assert.match(pass2Strict, /cast/);
  assert.match(pass2Strict, /use name\+gender from `cast`/);
});

test('resolveMaidPresetSelection orders assembled tags by modifier binding order', () => {
  const cat = normalizeCurationCatalog({
    version: 1,
    modifier_library: [
      { id: 'a.group', options: [{ id: 'a1', prompt: [[1, 'alpha tag']] }] },
      { id: 'b.group', options: [{ id: 'b1', prompt: [[1, 'beta tag']] }] },
    ],
    presets: {
      id: 'preset',
      children: [
        {
          id: 'solo',
          type: 'composition',
          children: [
            {
              id: 'general',
              type: 'category',
              children: [
                {
                  id: 'leaf',
                  type: 'position',
                  modifiers: [
                    { ref: 'b.group', order: 0 },
                    { ref: 'a.group', order: 1 },
                  ],
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  });
  const split = resolveMaidPresetSelection(cat, {
    composition_id: 'leaf',
    curation_option_ids: ['a1', 'b1'],
  });
  // b.group has the lower `order`, so its tag must come first despite being
  // picked second in curation_option_ids.
  assert.ok(split.base.indexOf('beta tag') < split.base.indexOf('alpha tag'));
});

test('resolveMaidPresetSelection extra.optionIds/bindings carry a continuity pick onto a later shot', () => {
  const cat = normalizeCurationCatalog({
    version: 1,
    modifier_library: [
      { id: 'wear_state', continuity: true, options: [{ id: 'torn', prompt: [[2, 'torn shirt']] }] },
    ],
    presets: {
      id: 'preset',
      children: [
        {
          id: 'solo',
          type: 'composition',
          children: [
            {
              id: 'general',
              type: 'category',
              children: [
                {
                  id: 'leaf_a',
                  type: 'position',
                  modifiers: [{ ref: 'wear_state', include_options: ['torn'], action: { target: 'female' } }],
                  children: [],
                },
                {
                  id: 'leaf_b',
                  // No wear_state binding on this leaf at all.
                  type: 'position',
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
  });
  // leaf_a's chain declares the wear_state binding — this is what a caller
  // (services/curation.ts) reads to know "the tree forces this pick here".
  const chainA = resolvePresetChain(cat, { composition_id: 'leaf_a' });
  const bindingsA = continuityBindingsForChain(cat, chainA);
  assert.equal(bindingsA.length, 1);
  assert.equal(bindingsA[0].ref, 'wear_state');
  assert.deepEqual(bindingsA[0].include_options, ['torn']);

  // Feeding that binding's ids in (as the service does, via curation_option_ids
  // or extra) resolves it onto `female` per the binding's action.target.
  const shotA = resolveMaidPresetSelection(cat, {
    composition_id: 'leaf_a',
    curation_option_ids: ['torn'],
  });
  assert.match(shotA.female, /torn shirt/);

  // leaf_b's own chain has no wear_state binding at all — nothing to carry from it.
  const chainB = resolvePresetChain(cat, { composition_id: 'leaf_b' });
  assert.deepEqual(continuityBindingsForChain(cat, chainB), []);
  const shotBWithoutCarry = resolveMaidPresetSelection(cat, { composition_id: 'leaf_b' });
  assert.equal(shotBWithoutCarry.female, '');
  assert.doesNotMatch(shotBWithoutCarry.base, /torn/);

  // The caller carries leaf_a's binding + ids forward (job-scoped continuity
  // map) so leaf_b — silent about wear_state — still keeps the same value,
  // routed to the same actor side via the ORIGINAL binding's action.target.
  const shotBWithCarry = resolveMaidPresetSelection(
    cat,
    { composition_id: 'leaf_b' },
    { optionIds: ['torn'], bindings: bindingsA },
  );
  assert.match(shotBWithCarry.female, /torn shirt/);
});

test('embedding provider defaults swap on provider change', () => {
  assert.equal(defaultModelForEmbedding('voyage'), 'voyage-3-lite');
  assert.match(defaultEndpointForEmbedding('voyage'), /voyageai/);
  assert.equal(shouldAutoReplaceEmbeddingEndpoint('https://api.openai.com/v1/embeddings'), true);
  assert.equal(shouldAutoReplaceEmbeddingEndpoint('https://my.proxy/v1/embeddings'), false);
  assert.equal(shouldAutoReplaceEmbeddingModel('text-embedding-3-small'), true);
  assert.equal(shouldAutoReplaceEmbeddingModel('my-custom-embed'), false);
});

test('focusBandsForShots: solo shot uses ±15 clamped', () => {
  assert.deepEqual(focusBandsForShots([{ y_percent: 15 }]), [
    { from_percent: 0, to_percent: 30 },
  ]);
  assert.deepEqual(focusBandsForShots([{ y_percent: 50 }]), [
    { from_percent: 35, to_percent: 65 },
  ]);
  assert.deepEqual(focusBandsForShots([{ y_percent: 95 }]), [
    { from_percent: 80, to_percent: 100 },
  ]);
});

test('focusBandsForShots: three shots at 20/50/80 use neighbor midpoints', () => {
  const bands = focusBandsForShots([
    { y_percent: 20 },
    { y_percent: 50 },
    { y_percent: 80 },
  ]);
  assert.deepEqual(bands, [
    { from_percent: 0, to_percent: 35 },
    { from_percent: 35, to_percent: 65 },
    { from_percent: 65, to_percent: 100 },
  ]);
});

test('focusFieldsForShots: empty chat yields empty hints; offsets clamp', () => {
  const fields = focusFieldsForShots([{ y_percent: 40 }], '');
  assert.equal(fields[0].focus_hint, '');
  assert.ok(fields[0].focus.from_percent <= fields[0].focus.to_percent);

  assert.deepEqual(percentSpanToOffsets('', 10, 90), { start: 0, end: 0 });
  assert.deepEqual(percentSpanToOffsets('abcdefghij', 0, 100), { start: 0, end: 10 });
  assert.deepEqual(percentSpanToOffsets('abcdefghij', 50, 50), { start: 5, end: 6 });
});

test('sliceChatFocusHint snaps to newlines and caps length', () => {
  const chat = `${'a'.repeat(40)}\nearly band\n${'b'.repeat(40)}\nlate band\n${'c'.repeat(40)}`;
  const hint = sliceChatFocusHint(chat, 0, 40, 200);
  assert.match(hint, /early band/);
  assert.ok(hint.length <= 200);

  const long = 'x'.repeat(2000);
  const capped = sliceChatFocusHint(long, 0, 100, 600);
  assert.ok(capped.endsWith('…'));
  assert.ok(capped.length <= 601);
});

test('curationPass2ContextRules and refine messages mention focus_hint', () => {
  const rules = curationPass2ContextRules().join('\n');
  assert.match(rules, /focus_hint/);
  assert.match(rules, /PRIMARY evidence/i);

  const cat = defaultCurationCatalog();
  const refine = curationRefineSystemMessage(cat, cat.groups.slice(0, 2));
  assert.match(refine, /focus_hint/);

  const presetRefine = curationPresetRefineSystemMessage(cat, []);
  assert.match(presetRefine, /focus_hint/);
});

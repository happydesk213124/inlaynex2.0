import test from "node:test";
import assert from "node:assert/strict";

import {
  migrateSettings,
  exportSettings,
  importSettings,
} from "../.test-build/settings-schema.mjs";

test("person_tag_weight migrates to 0–5 (default 3)", () => {
  assert.equal(migrateSettings({ card: {} }).card.person_tag_weight, 3);
  assert.equal(migrateSettings({ card: { person_tag_weight: 0 } }).card.person_tag_weight, 0);
  assert.equal(migrateSettings({ card: { person_tag_weight: 4.6 } }).card.person_tag_weight, 5);
  assert.equal(migrateSettings({ card: { person_tag_weight: 99 } }).card.person_tag_weight, 5);
  assert.equal(migrateSettings({ card: { person_tag_weight: "2" } }).card.person_tag_weight, 2);
});

test("settings export omits API keys and auth tokens", () => {
  const exported = JSON.parse(exportSettings({
    auth_token: "secret",
    llm: { api_key: "llm-secret", model: "model" },
    nai: { api_key: "nai-secret", model: "nai" },
    card: { inline_thumb_pct: 100 },
  }));

  assert.equal(exported.auth_token, undefined);
  assert.equal(exported.llm.api_key, undefined);
  assert.equal(exported.nai.api_key, undefined);
  assert.equal(exported.llm.model, "model");
  assert.equal(exported.nai.model, "nai");
});

test("malformed import rejects without producing replacement settings", () => {
  assert.throws(() => importSettings("{ nope"), /JSON/);
  assert.throws(() => importSettings("[]"), /object/i);
});

test("valid import migrates legacy scale", () => {
  const imported = importSettings(JSON.stringify({ card: { inline_thumb_pct: 300 } }));
  assert.equal(imported.card.inline_thumb_pct, 50);
  assert.equal(imported.settings_schema_version, 2);
});

test("focus_character migrates to off|female|male|auto", () => {
  assert.equal(migrateSettings({ card: {} }).card.focus_character, "off");
  assert.equal(migrateSettings({ card: { focus_character: "female" } }).card.focus_character, "female");
  assert.equal(migrateSettings({ card: { focus_character: "male" } }).card.focus_character, "male");
  assert.equal(migrateSettings({ card: { focus_character: "auto" } }).card.focus_character, "auto");
  assert.equal(migrateSettings({ card: { focus_character: true } }).card.focus_character, "auto");
  assert.equal(migrateSettings({ card: { focus_character: "women" } }).card.focus_character, "female");
  assert.equal(migrateSettings({ card: { focus_character: "nope" } }).card.focus_character, "off");
});

test("focus_weight migrates to 0–5 one decimal (default 2)", () => {
  assert.equal(migrateSettings({ card: {} }).card.focus_weight, 2);
  assert.equal(migrateSettings({ card: { focus_weight: 0 } }).card.focus_weight, 0);
  assert.equal(migrateSettings({ card: { focus_weight: 2.5 } }).card.focus_weight, 2.5);
  assert.equal(migrateSettings({ card: { focus_weight: 4.66 } }).card.focus_weight, 4.7);
  assert.equal(migrateSettings({ card: { focus_weight: 99 } }).card.focus_weight, 5);
  assert.equal(migrateSettings({ card: { focus_weight: "3.1" } }).card.focus_weight, 3.1);
});

test("focus_prompt migrates to default|strong|always|manual", () => {
  assert.equal(migrateSettings({ card: {} }).card.focus_prompt, "default");
  assert.equal(migrateSettings({ card: { focus_prompt: "strong" } }).card.focus_prompt, "strong");
  assert.equal(migrateSettings({ card: { focus_prompt: "always" } }).card.focus_prompt, "always");
  assert.equal(migrateSettings({ card: { focus_prompt: "manual" } }).card.focus_prompt, "manual");
  assert.equal(migrateSettings({ card: { focus_prompt: "force" } }).card.focus_prompt, "always");
  assert.equal(migrateSettings({ card: { focus_prompt: "nope" } }).card.focus_prompt, "default");
});

test("natural_base migrates boolean and aliases to mode enum", () => {
  assert.equal(migrateSettings({ card: { natural_base: true } }).card.natural_base, "short");
  assert.equal(migrateSettings({ card: { natural_base: false } }).card.natural_base, "off");
  assert.equal(migrateSettings({ card: { natural_base: "detailed" } }).card.natural_base, "detailed");
  assert.equal(migrateSettings({ card: { natural_base: "supplement" } }).card.natural_base, "supplement");
  assert.equal(migrateSettings({ card: {} }).card.natural_base, "short");
});

test("composition_curation legacy true migrates to curation.mode two_stage", () => {
  const migrated = migrateSettings({ card: { composition_curation: true } });
  assert.equal(migrated.card.composition_curation, false);
  assert.equal(migrated.curation.mode, "two_stage");
  assert.equal(migrateSettings({ card: { composition_curation: false } }).curation.mode, "off");
  assert.equal(migrateSettings({ curation: { mode: "embed_snap" } }).curation.mode, "embed_snap");
});

test("curation.strict_ids normalizes to boolean, default false", () => {
  assert.equal(migrateSettings({ card: {} }).curation.strict_ids, false);
  assert.equal(migrateSettings({ curation: { strict_ids: true } }).curation.strict_ids, true);
  assert.equal(migrateSettings({ curation: { strict_ids: "true" } }).curation.strict_ids, true);
  assert.equal(migrateSettings({ curation: { strict_ids: "nope" } }).curation.strict_ids, false);
  assert.equal(migrateSettings({ curation: { strict_ids: 1 } }).curation.strict_ids, true);
});

test("overlay_markers is canonical for left-line overlay + inline previews", () => {
  const on = migrateSettings({ card: { overlay_markers: true, inline_previews: false } });
  assert.equal(on.card.overlay_markers, true);
  assert.equal(on.card.inline_previews, true);

  const off = migrateSettings({ card: { overlay_markers: false, inline_previews: true } });
  assert.equal(off.card.overlay_markers, false);
  assert.equal(off.card.inline_previews, false);
});

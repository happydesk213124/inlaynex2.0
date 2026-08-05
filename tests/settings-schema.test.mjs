import test from "node:test";
import assert from "node:assert/strict";

import {
  migrateSettings,
  exportSettings,
  importSettings,
} from "../.test-build/settings-schema.mjs";

test("legacy 600 percent migrates to new 100 percent without changing visual size", () => {
  const migrated = migrateSettings({ card: { inline_thumb_pct: 600 } });
  assert.equal(migrated.card.inline_thumb_pct, 100);
  assert.equal(migrated.card.scale_semantics_version, 2);
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

test("natural_base migrates boolean and aliases to mode enum", () => {
  assert.equal(migrateSettings({ card: { natural_base: true } }).card.natural_base, "short");
  assert.equal(migrateSettings({ card: { natural_base: false } }).card.natural_base, "off");
  assert.equal(migrateSettings({ card: { natural_base: "detailed" } }).card.natural_base, "detailed");
  assert.equal(migrateSettings({ card: { natural_base: "supplement" } }).card.natural_base, "supplement");
  assert.equal(migrateSettings({ card: {} }).card.natural_base, "short");
});

test("composition_curation migrates to boolean", () => {
  assert.equal(migrateSettings({ card: { composition_curation: true } }).card.composition_curation, true);
  assert.equal(migrateSettings({ card: { composition_curation: "true" } }).card.composition_curation, true);
  assert.equal(migrateSettings({ card: { composition_curation: false } }).card.composition_curation, false);
  assert.equal(migrateSettings({ card: {} }).card.composition_curation, false);
});

test("overlay_markers is canonical for left-line overlay + inline previews", () => {
  const on = migrateSettings({ card: { overlay_markers: true, inline_previews: false } });
  assert.equal(on.card.overlay_markers, true);
  assert.equal(on.card.inline_previews, true);

  const off = migrateSettings({ card: { overlay_markers: false, inline_previews: true } });
  assert.equal(off.card.overlay_markers, false);
  assert.equal(off.card.inline_previews, false);
});

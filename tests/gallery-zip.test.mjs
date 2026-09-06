import test from "node:test";
import assert from "node:assert/strict";
import {
  assignGalleryExportFiles,
  buildStoreZip,
  parseStoreZip,
  buildGalleryManifest,
  lookupZipImage,
  originalGalleryFileName,
  resolveReattach,
  stripExportSeqPrefix,
  unpackGalleryZip,
  crc32,
} from "../.test-build/gallery-zip.mjs";

test("crc32 known value", () => {
  // CRC of empty is 0
  assert.equal(crc32(new Uint8Array()), 0);
});

test("store zip marks UTF-8 names so Windows does not mojibake Hangul", () => {
  const zip = buildStoreZip([
    { name: "노겜노라/000001_노겜노라_msg1_s1.png", data: new Uint8Array([1, 2, 3]) },
  ]);
  const flags = zip[6] | (zip[7] << 8);
  assert.equal(flags, 0x0800);
  const extraLen = zip[28] | (zip[29] << 8);
  assert.ok(extraLen >= 9);
  const nameLen = zip[26] | (zip[27] << 8);
  const extra = zip.subarray(30 + nameLen, 30 + nameLen + extraLen);
  assert.equal(extra[0] | (extra[1] << 8), 0x7075);
  const map = parseStoreZip(zip);
  assert.ok(map.has("노겜노라/000001_노겜노라_msg1_s1.png"));
});

test("store zip roundtrip", () => {
  const payload = new TextEncoder().encode("hello");
  const zip = buildStoreZip([
    { name: "manifest.json", data: new TextEncoder().encode('{"ok":true}') },
    { name: "images/a.png", data: payload },
  ]);
  const map = parseStoreZip(zip);
  assert.equal(new TextDecoder().decode(map.get("images/a.png")), "hello");
  assert.equal(JSON.parse(new TextDecoder().decode(map.get("manifest.json"))).ok, true);
});

test("manifest + unpack", () => {
  const items = [{ id: "abc", content_hash: "h1", character_id: "c", chat_id: "t", message_index: 2 }];
  const manifest = buildGalleryManifest(items);
  assert.equal(manifest.format, "inlay-nexus-gallery");
  assert.equal(manifest.items[0].file, "images/abc.png");
  const zip = buildStoreZip([
    { name: "manifest.json", data: new TextEncoder().encode(JSON.stringify(manifest)) },
    { name: "images/abc.png", data: new Uint8Array([137, 80, 78, 71]) },
  ]);
  const unpacked = unpackGalleryZip(zip);
  assert.equal(unpacked.manifest.items[0].id, "abc");
  assert.ok(unpacked.images.get("images/abc.png"));
});

test("newest image in a folder is 000001_ plus the old download name", () => {
  const rows = assignGalleryExportFiles([
    { id: "old", folder_key: "c|t", character_name: "노겜노라", message_index: 1, shot_index: 0, created_at: 10 },
    { id: "new", folder_key: "c|t", character_name: "노겜노라", message_index: 9, shot_index: 2, created_at: 99 },
  ]);
  assert.equal(rows[0].id, "new");
  assert.equal(rows[0].file, "노겜노라/000001_노겜노라_msg10_s3.png");
  assert.equal(rows[1].file, "노겜노라/000002_노겜노라_msg2_s1.png");
});

test("full export keeps one directory per explorer folder", () => {
  const rows = assignGalleryExportFiles([
    { id: "a", folder_key: "c1|t1", character_name: "Alice", chat_name: "room1", created_at: 2 },
    { id: "b", folder_key: "c2|t2", character_name: "Bob", chat_name: "room2", created_at: 3 },
  ]);
  const dirs = [...new Set(rows.map((r) => r.file.split("/")[0]))].sort();
  assert.deepEqual(dirs, ["Alice", "Bob"]);
});

test("same character name in two rooms keeps both folders", () => {
  const rows = assignGalleryExportFiles([
    { id: "a", folder_key: "c|t1", character_name: "노겜노라", chat_name: "room1", created_at: 2 },
    { id: "b", folder_key: "c|t2", character_name: "노겜노라", chat_name: "room2", created_at: 3 },
  ]);
  const dirs = [...new Set(rows.map((r) => r.file.split("/")[0]))].sort();
  assert.deepEqual(dirs, ["노겜노라", "노겜노라_room2"]);
});

test("stripExportSeqPrefix leaves old names alone", () => {
  assert.equal(stripExportSeqPrefix("노겜노라/000001_노겜노라_msg10_s3.png"), "노겜노라_msg10_s3.png");
  assert.equal(stripExportSeqPrefix("images/abc.png"), "abc.png");
  assert.equal(originalGalleryFileName({ character_name: "inlay", message_index: 0, shot_index: 0 }), "inlay_msg1_s1.png");
});

test("lookupZipImage accepts prefixed, legacy, and stripped names", () => {
  const png = new Uint8Array([1]);
  const images = new Map([
    ["노겜노라/000001_노겜노라_msg10_s3.png", png],
  ]);
  assert.equal(lookupZipImage(images, { file: "노겜노라/000001_노겜노라_msg10_s3.png", id: "new" }), png);
  const legacy = new Map([["images/abc.png", png]]);
  assert.equal(lookupZipImage(legacy, { file: "images/abc.png", id: "abc" }), png);
  const stripped = new Map([["노겜노라/노겜노라_msg10_s3.png", png]]);
  assert.equal(lookupZipImage(stripped, { file: "노겜노라/000001_노겜노라_msg10_s3.png", id: "new" }), png);
});

test("resolveReattach exact / candidate / orphan", () => {
  const existing = [
    { id: "x", content_hash: "hh", character_id: "c1", chat_id: "ch1", message_index: 3 },
    { id: "y", content_hash: "other", character_id: "c1", chat_id: "ch1", message_index: 3 },
  ];
  assert.equal(resolveReattach({ location: { content_hash: "hh" } }, existing).status, "exact");
  assert.equal(
    resolveReattach({ location: { content_hash: "miss", character_id: "c1", chat_id: "ch1", message_index: 3 } }, existing).status,
    "candidate",
  );
  assert.equal(resolveReattach({ location: { content_hash: "zzz" } }, existing).status, "orphan");
});

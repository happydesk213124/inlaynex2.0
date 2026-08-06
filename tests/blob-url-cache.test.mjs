import test from "node:test";
import assert from "node:assert/strict";
import { BlobUrlCache } from "../.test-build/blob-url-cache.mjs";

test("BlobUrlCache evicts LRU unpinned entries when over budget", () => {
  const cache = new BlobUrlCache(20);
  cache.set("a", "a".repeat(10));
  cache.set("b", "b".repeat(10));
  assert.equal(cache.size, 2);
  cache.set("c", "c".repeat(10));
  // a was oldest and unpinned → gone
  assert.equal(cache.get("a"), undefined);
  assert.ok(cache.get("b"));
  assert.ok(cache.get("c"));
});

test("BlobUrlCache never evicts pinned ids", () => {
  const cache = new BlobUrlCache(15);
  cache.set("keep", "k".repeat(10));
  cache.pin(["keep"]);
  cache.set("old", "o".repeat(10));
  cache.set("new", "n".repeat(10));
  assert.ok(cache.get("keep"));
  // Unpinned entries may be dropped to stay near budget; pinned must remain.
  assert.equal(cache.get("keep")?.length, 10);
});

test("BlobUrlCache get touches LRU order", () => {
  const cache = new BlobUrlCache(20);
  cache.set("a", "a".repeat(10));
  cache.set("b", "b".repeat(10));
  cache.get("a"); // a becomes newest
  cache.set("c", "c".repeat(10));
  assert.ok(cache.get("a"));
  assert.equal(cache.get("b"), undefined);
});

test("BlobUrlCache retainOnly drops unpinned immediately", () => {
  const cache = new BlobUrlCache(1000);
  cache.set("a", "a".repeat(10));
  cache.set("b", "b".repeat(10));
  cache.set("c", "c".repeat(10));
  cache.retainOnly(["b"]);
  assert.equal(cache.get("a"), undefined);
  assert.ok(cache.get("b"));
  assert.equal(cache.get("c"), undefined);
  assert.deepEqual(cache.pinnedIds(), ["b"]);
});

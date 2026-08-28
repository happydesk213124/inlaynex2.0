import test from "node:test";
import assert from "node:assert/strict";

import { cardMatchesMessageUnlink, resolveStoredContentHash } from "../.test-build/unlink-match.mjs";

test("unlink matches a late comic hash on meta or location", () => {
  assert.equal(
    cardMatchesMessageUnlink({
      hashes: ["", "comic-hash"],
      messageIndexes: [-1, 4],
      wantHash: "comic-hash",
      wantMessageIndex: 4,
    }),
    true,
  );
  assert.equal(
    cardMatchesMessageUnlink({
      hashes: [""],
      messageIndexes: [4],
      wantHash: "other",
      wantMessageIndex: 4,
    }),
    true,
  );
  assert.equal(
    cardMatchesMessageUnlink({
      hashes: ["other"],
      messageIndexes: [-1],
      wantHash: "want",
      wantMessageIndex: 4,
    }),
    false,
  );
});

test("cleared location hash does not revive the meta hash", () => {
  assert.equal(resolveStoredContentHash({ content_hash: "" }, { content_hash: "old" }), "");
  assert.equal(resolveStoredContentHash({}, { content_hash: "old" }), "old");
  assert.equal(resolveStoredContentHash({ content_hash: "live" }, { content_hash: "old" }), "live");
});

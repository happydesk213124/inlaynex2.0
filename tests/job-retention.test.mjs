import test from "node:test";
import assert from "node:assert/strict";

import { JOB_RETENTION_LIMIT, jobIdsToPrune, jobRetentionStamp } from "../.test-build/job-retention.mjs";

function row(id, state, created_at, updated_at) {
  return { id, state, created_at, updated_at };
}

test("keeps every row when at or under the cap", () => {
  const rows = Array.from({ length: JOB_RETENTION_LIMIT }, (_, i) => row(`j${i}`, "done", i + 1));
  assert.deepEqual(jobIdsToPrune(rows), []);
  assert.deepEqual(jobIdsToPrune(rows.slice(0, 3)), []);
});

test("drops oldest done jobs past the cap", () => {
  const rows = Array.from({ length: 15 }, (_, i) => row(`j${i}`, "done", i + 1));
  const drop = new Set(jobIdsToPrune(rows));
  assert.equal(drop.size, 5);
  for (let i = 0; i < 5; i++) assert.equal(drop.has(`j${i}`), true);
  for (let i = 5; i < 15; i++) assert.equal(drop.has(`j${i}`), false);
});

test("never drops an in-flight job even when it is the oldest", () => {
  const rows = [
    row("old-gen", "generating", 1),
    row("old-tag", "tagging", 2),
    row("old-q", "queued", 3),
    ...Array.from({ length: 20 }, (_, i) => row(`done${i}`, "done", 100 + i)),
  ];
  const drop = new Set(jobIdsToPrune(rows));
  assert.equal(drop.has("old-gen"), false);
  assert.equal(drop.has("old-tag"), false);
  assert.equal(drop.has("old-q"), false);
  assert.equal(drop.size, rows.length - JOB_RETENTION_LIMIT);
  assert.equal(drop.has("done19"), false);
});

test("prefers updated_at over created_at when ranking", () => {
  const rows = [
    row("stale", "done", 999, 1),
    ...Array.from({ length: 10 }, (_, i) => row(`fresh${i}`, "done", 1, 10 + i)),
  ];
  const drop = jobIdsToPrune(rows);
  assert.deepEqual(drop, ["stale"]);
});

test("jobRetentionStamp falls back to created_at", () => {
  assert.equal(jobRetentionStamp({ id: "a", updated_at: 8, created_at: 2 }), 8);
  assert.equal(jobRetentionStamp({ id: "a", created_at: 2 }), 2);
  assert.equal(jobRetentionStamp({ id: "a" }), 0);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assignLinesFromYPercent,
  isLazySequentialShotLines,
  numberMessageLinesForTagger,
  repairLazyShotLines,
  splitTaggerMessageLines,
} from '../.test-build/shot-line.mjs';

test('splitTaggerMessageLines skips blanks', () => {
  assert.deepEqual(splitTaggerMessageLines('a\n\n  b  \n'), ['a', 'b']);
});

test('numberMessageLinesForTagger prefixes L#', () => {
  assert.equal(
    numberMessageLinesForTagger('첫 줄\n둘째\n셋째'),
    'L1|첫 줄\nL2|둘째\nL3|셋째',
  );
});

test('isLazySequentialShotLines detects 1..N only', () => {
  assert.equal(isLazySequentialShotLines([1, 2, 3]), true);
  assert.equal(isLazySequentialShotLines([1, 2]), true);
  assert.equal(isLazySequentialShotLines([2, 5, 8]), false);
  assert.equal(isLazySequentialShotLines([1]), false);
  assert.equal(isLazySequentialShotLines([1, 2, 4]), false);
});

test('assignLinesFromYPercent spreads and avoids collisions', () => {
  assert.deepEqual(assignLinesFromYPercent([20, 50, 80], 10), [3, 6, 8]);
  const collided = assignLinesFromYPercent([50, 50, 50], 10);
  assert.equal(new Set(collided).size, 3);
});

test('repairLazyShotLines remaps 1,2,3 via y_percent', () => {
  const msg = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n');
  const shots = [
    { line: 1, y_percent: 20, camera: 'a' },
    { line: 2, y_percent: 50, camera: 'b' },
    { line: 3, y_percent: 80, camera: 'c' },
  ];
  const fixed = repairLazyShotLines(shots, msg);
  assert.deepEqual(fixed.map((s) => s.line), [3, 6, 8]);
  assert.equal(fixed[0].camera, 'a');
});

test('repairLazyShotLines keeps non-sequential lines', () => {
  const msg = 'a\nb\nc\nd\ne\nf\ng\nh';
  const shots = [
    { line: 2, y_percent: 20 },
    { line: 5, y_percent: 50 },
    { line: 7, y_percent: 80 },
  ];
  assert.deepEqual(
    repairLazyShotLines(shots, msg).map((s) => s.line),
    [2, 5, 7],
  );
});

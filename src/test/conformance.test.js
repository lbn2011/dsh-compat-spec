import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  diffResult,
  issueKeys,
  loadManifest,
  loadVectors,
  unimplementedReason,
} from '../../conformance/index.mjs';
import { ISSUE_CODES, validateDeclaration } from '../../src/index.js';

const vectors = loadVectors();

test('every vector is discoverable through the manifest', () => {
  const manifest = loadManifest();
  assert.equal(vectors.length, Object.keys(manifest.positive).length
    + Object.keys(manifest.negative).length
    + Object.keys(manifest.structural).length);
  assert.ok(vectors.length >= 44, `expected at least 44 vectors, found ${vectors.length}`);
});

test('positive vectors all validate with zero issues', () => {
  const positives = vectors.filter((vector) => vector.suite === 'positive');
  assert.ok(positives.length >= 5);
  for (const vector of positives) {
    const result = validateDeclaration(vector.declaration);
    assert.deepEqual(diffResult(result, vector.expected), [], vector.id);
    assert.equal(result.valid, true, vector.id);
    assert.deepEqual(result.issues, [], vector.id);
  }
});

test('negative vectors each produce exactly the expected codes and paths', () => {
  const negatives = vectors.filter((vector) => vector.suite === 'negative');
  assert.ok(negatives.length >= 25);
  for (const vector of negatives) {
    const result = validateDeclaration(vector.declaration);
    assert.equal(result.valid, false, `${vector.id} must be rejected`);
    assert.deepEqual(diffResult(result, vector.expected), [], vector.id);
  }
});

test('every negative vector is covered end to end (valid flag and issues)', () => {
  for (const vector of vectors.filter((entry) => entry.suite === 'negative')) {
    const result = validateDeclaration(vector.declaration);
    assert.equal(result.valid, false, vector.id);
    assert.ok(result.issues.length > 0, vector.id);
    for (const issue of result.issues) {
      assert.equal(typeof issue.code, 'string');
      assert.equal(typeof issue.path, 'string');
      assert.equal(typeof issue.message, 'string');
      assert.equal(issue.severity, 'error');
    }
  }
});

test('structural vectors keep a text-level expectation that this API cannot implement', () => {
  const structural = vectors.filter((vector) => vector.suite === 'structural');
  assert.equal(structural.length, 4);
  for (const vector of structural) {
    // Not satisfiable through validateDeclaration: the duplicate key is gone after JSON.parse.
    assert.equal(vector.implementsExpectation, false, `${vector.id} must be marked value-level-unimplementable`);
    for (const entry of vector.expected.issues) {
      // The text-level expectation is preserved verbatim as documentation.
      assert.equal(entry.code, 'DUPLICATE_FIELD', vector.id);
      assert.equal(typeof entry.path, 'string', vector.id);
    }
    // ... but the code is not part of this validator's vocabulary.
    assert.equal(Object.hasOwn(ISSUE_CODES, 'DUPLICATE_FIELD'), false, vector.id);
    assert.equal(Object.values(ISSUE_CODES).includes('DUPLICATE_FIELD'), false, vector.id);
  }
});

test('structural vectors are never counted as passing and never claim conformance', () => {
  for (const vector of vectors.filter((entry) => entry.suite === 'structural')) {
    const reason = unimplementedReason(vector);
    assert.equal(typeof reason, 'string', vector.id);
    assert.match(reason, /JSON-text/, vector.id);

    const result = validateDeclaration(vector.declaration);
    // Whatever the surviving value looks like, it is not evidence for the text-level claim.
    assert.equal(typeof result.valid, 'boolean', vector.id);
    assert.equal(result.issues.every((entry) => Object.values(ISSUE_CODES).includes(entry.code)), true, vector.id);
    assert.deepEqual(diffResult(result, vector.expected).length > 0, true, `${vector.id} must not satisfy the text-level expectation`);
  }
});

test('value-level totals are 40 implemented vectors out of 44 published', () => {
  const implemented = vectors.filter((vector) => vector.implementsExpectation);
  const unimplemented = vectors.filter((vector) => !vector.implementsExpectation);
  assert.equal(vectors.length, 44);
  assert.equal(implemented.length, 40);
  assert.equal(unimplemented.length, 4);
  assert.deepEqual(
    vectors.reduce((counts, vector) => ({ ...counts, [vector.suite]: (counts[vector.suite] ?? 0) + 1 }), {}),
    { positive: 6, negative: 34, structural: 4 },
  );
});

test('diffResult reports both missing and unexpected issues in a stable order', () => {
  const actual = { valid: false, issues: [{ code: 'A', path: 'x' }, { code: 'C', path: 'z' }] };
  const expected = { valid: false, issues: [{ code: 'A', path: 'x' }, { code: 'B', path: 'y' }] };
  assert.deepEqual(diffResult(actual, expected), ['missing issue: B@y', 'unexpected issue: C@z']);
  assert.deepEqual(diffResult(expected, expected), []);
  assert.deepEqual(diffResult({ valid: true, issues: [] }, expected), [
    'valid: expected false, got true',
    'missing issue: A@x',
    'missing issue: B@y',
  ]);
});

test('issueKeys sorts without mutating the input', () => {
  const issues = [{ code: 'B', path: 'b' }, { code: 'A', path: 'a' }];
  assert.deepEqual(issueKeys(issues), ['A@a', 'B@b']);
  assert.deepEqual(issues.map((entry) => entry.code), ['B', 'A']);
});

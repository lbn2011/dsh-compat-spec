/**
 * Shared loader + evaluator for the language-neutral conformance vectors.
 *
 * Layout (see conformance/manifest.json):
 * - positive/<name>.json      : the file itself is a declaration; it must validate
 *                               with zero issues.
 * - negative/<name>.json      : the file itself is a declaration; it must be invalid.
 *                               manifest.negative["<name>.json"].issues lists the
 *                               exact `{ code, path }` pairs required — order-insensitive,
 *                               missing or extra issues are failures.
 * - structural/<name>.json.txt: raw JSON *text* that is still valid JSON but cannot be
 *                               represented as a JSON value (duplicate object keys).
 *                               Evaluated against `JSON.parse(text)`. Their text-level
 *                               expectations are documentation of a rule this API cannot
 *                               implement, not tests it can pass: see unimplementedReason().
 *
 * Fixture files contain nothing but the declaration, so any implementation can point an
 * ordinary JSON loader at them. Expectations live in manifest.json precisely so the
 * declaration bodies stay untouched by this repository's private wrapper format.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const CONFORMANCE_ROOT = fileURLToPath(new URL('.', import.meta.url));
export const MANIFEST_PATH = `${CONFORMANCE_ROOT}manifest.json`;
export const SUITES = Object.freeze(['positive', 'negative', 'structural']);

export function loadManifest() {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
}

function readDeclaration(suite, file) {
  return JSON.parse(readFileSync(`${CONFORMANCE_ROOT}${suite}/${file}`, 'utf8'));
}

/**
 * @returns {Array<{
 *   id: string, suite: string, file: string, name: string, doc: string,
 *   declaration: unknown, sourceText: string|null,
 *   expected: { valid: boolean, issues: Array<{ code: string, path: string }> },
 *   implementsExpectation: boolean
 * }>}
 *   `implementsExpectation` is false for structural vectors: their `expected`
 *   records what a JSON-text-aware parser should report, and a validator that only
 *   receives a parsed value can never satisfy it. Such vectors are reported as
 *   unimplemented, never as passing.
 */
export function loadVectors() {
  const manifest = loadManifest();
  const vectors = [];

  for (const [file, entry] of Object.entries(manifest.positive ?? {})) {
    vectors.push({
      id: `positive/${file}`,
      suite: 'positive',
      file,
      name: entry.name ?? file,
      doc: entry.doc ?? '',
      declaration: readDeclaration('positive', file),
      sourceText: null,
      expected: { valid: true, issues: [] },
      implementsExpectation: true,
    });
  }

  for (const [file, entry] of Object.entries(manifest.negative ?? {})) {
    vectors.push({
      id: `negative/${file}`,
      suite: 'negative',
      file,
      name: entry.name ?? file,
      doc: entry.doc ?? '',
      declaration: readDeclaration('negative', file),
      sourceText: null,
      expected: { valid: entry.valid !== false, issues: entry.issues ?? [] },
      implementsExpectation: true,
    });
  }

  for (const [file, entry] of Object.entries(manifest.structural ?? {})) {
    const text = readFileSync(`${CONFORMANCE_ROOT}structural/${file}`, 'utf8');
    vectors.push({
      id: `structural/${file}`,
      suite: 'structural',
      file,
      name: entry.name ?? file,
      doc: entry.doc ?? '',
      declaration: JSON.parse(text),
      sourceText: text,
      expected: { valid: false, issues: entry.issues ?? [] },
      // A structural vector is unimplementable here whatever its manifest says.
      implementsExpectation: false,
    });
  }

  return vectors;
}

/**
 * Why a vector cannot be satisfied through a parsed value, or `null` when it can.
 *
 * `structural/*.json.txt` fixtures repeat an object key in raw JSON text. The
 * duplicate is gone by the time `JSON.parse` returns, so no value-level check can
 * see it. Their manifest expectations stay in place as the normative description
 * of the text-level rule; this repository does not implement that rule anywhere.
 *
 * @param {{ suite: string, expected: { issues: Array<{ code: string, path: string }> } }} vector
 * @returns {string|null}
 */
export function unimplementedReason(vector) {
  if (vector.suite !== 'structural') return null;
  return 'requires JSON-text-aware parsing: repeated object keys are erased by JSON.parse, so a value-level validator cannot report DUPLICATE_FIELD';
}

/** Render `{code, path}` pairs as a sorted, comparable key list. */
export function issueKeys(issues) {
  return issues.map((entry) => `${entry.code}@${entry.path}`).sort();
}

/**
 * Compare a validation result with a vector's expectation.
 *
 * @param {{ valid: boolean, issues: Array<{ code: string, path: string }> }} actual
 * @param {{ valid: boolean, issues: Array<{ code: string, path: string }> }} expected
 * @returns {string[]} Human-readable differences; empty means conformance.
 */
export function diffResult(actual, expected) {
  const problems = [];
  if (actual.valid !== expected.valid) {
    problems.push(`valid: expected ${expected.valid}, got ${actual.valid}`);
  }
  const actualKeys = issueKeys(actual.issues);
  const expectedKeys = issueKeys(expected.issues);
  const missing = expectedKeys.filter((key) => !actualKeys.includes(key));
  const extra = actualKeys.filter((key) => !expectedKeys.includes(key));
  for (const key of missing) problems.push(`missing issue: ${key}`);
  for (const key of extra) problems.push(`unexpected issue: ${key}`);
  return problems;
}

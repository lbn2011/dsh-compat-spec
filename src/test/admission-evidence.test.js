import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ASSERTION_IDS,
  CASE_CATALOG,
  CASE_IDS,
  ISSUE_CODE_ORDER,
  REQUIRED_CASE_IDS,
  VERSION,
  validateAdmissionEvidence,
} from '../admission-evidence.js';

const COMMIT = 'a'.repeat(40);

function assertionsFor(id, overrides = {}) {
  return ASSERTION_IDS[id].map((assertionId) => ({
    id: assertionId,
    passed: Object.prototype.hasOwnProperty.call(overrides, assertionId)
      ? overrides[assertionId]
      : true,
  }));
}

function admissionCase(id, overrides = {}) {
  return {
    id,
    status: 'passed',
    assertions: assertionsFor(id),
    limitations: [],
    ...overrides,
  };
}

function refusedCase(overrides = {}) {
  return admissionCase('admission-refused-conflict', { status: 'refused', ...overrides });
}

function doc(overrides = {}) {
  return {
    schemaVersion: VERSION,
    baseline: { commit: COMMIT, node: 'v24.9.0' },
    coordination: {
      coordinatorIdentity: 'observed-identical',
      provisioning: 'caller-supplied',
      scopeVisibility: 'not-determined',
    },
    cases: [
      admissionCase('admission-admitted'),
      refusedCase(),
      admissionCase('admission-activation-throw'),
      admissionCase('admission-cleanup-failure'),
    ],
    limitations: [],
    ...overrides,
  };
}

function only(result) {
  assert.equal(
    result.issues.length,
    1,
    `expected exactly one issue, got ${JSON.stringify(result.issues)}`,
  );
  return result.issues[0];
}

function issues(result) {
  return result.issues.map((entry) => `${entry.code}@${entry.path}`);
}

function caseIndex(document, id) {
  return document.cases.findIndex((entry) => entry.id === id);
}

test('VERSION is the single accepted schemaVersion literal', () => {
  assert.equal(VERSION, 'admission-evidence/0.1-draft.1');
  assert.equal(validateAdmissionEvidence(doc()).valid, true);
  for (const wrong of [
    'admission-evidence/0.1',
    'admission-evidence/0.1-draft.2',
    'admission-evidence/0.1-draft.1 ',
    'coexistence-evidence/0.1',
  ]) {
    const result = validateAdmissionEvidence(doc({ schemaVersion: wrong }));
    assert.equal(result.valid, false);
    assert.deepEqual(issues(result), ['INVALID_SCHEMA_VERSION@schemaVersion']);
  }
});

test('the catalog is closed, frozen and in catalog order', () => {
  assert.equal(CASE_IDS.length, 8);
  assert.deepEqual([...REQUIRED_CASE_IDS], CASE_IDS.slice(0, 4));
  assert.deepEqual([...CASE_IDS], CASE_CATALOG.map((entry) => entry.id));
  assert.equal(Object.isFrozen(CASE_CATALOG), true);
  assert.equal(Object.isFrozen(CASE_IDS), true);
  for (const entry of CASE_CATALOG) {
    assert.equal(Object.isFrozen(entry), true);
    assert.equal(Object.isFrozen(ASSERTION_IDS[entry.id]), true);
  }
  assert.throws(() => CASE_IDS.push('admission-imaginary'), TypeError);
  assert.throws(() => {
    CASE_CATALOG[0].id = 'mutated';
  }, TypeError);
});

test('a full valid document validates and summarises', () => {
  const result = validateAdmissionEvidence(doc());
  assert.equal(result.valid, true);
  assert.deepEqual(result.issues, []);
  const { summary } = result;
  assert.equal(summary.schemaVersion, VERSION);
  assert.equal(summary.certification, false);
  assert.deepEqual(summary.coverage.required, [...REQUIRED_CASE_IDS]);
  assert.deepEqual(summary.coverage.present, [...REQUIRED_CASE_IDS]);
  assert.deepEqual(summary.coverage.unknown, [
    'admission-lease-state',
    'admission-tuple-shape',
    'admission-remount-same-coordinator',
    'admission-visibility',
  ]);
  assert.deepEqual(
    summary.cases.map((entry) => entry.id),
    [...REQUIRED_CASE_IDS],
  );
  for (const entry of summary.cases) {
    assert.equal(entry.assertionCount, ASSERTION_IDS[entry.id].length);
    assert.deepEqual(entry.failedAssertions, []);
    assert.deepEqual(entry.limitations, []);
  }
  assert.deepEqual(summary.limitations, []);
});

test('an invalid document carries no summary key at all', () => {
  const result = validateAdmissionEvidence(doc({ schemaVersion: 'nope' }));
  assert.equal(result.valid, false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'summary'), false);
  assert.equal(result.summary, undefined);
});

test('a missing required case is invalid rather than silently absent', () => {
  const document = doc();
  document.cases = document.cases.filter((entry) => entry.id !== 'admission-cleanup-failure');
  assert.deepEqual(issues(validateAdmissionEvidence(document)), ['MISSING_REQUIRED_CASE@cases']);
});

test('absent optional cases are named as unknown coverage, never as a pass', () => {
  const result = validateAdmissionEvidence(doc());
  assert.equal(result.valid, true);
  assert.deepEqual(result.summary.coverage.unknown, [
    'admission-lease-state',
    'admission-tuple-shape',
    'admission-remount-same-coordinator',
    'admission-visibility',
  ]);
  for (const entry of result.summary.cases) assert.notEqual(entry.status, 'not-run');
});

test('a present optional case is reported without inventing the absent ones', () => {
  const document = doc();
  document.cases.push(admissionCase('admission-tuple-shape'));
  const result = validateAdmissionEvidence(document);
  assert.equal(result.valid, true);
  assert.deepEqual(result.summary.coverage.present, [...REQUIRED_CASE_IDS, 'admission-tuple-shape']);
  assert.deepEqual(result.summary.coverage.unknown, [
    'admission-lease-state',
    'admission-remount-same-coordinator',
    'admission-visibility',
  ]);
});

test('an expected refusal is a success, not a failure of the run', () => {
  const result = validateAdmissionEvidence(doc());
  assert.equal(result.valid, true);
  const entry = result.summary.cases.find((item) => item.id === 'admission-refused-conflict');
  assert.equal(entry.status, 'refused');
  assert.equal(entry.assertionCount, 5);
  assert.deepEqual(entry.failedAssertions, []);
});

test('refused is legal only on the refused-conflict case', () => {
  const document = doc();
  document.cases[caseIndex(document, 'admission-admitted')].status = 'refused';
  assert.deepEqual(issues(validateAdmissionEvidence(document)), [
    'STATUS_NOT_ALLOWED_FOR_CASE@cases[0].status',
  ]);
});

test('a failed case must carry at least one false assertion', () => {
  const document = doc();
  document.cases[caseIndex(document, 'admission-activation-throw')] = admissionCase(
    'admission-activation-throw',
    {
      status: 'failed',
      assertions: assertionsFor('admission-activation-throw', {
        'registered-rollback-callbacks-settled': false,
        'rethrow-same-error-identity': false,
      }),
    },
  );
  const result = validateAdmissionEvidence(document);
  assert.equal(result.valid, true);
  const entry = result.summary.cases.find((item) => item.id === 'admission-activation-throw');
  assert.equal(entry.status, 'failed');
  // Catalog order, not document order.
  assert.deepEqual(entry.failedAssertions, [
    'registered-rollback-callbacks-settled',
    'rethrow-same-error-identity',
  ]);
});

test('an all-true assertion list is incoherent with failed', () => {
  const document = doc();
  document.cases[caseIndex(document, 'admission-admitted')].status = 'failed';
  assert.deepEqual(issues(validateAdmissionEvidence(document)), [
    'STATUS_ASSERTION_MISMATCH@cases[0].status',
  ]);
});

test('passed with a false assertion is a mismatch, not a quiet downgrade', () => {
  const document = doc();
  document.cases[caseIndex(document, 'admission-admitted')] = admissionCase(
    'admission-admitted',
    {
      assertions: assertionsFor('admission-admitted', { 'close-fulfilled': false }),
    },
  );
  const result = validateAdmissionEvidence(document);
  assert.equal(result.valid, false);
  assert.deepEqual(issues(result), ['STATUS_ASSERTION_MISMATCH@cases[0].status']);
});

test('not-run is valid with zero assertions and a limitation', () => {
  const document = doc();
  document.cases[caseIndex(document, 'admission-cleanup-failure')] = {
    id: 'admission-cleanup-failure',
    status: 'not-run',
    assertions: [],
    limitations: ['the fixture never started; nothing about cleanup was observed'],
  };
  const result = validateAdmissionEvidence(document);
  assert.equal(result.valid, true);
  const entry = result.summary.cases.find((item) => item.id === 'admission-cleanup-failure');
  assert.equal(entry.status, 'not-run');
  assert.equal(entry.assertionCount, 0);
  assert.deepEqual(entry.failedAssertions, []);
  assert.deepEqual(entry.limitations, [
    'the fixture never started; nothing about cleanup was observed',
  ]);
});

test('not-run without a limitation is refused', () => {
  const document = doc();
  document.cases[caseIndex(document, 'admission-cleanup-failure')] = {
    id: 'admission-cleanup-failure',
    status: 'not-run',
    assertions: [],
    limitations: [],
  };
  assert.deepEqual(issues(validateAdmissionEvidence(document)), [
    'NOT_RUN_REQUIRES_LIMITATION@cases[3].limitations',
  ]);
});

test('not-run carrying assertions is a contradiction', () => {
  const document = doc();
  document.cases[caseIndex(document, 'admission-admitted')].status = 'not-run';
  const result = validateAdmissionEvidence(document);
  assert.equal(result.valid, false);
  assert.ok(issues(result).includes('STATUS_ASSERTION_MISMATCH@cases[0].status'));
});

test('an attempted case missing one assertion of its set is incomplete', () => {
  const document = doc();
  document.cases[caseIndex(document, 'admission-admitted')].assertions.pop();
  assert.deepEqual(issues(validateAdmissionEvidence(document)), ['MISSING_ASSERTION@cases[0].assertions']);
});

test('an extra assertion id is unknown, and its text never reaches a path', () => {
  const document = doc();
  document.cases[caseIndex(document, 'admission-admitted')].assertions.push({
    id: 'a-row-resolves',
    passed: true,
  });
  const result = validateAdmissionEvidence(document);
  const issue = only(result);
  assert.equal(issue.code, 'UNKNOWN_ASSERTION_ID');
  assert.equal(issue.path, 'cases[0].assertions[7].id');
  assert.equal(JSON.stringify(result.issues).includes('a-row-resolves'), false);
});

test('unknown and duplicate case ids are both reported', () => {
  const unknown = doc();
  unknown.cases[0].id = 'admission-invented';
  assert.deepEqual(issues(validateAdmissionEvidence(unknown)), [
    'UNKNOWN_CASE_ID@cases[0].id',
    'MISSING_REQUIRED_CASE@cases',
  ]);

  const duplicate = doc();
  duplicate.cases.push(admissionCase('admission-admitted'));
  assert.deepEqual(issues(validateAdmissionEvidence(duplicate)), ['DUPLICATE_CASE_ID@cases[4].id']);
});

test('unknown root keys are refused at the parent path without echoing the key', () => {
  const document = doc();
  document.pluginId = 'example.plugin';
  const result = validateAdmissionEvidence(document);
  const issue = only(result);
  assert.equal(issue.code, 'UNEXPECTED_FIELD');
  assert.equal(issue.path, '');
  assert.equal(JSON.stringify(result.issues).includes('pluginId'), false);
  assert.equal(JSON.stringify(result.issues).includes('example.plugin'), false);
});

test('provenance-bearing keys are forbidden, not merely unexpected', () => {
  for (const key of ['signature', 'key', 'certificate', 'issuer', 'attestation', 'verified-by']) {
    const result = validateAdmissionEvidence(doc({ [key]: 'x' }));
    const issue = only(result);
    assert.equal(issue.code, 'FORBIDDEN_FIELD', `expected FORBIDDEN_FIELD for ${key}`);
    assert.equal(issue.path, '');
  }
});

test('unknown keys inside a case and inside an assertion are closed too', () => {
  const withCaseKey = doc();
  withCaseKey.cases[0].count = 0;
  assert.deepEqual(issues(validateAdmissionEvidence(withCaseKey)), ['UNEXPECTED_FIELD@cases[0]']);

  const withAssertionKey = doc();
  withAssertionKey.cases[0].assertions[0].message = 'ok';
  assert.deepEqual(issues(validateAdmissionEvidence(withAssertionKey)), [
    'UNEXPECTED_FIELD@cases[0].assertions[0]',
  ]);
});

test('a sparse array is reported at the hole', () => {
  const document = doc();
  document.cases.length = 5;
  assert.deepEqual(issues(validateAdmissionEvidence(document)), ['SPARSE_ARRAY@cases[4]']);
});

test('an own accessor is reported as not inspectable, never called', () => {
  const document = doc();
  let calls = 0;
  Object.defineProperty(document.cases[0].assertions[0], 'passed', {
    get() {
      calls += 1;
      return true;
    },
    enumerable: true,
    configurable: true,
  });
  const result = validateAdmissionEvidence(document);
  assert.equal(calls, 0);
  assert.ok(issues(result).includes('NOT_INSPECTABLE@cases[0].assertions[0].passed'));
});

test('an accessor on a top-level member is not invoked either', () => {
  const document = doc();
  let calls = 0;
  delete document.limitations;
  Object.defineProperty(document, 'limitations', {
    get() {
      calls += 1;
      return [];
    },
    enumerable: true,
    configurable: true,
  });
  const result = validateAdmissionEvidence(document);
  assert.equal(calls, 0);
  assert.deepEqual(issues(result), ['NOT_INSPECTABLE@limitations']);
});

test('an array item accessor is not invoked', () => {
  const document = doc();
  let calls = 0;
  Object.defineProperty(document.limitations, 0, {
    get() {
      calls += 1;
      return 'injected';
    },
    enumerable: true,
    configurable: true,
  });
  document.limitations.length = 1;
  const result = validateAdmissionEvidence(document);
  assert.equal(calls, 0);
  assert.deepEqual(issues(result), ['NOT_INSPECTABLE@limitations[0]']);
});

test('a rejected case limitation list is never re-read', () => {
  const document = doc();
  let calls = 0;
  const limitations = [];
  limitations.length = 1;
  Object.defineProperty(limitations, 0, {
    get() {
      calls += 1;
      return 'injected';
    },
    enumerable: true,
    configurable: true,
  });
  document.cases[0] = { ...document.cases[0], limitations };

  const result = validateAdmissionEvidence(document);
  // The entry is refused at its own descriptor and the array is never spread
  // afterwards, which is the read a naive copy would have performed.
  assert.equal(calls, 0);
  assert.deepEqual(issues(result), ['NOT_INSPECTABLE@cases[0].limitations[0]']);
});

test('a rejected case limitation list has no iterator invoked', () => {
  const document = doc();
  let calls = 0;
  const limitations = [];
  Object.defineProperty(limitations, Symbol.iterator, {
    get() {
      calls += 1;
      return Array.prototype[Symbol.iterator];
    },
    enumerable: false,
    configurable: true,
  });
  document.cases[1] = { ...document.cases[1], limitations };

  const result = validateAdmissionEvidence(document);
  assert.equal(calls, 0);
  // A symbol key is closed like any other extra, and its text never surfaces.
  assert.deepEqual(issues(result), ['UNEXPECTED_FIELD@cases[1].limitations']);
  assert.equal(JSON.stringify(result.issues).includes('iterator'), false);
});

test('an inherited array index is a hole, never a value', () => {
  const prototype = Object.create(Array.prototype);
  Object.defineProperty(prototype, '0', {
    value: 'inherited text',
    enumerable: true,
    configurable: true,
  });
  const limitations = [];
  limitations.length = 1;
  Object.setPrototypeOf(limitations, prototype);
  assert.equal(Array.isArray(limitations), true);
  // The inherited value is visible through ordinary property access …
  assert.equal(limitations[0], 'inherited text');

  const document = doc({ limitations });
  const result = validateAdmissionEvidence(document);
  // … but it is not an own item, so the array has a hole and nothing is read.
  assert.deepEqual(issues(result), ['SPARSE_ARRAY@limitations[0]']);
});

test('symbol-keyed and non-enumerable extras are closed like any other key', () => {
  const symbolKey = Symbol('hidden');
  const withSymbol = doc();
  withSymbol[symbolKey] = 'x';
  const symbolResult = validateAdmissionEvidence(withSymbol);
  assert.deepEqual(issues(symbolResult), ['UNEXPECTED_FIELD@']);
  assert.equal(JSON.stringify(symbolResult.issues).includes('hidden'), false);

  const withHidden = doc();
  Object.defineProperty(withHidden, 'pluginId', { value: 'x', enumerable: false });
  assert.deepEqual(issues(validateAdmissionEvidence(withHidden)), ['UNEXPECTED_FIELD@']);
});

test('an array carrying a non-index own key is not closed', () => {
  const document = doc();
  document.limitations.extra = true;
  assert.deepEqual(issues(validateAdmissionEvidence(document)), ['UNEXPECTED_FIELD@limitations']);
});

test('a class instance is not a plain object', () => {
  class Baseline {
    constructor() {
      this.commit = COMMIT;
      this.node = 'v24.9.0';
    }
  }
  const nested = validateAdmissionEvidence(doc({ baseline: new Baseline() }));
  assert.deepEqual(issues(nested), ['WRONG_TYPE@baseline']);

  class Document {}
  const root = validateAdmissionEvidence(new Document());
  assert.deepEqual(issues(root), ['INVALID_INPUT@']);

  // The same shape as a literal is accepted, so the refusal is about the object,
  // not its fields.
  assert.equal(
    validateAdmissionEvidence(doc({ baseline: { commit: COMMIT, node: 'v24.9.0' } })).valid,
    true,
  );
});

test('non-JSON roots are refused without throwing', () => {
  for (const value of [null, undefined, 42, 'x', [], true]) {
    const result = validateAdmissionEvidence(value);
    assert.equal(result.valid, false);
    assert.deepEqual(issues(result), ['INVALID_INPUT@']);
  }
});

test('a non-boolean passed value is a wrong type, not a coercion', () => {
  const document = doc();
  document.cases[0].assertions[0].passed = 'true';
  // The value is unreadable as a verdict, so the case cannot be judged consistent
  // either; the only report is the type error.
  assert.deepEqual(issues(validateAdmissionEvidence(document)), [
    'WRONG_TYPE@cases[0].assertions[0].passed',
  ]);
});

test('coordination members are checked against their own enums', () => {
  const identity = doc();
  identity.coordination.coordinatorIdentity = 'shared';
  assert.deepEqual(issues(validateAdmissionEvidence(identity)), [
    'INVALID_COORDINATION_VALUE@coordination.coordinatorIdentity',
  ]);

  const provisioning = doc();
  provisioning.coordination.provisioning = 'module-url-provisioned';
  const issue = only(validateAdmissionEvidence(provisioning));
  assert.equal(issue.code, 'INVALID_COORDINATION_VALUE');
  assert.equal(issue.path, 'coordination.provisioning');

  const visibility = doc();
  visibility.coordination.scopeVisibility = 'global';
  assert.deepEqual(issues(validateAdmissionEvidence(visibility)), [
    'INVALID_COORDINATION_VALUE@coordination.scopeVisibility',
  ]);

  for (const value of ['observed-identical', 'different', 'not-compared']) {
    const ok = doc();
    ok.coordination.coordinatorIdentity = value;
    assert.equal(validateAdmissionEvidence(ok).valid, true);
  }
});

test('strings must arrive already trimmed, and are never repaired', () => {
  const padded = doc({ baseline: { commit: COMMIT, node: ' v24.9.0 ' } });
  assert.deepEqual(issues(validateAdmissionEvidence(padded)), [
    'INVALID_STRING_FORMAT@baseline.node',
  ]);

  const empty = doc({ baseline: { commit: COMMIT, node: '' } });
  assert.deepEqual(issues(validateAdmissionEvidence(empty)), ['EMPTY_STRING@baseline.node']);

  const whitespaceOnly = doc({ baseline: { commit: COMMIT, node: '   ' } });
  assert.deepEqual(issues(validateAdmissionEvidence(whitespaceOnly)), [
    'INVALID_STRING_FORMAT@baseline.node',
  ]);

  const paddedLimitation = doc({ limitations: [' oops '] });
  assert.deepEqual(issues(validateAdmissionEvidence(paddedLimitation)), [
    'INVALID_STRING_FORMAT@limitations[0]',
  ]);

  // The document is not mutated into a valid one.
  assert.equal(padded.baseline.node, ' v24.9.0 ');
});

test('baseline.commit accepts only 40 lowercase hex or not-recorded', () => {
  assert.equal(
    validateAdmissionEvidence(doc({ baseline: { commit: 'not-recorded', node: 'v24.9.0' } })).valid,
    true,
  );
  for (const commit of ['A'.repeat(40), 'a'.repeat(39), 'a'.repeat(41), '', 'not-recorded ']) {
    const result = validateAdmissionEvidence(doc({ baseline: { commit, node: 'v24.9.0' } }));
    assert.equal(result.valid, false);
    assert.ok(issues(result).includes('INVALID_COMMIT@baseline.commit'), commit);
  }
});

test('labels.coordinator obeys the grammar and nothing else', () => {
  for (const label of ['hooks.run.js', 'svc-abc123', 'a_b', 'B' .repeat(1)]) {
    assert.equal(validateAdmissionEvidence(doc({ labels: { coordinator: label } })).valid, true, label);
  }
  for (const label of ['hooks/run.js', 'a:b', 'a b', '', '-'.repeat(65), 'ünïcode']) {
    const result = validateAdmissionEvidence(doc({ labels: { coordinator: label } }));
    const issue = only(result);
    assert.equal(issue.code, 'INVALID_LABEL', `expected INVALID_LABEL for ${JSON.stringify(label)}`);
    assert.equal(issue.path, 'labels.coordinator');
  }
  // A label is a label, not a stronger claim.
  const extra = validateAdmissionEvidence(doc({ labels: { coordinator: 'a', verified: true } }));
  assert.deepEqual(issues(extra), ['UNEXPECTED_FIELD@labels']);
});

test('limits and node are free text: a valid document may hold sensitive strings', () => {
  const document = doc({
    baseline: { commit: COMMIT, node: 'v24.9.0-/home/runner/work/secret' },
    limitations: ['ran on host runner-7 with token in env'],
  });
  const result = validateAdmissionEvidence(document);
  assert.equal(result.valid, true);
  // Copied through unchanged: this lane does not redact or scan.
  assert.deepEqual(result.summary.limitations, ['ran on host runner-7 with token in env']);
});

test('validation is pure: no mutation, stable across calls', () => {
  const document = doc();
  const snapshot = JSON.stringify(document);
  const first = validateAdmissionEvidence(document);
  const second = validateAdmissionEvidence(document);
  assert.equal(JSON.stringify(document), snapshot);
  assert.deepEqual(first, second);
  assert.notEqual(first.summary.cases, second.summary.cases);
  assert.notEqual(first.summary.limitations, second.summary.limitations);
});

test('case and assertion order do not affect the summary', () => {
  const forward = doc();
  const reversed = doc();
  reversed.cases = [...reversed.cases].reverse();
  for (const entry of reversed.cases) entry.assertions = [...entry.assertions].reverse();

  const left = validateAdmissionEvidence(forward);
  const right = validateAdmissionEvidence(reversed);
  assert.equal(left.valid, true);
  assert.equal(right.valid, true);
  assert.deepEqual(left.summary, right.summary);
});

test('per-case limitations survive summarisation in document order', () => {
  const document = doc();
  document.cases[caseIndex(document, 'admission-admitted')].limitations = [
    'first note',
    'second note',
  ];
  const entry = validateAdmissionEvidence(document).summary.cases.find(
    (item) => item.id === 'admission-admitted',
  );
  assert.deepEqual(entry.limitations, ['first note', 'second note']);
});

test('issues are deterministic and ordered by location then code', () => {
  const document = doc({ schemaVersion: 'nope' });
  document.pluginId = 'x';
  document.coordination.provisioning = 'nope';
  const first = validateAdmissionEvidence(document);
  const second = validateAdmissionEvidence(document);
  assert.deepEqual(first.issues, second.issues);
  assert.deepEqual(issues(first), [
    'UNEXPECTED_FIELD@',
    'INVALID_SCHEMA_VERSION@schemaVersion',
    'INVALID_COORDINATION_VALUE@coordination.provisioning',
  ]);
});

test('every reported code is in the closed list', () => {
  const broken = doc({ schemaVersion: 5 });
  broken.pluginId = true;
  broken.baseline = { commit: 'zz', node: 7 };
  broken.labels = 'x';
  broken.cases[0].status = 'maybe';
  broken.limitations = [null];
  const result = validateAdmissionEvidence(broken);
  assert.equal(result.valid, false);
  for (const issue of result.issues) {
    assert.ok(ISSUE_CODE_ORDER.includes(issue.code), `unexpected code ${issue.code}`);
    assert.equal(typeof issue.path, 'string');
    assert.deepEqual(Object.keys(issue).sort(), ['code', 'path']);
  }
});

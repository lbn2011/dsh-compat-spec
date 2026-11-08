/**
 * dsh-compat-spec — admission evidence lane (`admission-evidence/0.1-draft.1`).
 *
 * This module is the *reference validator* for the admission evidence lane
 * described in `spec/admission-evidence.md` §4–§6.7. It is a pure,
 * dependency-free function: no I/O, no clock, no randomness, no network, no
 * subprocess, and no mutation of its input.
 *
 * It answers exactly one question: **is this document internally consistent?**
 * A green result is NOT evidence that anything was admitted, that a run
 * happened, or that the producer is honest. Passing validation means the field
 * set is closed, the ids are known, the status matches both the case and its
 * assertions, and nothing forbidden travelled along. Every provenance field is
 * a claim typed by whoever wrote the document (§7), so `certification` is the
 * literal `false` in every summary this module produces.
 *
 * The lane and its version literal were selected by the user (2026-11-04). The
 * case catalog, the assertion sets and this return contract are a Lead-frozen
 * draft implementation contract: frozen so that implementation could begin, not
 * ratified, not published, and still carrying the `-draft.1` literal.
 *
 * @packageDocumentation
 */

/** The single accepted `schemaVersion` literal. */
export const VERSION = 'admission-evidence/0.1-draft.1';

/**
 * The four status words, in the order the spec introduces them (§5).
 *
 * The words are bound to the case catalog: a status is *checked* against the
 * case it is attached to, never chosen freely (§6.3).
 */
export const CASE_STATUSES = Object.freeze(['passed', 'refused', 'failed', 'not-run']);

/**
 * The closed diagnostic codes, in emission order within one location (§6.7).
 *
 * Within a single `path` the issues this module returns are sorted by their
 * index in this list; across paths they follow traversal order (root,
 * `baseline`, `coordination`, `labels`, `cases` in array order, `limitations`).
 */
export const ISSUE_CODE_ORDER = Object.freeze([
  'INVALID_INPUT',
  'NOT_INSPECTABLE',
  'UNEXPECTED_FIELD',
  'MISSING_FIELD',
  'WRONG_TYPE',
  'EMPTY_STRING',
  'INVALID_STRING_FORMAT',
  'SPARSE_ARRAY',
  'INVALID_SCHEMA_VERSION',
  'INVALID_COMMIT',
  'INVALID_COORDINATION_VALUE',
  'INVALID_LABEL',
  'FORBIDDEN_FIELD',
  'UNKNOWN_CASE_ID',
  'DUPLICATE_CASE_ID',
  'MISSING_REQUIRED_CASE',
  'UNKNOWN_ASSERTION_ID',
  'DUPLICATE_ASSERTION_ID',
  'MISSING_ASSERTION',
  'INVALID_STATUS',
  'STATUS_NOT_ALLOWED_FOR_CASE',
  'STATUS_ASSERTION_MISMATCH',
  'NOT_RUN_REQUIRES_LIMITATION',
]);

/** The closed case catalog, in catalog order (§6.1). */
export const CASE_IDS = Object.freeze([
  'admission-admitted',
  'admission-refused-conflict',
  'admission-activation-throw',
  'admission-cleanup-failure',
  'admission-lease-state',
  'admission-tuple-shape',
  'admission-remount-same-coordinator',
  'admission-visibility',
]);

/** The four cases a valid document must report (§6.1, §6.5). */
export const REQUIRED_CASE_IDS = Object.freeze(CASE_IDS.slice(0, 4));

/**
 * Exact assertion sets per case, in the order §6.2 lists them.
 *
 * Order is load-bearing: `summary.cases[i].failedAssertions` is emitted in this
 * order, never in document order, so permuting a document's assertion array
 * cannot change its summary.
 */
export const ASSERTION_IDS = Object.freeze({
  'admission-admitted': Object.freeze([
    'reservation-precedes-activation',
    'activation-ran-once',
    'caller-effect-observed-once',
    'close-fulfilled',
    'close-returns-same-promise',
    'claim-released-after-close',
    'disposer-ran-exactly-once',
  ]),
  'admission-refused-conflict': Object.freeze([
    'refusal-code-conflict',
    'refusal-before-any-callback',
    'contender-activation-ran-zero',
    'contender-effect-ran-zero',
    'holder-claim-still-held',
  ]),
  'admission-activation-throw': Object.freeze([
    'activation-entered-then-threw',
    'registered-rollback-callbacks-settled',
    'rethrow-same-error-identity',
    'rollback-disposer-ran-exactly-once',
    'claim-quarantined-after-throw',
  ]),
  'admission-cleanup-failure': Object.freeze([
    'close-rejected',
    'close-rejection-code-cleanup-failed',
    'disposer-ran-exactly-once',
    'claim-not-released-after-failed-cleanup',
    'later-reservation-conflicts',
  ]),
  'admission-lease-state': Object.freeze([
    'release-idempotent',
    'stale-release-frees-nothing',
    'release-quarantined-refused',
    'quarantine-released-refused',
  ]),
  'admission-tuple-shape': Object.freeze([
    'refuses-extra-own-key',
    'refuses-non-own-field',
    'refuses-accessor-field',
    'refuses-untrimmed-name',
    'refuses-untrimmed-scope',
    'refuses-wrong-kind',
    'refuses-empty-string',
  ]),
  'admission-remount-same-coordinator': Object.freeze([
    'same-coordinator-after-remount',
    'unreleased-claim-still-held',
  ]),
  'admission-visibility': Object.freeze([
    'coordinator-object-identical',
    'scope-visibility-recorded',
  ]),
});

/** Coordinator identity states (§4). */
export const COORDINATOR_IDENTITY_VALUES = Object.freeze([
  'observed-identical',
  'different',
  'not-compared',
]);

/** How the coordinator reached the participant — provenance, never authentication (§4). */
export const PROVISIONING_VALUES = Object.freeze(['caller-supplied', 'not-determined']);

/** Visibility scope states (§4). */
export const SCOPE_VISIBILITY_VALUES = Object.freeze([
  'same-visibility-scope',
  'different-scope',
  'not-determined',
]);

// Rule references from §6.1, kept next to the catalog for reviewers; they carry
// no behaviour and are not part of the validated document. Declared before the
// catalog because the catalog reads them while the module is evaluated.
const SUPPORTED_RULES = Object.freeze({
  'admission-admitted': Object.freeze(['R1', 'R3', 'R6']),
  'admission-refused-conflict': Object.freeze(['R1', 'R2']),
  'admission-activation-throw': Object.freeze(['R4']),
  'admission-cleanup-failure': Object.freeze(['R5', 'R7']),
  'admission-lease-state': Object.freeze(['R7']),
  'admission-tuple-shape': Object.freeze(['R2']),
  'admission-remount-same-coordinator': Object.freeze(['R8']),
  'admission-visibility': Object.freeze(['R8', 'R9']),
});

/**
 * The catalog as data: one frozen entry per case id, in catalog order.
 *
 * `allowedStatuses` is derived from §5: `refused` exists only for the case whose
 * expected outcome is a refusal, and `passed` is not available to that case.
 */
export const CASE_CATALOG = Object.freeze(
  CASE_IDS.map((id) => {
    const required = REQUIRED_CASE_IDS.includes(id);
    const expectedRefusal = id === 'admission-refused-conflict';
    return Object.freeze({
      id,
      required,
      expectedOutcome: expectedRefusal ? 'refusal' : 'completion',
      supportedRules: SUPPORTED_RULES[id],
      allowedStatuses: expectedRefusal
        ? Object.freeze(['refused', 'failed', 'not-run'])
        : Object.freeze(['passed', 'failed', 'not-run']),
      assertionIds: ASSERTION_IDS[id],
    });
  }),
);

const ROOT_FIELDS = Object.freeze([
  'schemaVersion',
  'baseline',
  'coordination',
  'labels',
  'cases',
  'limitations',
]);

const ROOT_REQUIRED_FIELDS = Object.freeze([
  'schemaVersion',
  'baseline',
  'coordination',
  'cases',
  'limitations',
]);

const BASELINE_FIELDS = Object.freeze(['commit', 'node']);
const COORDINATION_FIELDS = Object.freeze([
  'coordinatorIdentity',
  'provisioning',
  'scopeVisibility',
]);
const LABELS_FIELDS = Object.freeze(['coordinator']);
const CASE_FIELDS = Object.freeze(['id', 'status', 'assertions', 'limitations']);
const ASSERTION_FIELDS = Object.freeze(['id', 'passed']);

/**
 * Field names that would turn a record into a provenance attempt (§7).
 *
 * A document carrying one of these is refused rather than ignored: a signature
 * field that a validator merely skipped would still be read by a human as
 * authentication.
 */
const FORBIDDEN_FIELDS = Object.freeze([
  'signature',
  'key',
  'certificate',
  'issuer',
  'attestation',
  'verified-by',
]);

const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const LABEL_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

const CODE_RANK = new Map(ISSUE_CODE_ORDER.map((code, index) => [code, index]));

const COORDINATION_DOMAINS = Object.freeze({
  coordinatorIdentity: COORDINATOR_IDENTITY_VALUES,
  provisioning: PROVISIONING_VALUES,
  scopeVisibility: SCOPE_VISIBILITY_VALUES,
});

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

/**
 * A plain object is an object literal: its prototype is `Object.prototype` or
 * `null`.
 *
 * Class instances are refused. They carry behaviour and inherited members, and a
 * document is supposed to be data recovered from `JSON.parse` — an instance
 * silently supplies values from its prototype chain, which is exactly what the
 * closed-field rule is meant to exclude.
 */
function isPlainObject(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    // A proxy trap that throws here is not a plain object we can vouch for.
    return false;
  }
}

function isForbiddenField(key) {
  return typeof key === 'string' && FORBIDDEN_FIELDS.includes(key);
}

/**
 * Reads an own property without running caller code.
 *
 * A data descriptor is returned as a value; an own accessor is not invoked, it
 * is reported as not inspectable. This is a best-effort guard — a proxy trap can
 * still run before this function is reached, which is why the module promises
 * nothing about hostile object graphs (§6.6).
 */
function readOwn(object, key) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (descriptor === undefined) return { state: 'missing' };
    if (!hasOwn(descriptor, 'value')) return { state: 'not-inspectable' };
    return { state: 'value', value: descriptor.value };
  } catch {
    return { state: 'not-inspectable' };
  }
}

function ownKeys(object) {
  try {
    // Reflect.ownKeys sees symbol-keyed and non-enumerable own properties, which
    // Object.keys does not. A field a validator cannot see is a claim that would
    // travel unread, so the closed-field rule has to be evaluated against these.
    return Reflect.ownKeys(object);
  } catch {
    return null;
  }
}

const CANONICAL_INDEX = /^(?:0|[1-9][0-9]*)$/;

function isCanonicalIndex(key, length) {
  return typeof key === 'string' && CANONICAL_INDEX.test(key) && Number(key) < length;
}

/**
 * Reads one array item from an own data descriptor.
 *
 * `index in array` and `array[index]` are both wrong here: the first walks the
 * prototype chain, and the second invokes an accessor and can return an inherited
 * value. A hole is an absent *own* property; an own accessor is not inspectable;
 * an inherited index is simply not part of the array.
 */
function readArrayItem(array, index) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(array, String(index));
    if (descriptor === undefined) return { state: 'missing' };
    if (!hasOwn(descriptor, 'value')) return { state: 'not-inspectable' };
    return { state: 'value', value: descriptor.value };
  } catch {
    return { state: 'not-inspectable' };
  }
}

/**
 * Rejects own keys on an array that are not `length` and not an index in range.
 *
 * A closed contract means the array carries items and nothing else; a stray
 * property would otherwise ride along unseen. The offending key's text never
 * enters a path.
 */
function checkArrayExtras(array, path, sink) {
  const keys = ownKeys(array);
  if (keys === null) {
    sink.at(path, 'NOT_INSPECTABLE');
    return;
  }
  for (const key of keys) {
    if (key === 'length') continue;
    if (isCanonicalIndex(key, array.length)) continue;
    sink.at(path, 'UNEXPECTED_FIELD');
  }
}

/**
 * Issue sink: groups codes by location, keeps locations in traversal order, and
 * sorts the codes inside one location by §6.7 order.
 *
 * Identical codes at one location collapse into a single issue. That is
 * deliberate for unknown keys and unknown assertion ids: an unknown key must be
 * named at its parent location and its own name must never appear in a path, so
 * two unknown keys at one location are one reportable fact.
 */
function createIssueSink() {
  const codesByPath = new Map();
  const pathOrder = [];
  return {
    at(path, code) {
      if (!codesByPath.has(path)) {
        codesByPath.set(path, new Set());
        pathOrder.push(path);
      }
      codesByPath.get(path).add(code);
    },
    issues() {
      const result = [];
      for (const path of pathOrder) {
        const codes = [...codesByPath.get(path)].sort(
          (left, right) => CODE_RANK.get(left) - CODE_RANK.get(right),
        );
        for (const code of codes) result.push({ code, path });
      }
      return result;
    },
    get size() {
      return pathOrder.length;
    },
  };
}

function checkClosedFields(object, path, allowed, sink) {
  const keys = ownKeys(object);
  if (keys === null) {
    sink.at(path, 'NOT_INSPECTABLE');
    return;
  }
  for (const key of keys) {
    // A forbidden key is reported as such instead of as unexpected: the two
    // would otherwise describe the same key twice, and the specific code is the
    // actionable one. The key's own text never enters the path.
    if (isForbiddenField(key)) sink.at(path, 'FORBIDDEN_FIELD');
    else if (!allowed.includes(key)) sink.at(path, 'UNEXPECTED_FIELD');
  }
}

function requireField(object, key, path, sink) {
  const read = readOwn(object, key);
  if (read.state === 'missing') {
    sink.at(path, 'MISSING_FIELD');
    return { ok: false };
  }
  if (read.state === 'not-inspectable') {
    sink.at(path, 'NOT_INSPECTABLE');
    return { ok: false };
  }
  return { ok: true, value: read.value };
}

/** A required string that must be non-empty and already trimmed (§4). */
function checkStrictString(value, path, sink) {
  if (typeof value !== 'string') {
    sink.at(path, 'WRONG_TYPE');
    return false;
  }
  if (value === '') {
    sink.at(path, 'EMPTY_STRING');
    return false;
  }
  // No trimming and no normalisation: a padded string is refused, never repaired.
  if (value.trim() !== value) {
    sink.at(path, 'INVALID_STRING_FORMAT');
    return false;
  }
  return true;
}

/**
 * Validates a limitation list and returns the VALUES IT KEPT.
 *
 * The return value is a fresh array of primitives built from own data
 * descriptors. Callers must copy from it and never re-read the input: re-reading
 * a rejected array — `[...value]`, `value.slice()`, `Array.from(value)` — goes
 * through `Symbol.iterator` and per-index `[[Get]]`, which invokes an accessor or
 * a custom iterator on exactly the input this function just refused (§6.6).
 */
function checkLimitations(value, path, sink) {
  if (!Array.isArray(value)) {
    sink.at(path, 'WRONG_TYPE');
    return [];
  }
  checkArrayExtras(value, path, sink);
  const kept = [];
  for (let index = 0; index < value.length; index += 1) {
    const entryPath = `${path}[${index}]`;
    const item = readArrayItem(value, index);
    if (item.state === 'missing') {
      sink.at(entryPath, 'SPARSE_ARRAY');
      continue;
    }
    if (item.state === 'not-inspectable') {
      sink.at(entryPath, 'NOT_INSPECTABLE');
      continue;
    }
    if (checkStrictString(item.value, entryPath, sink)) kept.push(item.value);
  }
  return kept;
}

function checkBaseline(value, sink) {
  if (!isPlainObject(value)) {
    sink.at('baseline', 'WRONG_TYPE');
    return;
  }
  checkClosedFields(value, 'baseline', BASELINE_FIELDS, sink);

  const commit = requireField(value, 'commit', 'baseline.commit', sink);
  if (commit.ok) {
    if (typeof commit.value !== 'string') sink.at('baseline.commit', 'WRONG_TYPE');
    else if (commit.value !== 'not-recorded' && !COMMIT_PATTERN.test(commit.value)) {
      sink.at('baseline.commit', 'INVALID_COMMIT');
    }
  }

  const node = requireField(value, 'node', 'baseline.node', sink);
  if (node.ok) checkStrictString(node.value, 'baseline.node', sink);
}

function checkCoordination(value, sink) {
  if (!isPlainObject(value)) {
    sink.at('coordination', 'WRONG_TYPE');
    return;
  }
  checkClosedFields(value, 'coordination', COORDINATION_FIELDS, sink);

  for (const member of COORDINATION_FIELDS) {
    const path = `coordination.${member}`;
    const read = requireField(value, member, path, sink);
    if (!read.ok) continue;
    if (typeof read.value !== 'string') {
      sink.at(path, 'WRONG_TYPE');
      continue;
    }
    // The path names the member and never the value (§6.7).
    if (!COORDINATION_DOMAINS[member].includes(read.value)) {
      sink.at(path, 'INVALID_COORDINATION_VALUE');
    }
  }
}

function checkLabels(value, sink) {
  if (!isPlainObject(value)) {
    sink.at('labels', 'WRONG_TYPE');
    return;
  }
  checkClosedFields(value, 'labels', LABELS_FIELDS, sink);

  const read = readOwn(value, 'coordinator');
  if (read.state === 'not-inspectable') {
    sink.at('labels.coordinator', 'NOT_INSPECTABLE');
    return;
  }
  if (read.state === 'missing') return;
  if (typeof read.value !== 'string') {
    sink.at('labels.coordinator', 'WRONG_TYPE');
    return;
  }
  // The grammar is the whole rule: no extension ban, no URL heuristic, and no
  // anonymity guarantee (§4).
  if (!LABEL_PATTERN.test(read.value)) sink.at('labels.coordinator', 'INVALID_LABEL');
}

function checkAssertions(value, casePath, caseId, status, sink) {
  const path = `${casePath}.assertions`;
  if (!Array.isArray(value)) {
    sink.at(path, 'WRONG_TYPE');
    return null;
  }

  const expected = caseId === null ? null : ASSERTION_IDS[caseId];
  const seen = new Set();
  const entries = [];
  let wellFormed = true;

  checkArrayExtras(value, path, sink);

  for (let index = 0; index < value.length; index += 1) {
    const entryPath = `${path}[${index}]`;
    const item = readArrayItem(value, index);
    if (item.state === 'missing') {
      sink.at(entryPath, 'SPARSE_ARRAY');
      wellFormed = false;
      continue;
    }
    if (item.state === 'not-inspectable') {
      sink.at(entryPath, 'NOT_INSPECTABLE');
      wellFormed = false;
      continue;
    }
    const assertion = item.value;
    if (!isPlainObject(assertion)) {
      sink.at(entryPath, 'WRONG_TYPE');
      wellFormed = false;
      continue;
    }
    checkClosedFields(assertion, entryPath, ASSERTION_FIELDS, sink);

    const id = requireField(assertion, 'id', `${entryPath}.id`, sink);
    let idOk = false;
    if (id.ok) {
      if (typeof id.value !== 'string') {
        sink.at(`${entryPath}.id`, 'WRONG_TYPE');
      } else if (expected !== null && !expected.includes(id.value)) {
        // The id is from a closed set, so reports name the location only.
        sink.at(`${entryPath}.id`, 'UNKNOWN_ASSERTION_ID');
      } else if (seen.has(id.value)) {
        sink.at(`${entryPath}.id`, 'DUPLICATE_ASSERTION_ID');
      } else {
        seen.add(id.value);
        idOk = true;
      }
    }

    const passed = requireField(assertion, 'passed', `${entryPath}.passed`, sink);
    let passedOk = false;
    if (passed.ok) {
      if (typeof passed.value !== 'boolean') sink.at(`${entryPath}.passed`, 'WRONG_TYPE');
      else passedOk = true;
    }

    if (idOk && passedOk) entries.push({ id: id.value, passed: passed.value });
    else wellFormed = false;
  }

  // A `not-run` case carries no assertions by definition, so the exact-set rule
  // does not apply to it: requiring the full set would make every honest
  // "nobody tried" record invalid (§5, rule 2).
  if (expected !== null && status !== 'not-run') {
    for (const id of expected) {
      if (!seen.has(id)) sink.at(path, 'MISSING_ASSERTION');
    }
  }

  return wellFormed ? entries : null;
}

function checkStatusAgainstAssertions(status, casePath, entries) {
  if (entries === null) return null;
  if (entries.length === 0) return status === 'not-run' ? 'ok' : 'mismatch';
  if (status === 'not-run') return 'mismatch';
  const anyFalse = entries.some((entry) => entry.passed === false);
  if (status === 'failed') return anyFalse ? 'ok' : 'mismatch';
  // `passed` and `refused` both require at least one assertion, all true.
  return anyFalse ? 'mismatch' : 'ok';
}

function checkCases(value, sink) {
  if (!Array.isArray(value)) {
    sink.at('cases', 'WRONG_TYPE');
    return null;
  }

  const reported = new Map();
  const entries = [];

  checkArrayExtras(value, 'cases', sink);

  for (let index = 0; index < value.length; index += 1) {
    const path = `cases[${index}]`;
    const item = readArrayItem(value, index);
    if (item.state === 'missing') {
      sink.at(path, 'SPARSE_ARRAY');
      continue;
    }
    if (item.state === 'not-inspectable') {
      sink.at(path, 'NOT_INSPECTABLE');
      continue;
    }
    const entry = item.value;
    if (!isPlainObject(entry)) {
      sink.at(path, 'WRONG_TYPE');
      continue;
    }
    checkClosedFields(entry, path, CASE_FIELDS, sink);

    const idRead = requireField(entry, 'id', `${path}.id`, sink);
    let caseId = null;
    if (idRead.ok) {
      if (typeof idRead.value !== 'string') {
        sink.at(`${path}.id`, 'WRONG_TYPE');
      } else if (!CASE_IDS.includes(idRead.value)) {
        sink.at(`${path}.id`, 'UNKNOWN_CASE_ID');
      } else {
        caseId = idRead.value;
        if (reported.has(caseId)) sink.at(`${path}.id`, 'DUPLICATE_CASE_ID');
        else reported.set(caseId, index);
      }
    }

    const statusRead = requireField(entry, 'status', `${path}.status`, sink);
    let status = null;
    if (statusRead.ok) {
      if (typeof statusRead.value !== 'string') {
        sink.at(`${path}.status`, 'WRONG_TYPE');
      } else if (!CASE_STATUSES.includes(statusRead.value)) {
        sink.at(`${path}.status`, 'INVALID_STATUS');
      } else {
        status = statusRead.value;
        if (caseId !== null) {
          const catalogEntry = CASE_CATALOG.find((entrySpec) => entrySpec.id === caseId);
          if (!catalogEntry.allowedStatuses.includes(status)) {
            sink.at(`${path}.status`, 'STATUS_NOT_ALLOWED_FOR_CASE');
          }
        }
      }
    }

    const assertionsRead = readOwn(entry, 'assertions');
    let assertionEntries = null;
    let assertionCount = 0;
    if (assertionsRead.state === 'missing') {
      sink.at(`${path}.assertions`, 'MISSING_FIELD');
    } else if (assertionsRead.state === 'not-inspectable') {
      sink.at(`${path}.assertions`, 'NOT_INSPECTABLE');
    } else {
      assertionEntries = checkAssertions(assertionsRead.value, path, caseId, status, sink);
      assertionCount = Array.isArray(assertionsRead.value)
        ? assertionEntries === null
          ? countDense(assertionsRead.value)
          : assertionEntries.length
        : 0;
    }

    const limitationsRead = requireField(entry, 'limitations', `${path}.limitations`, sink);
    // Kept values only: the input array is never re-read or spread (§6.6).
    let limitationValues = [];
    if (limitationsRead.ok) {
      limitationValues = checkLimitations(limitationsRead.value, `${path}.limitations`, sink);
    }

    if (status !== null && assertionEntries !== null) {
      if (checkStatusAgainstAssertions(status, path, assertionEntries) === 'mismatch') {
        sink.at(`${path}.status`, 'STATUS_ASSERTION_MISMATCH');
      }
    }
    if (status === 'not-run' && limitationsRead.ok && limitationValues.length === 0) {
      sink.at(`${path}.limitations`, 'NOT_RUN_REQUIRES_LIMITATION');
    }

    if (caseId !== null && status !== null) {
      entries.push({
        id: caseId,
        index,
        status,
        assertionCount,
        assertionEntries,
        limitations: limitationValues,
      });
    }
  }

  for (const id of REQUIRED_CASE_IDS) {
    if (!reported.has(id)) sink.at('cases', 'MISSING_REQUIRED_CASE');
  }

  return entries;
}

function countDense(array) {
  let count = 0;
  for (let index = 0; index < array.length; index += 1) {
    if (readArrayItem(array, index).state !== 'missing') count += 1;
  }
  return count;
}

/**
 * Copies a list of validated strings without touching the iteration protocol.
 *
 * Every input here is already a fresh array this module built from own data
 * descriptors, so a plain index loop is both sufficient and the only copy that
 * cannot be redirected by a `Symbol.iterator` left on anything the caller owns.
 */
function copyStrings(list) {
  const copy = [];
  for (let index = 0; index < list.length; index += 1) copy.push(list[index]);
  return copy;
}

function buildSummary(root, caseEntries) {
  const byId = new Map(caseEntries.map((entry) => [entry.id, entry]));
  const present = CASE_IDS.filter((id) => byId.has(id));
  const unknown = CASE_IDS.filter((id) => !byId.has(id));

  return {
    schemaVersion: VERSION,
    // Literal, always false: this lane authenticates nothing (§7).
    certification: false,
    coverage: {
      required: copyStrings(REQUIRED_CASE_IDS),
      present,
      unknown,
    },
    cases: present.map((id) => {
      const entry = byId.get(id);
      const catalogAssertions = ASSERTION_IDS[id];
      const observed = new Map(
        (entry.assertionEntries ?? []).map((assertion) => [assertion.id, assertion.passed]),
      );
      // Catalog order, unique, and empty unless the case is `failed`, so that a
      // permuted document summarises identically (§6.6).
      const failedAssertions = catalogAssertions.filter((id2) => observed.get(id2) === false);
      return {
        id,
        status: entry.status,
        assertionCount: entry.assertionCount,
        failedAssertions: entry.status === 'failed' ? failedAssertions : [],
        limitations: copyStrings(entry.limitations),
      };
    }),
    limitations: copyStrings(root.limitations),
  };
}

/**
 * Validates one admission evidence document.
 *
 * Synchronous, pure and deterministic. It returns
 * `{ valid: true, issues: [], summary }` or `{ valid: false, issues }` — the
 * `summary` key is absent when invalid, never null and never partial.
 *
 * It does not throw for any value produced by `JSON.parse`. That is a promise
 * about parsed JSON, not a sandbox promise: an own accessor, a proxy trap or a
 * getter can run code inside the caller's object before any validation logic is
 * reached, and this lane does not defend against a hostile object graph (§6.6).
 *
 * @param {unknown} value A value produced by `JSON.parse`.
 * @returns {{ valid: boolean, issues: Array<{ code: string, path: string }>, summary?: object }}
 */
export function validateAdmissionEvidence(value) {
  if (!isPlainObject(value)) return { valid: false, issues: [{ code: 'INVALID_INPUT', path: '' }] };

  const sink = createIssueSink();
  checkClosedFields(value, '', ROOT_FIELDS, sink);
  for (const field of ROOT_REQUIRED_FIELDS) {
    const read = readOwn(value, field);
    if (read.state === 'missing') sink.at(field, 'MISSING_FIELD');
    else if (read.state === 'not-inspectable') sink.at(field, 'NOT_INSPECTABLE');
  }

  const schemaVersion = readOwn(value, 'schemaVersion');
  if (schemaVersion.state === 'value') {
    if (typeof schemaVersion.value !== 'string') sink.at('schemaVersion', 'WRONG_TYPE');
    else if (schemaVersion.value !== VERSION) sink.at('schemaVersion', 'INVALID_SCHEMA_VERSION');
  }

  const baseline = readOwn(value, 'baseline');
  if (baseline.state === 'value') checkBaseline(baseline.value, sink);

  const coordination = readOwn(value, 'coordination');
  if (coordination.state === 'value') checkCoordination(coordination.value, sink);

  const labels = readOwn(value, 'labels');
  if (labels.state === 'value') checkLabels(labels.value, sink);
  else if (labels.state === 'not-inspectable') sink.at('labels', 'NOT_INSPECTABLE');

  const cases = readOwn(value, 'cases');
  const caseEntries = cases.state === 'value' ? checkCases(cases.value, sink) : null;

  const limitations = readOwn(value, 'limitations');
  let rootLimitations = [];
  if (limitations.state === 'value') {
    rootLimitations = checkLimitations(limitations.value, 'limitations', sink);
  }

  const issues = sink.issues();
  if (issues.length > 0) return { valid: false, issues };

  return {
    valid: true,
    issues: [],
    summary: buildSummary({ limitations: rootLimitations }, caseEntries ?? []),
  };
}

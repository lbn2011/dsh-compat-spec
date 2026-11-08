import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ISSUE_CODES,
  PROTOCOL_VERSION,
  RESOURCE_KINDS,
  assertValidDeclaration,
  declarationJsonSchema,
  declarationTemplate,
  validateDeclaration,
} from '../../src/index.js';

const SCHEMA_PATH = fileURLToPath(new URL('../../spec/declaration.schema.json', import.meta.url));

function valid(overrides = {}) {
  const declaration = {
    schemaVersion: PROTOCOL_VERSION,
    plugin: { id: 'example.plugin', version: '1.2.3' },
    capabilities: { required: [], optional: [] },
    resources: [],
  };
  return { ...declaration, ...overrides };
}

function only(result) {
  assert.equal(result.issues.length, 1, `expected exactly one issue, got ${JSON.stringify(result.issues)}`);
  return result.issues[0];
}

function issueList(result) {
  return [...result.issues].map((entry) => `${entry.code}@${entry.path}`);
}

test('PROTOCOL_VERSION is the single accepted schemaVersion', () => {
  assert.equal(PROTOCOL_VERSION, '0.1.0-draft.1');
  assert.equal(validateDeclaration(valid()).valid, true);
  for (const wrong of ['0.1.0', '0.1.0-draft.2', '0.1.0-DRAFT.1', '1.0.0']) {
    const result = validateDeclaration(valid({ schemaVersion: wrong }));
    assert.equal(result.valid, false);
    assert.equal(only(result).code, ISSUE_CODES.INVALID_VALUE);
    assert.equal(only(result).path, 'schemaVersion');
  }
});

test('a minimal declaration is accepted and produces no issues', () => {
  const result = validateDeclaration(valid());
  assert.deepEqual({ ...result, issues: [...result.issues] }, { valid: true, issues: [] });
});

test('the returned result and issues are frozen and JSON-serializable', () => {
  const result = validateDeclaration(valid({ plugin: { id: '', version: '1' } }));
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.issues), true);
  assert.equal(Object.isFrozen(result.issues[0]), true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.issues[0])), {
    code: 'INVALID_VALUE',
    path: 'plugin.id',
    message: 'plugin.id must not be an empty string.',
    severity: 'error',
  });
});

test('resources is a required array: omitted and null are both rejected, never defaulted', () => {
  assert.equal(validateDeclaration(valid({ resources: [] })).valid, true);

  const omitted = valid();
  delete omitted.resources;
  const missing = validateDeclaration(omitted);
  assert.equal(missing.valid, false);
  assert.deepEqual(issueList(missing), ['MISSING_FIELD@resources']);

  const nulled = validateDeclaration(valid({ resources: null }));
  assert.deepEqual(issueList(nulled), ['TYPE_MISMATCH@resources']);

  for (const bad of [undefined, {}, 0, false, 'null', new Set()]) {
    const result = validateDeclaration(valid({ resources: bad }));
    assert.equal(result.valid, false, `resources ${String(bad)}`);
    assert.deepEqual(issueList(result), ['TYPE_MISMATCH@resources'], `resources ${String(bad)}`);
  }

  // An empty object inside the list is a per-entry defect, not a top-level one.
  assert.deepEqual(issueList(validateDeclaration(valid({ resources: [{}] }))), [
    'MISSING_FIELD@resources[0].kind',
    'MISSING_FIELD@resources[0].name',
    'MISSING_FIELD@resources[0].scope',
  ]);
});

test('scope is any static label and is never defaulted', () => {
  assert.deepEqual([...RESOURCE_KINDS], ['tool', 'service']);

  // Positive: free-form labels, including ones an enumeration would reject.
  for (const scope of ['plugin', 'shared', 'host', 'agent', 'per-session', 'a b', '团队']) {
    const result = validateDeclaration(valid({ resources: [{ kind: 'tool', name: 'echo', scope }] }));
    assert.deepEqual(result.issues, [], JSON.stringify(scope));
  }

  // Negative: absent, null, wrong type, or a label violating the string rules.
  for (const [scope, code] of [
    [undefined, 'MISSING_FIELD'],
    [null, 'TYPE_MISMATCH'],
    [true, 'TYPE_MISMATCH'],
    [0, 'TYPE_MISMATCH'],
    ['', 'INVALID_VALUE'],
    [' plugin', 'INVALID_VALUE'],
    ['plugin\t', 'INVALID_VALUE'],
    ['plug\u0000in', 'INVALID_VALUE'],
  ]) {
    const entry = { kind: 'tool', name: 'echo' };
    if (scope !== undefined) entry.scope = scope;
    const issue = only(validateDeclaration(valid({ resources: [entry] })));
    assert.equal(issue.code, code, JSON.stringify(scope));
    assert.equal(issue.path, 'resources[0].scope', JSON.stringify(scope));
  }
});

test('scope is not an enumeration: no closed vocabulary is exported or reported', async () => {
  const module = await import('../../src/index.js');
  for (const removed of ['SCOPES', 'SCOPE_PLUGIN', 'SCOPE_SHARED', 'RESOURCES_OMITTED', 'DEFAULT_RESOURCES']) {
    assert.equal(Object.hasOwn(module, removed), false, `${removed} must not be exported`);
  }
  assert.equal(Object.hasOwn(ISSUE_CODES, 'UNKNOWN_SCOPE'), false, 'UNKNOWN_SCOPE must not exist');

  // Every emitted issue code is defined, so the codes table is not a superset of dead names.
  const emitted = new Set(
    [
      valid(),
      valid({ resources: null }),
      valid({ extra: 1 }),
      valid({ resources: [{ kind: 'widget', name: 'x', scope: 'y' }] }),
      valid({ capabilities: { required: ['a', 'a'], optional: [] } }),
      null,
    ].flatMap((input) => [...validateDeclaration(input).issues].map((entry) => entry.code)),
  );
  for (const code of emitted) assert.ok(Object.values(ISSUE_CODES).includes(code), code);
});

test('empty lists are required and rejected explicitly rather than defaulted', () => {
  for (const field of ['required', 'optional']) {
    const capabilities = { required: [], optional: [] };
    delete capabilities[field];
    const result = validateDeclaration(valid({ capabilities }));
    assert.deepEqual(issueList(result), [`MISSING_FIELD@capabilities.${field}`]);
  }
});

test('capability names may not be duplicated nor appear in both lists', () => {
  const duplicate = validateDeclaration(
    valid({ capabilities: { required: ['b', 'a', 'b'], optional: [] } }),
  );
  assert.equal(duplicate.valid, false);
  assert.deepEqual(
    [...duplicate.issues].map((entry) => [entry.code, entry.path]),
    [['INVALID_VALUE', 'capabilities.required[2]']],
  );

  const overlap = validateDeclaration(
    valid({ capabilities: { required: ['a', 'b'], optional: ['b'] } }),
  );
  assert.deepEqual(
    [...overlap.issues].map((entry) => [entry.code, entry.path]),
    [['INVALID_VALUE', 'capabilities.required[1]']],
  );
});

test('identifiers are opaque non-empty strings without surrounding whitespace', () => {
  const cases = [
    ['', 'INVALID_VALUE'],
    [' a', 'INVALID_VALUE'],
    ['a ', 'INVALID_VALUE'],
    ['\ta', 'INVALID_VALUE'],
    ['a\n', 'INVALID_VALUE'],
    ['a\u0000b', 'INVALID_VALUE'],
    ['a\u2028b', 'INVALID_VALUE'],
    [42, 'TYPE_MISMATCH'],
    [null, 'TYPE_MISMATCH'],
    [true, 'TYPE_MISMATCH'],
    [[], 'TYPE_MISMATCH'],
  ];
  for (const [id, code] of cases) {
    const result = validateDeclaration(valid({ plugin: { id, version: '1.0.0' } }));
    assert.equal(result.valid, false, `id ${JSON.stringify(id)} should be rejected`);
    assert.equal(only(result).code, code, `id ${JSON.stringify(id)}`);
    assert.equal(only(result).path, 'plugin.id');
  }

  for (const ok of ['a', '0', '示例.工具', 'a b', 'v1.2.3-alpha+build', 'x/y@z']) {
    const result = validateDeclaration(valid({ plugin: { id: ok, version: ok } }));
    assert.equal(result.valid, true, `id ${JSON.stringify(ok)} should be accepted: ${JSON.stringify(result.issues)}`);
  }
});

test('version is opaque: no SemVer parsing and no satisfiability claim', () => {
  for (const version of ['latest', '1', '1.2.3.4', '>=1.0.0 <2', '^1.0.0', 'v1.0.0', '2026-10-31']) {
    const result = validateDeclaration(valid({ plugin: { id: 'p', version } }));
    assert.equal(result.valid, true, `${version} should be accepted as an opaque non-empty string`);
  }
  const versionBlock = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')).properties.plugin.properties.version;
  assert.equal(Object.hasOwn(versionBlock, 'format'), false, 'version must not use format');
  assert.equal(Object.hasOwn(versionBlock, 'enum'), false, 'version must not use enum');
  assert.equal(Object.hasOwn(versionBlock, 'oneOf'), false, 'version must not use alternatives');
  assert.doesNotMatch(versionBlock.description ?? '', /must be a valid|must match \^?\d/i);
  assert.match(versionBlock.description, /No SemVer parsing/);
});

test('duplicate resources are detected by kind+name+scope', () => {
  const resources = [
    { kind: 'tool', name: 'echo', scope: 'plugin' },
    { kind: 'tool', name: 'echo', scope: 'plugin' },
  ];
  const result = validateDeclaration(valid({ resources }));
  assert.deepEqual(issueList(result), ['INVALID_VALUE@resources[1]']);

  const allowed = [
    { kind: 'tool', name: 'echo', scope: 'plugin' },
    { kind: 'tool', name: 'echo', scope: 'shared' },
    { kind: 'service', name: 'echo', scope: 'plugin' },
  ];
  assert.equal(validateDeclaration(valid({ resources: allowed })).valid, true);

  // The duplicate key cannot collide across different label strings.
  const freeForm = [
    { kind: 'tool', name: 'echo', scope: 'agent' },
    { kind: 'tool', name: 'echo', scope: 'host' },
  ];
  assert.equal(validateDeclaration(valid({ resources: freeForm })).valid, true);
});

test('unknown fields are rejected at every level and reported before value checks', () => {
  const result = validateDeclaration({
    ...valid(),
    extra: 1,
    plugin: { id: 'p', version: '1', displayName: 'P' },
    capabilities: { required: [], optional: [], forbidden: [] },
    resources: [{ kind: 'tool', name: 'echo', scope: 'plugin', owner: 'x' }],
  });
  assert.deepEqual(
    [...result.issues].map((entry) => [entry.code, entry.path]),
    [
      ['UNKNOWN_FIELD', 'extra'],
      ['UNKNOWN_FIELD', 'plugin.displayName'],
      ['UNKNOWN_FIELD', 'capabilities.forbidden'],
      ['UNKNOWN_FIELD', 'resources[0].owner'],
    ],
  );

  const missing = validateDeclaration({
    schemaVersion: PROTOCOL_VERSION,
    plorg: {},
    capabilities: { required: [], optional: [] },
  });
  assert.deepEqual(
    [...missing.issues].map((entry) => [entry.code, entry.path]),
    [
      ['UNKNOWN_FIELD', 'plorg'],
      ['MISSING_FIELD', 'plugin'],
      ['MISSING_FIELD', 'resources'],
    ],
  );
});

test('issues are ordered by field, not by discovery accident', () => {
  const result = validateDeclaration({
    schemaVersion: '9.9.9',
    plugin: { id: 'p', version: '1' },
    capabilities: { required: [] },
    resources: [{ kind: 'tool' }],
  });
  assert.deepEqual(issueList(result), [
    'INVALID_VALUE@schemaVersion',
    'MISSING_FIELD@capabilities.optional',
    'MISSING_FIELD@resources[0].name',
    'MISSING_FIELD@resources[0].scope',
  ]);
});

test('non-object roots are rejected without throwing', () => {
  const inputs = [null, undefined, true, 0, 'text', [], [valid()], () => ({}), Symbol('s'), 10n];
  for (const input of inputs) {
    const result = validateDeclaration(input);
    assert.equal(result.valid, false, `expected rejection for ${String(input)}`);
    assert.deepEqual(issueList(result), ['TYPE_MISMATCH@']);
  }

  // A Date is an object without declaration fields: four missing root fields.
  const date = validateDeclaration(new Date(0));
  assert.deepEqual(issueList(date), [
    'MISSING_FIELD@schemaVersion',
    'MISSING_FIELD@plugin',
    'MISSING_FIELD@capabilities',
    'MISSING_FIELD@resources',
  ]);
});

test('hostile objects do not throw and unknown accessors are not invoked', () => {
  const throwingGetter = Object.defineProperty(
    { schemaVersion: PROTOCOL_VERSION, capabilities: { required: [], optional: [] }, resources: [] },
    'plugin',
    {
      enumerable: true,
      get() {
        throw new Error('boom');
      },
    },
  );
  const hostile = [
    throwingGetter,
    Object.create(null),
    { ...valid(), __proto__evil: 1 },
    JSON.parse('{"__proto__":{"polluted":true}}'),
    { ...valid(), capabilities: { required: ['a'], optional: new Set() } },
  ];

  for (const value of hostile) {
    assert.doesNotThrow(() => validateDeclaration(value));
  }

  assert.deepEqual(issueList(validateDeclaration(throwingGetter)), ['THROWS@plugin']);
  assert.equal(Object.prototype.polluted, undefined);
});

test('throwing getters on known fields become THROWS issues, never exceptions', () => {
  for (const key of ['schemaVersion', 'plugin', 'capabilities', 'resources']) {
    const base = valid();
    Object.defineProperty(base, key, {
      enumerable: true,
      configurable: true,
      get() {
        throw new Error(`boom ${key}`);
      },
    });
    assert.deepEqual(issueList(validateDeclaration(base)), [`THROWS@${key}`], key);
  }

  const nestedPlugin = { version: '1' };
  Object.defineProperty(nestedPlugin, 'id', {
    enumerable: true,
    get() {
      throw new Error('boom id');
    },
  });
  assert.deepEqual(issueList(validateDeclaration(valid({ plugin: nestedPlugin }))), ['THROWS@plugin.id']);

  const nestedResource = { kind: 'tool', name: 'x' };
  Object.defineProperty(nestedResource, 'scope', {
    enumerable: true,
    get() {
      throw new Error('boom scope');
    },
  });
  assert.deepEqual(issueList(validateDeclaration(valid({ resources: [nestedResource] }))), [
    'THROWS@resources[0].scope',
  ]);
});

test('hostile keys are rendered unambiguously in paths', () => {
  const value = valid();
  value['weird key'] = 1;
  value['a.b'] = 2;
  assert.deepEqual(issueList(validateDeclaration(value)), ["UNKNOWN_FIELD@['a.b']", "UNKNOWN_FIELD@['weird key']"]);
});

test('assertValidDeclaration throws only when explicitly called', () => {
  assert.equal(assertValidDeclaration(valid()), true);
  assert.throws(
    () => assertValidDeclaration(valid({ plugin: { id: '', version: '1' } }), 'bad declaration'),
    (error) => {
      assert.equal(error.name, 'DeclarationValidationError');
      assert.match(error.message, /^bad declaration\nplugin\.id: INVALID_VALUE: /);
      assert.equal(error.issues.length, 1);
      return true;
    },
  );
});

test('declarationTemplate is an incomplete skeleton with a required empty resources array', () => {
  const template = declarationTemplate();
  assert.deepEqual(template.resources, []);
  assert.deepEqual(template.capabilities, { required: [], optional: [] });
  assert.deepEqual(issueList(validateDeclaration(template)), ['INVALID_VALUE@plugin.id', 'INVALID_VALUE@plugin.version']);
});

test('severity is always error today', () => {
  for (const input of [valid(), valid({ resources: null }), null, valid({ extra: 1 })]) {
    for (const entry of validateDeclaration(input).issues) assert.equal(entry.severity, 'error');
  }
});

test('every exported issue code is reachable from some input', () => {
  const inputs = [
    null, // TYPE_MISMATCH at the root
    valid({ extra: 1 }), // UNKNOWN_FIELD
    valid({ resources: null }), // TYPE_MISMATCH on a field
    valid({ plugin: { version: '1' } }), // MISSING_FIELD
    valid({ plugin: { id: '', version: '1' } }), // INVALID_VALUE
    (() => {
      const thrower = valid();
      Object.defineProperty(thrower, 'plugin', {
        enumerable: true,
        get() {
          throw new Error('boom');
        },
      });
      return thrower; // THROWS
    })(),
  ];
  const emitted = new Set(inputs.flatMap((input) => validateDeclaration(input).issues.map((entry) => entry.code)));
  assert.deepEqual([...emitted].sort(), [...Object.values(ISSUE_CODES)].sort());
  assert.equal(Object.isFrozen(ISSUE_CODES), true);
});

test('no unreachable code is exported, in particular DUPLICATE_FIELD', async () => {
  const module = await import('../../src/index.js');
  assert.equal(Object.hasOwn(ISSUE_CODES, 'DUPLICATE_FIELD'), false);
  assert.equal(Object.hasOwn(module, 'DUPLICATE_FIELD'), false);
  assert.equal(Object.values(ISSUE_CODES).includes('DUPLICATE_FIELD'), false);
  // The parsed-value contract cannot produce it: a repeated key is already gone.
  const duplicated = JSON.parse('{"schemaVersion":"0.1.0-draft.1","schemaVersion":"0.1.0-draft.1"}');
  for (const entry of validateDeclaration(duplicated).issues) {
    assert.notEqual(entry.code, 'DUPLICATE_FIELD');
  }
});

test('the declared IssueCode union matches the exported ISSUE_CODES keys', () => {
  const source = readFileSync(new URL('../index.d.ts', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('export type IssueCode'), source.indexOf('export type Severity'));
  const declared = [...block.matchAll(/'([A-Z_]+)'/g)].map((match) => match[1]).sort();
  assert.deepEqual(declared, [...Object.keys(ISSUE_CODES)].sort());
});

test('the no-throw promise is scoped to JSON values, not to arbitrary JS objects', () => {
  const src = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  const doc = src.slice(src.indexOf('/**\n * Validate an author-supplied declaration.'), src.indexOf('export function validateDeclaration'));
  assert.match(doc, /No-throw contract: JSON values only/);
  assert.match(doc, /Proxy/);
  assert.doesNotMatch(doc, /never throws for any/i);

  // A hostile Proxy may throw before any value is read; the docs must not promise otherwise.
  const hostileProxy = new Proxy({}, {
    ownKeys() {
      throw new Error('ownKeys trap');
    },
  });
  assert.throws(() => validateDeclaration(hostileProxy), /ownKeys trap/);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CONFIG_SCHEMA_PROTOCOL_VERSION,
  PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
  assertValidDeclaration,
  declarationJsonSchema,
  declarationJsonSchemaForVersion,
  declarationTemplate,
  validateDeclaration,
} from '../index.js';

function declaration(configSchema = true) {
  return {
    ...declarationTemplate(),
    schemaVersion: CONFIG_SCHEMA_PROTOCOL_VERSION,
    plugin: { id: 'example.config', version: 'opaque' },
    configSchema,
  };
}
const pairs = (value) => validateDeclaration(value).issues.map(({ code, path }) => [code, path]);

test('revision constants and legacy defaults do not silently upgrade callers', () => {
  assert.equal(PROTOCOL_VERSION, '0.1.0-draft.1');
  assert.equal(CONFIG_SCHEMA_PROTOCOL_VERSION, '0.2.0-draft.1');
  assert.deepEqual(SUPPORTED_PROTOCOL_VERSIONS, [PROTOCOL_VERSION, CONFIG_SCHEMA_PROTOCOL_VERSION]);
  assert.ok(Object.isFrozen(SUPPORTED_PROTOCOL_VERSIONS));
  assert.equal(declarationTemplate().schemaVersion, PROTOCOL_VERSION);
  assert.equal(Object.hasOwn(declarationTemplate(), 'configSchema'), false);
  assert.deepEqual(declarationJsonSchemaForVersion(PROTOCOL_VERSION), declarationJsonSchema());
});

test('new revision requires an explicit boolean or object contract', () => {
  for (const schema of [true, false, {}, { type: 'object', additionalProperties: false }]) {
    assert.deepEqual(pairs(declaration(schema)), []);
    assert.equal(assertValidDeclaration(declaration(schema)), true);
  }
  const missing = declaration();
  delete missing.configSchema;
  assert.deepEqual(pairs(missing), [['MISSING_FIELD', 'configSchema']]);
  assert.equal(Object.hasOwn(missing, 'configSchema'), false);
  for (const schema of [null, [], 0, 1, '', 'true']) {
    assert.deepEqual(pairs(declaration(schema)), [['TYPE_MISMATCH', 'configSchema']]);
  }
  const explicitUndefined = declaration();
  explicitUndefined.configSchema = undefined;
  assert.deepEqual(pairs(explicitUndefined), [['TYPE_MISMATCH', 'configSchema']]);
  assert.throws(() => assertValidDeclaration(missing), { name: 'DeclarationValidationError' });
});

test('configSchema accepts only plain records or booleans without widening legacy checks', () => {
  class Schema {}
  for (const schema of [new Date(0), new Map(), new Boolean(false), new Schema()]) {
    assert.deepEqual(pairs(declaration(schema)), [['TYPE_MISMATCH', 'configSchema']]);
  }
  assert.deepEqual(pairs(declaration(Object.create(null))), []);
});

test('inherited revision and contract fields are never read', () => {
  for (const key of ['schemaVersion', 'configSchema']) {
    const input = declaration();
    delete input[key];
    Object.setPrototypeOf(input, Object.defineProperty({}, key, {
      get() { throw new Error('inherited field must not be read'); },
    }));
    assert.deepEqual(pairs(input), key === 'schemaVersion'
      ? [['UNKNOWN_FIELD', 'configSchema'], ['MISSING_FIELD', 'schemaVersion']]
      : [['MISSING_FIELD', 'configSchema']]);
  }
});

test('legacy revision refuses the new field and does not require it', () => {
  const legacy = { ...declaration(), schemaVersion: PROTOCOL_VERSION };
  assert.deepEqual(pairs(legacy), [['UNKNOWN_FIELD', 'configSchema']]);
  delete legacy.configSchema;
  assert.deepEqual(pairs(legacy), []);
  Object.defineProperty(legacy, 'configSchema', { get() { throw new Error('must not read'); } });
  assert.deepEqual(pairs(legacy), [['UNKNOWN_FIELD', 'configSchema']]);
});

test('unsupported or missing revision never infers the new envelope', () => {
  for (const version of ['0.2.0', '0.2.0-draft.2', '0.2.0-DRAFT.1']) {
    assert.deepEqual(pairs({ ...declaration(), schemaVersion: version }), [
      ['UNKNOWN_FIELD', 'configSchema'], ['INVALID_VALUE', 'schemaVersion'],
    ]);
  }
  const missing = declaration();
  delete missing.schemaVersion;
  assert.deepEqual(pairs(missing), [['UNKNOWN_FIELD', 'configSchema'], ['MISSING_FIELD', 'schemaVersion']]);
});

test('envelope success deliberately does not establish schema semantic validity', () => {
  for (const schema of [
    { type: 42 },
    { $schema: 'urn:unsupported-dialect', format: 'unknown-format' },
    { $ref: 'https://example.invalid/unresolved' },
    { $defs: { node: { $dynamicAnchor: 'node', $dynamicRef: '#node' } } },
    { customAnnotation: { arbitrary: true }, default: { secret: 'not-applied' } },
  ]) {
    const input = declaration(schema);
    const before = JSON.stringify(input);
    assert.deepEqual(pairs(input), []);
    assert.equal(JSON.stringify(input), before);
  }
  const schema = Object.defineProperty({}, 'type', { get() { throw new Error('not traversed'); } });
  assert.deepEqual(pairs(declaration(schema)), []);
});

test('known-field getters are guarded and the revision is read exactly once', () => {
  const input = declaration();
  let reads = 0;
  Object.defineProperty(input, 'schemaVersion', { get() { reads += 1; return CONFIG_SCHEMA_PROTOCOL_VERSION; } });
  Object.defineProperty(input, 'configSchema', { get() { throw new Error('private'); } });
  assert.deepEqual(pairs(input), [['THROWS', 'configSchema']]);
  assert.equal(reads, 1);
});

test('new revision retains envelope checks and deterministic issue order', () => {
  assert.deepEqual(pairs({ schemaVersion: CONFIG_SCHEMA_PROTOCOL_VERSION, z: true }), [
    ['UNKNOWN_FIELD', 'z'], ['MISSING_FIELD', 'plugin'],
    ['MISSING_FIELD', 'capabilities'], ['MISSING_FIELD', 'resources'],
    ['MISSING_FIELD', 'configSchema'],
  ]);
  const input = declaration(false);
  input.capabilities = { required: ['x'], optional: ['x'] };
  input.resources = null;
  assert.deepEqual(pairs(input), [['INVALID_VALUE', 'capabilities.required[0]'], ['TYPE_MISMATCH', 'resources']]);
});

test('explicit schema API produces an outer-shape schema without changing the legacy artifact', () => {
  const legacy = declarationJsonSchema();
  const schema = declarationJsonSchemaForVersion(CONFIG_SCHEMA_PROTOCOL_VERSION);
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.notEqual(schema.$id, legacy.$id);
  assert.equal(schema.properties.schemaVersion.const, CONFIG_SCHEMA_PROTOCOL_VERSION);
  assert.deepEqual(schema.required, [...legacy.required, 'configSchema']);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.configSchema.type, ['boolean', 'object']);
  assert.equal(Object.hasOwn(schema.properties.configSchema, '$ref'), false);
  assert.match(schema.description, /only its outer boolean or object shape is checked/);
  assert.deepEqual(schema.properties.plugin, legacy.properties.plugin);
  assert.equal(Object.hasOwn(legacy.properties, 'configSchema'), false);
  schema.properties.configSchema.type.push('null');
  assert.deepEqual(declarationJsonSchemaForVersion(CONFIG_SCHEMA_PROTOCOL_VERSION).properties.configSchema.type, ['boolean', 'object']);
  assert.deepEqual(declarationJsonSchema(), legacy);
  for (const version of [undefined, null, '', '0.3.0']) {
    assert.throws(() => declarationJsonSchemaForVersion(version), RangeError);
  }
});

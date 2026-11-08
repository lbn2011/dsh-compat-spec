import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  PROTOCOL_VERSION,
  RESOURCE_KINDS,
  declarationJsonSchema,
  declarationTemplate,
  validateDeclaration,
} from '../../src/index.js';
import { renderSchema } from '../../tools/schema-sync.mjs';

const SCHEMA_PATH = fileURLToPath(new URL('../../spec/declaration.schema.json', import.meta.url));

test('committed spec/declaration.schema.json matches declarationJsonSchema()', () => {
  // Regenerate with: node tools/schema-sync.mjs --write
  assert.equal(readFileSync(SCHEMA_PATH, 'utf8'), renderSchema());
});

test('the schema is valid JSON and keeps its publication metadata', () => {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.type, 'object');
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.schemaVersion.const, PROTOCOL_VERSION);
});

test('resources is a required non-null array in the schema', () => {
  const schema = declarationJsonSchema();
  assert.deepEqual([...schema.required], ['schemaVersion', 'plugin', 'capabilities', 'resources']);
  assert.equal(schema.properties.resources.type, 'array');
  assert.equal(Object.hasOwn(schema.properties.resources, 'oneOf'), false, 'no null alternative');
  assert.equal(Object.hasOwn(schema.properties.resources, 'minItems'), false, 'an empty array is allowed');
  assert.deepEqual([...schema.properties.resources.items.properties.kind.enum], [...RESOURCE_KINDS]);
  assert.deepEqual([...schema.properties.resources.items.required], ['kind', 'name', 'scope']);
});

test('scope is a free-form label, not an enum', () => {
  const scope = declarationJsonSchema().properties.resources.items.properties.scope;
  assert.equal(scope.type, 'string');
  assert.equal(Object.hasOwn(scope, 'enum'), false, 'scope must not be an enumerated vocabulary');
  assert.equal(Object.hasOwn(scope, 'const'), false);
  assert.match(scope.pattern, /\\s/, 'scope keeps the shared whitespace/control pattern');
  assert.match(scope.description, /no default is applied/);
});

test('the schema states that a JSON Schema engine is not bundled', () => {
  const schema = declarationJsonSchema();
  assert.match(schema.description, /not host acceptance, loading or execution evidence/);
  assert.match(schema.description, /normative validation is performed by validateDeclaration\(\)/);
  assert.match(schema.$comment, /Not expressible in JSON Schema/);
});

test('the schema names exactly the rules it cannot express', () => {
  const schema = declarationJsonSchema();

  // 1. Repeated object field names: undecidable at the value level.
  assert.match(schema.$comment, /repeated object field names/);
  // 2. Cross-list disjointness of capabilities.required / capabilities.optional.
  assert.match(schema.$comment, /capabilities\.required and capabilities\.optional must be disjoint/);
  assert.match(schema.properties.capabilities.properties.required.description, /NOT expressible in JSON Schema/);
  assert.match(schema.properties.capabilities.properties.optional.description, /NOT expressible in JSON Schema/);

  // The schema must not imply that a schema-only check enforces them.
  assert.match(schema.$comment, /not enforced by a schema-only validator/);
});

test('resource-triple uniqueness is expressible, so it is not listed as inexpressible', () => {
  const schema = declarationJsonSchema();
  const { resources } = schema.properties;
  const { items } = resources;

  // The schema-level constraint that covers the triple.
  assert.equal(resources.uniqueItems, true);

  // Why it is sufficient: the triple is the whole item. Every field is
  // required, no additional fields are allowed, and every field is a scalar,
  // so two entries with the same (kind, name, scope) are equal items.
  assert.equal(items.additionalProperties, false);
  assert.deepEqual([...items.required], ['kind', 'name', 'scope']);
  assert.deepEqual(Object.keys(items.properties).sort(), ['kind', 'name', 'scope']);
  for (const field of ['kind', 'name', 'scope']) {
    assert.equal(items.properties[field].type, 'string', `${field} must be a scalar for equality to imply triple equality`);
  }

  // Neither the $comment nor the description may still claim triple uniqueness is inexpressible.
  const $commentRuleList = schema.$comment.split('validator: ')[1] ?? '';
  assert.doesNotMatch($commentRuleList, /\(kind, name, scope\)/);
  assert.doesNotMatch(schema.$comment, /per-item projection/);
  assert.doesNotMatch(resources.description, /cannot project|does not enforce uniqueness/);
  assert.match(resources.description, /uniqueItems/);
});

test('the validator still rejects a repeated (kind, name, scope) triple', () => {
  const declaration = {
    ...declarationTemplate(),
    plugin: { id: 'p', version: '1.0.0' },
    resources: [
      { kind: 'tool', name: 'a', scope: 'plugin' },
      { kind: 'tool', name: 'a', scope: 'plugin' },
    ],
  };
  const result = validateDeclaration(declaration);
  assert.equal(result.valid, false);
  assert.deepEqual(
    result.issues.map(({ code, path }) => ({ code, path })),
    [{ code: 'INVALID_VALUE', path: 'resources[1]' }],
  );
});

test('capability lists use uniqueItems and may be empty', () => {
  const schema = declarationJsonSchema();
  assert.equal(schema.properties.capabilities.properties.required.uniqueItems, true);
  assert.equal(schema.properties.capabilities.properties.optional.uniqueItems, true);
  assert.equal(Object.hasOwn(schema.properties.capabilities.properties.required, 'minItems'), false);
});

test('the issue definition lists exactly the codes the validator can emit', () => {
  const codes = declarationJsonSchema().$defs.issue.properties.code.enum;
  assert.deepEqual([...codes].sort(), [
    'INVALID_VALUE',
    'MISSING_FIELD',
    'THROWS',
    'TYPE_MISMATCH',
    'UNKNOWN_FIELD',
  ]);
  assert.equal(codes.includes('DUPLICATE_FIELD'), false, 'DUPLICATE_FIELD is unreachable and must not be listed');
});

test('declarationJsonSchema returns a fresh object each call', () => {
  const first = declarationJsonSchema();
  first.title = 'mutated';
  assert.notEqual(declarationJsonSchema().title, 'mutated');
});

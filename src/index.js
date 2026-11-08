/**
 * dsh-compat-spec — draft plugin declaration protocol.
 *
 * This module is a pure, dependency-free library: it never reads files, writes
 * files, touches the network, installs anything or inspects a live DSH host.
 * Everything here describes a *declaration supplied by a plugin author*. It is
 * not evidence that any host accepted, loaded or ran a plugin.
 *
 * @packageDocumentation
 */

/** The protocol revision implemented by this package. */
export const PROTOCOL_VERSION = '0.1.0-draft.1';

/** Resource categories. A closed vocabulary, not a host registration API. */
export const RESOURCE_KINDS = Object.freeze(['tool', 'service']);

/**
 * Stable machine-readable issue codes.
 *
 * Every entry here is *reachable*: some input class actually produces it. A
 * code for repeated object field names is deliberately absent — a JavaScript
 * value cannot carry one, so no entry of this module could ever emit it. The
 * `structural/` conformance vectors still name `DUPLICATE_FIELD` in their
 * manifest text; those expectations apply only to a JSON-text parser and are
 * not implementable through this API (see spec/declaration-protocol.md §8).
 */
export const ISSUE_CODES = Object.freeze({
  TYPE_MISMATCH: 'TYPE_MISMATCH',
  MISSING_FIELD: 'MISSING_FIELD',
  UNKNOWN_FIELD: 'UNKNOWN_FIELD',
  INVALID_VALUE: 'INVALID_VALUE',
  /**
   * Reading a known field threw (for example a throwing get accessor).
   * Unreachable for JSON values; a best-effort mapping for some hostile
   * JavaScript objects, not a promise about all of them.
   */
  THROWS: 'THROWS',
});

export const SEVERITIES = Object.freeze(['error', 'warning']);

const FIELDS = Object.freeze({
  root: Object.freeze(['schemaVersion', 'plugin', 'capabilities', 'resources']),
  plugin: Object.freeze(['id', 'version']),
  capabilities: Object.freeze(['required', 'optional']),
  resource: Object.freeze(['kind', 'name', 'scope']),
});

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function typeName(value) {
  return value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
}

/**
 * Read a property value. Best-effort hardening, not a guarantee.
 *
 * A `get` accessor on a known field is invoked; if it throws, the exception is
 * converted into a `THROWS` issue instead of escaping. JSON values never have
 * accessors, so this path is unreachable for the protocol's own input language.
 * Objects on the prototype chain are never consulted beyond ordinary property
 * lookup, and unknown field *values* are never read.
 *
 * This does **not** make arbitrary JavaScript safe: a `Proxy` `ownKeys`,
 * `getOwnPropertyDescriptor` or `has` trap, or a host-advanced object, can throw
 * before any value is read, and the error escapes. Only JSON values are covered
 * by the no-throw contract; see {@link validateDeclaration}.
 *
 * @param {object} object
 * @param {string|number} key
 * @param {string} path
 * @param {Array<object>} issues
 * @returns {{ ok: true, value: unknown } | { ok: false }}
 */
function readField(object, key, path, issues) {
  try {
    return { ok: true, value: object[key] };
  } catch {
    issues.push(
      issue(
        ISSUE_CODES.THROWS,
        path,
        `Reading ${path} threw an exception; the protocol only accepts plain JSON values, so this declaration cannot be accepted.`,
      ),
    );
    return { ok: false };
  }
}

/**
 * Join path segments. Field names that are not plain identifiers are rendered
 * in single quotes so that a path is unambiguous to a human and to a parser
 * that understands the quoted form.
 */
function joinPath(base, key) {
  if (typeof key === 'number') return `${base}[${key}]`;
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) {
    return base === '' ? key : `${base}.${key}`;
  }
  return `${base}['${String(key)}']`;
}

/** Own property names in ascending code-unit order. */
function ownKeys(value) {
  return Object.getOwnPropertyNames(value).sort();
}

/**
 * Create an issue object. Issues are plain and JSON-serializable.
 *
 * @param {string} code One of {@link ISSUE_CODES}.
 * @param {string} path Location inside the declaration, e.g. `capabilities.required[2]`.
 * @param {string} message Human-readable explanation.
 * @param {'error'|'warning'} [severity] `warning` is reserved; nothing emits it yet.
 */
function issue(code, path, message, severity = 'error') {
  return Object.freeze({ code, path, message, severity });
}

/** Report every own field outside `allowed` at one object level. */
function reportUnknownFields(object, allowed, basePath, issues) {
  for (const key of ownKeys(object)) {
    if (!allowed.includes(key)) {
      issues.push(
        issue(
          ISSUE_CODES.UNKNOWN_FIELD,
          joinPath(basePath, key),
          `Unexpected field "${key}" at "${basePath || '<root>'}".`,
        ),
      );
    }
  }
}

/**
 * Validate an author-supplied label.
 *
 * The rules — non-empty string, no leading or trailing whitespace, no ASCII
 * control characters and no U+2028 / U+2029 — are identical for `plugin.id`,
 * `plugin.version`, capability names, resource `name` and the resource `scope`
 * label. Nothing else is validated: there is no grammar, namespace, SemVer
 * parsing or scope vocabulary anywhere in this protocol.
 */
function checkLabel(value, path, label, issues) {
  if (typeof value !== 'string') {
    issues.push(issue(ISSUE_CODES.TYPE_MISMATCH, path, `${label} must be a string, got ${typeName(value)}.`));
    return false;
  }
  if (value.length === 0) {
    issues.push(issue(ISSUE_CODES.INVALID_VALUE, path, `${label} must not be an empty string.`));
    return false;
  }
  if (value !== value.trim()) {
    issues.push(
      issue(
        ISSUE_CODES.INVALID_VALUE,
        path,
        `${label} must not begin or end with whitespace (received ${JSON.stringify(value)}).`,
      ),
    );
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index);
    if (codePoint < 0x20 || codePoint === 0x7f || codePoint === 0x2028 || codePoint === 0x2029) {
      issues.push(
        issue(
          ISSUE_CODES.INVALID_VALUE,
          path,
          `${label} must not contain ASCII control characters or U+2028/U+2029 line separators.`,
        ),
      );
      return false;
    }
  }
  return true;
}

/**
 * Validate one capability name list. Returns the accepted names mapped to their
 * first index, or null when any entry was rejected.
 */
function checkCapabilityList(value, path, label, issues) {
  if (!Array.isArray(value)) {
    issues.push(issue(ISSUE_CODES.TYPE_MISMATCH, path, `${label} must be an array, got ${typeName(value)}.`));
    return null;
  }

  /** @type {Map<string, number>} */
  const seen = new Map();
  let usable = true;
  for (let index = 0; index < value.length; index += 1) {
    const entryPath = `${path}[${index}]`;
    const read = readField(value, index, entryPath, issues);
    if (!read.ok) {
      usable = false;
      continue;
    }
    if (!checkLabel(read.value, entryPath, `${label} capability`, issues)) {
      usable = false;
      continue;
    }
    if (seen.has(read.value)) {
      issues.push(
        issue(
          ISSUE_CODES.INVALID_VALUE,
          entryPath,
          `Duplicate capability ${JSON.stringify(read.value)} in ${label}[].`,
        ),
      );
      usable = false;
      continue;
    }
    seen.set(read.value, index);
  }
  return usable ? seen : null;
}

function checkPlugin(value, issues) {
  if (!isPlainObject(value)) {
    issues.push(issue(ISSUE_CODES.TYPE_MISMATCH, 'plugin', `plugin must be an object, got ${typeName(value)}.`));
    return;
  }
  reportUnknownFields(value, FIELDS.plugin, 'plugin', issues);
  for (const field of FIELDS.plugin) {
    const path = `plugin.${field}`;
    if (!hasOwn(value, field)) {
      issues.push(issue(ISSUE_CODES.MISSING_FIELD, path, `${path} is required.`));
      continue;
    }
    const read = readField(value, field, path, issues);
    if (read.ok) checkLabel(read.value, path, path, issues);
  }
}

function checkCapabilities(value, issues) {
  if (!isPlainObject(value)) {
    issues.push(
      issue(ISSUE_CODES.TYPE_MISMATCH, 'capabilities', `capabilities must be an object, got ${typeName(value)}.`),
    );
    return;
  }
  reportUnknownFields(value, FIELDS.capabilities, 'capabilities', issues);

  const lists = {};
  for (const field of FIELDS.capabilities) {
    const path = `capabilities.${field}`;
    if (!hasOwn(value, field)) {
      issues.push(issue(ISSUE_CODES.MISSING_FIELD, path, `${path} is required.`));
      continue;
    }
    const read = readField(value, field, path, issues);
    if (!read.ok) continue;
    lists[field] = checkCapabilityList(read.value, path, path, issues);
  }

  if (lists.required && lists.optional) {
    for (const [name, index] of lists.required) {
      if (lists.optional.has(name)) {
        issues.push(
          issue(
            ISSUE_CODES.INVALID_VALUE,
            `capabilities.required[${index}]`,
            `Capability ${JSON.stringify(name)} cannot appear in both capabilities.required and capabilities.optional.`,
          ),
        );
      }
    }
  }
}

/**
 * Validate the `resources` array. The array is mandatory and may be empty; a
 * missing or `null` `resources` is reported by the caller and never defaulted.
 */
function checkResources(value, issues) {
  if (!Array.isArray(value)) {
    issues.push(issue(ISSUE_CODES.TYPE_MISMATCH, 'resources', `resources must be an array, got ${typeName(value)}.`));
    return;
  }

  /** @type {Map<string, number>} */
  const seen = new Map();
  for (let index = 0; index < value.length; index += 1) {
    const base = `resources[${index}]`;
    const readEntry = readField(value, index, base, issues);
    if (!readEntry.ok) continue;
    const entry = readEntry.value;
    if (!isPlainObject(entry)) {
      issues.push(issue(ISSUE_CODES.TYPE_MISMATCH, base, `${base} must be an object, got ${typeName(entry)}.`));
      continue;
    }
    reportUnknownFields(entry, FIELDS.resource, base, issues);

    let complete = true;
    for (const field of FIELDS.resource) {
      if (!hasOwn(entry, field)) {
        issues.push(issue(ISSUE_CODES.MISSING_FIELD, `${base}.${field}`, `${base}.${field} is required.`));
        complete = false;
      }
    }

    const fields = {};
    for (const field of FIELDS.resource) {
      if (!hasOwn(entry, field)) continue;
      const path = `${base}.${field}`;
      const read = readField(entry, field, path, issues);
      if (!read.ok) {
        complete = false;
        continue;
      }
      if (field === 'kind') {
        if (typeof read.value !== 'string') {
          issues.push(issue(ISSUE_CODES.TYPE_MISMATCH, path, `${path} must be a string, got ${typeName(read.value)}.`));
          complete = false;
        } else if (!RESOURCE_KINDS.includes(read.value)) {
          issues.push(
            issue(
              ISSUE_CODES.INVALID_VALUE,
              path,
              `${path} must be one of ${RESOURCE_KINDS.map((kind) => JSON.stringify(kind)).join(', ')}; got ${JSON.stringify(read.value)}.`,
            ),
          );
          complete = false;
        }
      } else if (!checkLabel(read.value, path, path, issues)) {
        complete = false;
      }
      fields[field] = read.value;
    }

    if (!complete) continue;

    const key = JSON.stringify([fields.kind, fields.name, fields.scope]);
    const previous = seen.get(key);
    if (previous === undefined) {
      seen.set(key, index);
    } else {
      issues.push(
        issue(
          ISSUE_CODES.INVALID_VALUE,
          base,
          `Duplicate resource claim kind=${JSON.stringify(fields.kind)} name=${JSON.stringify(fields.name)} scope=${JSON.stringify(fields.scope)}; first declared at resources[${previous}].`,
        ),
      );
    }
  }
}

/**
 * Validate an author-supplied declaration.
 *
 * **No-throw contract: JSON values only.** The protocol's input language is a
 * JSON value, and for any JSON value this function returns a result instead of
 * throwing. That covers everything `JSON.parse` can produce, including deep
 * nesting, `__proto__` keys and very long arrays.
 *
 * Arbitrary JavaScript objects are **not** covered. The implementation is
 * defensive but best-effort: it inspects own property *names* plus the values
 * of known fields only, so accessors on unknown keys are never invoked, and a
 * throwing accessor on a known field is reported as `THROWS`. Inputs that throw
 * before any field is read — notably a `Proxy` whose `ownKeys`,
 * `getOwnPropertyDescriptor`, `get` or `has` trap throws — may still propagate
 * the exception. No proxy-trap interception is attempted.
 *
 * @param {unknown} value Declaration to validate.
 * @returns {{ valid: boolean, issues: ReadonlyArray<{ code: string, path: string, message: string, severity: 'error'|'warning' }> }}
 *   `valid` is `true` if and only if `issues` is empty.
 */
export function validateDeclaration(value) {
  const issues = [];

  if (!isPlainObject(value)) {
    issues.push(issue(ISSUE_CODES.TYPE_MISMATCH, '', `Declaration must be an object, got ${typeName(value)}.`));
    return Object.freeze({ valid: false, issues: Object.freeze(issues) });
  }

  // Issue order is fixed: unknown root fields, then schemaVersion, plugin,
  // capabilities, resources; each object level reports unknown fields first.
  reportUnknownFields(value, FIELDS.root, '', issues);

  if (!hasOwn(value, 'schemaVersion')) {
    issues.push(
      issue(
        ISSUE_CODES.MISSING_FIELD,
        'schemaVersion',
        `schemaVersion is required and must equal ${JSON.stringify(PROTOCOL_VERSION)}.`,
      ),
    );
  } else {
    const read = readField(value, 'schemaVersion', 'schemaVersion', issues);
    if (read.ok) {
      if (typeof read.value !== 'string') {
        issues.push(
          issue(
            ISSUE_CODES.TYPE_MISMATCH,
            'schemaVersion',
            `schemaVersion must be a string, got ${typeName(read.value)}.`,
          ),
        );
      } else if (read.value !== PROTOCOL_VERSION) {
        issues.push(
          issue(
            ISSUE_CODES.INVALID_VALUE,
            'schemaVersion',
            `schemaVersion must equal ${JSON.stringify(PROTOCOL_VERSION)}; got ${JSON.stringify(read.value)}. No other protocol revision is accepted by this validator.`,
          ),
        );
      }
    }
  }

  for (const [field, check] of [
    ['plugin', checkPlugin],
    ['capabilities', checkCapabilities],
    ['resources', checkResources],
  ]) {
    if (!hasOwn(value, field)) {
      const message =
        field === 'resources'
          ? 'resources is required and must be an array; it may be empty but is never defaulted.'
          : `${field} is required.`;
      issues.push(issue(ISSUE_CODES.MISSING_FIELD, field, message));
      continue;
    }
    const read = readField(value, field, field, issues);
    if (read.ok) check(read.value, issues);
  }

  return Object.freeze({ valid: issues.length === 0, issues: Object.freeze(issues) });
}

/**
 * Throwing assertion helper for callers that prefer exceptions at their own
 * boundary. Not used internally by {@link validateDeclaration}.
 *
 * @param {unknown} value
 * @param {string} [label] Prefix for the thrown message.
 * @returns {true}
 * @throws {TypeError} When the declaration is invalid.
 */
export function assertValidDeclaration(value, label = 'Invalid declaration') {
  const result = validateDeclaration(value);
  if (!result.valid) {
    const summary = result.issues
      .map((entry) => `${entry.path || '<root>'}: ${entry.code}: ${entry.message}`)
      .join('\n');
    const error = new TypeError(`${label}\n${summary}`);
    error.name = 'DeclarationValidationError';
    error.issues = result.issues;
    throw error;
  }
  return true;
}

/**
 * A declaration skeleton. The empty strings and empty arrays are deliberately
 * incomplete: this function never guesses an author's identity or claims.
 *
 * @returns {{ schemaVersion: string, plugin: { id: string, version: string }, capabilities: { required: string[], optional: string[] }, resources: [] }}
 */
export function declarationTemplate() {
  return {
    schemaVersion: PROTOCOL_VERSION,
    plugin: { id: '', version: '' },
    capabilities: { required: [], optional: [] },
    resources: [],
  };
}

/** Identical label rules for every string field: non-blank, un-padded, no controls. */
const LABEL_PATTERN =
  '^[^\\u0000-\\u001F\\u007F\\u2028\\u2029\\s](?:[^\\u0000-\\u001F\\u007F\\u2028\\u2029]*[^\\u0000-\\u001F\\u007F\\u2028\\u2029\\s])?$';

/**
 * Rules that JSON Schema (2020-12) cannot express, stated once as prose. They
 * are mirrored into the schema's `$comment` and spec/declaration-protocol.md §9.
 */
const SCHEMA_INEXPRESSIBLE_RULES = Object.freeze([
  'repeated object field names in the JSON text (no single-keyword constraint exists; only a JSON-text parser can see them)',
  'capabilities.required and capabilities.optional must be disjoint (uniqueItems is per array; cross-array disjointness has no keyword)',
]);

/**
 * JSON Schema (2020-12) for the declaration format.
 *
 * PROVENANCE: this object is the single source of truth. `spec/declaration.schema.json`
 * is generated from it and `node --test` fails if the committed file drifts.
 *
 * ENFORCEMENT DISCLAIMER: this package ships and calls no JSON Schema engine.
 * Normative validation is performed by {@link validateDeclaration}. The schema
 * agrees with it on every expressible rule; the two rules that JSON Schema
 * cannot express are listed verbatim in `$comment` and in
 * spec/declaration-protocol.md §9. Resource-triple uniqueness is expressible and
 * therefore not listed: `kind`, `name` and `scope` are the only fields of each
 * resource (additionalProperties is false, all three are required), so two
 * entries sharing the triple are equal items and `uniqueItems: true` rejects
 * them.
 *
 * @returns {object} A fresh, JSON-serializable schema object.
 */
export function declarationJsonSchema() {
  const label = (description) => ({ type: 'string', minLength: 1, pattern: LABEL_PATTERN, description });

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://example.invalid/dsh-compat-spec/declaration.schema.json',
    title: 'DSH plugin declaration',
    description:
      'Draft plugin declaration protocol. Validating a declaration describes author intent only; it is not host acceptance, loading or execution evidence. No JSON Schema engine is bundled: normative validation is performed by validateDeclaration() in this package.',
    $comment: [
      `protocolVersion: ${PROTOCOL_VERSION}`,
      'Generated from src/index.js declarationJsonSchema(); edit that function, not this file.',
      `Not expressible in JSON Schema, and therefore not enforced by a schema-only validator: ${SCHEMA_INEXPRESSIBLE_RULES.join('; ')}.`,
    ].join(' | '),
    type: 'object',
    additionalProperties: false,
    required: [...FIELDS.root],
    properties: {
      schemaVersion: {
        type: 'string',
        const: PROTOCOL_VERSION,
        description: `Must equal ${JSON.stringify(PROTOCOL_VERSION)}. No other revision is accepted.`,
      },
      plugin: {
        type: 'object',
        additionalProperties: false,
        required: [...FIELDS.plugin],
        properties: {
          id: label('Opaque non-empty plugin identifier without leading or trailing whitespace.'),
          version: label(
            'Opaque non-empty version label. No SemVer parsing, ordering or satisfiability is defined by this protocol.',
          ),
        },
      },
      capabilities: {
        type: 'object',
        additionalProperties: false,
        required: [...FIELDS.capabilities],
        properties: {
          required: {
            type: 'array',
            uniqueItems: true,
            items: label('Capability the plugin declares as required.'),
            description:
              'Must be disjoint from capabilities.optional. Disjointness is NOT expressible in JSON Schema (uniqueItems covers one array at a time), so a schema-only check does not enforce it.',
          },
          optional: {
            type: 'array',
            uniqueItems: true,
            items: label('Capability the plugin declares as optional.'),
            description:
              'Must be disjoint from capabilities.required. Disjointness is NOT expressible in JSON Schema (uniqueItems covers one array at a time), so a schema-only check does not enforce it.',
          },
        },
      },
      resources: {
        type: 'array',
        uniqueItems: true,
        description:
          'Required array of resource claims; it may be empty. It is never defaulted, and null is not accepted. No two entries may share the same (kind, name, scope) triple: each entry has exactly these three required fields, so duplicate triples are equal items and uniqueItems rejects them at the schema level as well.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [...FIELDS.resource],
          properties: {
            kind: {
              type: 'string',
              enum: [...RESOURCE_KINDS],
              description: 'Resource category. Not a host registration API.',
            },
            name: label('Opaque non-empty resource name without leading or trailing whitespace.'),
            scope: label(
              'Author-supplied static label: any non-empty string without leading or trailing whitespace. Not a host, agent or session scope, and no default is applied.',
            ),
          },
        },
      },
    },
    $defs: {
      issue: {
        type: 'object',
        additionalProperties: false,
        required: ['code', 'path', 'message', 'severity'],
        properties: {
          code: { type: 'string', enum: Object.values(ISSUE_CODES) },
          path: {
            type: 'string',
            description: 'Empty string for the declaration root; otherwise a dot/bracket path.',
          },
          message: { type: 'string', minLength: 1 },
          severity: { type: 'string', enum: [...SEVERITIES] },
        },
      },
      validationResult: {
        type: 'object',
        additionalProperties: false,
        required: ['valid', 'issues'],
        properties: {
          valid: { type: 'boolean' },
          issues: { type: 'array', items: { $ref: '#/$defs/issue' } },
        },
      },
    },
  };
}

# Declaration protocol — draft 0.1.0-draft.1

Status: **draft**. Not ratified, not published, not accepted by any DSH host.
Protocol version: `0.1.0-draft.1` (the only value `schemaVersion` may take in this revision).
Machine-readable schema: [declaration.schema.json](declaration.schema.json).
Reference validator: `validateDeclaration()` in [`src/index.js`](../src/index.js).

## 0. What this document is, and is not

A **declaration** is a JSON object in which a plugin author states an identity, a
capability intention and a set of managed-resource claims. This document defines
exactly which statements are well-formed.

It does **not** define, and a valid declaration must not be read as evidence of:

- host acceptance, installation, loading or execution of a plugin;
- any matching between a declaration and another plugin's declaration;
- the existence, shape or stability of any official DSH host API;
- version satisfiability of any kind.

Validating a declaration proves only that the author expressed intent in the
protocol's grammar. Verified behaviour requires a test run and a report
separate from this document.

### 0.1 Non-official fields

Every field defined here is **not** an official DSH host field. In particular:

- `plugin.id` is not a host registration id;
- `plugin.version` is not interpreted against any host version;
- `resources[].kind` does not name a host registration API;
- `resources[].scope` is **not** an agent, session, project or host scope, and
  must never be mapped by inference onto a real agent scope.

Implementations must not silently translate a declaration into host state.
Any such translation is out of scope for this revision and requires its own
contract.

## 1. Document shape

A declaration is a JSON object with exactly four permitted top-level fields.

```json
{
  "schemaVersion": "0.1.0-draft.1",
  "plugin": { "id": "example.minimal-tool", "version": "0.1.0" },
  "capabilities": { "required": [], "optional": [] },
  "resources": []
}
```

| Field | Presence | Type | Meaning |
|---|---|---|---|
| `schemaVersion` | required | string | Must equal `0.1.0-draft.1`. |
| `plugin` | required | object | See §2. |
| `capabilities` | required | object | See §3. |
| `resources` | required | array | See §4. May be empty, but must be present. |

Unknown fields are rejected at every level (§6, `UNKNOWN_FIELD`), including
future protocol revisions: a newer declaration is not treated as a subset of an
older validator.

## 2. `plugin`

| Field | Presence | Type | Rule |
|---|---|---|---|
| `plugin.id` | required | string | Non-empty identifier (§5). Opaque; no namespace or format grammar. |
| `plugin.version` | required | string | Non-empty identifier (§5). Opaque; no SemVer parsing. |

No ordering, comparison, range or satisfiability semantics are defined for
`version`. `latest`, `1`, `v1.0.0` and `2026-10-31` are all accepted and all
equally meaningless to a consumer of this protocol.

## 3. `capabilities`

| Field | Presence | Type | Rule |
|---|---|---|---|
| `capabilities.required` | required | array of strings | May be empty. Unique names (§5). Disjoint from `optional`. |
| `capabilities.optional` | required | array of strings | May be empty. Unique names (§5). Disjoint from `required`. |

Both keys are mandatory even when empty: an explicit empty list is an author
statement, while an omitted list is ambiguous and is rejected. Rejecting absent
values instead of inventing a default is deliberate — see §7.

A capability name is an opaque label. This revision defines no capability
registry, no semantics for any specific name, and no negotiation outcome. Two
plugins declaring the same capability name are not thereby compatible.

## 4. `resources`

`resources` is a **required array** of claim objects. It may be empty, but it
must be present: an omitted key is `MISSING_FIELD` and `null` is
`TYPE_MISMATCH`. Neither is repaired into `[]`. "No claim is made" is written as
`"resources": []`, and the validator never invents that value on the author's
behalf (§7).

Each entry is an object with exactly three permitted fields:

| Field | Presence | Type | Rule |
|---|---|---|---|
| `kind` | required | string | One of `"tool"`, `"service"`. |
| `name` | required | string | Non-empty identifier (§5). |
| `scope` | required | string | Author-supplied static label (§5). No default, no vocabulary. |

`scope` is **any static label the author chooses** — `"plugin"`, `"shared"`,
`"agent"`, `"per-session"`, `"a b"`, `"团队"` are all equally acceptable. The
only constraints are the string rules of §5 (non-empty, no leading or trailing
whitespace, no control characters). It is **not** an enumerated vocabulary in
this revision, and no label list is exported or enforced.

This protocol attaches no meaning to any particular label, does not recognise
`"plugin"`/`"shared"` specially, and defines no matching between plugins. A
later revision may define matching semantics; this one does not, and a label
must not be mapped by inference onto a host, agent or session scope.

Duplicates are detected by the triple `(kind, name, scope)`. The same `name`
under a different `kind` or a different `scope` is **not** a duplicate.

## 5. Identifier rules

The same rules apply to `plugin.id`, `plugin.version`, every capability name and
every resource `name`:

1. must be a JSON string;
2. must be non-empty;
3. must not begin or end with whitespace (`String.prototype.trim` semantics);
4. must not contain ASCII control characters (U+0000–U+001F, U+007F) or the
   line separators U+2028 / U+2029.

Nothing else is constrained. Unicode, spaces inside the string, `/`, `@`, `:`
and any other punctuation are permitted. Implementations must not add
case-folding, normalisation or namespace conventions.

## 6. Issues and codes

`validateDeclaration(value)` returns:

```ts
{ valid: boolean, issues: Array<{ code, path, message, severity }> }
```

`valid` is `true` if and only if `issues` is empty. The result, the issue array
and each issue object are frozen. Issues are plain JSON values.

`path` is `''` for the declaration root, otherwise a dot/bracket path such as
`capabilities.required[2]`. Field names that are not plain identifiers are
quoted: `['a.b']`.

| Code | Meaning |
|---|---|
| `TYPE_MISMATCH` | A value has the wrong JSON type (including a non-object root). |
| `MISSING_FIELD` | A required field is absent. Reported per field; no default is substituted. |
| `UNKNOWN_FIELD` | A field outside the permitted set at that level. |
| `INVALID_VALUE` | Wrong value: empty or padded identifier, bad `schemaVersion`, bad `kind`, duplicate capability, or duplicate resource claim. |
| `THROWS` | Reading a known field threw. Unreachable for JSON values; a best-effort mapping for some hostile JavaScript objects, not a guarantee. |

These five codes are exactly the exported `ISSUE_CODES` table, and every one of
them is reachable from some input. There is deliberately **no**
`DUPLICATE_FIELD` code: a repeated object key is erased by any JSON-value
parser, so no entry of this API could ever emit it. The text-level rule it names
is described in §8 as an unimplemented expectation, not as part of this table.

### 6.1 No-throw contract: JSON values only

`validateDeclaration` returns a result for every **JSON value** — anything
`JSON.parse` can produce. That is the protocol's entire input language, and the
contract covers it.

Arbitrary JavaScript objects are **not** covered. The implementation is
defensive but best-effort: it reads own property names and the values of known
fields only, never invokes accessors on unknown keys, and converts a throwing
accessor on a known field into a `THROWS` issue. Inputs that can throw before any
field is read — notably a `Proxy` whose `ownKeys`, `getOwnPropertyDescriptor`,
`get` or `has` trap throws — may propagate the exception. This revision does not
attempt proxy-trap interception; promising it would require a much more complex
mechanism for no protocol benefit.

Issue order is deterministic: unknown root fields first, then
`schemaVersion`, `plugin`, `capabilities`, `resources`, each in a fixed field
order. Consumers must not depend on message text; codes and paths are the
stable surface. `severity` currently has exactly one value, `"error"`.

## 7. No defaults

This protocol never supplies a value the author did not write:

- an absent `capabilities.required` / `capabilities.optional` is an error, not `[]`;
- an absent `resources` is `MISSING_FIELD` and `null` is `TYPE_MISMATCH`;
  neither is replaced by `[]`; an empty array must be written explicitly;
- `resources[].scope` has no default and no label is assumed; omitting it is an
  error;
- `schemaVersion` is not inferred from context.

The rationale is that a declaration records what an author intended. Silent
defaults would make the record indistinguishable from one the author never
wrote, and a downstream consumer could not tell prediction from invention.

## 8. Conformance vectors and their limit

`conformance/` holds language-neutral vectors:

- `positive/*.json` — the file body is a declaration that must validate cleanly;
- `negative/*.json` — the file body is a declaration that must be rejected;
- `structural/*.json.txt` — raw JSON text with repeated object keys;
- `manifest.json` — the exact expected `{code, path}` pairs, kept out of the
  declaration bodies so those bodies stay untouched by any private wrapper.

For negative vectors the expected pair set must match **exactly**:
order-insensitive, but a missing or an extra issue is a failure.

**Duplicate keys are not decidable at the value level.** `JSON.parse` silently
keeps the last occurrence, so a validator that receives a parsed value can never
observe that a key repeated. The four `structural` vectors therefore carry
`evaluatedAs` notes in the manifest that name the code `DUPLICATE_FIELD` for a
JSON-text-aware parser.

Those four expectations are **preserved as documentation of a rule this
revision does not implement**. They are excluded from value-level runs, reported
as `unimplemented`, and must never be counted as passing — neither in this
repository's tests, neither by its CLI, nor by a claim of conformance. Totals
in this revision are therefore: 44 published vectors (6 positive, 34 negative,
4 structural), of which 40 are implemented and evaluated, and 4 remain
unimplemented by design. An implementation that parses JSON text itself may
claim them; this package does not.

## 9. JSON Schema

[declaration.schema.json](declaration.schema.json) is generated from
`declarationJsonSchema()` and a test fails when the committed file drifts.

**No JSON Schema engine is bundled or invoked by this package.** Normative
validation is performed by the executable rules above. The schema agrees with
those rules on every rule JSON Schema can express. Two rules it cannot express,
repeated in the schema's `$comment`, are enforced only by `validateDeclaration`:

1. **Repeated object field names in the JSON text.** No JSON Schema keyword
   inspects source text, so a schema sees the post-parse object. This is also
   the rule behind the `structural` vectors of §8.
2. **Cross-list disjointness of `capabilities.required` and
   `capabilities.optional`.** `uniqueItems` applies to one array at a time;
   there is no keyword relating the members of two sibling arrays.

Uniqueness of the `(kind, name, scope)` triple across `resources[]`, by
contrast, **is** expressible and is not on that list. A resource entry has
exactly `kind`, `name` and `scope` (`additionalProperties` is `false` and all
three are required), so two entries sharing the triple are equal items, and
`"uniqueItems": true` on `resources` rejects them. No projection is needed:
there is nothing beyond the triple to distinguish two entries.

A consumer that runs the schema only must therefore report:

- everything `validateDeclaration` rejects, **except** a declaration whose only
  defect is one of the two rules above — a schema may accept it;
- nothing that `validateDeclaration` accepts.

Validating with the schema alone is not conformance to this specification.

## 10. Open questions for the next revision

Deliberately unresolved here, and not to be decided by individual
implementations:

1. Whether `version` should ever gain range semantics, and with which grammar.
2. Whether capability names need a registry or namespacing.
3. Whether resource matching between plugins is in scope at all.
4. Whether `scope` should carry host meaning; current answer is no.
5. Whether a negotiation outcome belongs in this protocol or a separate one.

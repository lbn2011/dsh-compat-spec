# Development notes

Short operational notes for whoever continues this repository. Normative content
lives in [spec/declaration-protocol.md](../spec/declaration-protocol.md); this file
only explains the moving parts.

## Commands

```sh
node --test                              # everything (50 tests)
node --test src/test/validate.test.js    # validator semantics only
node tools/schema-sync.mjs --check       # CI gate: committed schema vs code
node tools/schema-sync.mjs --write       # regenerate after editing the schema
node tools/cli.mjs --conformance         # vectors as a pass/fail report
```

No `npm install` step exists or is needed: the package has zero dependencies and
`npm` may be absent in the environment. The supported baseline is Node >=24.9.0; validation was run on Node 24.21.0.

## Where a change goes

| Change | Edit | Then |
|---|---|---|
| A validation rule | `src/index.js` | Update `spec/declaration-protocol.md`, add a vector, extend tests |
| The JSON Schema | `declarationJsonSchema()` in `src/index.js` | `node tools/schema-sync.mjs --write` |
| A conformance vector | Add the file under `conformance/positive|negative|structural/` | Add its expectation to `conformance/manifest.json` |
| The public type surface | `src/index.d.ts` | `src/test/package.test.js` fails if it drifts from runtime exports |

The committed `spec/declaration.schema.json` is generated. Never hand-edit it;
`src/test/schema.test.js` compares it byte-for-byte against `renderSchema()`.

## Design rules that tests enforce

1. **No throwing from `validateDeclaration` for JSON values.** Any new field read
   must go through `readField()`, which turns a throwing getter into a `THROWS`
   issue. That is best-effort hardening for hostile JavaScript objects, **not** a
   promise about them: proxy traps can throw before any value is read. Keep the
   documentation scoped to JSON values and do not re-introduce a blanket
   "never throws for any input" claim.
2. **No defaults.** An absent required key is a `MISSING_FIELD`, never filled in.
   `resources` is a required array; an omitted key must stay an error and `null`
   must stay unchanged. Never rewrite either to `[]`.
3. **No inferred host meaning.** `scope` stays an author label, `version` stays an
   opaque string. Do not add SemVer parsing or map `scope` onto an agent scope.
4. **Deterministic issue order.** Unknown root fields first, then
   `schemaVersion`, `plugin`, `capabilities`, `resources` in field order, followed
   by required `configSchema` only for `0.2.0-draft.1`. Legacy defaults and the
   generated schema remain `0.1.0-draft.1`; use the explicit
   `declarationJsonSchemaForVersion(version)` API for the newer envelope.
   The pure core checks only the contract's outer boolean/object shape; full
   JSON Schema admission and instance validation belong to the platform engine.
5. **Vectors are exact.** A negative vector's `{code, path}` set must match
   exactly; extra issues are failures, not tolerated noise.
6. **Pure library.** `src/index.js` must import nothing: no `node:` builtins, no
   `require`, no `fetch`, no `process`. I/O belongs in `tools/`.

## Adding a vector

1. Positive: write a bare declaration to `conformance/positive/NN-name.json` and
   add `{ "name": "...", "doc": "..." }` under `manifest.positive`.
2. Negative: write the bare declaration to `conformance/negative/NN-name.json` and
   add `{ "name", "doc", "valid": false, "issues": [{ "code", "path" }] }` under
   `manifest.negative`.
3. Structural (only for defects invisible after `JSON.parse`): add
   `conformance/structural/NN-name.json.txt` plus a manifest entry carrying
   `evaluatedAs`; such vectors are excluded from value-level runs.

Fixture files hold **only** the declaration. Anything else would make them
unusable by another implementation's plain JSON loader.

## Known limits (do not paper over)

- No host was started or inspected. Every claim in this repository is a library
  test result. Do not write an evidence matrix or a compatibility claim without
  running the real host.
- `structural` vectors are undecidable by a value-level validator. Do not make
  `validateDeclaration` report `DUPLICATE_FIELD`; it cannot see repeats. That code
  is not exported at all, and every exported code must stay reachable from some
  input — `src/test/validate.test.js` enforces both.
- `structural` vectors are reported as `unimplemented`, never as passing. Their
  manifest expectation is documentation of the text-level rule. Do not count the
  suite as "44 passing": it is 40 implemented, 4 unimplemented.
- No license exists yet. Do not add one without the owner's decision, and do not
  copy upstream source.
- Not committed, not published, no remote configured.

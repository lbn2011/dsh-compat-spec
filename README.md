# dsh-compat-spec

Independent DSH plugin compatibility protocol repository. This revision contains a
**draft** declaration protocol with a reference validator, a generated JSON Schema and
language-neutral conformance vectors. It is not a ratified release, has no host
acceptance claim, and has not been published anywhere.

## Status at a glance

| Item | State |
|---|---|
| Package | `dsh-compat-spec@0.1.0-draft.1`, ESM, zero dependencies, no install step |
| Protocol version | `0.1.0-draft.1` (`schemaVersion` must equal it) |
| Config-schema revision | `0.2.0-draft.1` — the same grammar plus an optional `configSchema` field; a `0.1.0-draft.1` document remains valid and is checked without it |
| Runtime | Node.js built-in test runner; developed against Node 24.21.0 |
| Host / live-DSH verification | **Not performed.** No host was started or inspected for this revision. |
| Publication, commits, license | Not published. MIT since 2026-11-10; `private` cleared on explicit approval the same day, so the publish is no longer silently blocked. |

## Start here

- [Protocol specification](spec/declaration-protocol.md) — normative field rules, error codes, scope limits.
- [JSON Schema](spec/declaration.schema.json) — generated mirror for machine consumption.
- [Requirements and delivery plan](docs/requirements-and-design/2026-10-31-compat-spec-requirements.md).
- `conformance/` — vectors plus [manifest.json](conformance/manifest.json) with exact expectations.
- [`src/index.js`](src/index.js) — reference validator (JSDoc) and [`src/index.d.ts`](src/index.d.ts) types.

## Library usage

```js
import { PROTOCOL_VERSION, validateDeclaration } from 'dsh-compat-spec';

const result = validateDeclaration(input);
// { valid: boolean, issues: [{ code, path, message, severity }] }
```

- `validateDeclaration(value)` never throws **for JSON values** — anything
  `JSON.parse` can produce, including `null`, arrays, `__proto__` keys and deep
  nesting. Arbitrary JavaScript objects are not covered: it is best-effort there
  (a throwing getter on a known field becomes a `THROWS` issue), and a `Proxy`
  trap that throws may still propagate. See the protocol's §6.1.
- `valid === true` if and only if `issues` is empty. Result and issues are frozen.
- Other exports: `assertValidDeclaration` (opt-in throwing wrapper),
  `declarationTemplate()`, `declarationJsonSchema()`, and the field tables
  `PROTOCOL_VERSION`, `RESOURCE_KINDS`, `ISSUE_CODES`, `SEVERITIES`. There is no
  exported scope vocabulary, because `scope` has none.

The library performs no I/O: it does not read or write files, access the
network, read process state or touch a live host. A file-reading CLI exists
separately as `tools/cli.mjs` for humans and CI.

### Admission-evidence grammar

The admission-evidence document grammar is a **separate module** with its own entry
point. It is not re-exported from the package root, because it validates a different
document — a coordinator's admission record, not a plugin declaration:

```js
import { validateAdmissionEvidence } from 'dsh-compat-spec/admission-evidence';
```

```json
"exports": {
  ".": { "types": "./src/index.d.ts", "default": "./src/index.js" },
  "./admission-evidence": {
    "types": "./src/admission-evidence.d.ts",
    "default": "./src/admission-evidence.js"
  }
}
```

Reading the module through the package specifier — rather than a relative path into
a checkout — is the supported route, and it is what the suite asserts with a
self-reference import. That proves resolution **from inside this package**; it does
not prove what an installed consumer resolves, which needs a real pack-and-install.
See `docs/testing/2026-11-09-admission-evidence-export.md`.

### CLI (optional)

```sh
node tools/cli.mjs --check <declaration.json>   # exit 0 valid, 1 invalid, 2 unreadable
node tools/cli.mjs --conformance                # run all value-level vectors
node tools/cli.mjs --schema                     # print the JSON Schema
node tools/cli.mjs --template                   # print the declaration skeleton
```

## Development commands

The repository's own suite is run under a fixed resource envelope by
`scripts/spec-test-batch/run.sh` (one transient unit, 384 MiB, swap 0, 32 tasks,
50 % CPU, 120 s, one memory gate). Measured 2026-11-09: `94/94` in four bounded
rounds, last two on identical inputs.

```sh
node --test                       # full suite
node --test src/test/validate.test.js   # one file
node tools/schema-sync.mjs --check      # committed schema vs code (CI gate)
node tools/schema-sync.mjs --write      # regenerate spec/declaration.schema.json
```

Last local run: **50 tests, 50 pass, 0 fail**; conformance **40 evaluated, 0
failures, 4 unimplemented and not counted as passed** (see below). No dependency
was installed; `npm` is not required and is not available in this environment.

### Why four vectors are unimplemented, not skipped-and-passing

Published vectors: **44** — 6 positive, 34 negative, 4 structural. Of these,
**40 are implemented and evaluated**; the 4 under `conformance/structural/*.json.txt`
are **unimplemented by design**, never counted as passing.

Repeated object keys vanish under `JSON.parse`, so a validator that receives a
parsed value cannot see them. Their text-level expectation is kept as
documentation of the rule (it names `DUPLICATE_FIELD`, a code this API does not
export because it is unreachable), and `node tools/cli.mjs --conformance`
reports them as `unimplemented`. No implementation may claim them without
actually parsing JSON text.

## Scope and limits

- The declaration fields are **not official DSH host fields**. `plugin.id`,
  `plugin.version`, resource `kind` and resource `scope` must not be mapped onto
  any real agent/host scope, registration id or version range by inference.
- `scope` is any static author label (non-empty, no leading/trailing whitespace).
  It is not an enumerated vocabulary and carries no host meaning; no matching
  between plugins is defined.
- `version` is an opaque non-empty string. No SemVer parsing, ordering or
  satisfiability is claimed or implemented.
- Absent values are rejected, never defaulted: `resources` is a required array,
  so an omitted key is an error and `null` is a type error; neither is rewritten
  to `[]`.
- No JSON Schema engine is bundled. The committed schema is a mirror; the
  normative check is the JavaScript validator. Two rules are not expressible
  in JSON Schema and are listed in the schema's `$comment`: repeated object
  field names, and cross-list disjointness of `capabilities.required` /
  `capabilities.optional`. A schema-only runner may accept a declaration whose
  only defect is one of those two. Uniqueness of the `(kind, name, scope)`
  triple across `resources[]` is expressible — the entry has exactly those three
  fields, so `"uniqueItems": true` on `resources` covers it.
- A valid declaration is **not** evidence that a host accepted or ran anything.
  No evidence matrix exists yet; this revision ships none.

## Layout

- `src/` — reference validator, type declarations, tests.
- `spec/` — normative prose and generated JSON Schema.
- `conformance/` — language-neutral positive, negative and structural vectors, evaluator.
- `tools/` — schema sync and optional CLI.
- `docs/requirements-and-design/` — requirements and staged plans.

Sibling products are dsh-plugin-kit (author helpers, templates, Skills and
tests) and dsh-compat-platform (analysis and approved operations). They are
separate Git repositories, not submodules or runtime path dependencies.
Contract versions must be agreed before integration.

## Limits of this delivery

Created locally on 2026-10-31. No remote, commit, package publication, install
or live-host run was performed. License is still pending and no reuse license is
granted by this README or any file here. No upstream source was copied; source
references in the requirements preserve the audit basis only.

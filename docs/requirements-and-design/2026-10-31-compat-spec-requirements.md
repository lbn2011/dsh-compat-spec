# Compatibility protocol — Requirements and delivery plan

Date: 2026-10-31. Status: first minimum protocol implemented as a draft; contracts not yet ratified.

> **[Decided, 2026-10-31]** Maintain three independent local repositories: dsh-compat-spec, dsh-plugin-kit and dsh-compat-platform. This repository owns the protocol. Bootstrap includes documentation and directory structure only; no publication or live-host installation.

## 1. Objective

Specify verifiable compatibility obligations for cooperating DSH plugins without replacing Cordis or claiming control over unmanaged plugins. Prioritize demonstrated old-adapter defects and unresolved composition semantics, not renamed native features.

## 2. Current state and gaps

Official baseline: deepseek-ai/deepseek-harness commit `ce7073d51254c26cd63b22a60835b8f948deb447` (0.2.2-alpha.2). The previously inspected installed host was 0.2.1-rc.2; neither baseline implies cross-version support.

| ID | Existing evidence | Required increment |
|---|---|---|
| D1 | Native tools register with exact disposers and per-layer duplicate rejection | Declare managed claims before multi-plugin activation; distinguish prediction from observed conflict |
| D2 | Cordis independently attempts effect teardown, logging errors | Define operation-level outcomes, incomplete cleanup and bounded observation without claiming forced termination |
| D3 | Prior old-adapter experiments reproduced cleanup short-circuit inside a single callback | Require independent cleanup attempts and repeat/concurrent settlement tests at the adapter level |
| D4 | Old lifecycle proposal already requires deadlines and atomic publication | Specify unresolved group declarations and reporting; do not claim these obligations are new |
| D5 | Host APIs are pre-stable | Explicit version/evidence matrix rather than universal compatibility |

The prior local research reported seven old-source defect/control tests and 39 prototype tests (36 mechanism tests plus three defect reproductions). These are historical observations, not acceptance results for this repository. No implementation or test suite has been migrated here.

## 3. Scope and conceptual data

- Plugin authors declare required/optional capabilities and predictable managed resource claims.
- Implementers negotiate capabilities and refuse missing required coordination rather than silently bypassing it.
- Reports distinguish static inference, direct Cordis tests, real Loader/profile tests, browser tests and actual multi-version runs.
- Model-route intent does not authorize access; discovery and preflight do not prove actual child execution.

| Proposed entity | Fields | Source of truth |
|---|---|---|
| Declaration | plugin identity, protocol range, required capabilities, claims | Author declaration, validated at input |
| Claim | resource kind/name/scope, owner instance/generation | Declaration plus runtime-issued ownership |
| Report | tested versions, scenarios, evidence level, limitations | Executed test runner and identified fixtures |
| Operation result | requested action, settlement, errors, uncertain ownership | Owning executor; never model-authored success |

These are conceptual fields, not final wire schemas. No new general-purpose security sandbox is specified.

## 4. Cross-repository responsibilities

This repository owns normative prose, schema source and language-neutral conformance vectors. dsh-plugin-kit will own author helpers and executable harnesses. dsh-compat-platform will own analysis, optional coordination and remediation execution.

Dependency direction: protocol → kit → platform; platform may also consume protocol directly. No runtime dependency may point back to the original research checkout or require sibling filesystem paths. Before first publication, agree explicit contract versions and immutable release references; never follow another repository's default branch implicitly. Each implementation publishes its own evidence matrix. Protocol versions and DSH versions are separate axes.

## 5. Delivery plan and acceptance

- [x] Establish local repository and scope documentation (bootstrap deliverable).
- [~] P0: review minimum declarations, errors, evidence levels and feature negotiation.
  - [x] Minimum declaration grammar implemented: `schemaVersion` (fixed `0.1.0-draft.1`),
        `plugin.{id,version}`, `capabilities.{required,optional}` and a required
        `resources[]` of `{kind,name,scope}` where `scope` is a free-form static
        label (no enumerated vocabulary, no default). Errors, unknown fields, duplicates,
        overlap and absent-value rejection are specified in
        [spec/declaration-protocol.md](../../spec/declaration-protocol.md).
  - [x] Reference validator `validateDeclaration()` plus generated JSON Schema and
        44 published language-neutral vectors (6 positive, 34 negative, 4 structural).
        Value-level conformance covers **40** of them; the 4 structural vectors require
        JSON-text-aware parsing and are reported as unimplemented, never as passing.
  - [ ] Evidence levels and feature negotiation remain open; nothing is specified or
        implemented for either, and no level is claimed by this repository.
- [~] P1: publish positive/negative vectors for claims, missing capabilities, repeated cleanup and stale generations.
  - [x] Positive/negative vectors published for declarations and resource claims,
        including missing required capabilities (`capabilities` object absent or a
        list absent) and duplicate resource claims.
  - [ ] Repeated cleanup and stale generations are **not** covered: they belong to
        operation outcomes, which this revision does not define.
- [ ] P2: define atomic-group declarations and operation receipts only against real consumers in kit/platform.
- [ ] P3: validate at least two actual DSH versions before making cross-version claims.

Acceptance requires a mapped source for each reused native behavior, at least one rejecting vector for each new obligation, and explicit unmanaged-plugin limitations. A passing reproduction of a bug is not a fixed-behavior test.

## 6. Risks and pending decisions

| Risk | Mitigation |
|---|---|
| Redundant protocol over native APIs | Cite native semantics and add only demonstrated gaps |
| Cross-repository drift | Version contracts and validate consumers together before release |
| Overstated atomicity | Limit guarantees to managed publication; external effects are separate |
| License/attribution loss | Review origins before copying code or old specifications |

**[Pending]** Final protocol name, license, npm/package identity, initial supported host release and first pilot plugins.
The package currently carries `private: true`, version `0.0.0`, and no license file. Recommendation: independently authored contracts, one pinned release first, then a second measured version. No license is inferred from upstream MIT metadata.

## 7. Repository layout

`spec/` holds the normative prose and the generated JSON Schema. `conformance/`
holds the language-neutral vectors plus their manifest. `src/` holds the reference
validator and its tests. `tools/` holds the schema-sync check and an optional CLI.

## 7.1 Minimum protocol — implementation record

Delivered in this revision, with limits stated explicitly:

| Aspect | Delivered | Not delivered / not claimed |
|---|---|---|
| Grammar | Four top-level fields; strict unknown-field rejection at every level | No negotiation, no operation outcomes, no receipts |
| Validation | `validateDeclaration(value) -> {valid, issues}`; never throws for JSON values; best-effort (not guaranteed) for arbitrary JavaScript objects such as throwing proxies | No JSON Schema runner; schema is a mirror only |
| Defaults | None; absent values are errors, `resources: null` preserved | No inference of `scope`, `version` or `resources` |
| `version` | Non-empty opaque string | No SemVer parsing, ordering or satisfiability |
| `scope` | Free-form static label (any non-empty string, no leading/trailing whitespace), no host meaning | No enumerated vocabulary, no mapping to real agent/host scope, no matching |
| Host reality | — | No host test, no live DSH run, no cross-version evidence |
| Machine consumption | JSON Schema draft 2020-12 generated from code; `resources` carries `uniqueItems: true`, which covers `(kind,name,scope)` uniqueness because a resource entry has exactly those three fields | Two rules not expressible in JSON Schema (repeated field names, cross-list disjointness); they are listed in `$comment` and enforced only by the validator. A schema-only check is not conformance |

Evidence level for every item above: **library tests only** (Node built-in test
runner, no dependencies). No direct Cordis test, real Loader/profile test,
browser test or multi-version run was executed, so no report from §3 exists yet.
This repository therefore makes **no** compatibility claim about any DSH version,
including the baseline `ce7073d51254c26cd63b22a60835b8f948deb447`.

## Appendix A. Source evidence

- [Official tools: register/restrict, lines 120–188](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/packages/core/tools/src/index.ts#L120-L188).
- [Cordis Fiber._unload, lines 712–745](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/vendor/cordis/src/fiber.ts#L712-L745).
- [Official pre-stable API notice](https://github.com/deepseek-ai/deepseek-harness/blob/ce7073d51254c26cd63b22a60835b8f948deb447/AGENTS.md#L5-L7).
- Historical local research location: `/root/dsh-ecosystem-spec/experiments/legacy-gap-audit/` and `/root/dsh-ecosystem-spec/experiments/compatibility-lab/`. References only; no dependency or copied implementation.

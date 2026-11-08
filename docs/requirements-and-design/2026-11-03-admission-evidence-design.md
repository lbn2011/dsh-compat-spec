# Admission evidence — requirements and design (draft; lane and version adopted)

> **Status: DRAFT INTERFACE — LANE AND VERSION ADOPTED; REFERENCE VALIDATOR
> IMPLEMENTED; FIRST BATCH RUN RECORDED, ONE DEFECT FIXED, BATCH MODULE TESTS
> PASSING.**
> The lane and the `admission-evidence/0.1-draft.1` literal are decided
> (2026-11-04). The generic case catalog, the assertion sets and the validator
> summary shape are the Lead-frozen draft implementation contract, changeable only
> as a recorded contract change with its cost — and still **not human
> ratification** and **not a published standard**. No schema file, conformance
> vector, package export, `bin` entry or CLI flag is added by this work, and no
> root export of the package changes; nothing here intends a change to
> `declaration-protocol.md` (`0.1.0-draft.1`) or to the existing
> `coexistence-evidence/0.1` intake lane. The normative companion draft is
> [`../../spec/admission-evidence.md`](../../spec/admission-evidence.md).
>
> **History versus current state.** Earlier revisions of this document said
> "nothing implemented" and "code and tests not run". Those statements describe the
> **documentation stage** and are kept as history; they are no longer true of the
> tree. A standalone validator now exists
> (`projects/dsh-compat-spec/src/admission-evidence.js`, with
> `admission-evidence.d.ts` and `src/test/admission-evidence.test.js`). Its first
> batch ran four test files with **101 tests: 95 passed, 6 failed**
> ([`../testing/2026-11-04-admission-evidence-batch.md`](../testing/2026-11-04-admission-evidence-batch.md));
> one failure was a `ReferenceError` from a missing import inside this lane's own
> test file, now corrected, while the other five belong to the platform diagnostic
> and integration files — the driver file recorded no failure. The corrected re-run
> reports **101 tests, 101 passed, 0 failed, 0 skipped** with the test process
> exiting 0
> ([`../testing/2026-11-04-admission-evidence-recheck.md`](../testing/2026-11-04-admission-evidence-recheck.md)),
> so this batch's module tests pass. That is a statement about these four test
> files: it is not ratification of the draft, not a published contract, and not a
> host acceptance.
>
> **Command disclosure.** Producing these documents used file reads, searches and
> scripted in-place text replacement, and one syntax-only `node --check` was run on
> the new module — a violation of the no-commands brief for that stage, recorded
> rather than glossed. The check does not execute the module; no test, build,
> install or host run was started from the documentation stage. This document
> offers no hash or byte-identity proof for any file it did not edit.

> **Decided before writing (scope of this change, 2026-11-03):**
> - Write scope is exactly two new files: this document and
>   `projects/dsh-compat-spec/spec/admission-evidence.md`. No other file in any
>   repository is created, edited or regenerated.
> - `0.1.0-draft.1` and `coexistence-evidence/0.1` receive **no intended edit**. No
>   field, status, tier or code is added to either. This is a statement about what
>   was edited, not a verified byte-identity claim: no before/after hash or
>   checksum of those files was produced.
> - This work is independent of the pending template host acceptance and does not
>   depend on, or advance, that acceptance.

> **Decided by user selection (2026-11-04):**
> - The lane is adopted as an **independent** lane, and its version literal is
>   **`admission-evidence/0.1-draft.1`**. Both are recorded as settled in §3 (D0,
>   D2) and in the companion draft (§10).
> - **Lead-frozen draft implementation contract (2026-11-04)**: the four status
>   words, the eight-case catalog and its exact assertion sets (D1), root-level
>   `coordination`, no `runner`/tier field, zero-effect alongside zero-callback,
>   optional absence as `coverage.unknown`, and the synchronous validator return.
>   Frozen so implementation can start; a deviation is a recorded contract change
>   with its cost, and none of it is human ratification or a published standard.

## 1. Objective

Define the **third, separate** evidence lane for *claim admission* — the observation
set produced when a caller-owned in-memory claim coordinator is driven by
cooperating contenders — and fix a draft interface implementable without further
design work.

Both halves are now decided in shape: the lane exists independently and its version
literal is `admission-evidence/0.1-draft.1` (user selection, 2026-11-04). What
remains proposed is the generic case catalog, the assertion sets and the validator's
summary shape; those are specified in
[`spec/admission-evidence.md`](../../spec/admission-evidence.md) §6 and can still be
changed by the Lead.

The immediate trigger is that one real record exists
(`projects/dsh-plugin-kit/docs/testing/runs/20261102T150305Z-admission-loader/`:
57 assertions, 4 cases A/B/C/D, `status=passed`) and it **does not fit the existing
lane's vocabulary without strain**. That lane can record an expected refusal — as
`passed` with zero-count assertions (§2.3) — but it has a closed list of three case
ids, so an admission scenario cannot be *named*, and its status does not distinguish
"the thing worked" from "the thing was correctly refused".

The design question is narrow on purpose. It is *not* "define plugin admission";
it is "define what a record of one coordinator's behaviour may state, and refuse
the rest".

## 2. Current state — what the sources actually say

Read for this design: `projects/dsh-plugin-kit/src/admission.js` (791 lines),
`src/cleanup.js` (287), `src/admission-provider.js` (198), `src/admission.d.ts`,
`projects/dsh-compat-platform/packages/analyzer/src/runtime-evidence.js` (721) and
its `runtime-evidence.md`, `projects/dsh-compat-spec/spec/declaration-protocol.md`,
the retained Loader artifacts `41-arm.json` / `42-run.json` / `43-prepare.json`,
and `docs/testing/2026-11-02-admission-loader.md` §9.

### 2.1 The coordinator's actual contract

| Property | Source | Note for the evidence lane |
|---|---|---|
| Two entry points, `reserve()` sync and `admit()` async | `admission.js:17-22`, `:642-644`, `:656` | A record must say which entry point a case exercised; they have different evidence shapes (a lease vs a handle). |
| Reservation is all-or-nothing and **precedes** the activation callback | `admission.js:133-135`; `reserveInternal` at `:554-576`; call site `:667` before `activate(...)` at `:682` | This is the property a first-class refusal status is *proposed* for; §2.3 shows it is also recordable today as `passed` with zero counts (§D1). |
| Conflict throws `ERR_ADMISSION_CONFLICT` with `.conflicts` in batch order; nothing mutated | `admission.js:278-289`, `:559-565` | The refusal must be asserted by **code**, not by message text. |
| A claim is exactly `{kind,name,scope}`, own data keys only; an untrimmed value is refused, never repaired | `admission.js:61-86`, `CLAIM_FIELDS` `:366`, `readOwnField` `:375-382`, `auditClaims` `:428-501` | The audit performs no trimming or normalisation; caller strings must arrive already trimmed. Rejections are per-reason and must not be collapsed into one boolean. |
| Key is injective `JSON.stringify([kind,name,scope])` | `admission.js:242-244` | No separator-collision claim is possible; the record need not assert one. |
| Malformed/duplicate batch → `ERR_ADMISSION_CLAIMS`, coordinator unchanged | `admission.js:262-272`, `:506-518` | "Unchanged" is observable via `size` and a follow-up `reserve`. |
| Lease `state` ∈ `reserved`/`released`/`quarantined`; release identity-bound; state errors | `admission.js:94-127`, `:608-615`, `:630-634`, `:296-314` | Two way-refusals (`release` on quarantined, `quarantine` on released) are themselves evidence that must be assertable. |
| Throwing activation ⇒ **always** quarantine; clean rollback rethrows the same value; failed rollback ⇒ `ERR_ADMISSION_ROLLBACK` | `admission.js:155-171`, `:683-700`, `:323-345` | Identity rethrow (§D6-adjacent) is a real assertion, not a detail: a copy would pass an equality check and fail the contract. |
| Clean close releases only after all cleanups succeed | `admission.js:731-743` | "Released" must be paired with "close fulfilled"; either alone is insufficient. |
| Failing cleanup ⇒ quarantine + reject with the scope's own `ERR_CLEANUP_SCOPE_FAILED` aggregate, unwrapped | `admission.js:744-752`; `cleanup.js:154-162`, `:217-233` | Host unload settling and close rejecting are **two** observations (§2.2). |
| Every `close()` returns the same promise object, created before the scope starts | `admission.js:717`, `:726-729`, `:731`; rationale `:194-199` | Identity, not state, is the assertion. |
| No timeout / no deadline / no lease expiry / no `Promise.race` | `admission.js:38-43`; `cleanup.js:91-104` | Forbids any duration-based assertion (§D-none). |
| Not a security boundary; no force-clear; restart is not recovery | `admission.js:44-57` | Bounds what a record may imply about ownership and recovery. |
| Provider publishes the caller's object **by identity** as `pluginAdmission`; creates/copies/resets nothing | `admission-provider.js:17-43`, `:103`, `:175-197` | "Shared" is a compound claim: URL provisioned **and** object identical (§2.4). |
| Reload can unload dependents so they release; provider unload is **not** a claim release | `admission-provider.js:37-43` | A remount case must say which of the two it observed. |
| One process, one visibility scope; two coordinators are disjoint tables | `admission-provider.js:45-55`; `admission.js:32-37` | Cross-process statements are out; visibility is usually `not-determined`. |

### 2.2 The one real record, and exactly what it covers

`41-arm.json` holds 57 assertions with `status: "passed"`; `42-run.json` reports
`coveredAssertions`/`expectedAssertions` as the same 57-element set with
`missing`/`unexpected`/`duplicates`/`failed`/`skipped` all empty. `43-prepare.json`
carries `schemaVersion: "admission-prepare/0.1"` — **a fixture-local identifier,
not a protocol version**, and one this design deliberately does not adopt (§D2).

Its own `observed.applies` uses three outcome words — `"admitted"`, `"refused"`,
and for the throwing row `"refused"` with `code: null`. The existing lane could
carry those words only inside assertion ids and prose, never as a status (§2.3);
that is a legibility cost, not an impossibility. Its `notClaimed`
list states: no full application boot or browser/GUI, no cross-version or
cross-repo comparison, nothing about two coordinators in different processes, and
"the pause is an explicit gate, not a timing observation; no assertion here
measures a duration".

Coverage is four cases, and the design must not inflate it:

| Rule (companion §2) | Loader-covered? | Best available evidence today |
|---|---|---|
| R1 reservation-first | **yes** — `b-refused-with-conflict-code`, `b-activation-callback-zero`, `b-native-register-zero`, `b-apply-count-differs-from-callback-count` | — |
| R2 tuple shape | **no** — no Loader assertion | module unit tests only |
| R3 clean close | **yes** — `a-close-settled-fulfilled`, `a-claims-released`, `a-cleanup-collected-and-invoked`, … | — |
| R4 throw ⇒ quarantine | **yes** — `d-*` (6 assertions incl. identity rethrow) | — |
| R5 cleanup failure | **yes** — `c-*` (10 assertions) | — |
| R6 shared promise | **yes** — `a-stale-close-same-promise`, `-no-effect-on-b-claims`, `-no-effect-on-b-registration` | — |
| R7 lease identity / lease-state refusals | **no** | module unit tests only |
| R8 caller-held / remount | **partly** — identity + URL asserted; **no remount case** | `shared-coordinator-instance-identical`, `shared-coordinator-url-is-provisioned` |
| R9 process / visibility | **no** | `notClaimed` prose only |
| R10 no deadline / not security | **yes, negatively** — no duration assertion exists; token labeled diagnostic | — |
| Coverage sentinel | **yes** — `expected-assertions-all-present` (`expected=56`, `+sentinel=57`) | — |

Four of eleven rows have no Loader-level coverage. Naming that is a finding of this
design, not a defect of the record: the record never claimed otherwise.

### 2.3 What the existing lane can express, and what it cannot

`runtime-evidence.js:72` fixes `CASE_STATUSES = ['passed','failed','not-run']`.
`checkStatusConsistency` (`:604-655`) then enforces `passed` ⇒ ≥1 assertion and
none false (`:608-624`), `failed` ⇒ ≥1 assertion and ≥1 false (`:627-643`), and
`not-run` ⇒ **zero** assertions (`:646-653`). Field sets are closed (`:102-105`)
and the only accepted tier is `'real-host'` (`:78`).

**An expected refusal is expressible there today.** A `passed` case whose
assertions are counters — `contender-activation-callbacks: true`,
`contender-native-registrations: true`, with the runner explaining that `true`
means the count was `0` — is a valid, honest record of "refused, ran nothing".
Nothing in the consistency rules resists a counter, and this design does not claim
otherwise.

What that lane actually costs is legibility and naming:

| Limitation | Why it matters |
|---|---|
| `CASE_IDS` is a closed list of three scenarios | Only a scenario whose subject, participants and expected outcome genuinely match one of those three can be encoded there. A different admission scenario is a *different* case and needs a separate or extended contract — relabelling an id would misreport what was observed. |
| Refusal-as-success is a convention, not a status | From the status alone, a reader cannot tell "worked" from "correctly refused". Both read `passed`. |

Adding a fourth status **to that lane** would widen a closed, already-written field
set and status list whose strictness is deliberate — so the vocabulary is proposed
for a separate lane instead. That is a design choice on legibility grounds; it is
**not** established necessity, and §D1 records it as an open decision with the
one-lane alternative named.

### 2.4 What "shared coordinator" can and cannot be observed

Three separate facts, routinely conflated:

1. the resolved module URL is the provisioned one (`shared-coordinator-url-is-provisioned`);
2. the observed coordinator object is `===` the provisioned one (`shared-coordinator-instance-identical`);
3. both participants resolved the provider inside the **same visibility scope** —
   usually **not determinable** from inside the arm.

The record's own text calls its shared-coordinator token "a diagnostic label, not
identity or authenticity proof". Hence the design keeps these as a
three-valued `coordination` object rather than one boolean (companion §4, §D4).

## 3. Gaps

| ID | Gap | Current state | Required | Evidence |
|---|---|---|---|---|
| **D0** | Whether a separate lane with a first-class `refused` status is adopted at all | **SETTLED (2026-11-04): yes** — separate lane, own version literal | Reason: the refusal/success distinction is readable off the status, and a closed existing lane is not widened. Cost, for the record: `passed` + zero-count assertions already carried the same evidence | `runtime-evidence.js:72`, `:604-655`; §2.3 |
| **D1** | No *first-class* status for "refused before the callback ran", and no way to name an admission scenario | 3 statuses + closed `CASE_IDS`; a refusal is carried by assertion ids under `passed` | Either a fourth status in a new lane, or an explicit convention documented in the existing lane — not both silently | `runtime-evidence.js:72`, `:604-655`; §2.3 |
| **D2** | The only real admission record uses a fixture-local `schemaVersion` | **SETTLED (2026-11-04): `admission-evidence/0.1-draft.1`** | Fixed literal, validated exactly; stays a draft literal so no document is mistaken for a released contract | `41-arm.json:4`, `42-run.json:4`, `43-prepare.json:2` |
| **D3** | Assertion ids in the record are fixture-specific | `inputs-runtime-root`, `prepare-schema-known`, `a-row-resolves`, … | A required set a *second* composition can honestly satisfy, or explicit separation of required vs runner-specific ids | `41-arm.json` assertions list |
| **D4** | "Shared coordinator" is one word for three facts | token + URL + identity asserted; scope never | A three-valued `coordination` record incl. `not-determined` | `admission-loader.md` §2, §9.9 |
| **D5** | `refused` could be asserted with callbacks=0 but registers unobserved | record asserts both, spec says nothing | Both required, so "did nothing" ≠ "started and was cut off" | `41-arm.json`: `b-activation-callback-zero`, `b-native-register-zero` |
| **D6** | An identity rethrow can be mistaken for an equality pass | asserted as identity today | Normative: same value **by identity**, not by structural equality | `d-activation-error-rethrown-by-identity`; `admission.js:698` |
| **D7** | Quarantine is stated as "still held" without a conflict probe | asserted via competitor refusal in C | Normative: assert a later reservation of the same tuple **conflicts** | `c-claim-held-after-failed-cleanup`, `c-competitor-refused-with-conflict-code` |
| **D8** | Host unload settling can be read as clean teardown | both asserted separately | Normative: the two are independent observations and neither implies the other | `c-loader-unload-resolved-anyway` + `c-close-rejected-independently` |
| **D9** | No lane exists for admission at all | `runtime-evidence.md` says "No evidence matrix exists yet" | A separate prose draft + a designed (unbuilt) shape | `dsh-compat-spec/README.md` §Scope and limits |
| **D10** | Provenance is unauthenticated everywhere | existing lane forces `certification: false` (`:715-720`) | Same rule here, plus a refusal of any signature/attestation field | `runtime-evidence.js:715-720` |
| **D11** | R2/R7/remount/R9 have no Loader coverage but are essential to the contract | module-level tests only | Cases optional-with-`not-run` rather than silently absent or fabricated (`§D5`) | §2.2 table |
| **D12** | A timeout can be mistaken for a coordinator behaviour | none exists in the module by design | Forbid duration-derived assertions; a timeout kill is non-pass | `admission.js:38-43`; `cleanup.js:91-104` |

## 4. Proposed solution

Full normative prose lives in the companion draft
([`spec/admission-evidence.md`](../../spec/admission-evidence.md)); this section
records the design reasoning and the mapping from gaps to choices.

### 4.1 Lane separation (D9, D0 — settled)

Three lanes, one subject each, no imports between them:

| Lane | Subject | Status | This change |
|---|---|---|---|
| `declaration-protocol.md` | what an author may **say** | draft, in-tree | no edit intended |
| `coexistence-evidence/0.1` | what happened when two plugins **coexisted in real hosts** | existing intake validator with its **own** evidence CLI (`src/evidence-cli.js`), separate from the declaration analyzer CLI (`bin: dsh-compat-analyze` → `src/cli.js`) | no edit intended |
| admission evidence | what a runner **observed** while one coordinator was driven | **adopted; interface still draft** | new prose only |

Sharing one lane is possible — an expected refusal fits in `passed` with
zero-count assertions (§2.3). What it costs is the ability to *name* an admission
scenario (closed `CASE_IDS`) and to read the refusal/success distinction off the
status. A third lane buys those two things without widening a closed lane. That
trade was made on 2026-11-04: the lane is adopted and the cost (no gain in
representability, only in naming and structure) is accepted deliberately.

### 4.2 Four statuses, bound to the case catalog (D1, D5, D6)

The four words `passed` / `refused` / `failed` / `not-run` are a **Lead-selected
draft implementation default** (2026-11-04), not human ratification and not a
published standard: the user selected only the lane and the version literal, and the
vocabulary remains draft until a separate acceptance act. The asymmetry is
normative: **a `refused` case is a success of the coordinator**, so it carries ≥1
assertion, all true, including both the zero-callback and the zero-effect property
(the latter read from the driver's own counter, not a host registry); `failed` must
carry a `false`; `not-run` must be empty and name its limitation.

**`not-run` means nobody tried, and it is the only thing it means.** Three
distinct situations that must not be confused:

- *attempted, every id evaluated, at least one false* ⇒ `failed`;
- *attempted, but the run was interrupted or an id could not be evaluated* ⇒ **no
  receipt**: the conversion is refused and the raw harness failure stays outside the
  lane. Manufacturing a `false` would invent a verdict, and relabelling it `not-run`
  would claim nobody tried;
- *never attempted* ⇒ `not-run`, zero assertions, ≥ 1 limitation.

The status is **checked against the case**, not chosen freely: the expected outcome
is a property of the case id, so `refused` is legal only for
`admission-refused-conflict`. A missing case is *absent coverage*, never a status
(companion §5, rule 5); a missing **required** case makes the document invalid
rather than silently green.

### 4.3 Compound `coordination` object (D4, D8)

Three independently-valued members — `coordinatorIdentity`,
`provisioning`, `scopeVisibility` — the last allowing `not-determined`. A boolean
`shared` would silently assert an unobserved scope and an unverified identity.

### 4.4 Generic case catalog and exact assertion sets (D3)

The record's 57 ids mix protocol-level obligations with fixture plumbing
(`inputs-runtime-root`, `prepare-schema-known`, `a-row-resolves`,
`shared-coordinator-token-matches`). Those four cannot be asserted by any other
composition, so requiring them would make conformance impossible outside one slice.

The companion therefore defines **eight generic case ids — four required, four
optional — with an exact assertion set per case** (§6.1/§6.2), and cites the 57 only
as precedent (§6.8). Three constraints keep it generic: every case must be
satisfiable by a direct in-process driver holding the coordinator itself, with no
Loader or fiber-introspection API, no host registration API and no provisioned
module URL; no case may require a generated fixture file or a digest of one; and no
case may name a plugin, repository, machine or commit.

Two assertion-level consequences, both from the same rule that the lane records
observations rather than host facts:

- Where a host run would read a native registration, a generic case reads a
  **caller-owned counter** the driver increments inside its own callback — so no
  case turns host integration into a conformance requirement.
- The error-identity assertion in `admission-activation-throw` holds only on a
  **clean rollback**. If a registered rollback callback threw, the coordinator
  delivers its own aggregate, and that is a real observation: the case is `failed`
  with explicit `false` assertions, never `not-run` — an attempt happened, so
  "nobody tried" would be a false report. `not-run` is reserved for a case that was
  genuinely never attempted; an attempt whose observations were lost produces no
  receipt at all rather than either status (§4.2, companion §6.4). The document also
  claims nothing about effects the callback performed outside the scope — those are
  unobservable, so "nothing was left behind" is not assertable in principle.

### 4.5 Provenance as claim, never authentication (D10)

No signature, key, certificate, issuer, attestation or "verified-by" field may
appear; a consumer summary carries `certification: false` unconditionally. The
three `coordination` members are each phrased as *observations*, not proofs, and
the record's own token caveat is quoted so it cannot be upgraded by paraphrase.

### 4.6 Process, visibility and time limits (D12, D11, R9/R10)

- Cross-process statements are out: two processes have disjoint tables by design.
- Visibility is reported honestly including `not-determined`.
- No assertion may be satisfied by a duration; a launcher timeout is a non-pass and
  the module has no deadline of its own.
- Restart/reload/fresh-coordinator is **not** recovery, and a record must not imply
  it is.
- `R2`, `R7`, remount and `R9` are optional-with-`not-run` in this revision rather
  than required, so the lane can state its own gaps instead of failing red until
  fixtures exist.

### 4.7 Non-novelty (explicit)

The claim tuple `(kind,name,scope)` and the identifier string rules — including
that an untrimmed value is refused rather than repaired, with no normalisation
performed — are **not** presented as new findings: they reuse
the vocabulary and rules already fixed by `declaration-protocol.md` §4–§5. Only the
*coordination* semantics (R1, R3–R8, R10) are new subject matter, and those are
one module's documented behaviour, not a discovery or a general protocol.

## 5. Risks and mitigations

| Risk | Mitigation |
|---|---|
| The draft is read as an accepted schema | Status block, "proposed draft" heading, no schema file/validator/export, and §D2 kept open |
| `refused` is read as "the run failed" | Companion §5 states the asymmetry in the status table and repeats it in §6 |
| A self-report is read as authenticated | `certification: false` mandatory; §7 forbids any attestation field; token caveat quoted verbatim |
| Fixture-specific ids leak into a contract | D3: obligations by rule; the 57 cited as precedent only |
| The lane over-claims host reality | Explicit "not claimed" rows in companion §0, §11; `'real-host'` tier deliberately not reused |
| Absent coverage silently reads as coverage | `not-run` requires zero assertions and a limitation; a missing required case is invalid rather than green; a missing optional case is named in `coverage.unknown`, never dropped |
| Editing `coexistence-evidence/0.1` "just to add a status" | §D0/D1 record the choice and its one-lane alternative; the status block states no edit to those files is intended, without claiming hash proof |
| The new status is mistaken for a settled necessity | §2.3 states that an expected refusal is already recordable as `passed` with zero counts; §D0 keeps the decision open |
| A green record is read as compatibility | Companion §11 lists what a green record does not establish |

## 6. Open schema decisions (pending Lead approval)

Mirrored from the companion §10 so the decision list is reviewable in one place.
No implementation may pick any of these unilaterally.

| # | Decision | Lean | Cost of the lean |
|---|---|---|---|
| **S0** | Whether a separate lane exists at all, versus `passed`+zero-count assertions in the existing lane | **SETTLED (2026-11-04): separate lane** — see D0 | Recorded cost: the existing lane could already carry the same evidence; the lane buys naming and a readable status, not representability |
| **S1** | Exact required assertion set + ids | Derive per rule R1–R10; keep the 57 as precedent | The lane becomes usable by a second composition; costs a derivation review now |
| **S2** | `schemaVersion` literal | **SETTLED (2026-11-04): `admission-evidence/0.1-draft.1`** — see D2 | One rename later if it is ever approved |
| **S3** | Whether a `runner`/tier field exists | None this revision | Consumers cannot distinguish runners structurally — honest, since neither can be trusted |
| **S4** | `coordination` at root only, or per case | Root only | Per-case copies would let one case describe a different table than its neighbour |
| **S5** | Remount, `R2`, `R7`, `R9` cases required or optional | Optional, `not-run` when unattempted | Coverage of the R2/R7/R9/remount rules depends on driver discipline, and an unattempted optional case shows up only in `coverage.unknown` |
| **S6** | `refused` requires zero-**effect** too | Yes, both (Lead-selected draft default) | A driver must instrument its own effect separately from callback entry; no host registry is needed |
| **S7** | Whether a summary type/module is ever built | **Lead-selected: build the validator next** — synchronous `{ valid, issues, summary iff valid }`, `issues` of `{ code, path }` | The first implementation fixes the shape in code while the prose is still draft, so any later change is paid twice |

## 7. Non-goals

- No schema file, generated mirror, conformance vector, validator, test or export.
- No change to `declaration-protocol.md`, `declaration.schema.json`,
  `runtime-evidence.js`, `runtime-evidence.md` or any conformance vector.
- No host acceptance, installation, execution or boot evidence.
- **No platform wrapper.** The lane fixes the validator's return contract only; a
  diagnostic wrapper, its error handling and its own codes belong to the platform
  that has one, and are not specified here (§4.4, companion §6.7).
- No cross-process, cross-version or cross-repository comparison.
- No relationship between an admission record and any plugin declaration.
- No advancement of, or dependency on, the pending template host acceptance.

## Appendix A. File:line quick reference

| Subject | Location |
|---|---|
| Reservation precedes callback | `projects/dsh-plugin-kit/src/admission.js:133-135`, `:667`, `:682` |
| Tuple = three own string keys; untrimmed refused, no normalisation | `projects/dsh-plugin-kit/src/admission.js:61-86`, `:366`, `:375-382`, `:428-501` |
| Injective canonical key | `projects/dsh-plugin-kit/src/admission.js:242-244` |
| Conflict code + `.conflicts` | `projects/dsh-plugin-kit/src/admission.js:278-289`, `:559-565` |
| Lease states, identity-bound release, refusals | `projects/dsh-plugin-kit/src/admission.js:94-127`, `:608-615`, `:630-634`, `:296-314` |
| Throw ⇒ always quarantine; identity rethrow; rollback aggregate | `projects/dsh-plugin-kit/src/admission.js:155-171`, `:683-700`, `:323-345` |
| Close releases only on full success | `projects/dsh-plugin-kit/src/admission.js:731-743` |
| One shared promise, created before the scope starts | `projects/dsh-plugin-kit/src/admission.js:717`, `:726-729`, `:194-199` |
| Cleanup aggregate + drain | `projects/dsh-plugin-kit/src/cleanup.js:154-162`, `:217-233` |
| No deadline; never-settling limitation | `projects/dsh-plugin-kit/src/cleanup.js:91-104`; `projects/dsh-plugin-kit/src/admission.js:38-43` |
| Provider identity publish; no reset; remount | `projects/dsh-plugin-kit/src/admission-provider.js:17-43`, `:103`, `:175-197` |
| Process / visibility limits | `projects/dsh-plugin-kit/src/admission-provider.js:45-55` |
| Existing lane: 3 statuses, closed fields, single tier | `projects/dsh-compat-platform/packages/analyzer/src/runtime-evidence.js:72`, `:78`, `:102-105` |
| Existing lane: status/assertion consistency | `projects/dsh-compat-platform/packages/analyzer/src/runtime-evidence.js:604-655` |
| Existing lane: always-unauthenticated certification | `projects/dsh-compat-platform/packages/analyzer/src/runtime-evidence.js:715-720` |
| The one real admission run | `projects/dsh-plugin-kit/docs/testing/runs/20261102T150305Z-admission-loader/{41-arm,42-run,43-prepare}.json` |
| Its narrative record, non-claims, deviations | `projects/dsh-plugin-kit/docs/testing/2026-11-02-admission-loader.md` §9, §9.9 |
| Declaration protocol — **no edit intended; not hash-verified** | `projects/dsh-compat-spec/spec/declaration-protocol.md` |

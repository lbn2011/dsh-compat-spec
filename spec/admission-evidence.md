# Admission evidence — draft interface for `admission-evidence/0.1-draft.1`

Status: **draft. Lane and version adopted, interface still draft; a standalone
reference validator now exists and its first batch run is recorded, but nothing here
is ratified, published or accepted.**

Two things are **decided** (user selection, 2026-11-04) and are no longer open:

- **The lane exists independently.** Admission evidence is its own lane, not a
  widening of `coexistence-evidence/0.1`; a first-class `refused` status is part of
  it (§5).
- **The version literal is `admission-evidence/0.1-draft.1`.** The literal is fixed
  and may be validated against exactly; it stays a *draft* literal, so a document
  carrying it is never a released contract.

Beyond those two, the case catalog, the assertion sets (§6), the four status words
(§5), the document shape (§4) and the validator return contract (§6.6) are a
**Lead-frozen draft implementation contract** (2026-11-04): frozen so that
implementation can start, changeable only as a recorded contract change with its cost
(§10), and still **not** human ratification and **not** a published standard. The
one genuinely open question left is whether a `runner`/tier field ever exists (§10,
D3).

No schema file, conformance vector, package export, `bin` entry or CLI flag is added
by this document, and no root export of the package changes. The shape, the case
catalog and the validator's output are specified in prose so that an implementation
can follow them; an implementation of §6.6 now exists as an independent module
(`projects/dsh-compat-spec/src/admission-evidence.js`, with
`admission-evidence.d.ts` and `src/test/admission-evidence.test.js`), reachable only
by direct path import. Its existence does not make this draft normative: the module
is evidence about the contract, not a ratification of it.

Run status is recorded in
[`../docs/testing/2026-11-04-admission-evidence-batch.md`](../docs/testing/2026-11-04-admission-evidence-batch.md)
and, for the corrected re-run, in
[`../docs/testing/2026-11-04-admission-evidence-recheck.md`](../docs/testing/2026-11-04-admission-evidence-recheck.md):
the first batch ran four test files with **101 tests, 95 passed and 6 failed**, one
of the failures being a missing import in this lane's own test file. That import was
corrected, and the re-run reports **101 tests, 101 passed, 0 failed, 0 skipped** with
the test process exiting 0 — this batch's module tests pass. The earlier "nothing
implemented, code and tests not run" statements in this document describe the
documentation stage only. Passing module tests are not ratification: the lane stays
a draft, and nothing here is a host acceptance.

Disclosure, because the opposite would be a false claim: producing this material
used file reads and searches, and one syntax-only `node --check` was run on the new
module. That check does not execute the module; no test, build, install or host run
was performed from the documentation stage.

This document does **not** change, extend or reinterpret:

- the declaration protocol `0.1.0-draft.1` in
  [declaration-protocol.md](declaration-protocol.md) and
  [declaration.schema.json](declaration.schema.json);
- the existence-agnostic evidence lane `coexistence-evidence/0.1` described in
  `projects/dsh-compat-platform/packages/analyzer/runtime-evidence.md`.

No edit to either is intended by this change, and none was made in the course of
writing it; no before/after hash or byte comparison was produced, so that is a
statement of intent and not a verified fact (§12). This draft is a **third,
separate** lane, and it does not present itself as the only way to record a
refusal — §3 names the encoding that already works today.

The requirements-and-design reasoning behind it — the gap analysis, the coverage
of the one real record, and the open decisions this draft inherits — is in
[2026-11-03-admission-evidence-design.md](../docs/requirements-and-design/2026-11-03-admission-evidence-design.md).
That document is itself a proposal and carries no additional authority.

## 0. What this document is, and is not

An **admission evidence document** is a JSON record in which a runner states what
it observed when a *caller-owned admission coordinator* was driven by cooperating
participants — whether a claim was taken, whether a refused contender ran any of
its own code, whether a clean close actually released the claims.

It is a **record of a run**, not a capability of a plugin, not a property of a
declaration, and not a certificate. Reading a valid admission evidence document
proves only that the document is internally consistent with the grammar in §4–§8.
It does not prove the run happened, that the coordinator used was the one named,
or that any host behaved as reported.

Three boundaries are load-bearing and are repeated wherever they could be
mistaken:

| Not claimed | Why, in one line |
|---|---|
| Authentication of the producer | Every field is a self-report; there is no signature, no key, no issuer and no trust anchor here (§9). |
| Host acceptance, installation or execution | Satisfying the schema and consistency rules establishes internal consistency only — it does not establish that a host accepted or loaded a plugin. A runner's own observations may legitimately include host-level facts; those remain that runner's self-report, and the grammar neither adjudicates nor authenticates them (§11). |
| Compatibility, atomicity or safety | A green record is a fixture result about one coordinator instance in one process (§12). |

### 0.1 Relationship to the other two lanes

| Lane | Subject | Status | Changed by this draft |
|---|---|---|---|
| `declaration-protocol.md` (`0.1.0-draft.1`) | What an author's declaration may *say* | Draft, in-tree | **No edit intended.** Not extended, not superseded. |
| `coexistence-evidence/0.1` | What a reporter says happened when two plugins coexisted in real hosts | Existing intake validator with its **own** evidence CLI (`node src/evidence-cli.js <receipt.json>`), separate from the declaration analyzer CLI (`bin: dsh-compat-analyze` → `src/cli.js`) | **No edit intended.** §3 states what that lane can already express about a refusal, and what it cannot. |
| **admission evidence (this draft)** | What a runner observed while one caller-owned coordinator was driven | **Proposed, §10 open** | — |

An admission evidence document is **not** an input to
`validateDeclaration()`, and a declaration is not an input here. Neither lane
imports the other.

## 1. Vocabulary fixed by this draft

These words are used with exactly one meaning each. Where an existing module uses
a different word for the same idea, the module's word is quoted so the mapping is
explicit rather than inferred.

| Term | Meaning here | Grounded in |
|---|---|---|
| **claim** | Exactly `{ kind, name, scope }`, three own string keys, nothing else. `kind` is exactly `'tool'` or `'service'`. `name` and `scope` are non-empty and **already trimmed**. | `projects/dsh-plugin-kit/src/admission.js:61-86`, `:411-521`; `CLAIM_KINDS` at `:230`; `CLAIM_FIELDS` at `:366` |
| **coordinator** | One caller-created in-memory claim table. Not per plugin; sharing it is a caller obligation. | `admission.js:24-37`, `createAdmissionCoordinator` at `:537` |
| **lease** | The frozen record `reserve()` returns: `state`, `claims`, `release()`, `quarantine()`. | `admission.js:94-127`, `leaseView` at `:582` |
| **handle** | The frozen `{ value, close() }` a successful `admit()` resolves to. | `admission.js:173-187`, `:705-756` |
| **contender** | One participant that asks for a batch of claims — one activation, one load row, one test path. | `admission.js:6-11` |
| **activation** | The caller-supplied callback `admit(claims, activate)` invokes after reserving. | `admission.js:137-171`, `:656-700` |
| **refusal** | A contender's batch was rejected *before* any of its activation callback ran. | `AdmissionConflictError` / `AdmissionClaimsError`, `admission.js:262-289`, `:565`, `:667` |
| **clean close** | `close()` resolved: every deferred disposer settled successfully, and only then were the claims released. | `admission.js:731-743` |
| **quarantine** | The claims stay mapped for the life of the coordinator; no public API clears them. | `admission.js:123-126`, `quarantineRecord` at `:630-634` |

## 2. Proposed normative semantics (the subject of the evidence)

This section states, as **proposed** normative semantics, the observable
behaviour an admission evidence document reports on. Each rule carries the source
location it is drawn from and is stated as *what a runner must be able to
observe*, not as a new requirement on any implementation.

These rules describe **one existing author-side module**
(`dsh-plugin-kit/admission`) as it stands. They are **not** a general protocol for
all DSH plugin capabilities, and this draft does **not** claim that every
capability the older protocol documents is novel. In particular, a
`(kind, name, scope)` claim triple, a `scope` label and a `name` identifier all
reuse the vocabulary and the string rules already fixed by
`declaration-protocol.md` §4–§5; only the *coordination* semantics below are new
subject matter, and even those are one module's behaviour, not a discovery.

### 2.1 R1 — Reservation precedes the activation callback

Reservation of the whole batch happens **before** the caller's activation callback
is invoked. A contender that loses therefore never executes any part of its
activation, including any registration side effect it would have performed.

- Source: `admission.js:133-135` ("the reservation happens **before** the
  activation callback is invoked"), implemented at `:667` (`reserveInternal(claims)`)
  which runs before `activate(context)` at `:682`.
- Observable form: with contender B's batch overlapping a held claim, B's
  activation-entered counter stays `0` and B's registration count stays `0`.
  The Loader record shows exactly this: `observed.applies` entry
  `{ role: "beta", generation: 2, admitted: "refused", code: "ERR_ADMISSION_CONFLICT" }`
  with `b-activation-callback-zero` and `b-native-register-zero` both true.
- Not claimed: that the *host* would have refused the registration. Only that
  this module refused the claims and never called the callback.

### 2.2 R2 — A claim is exactly three own string keys, used verbatim

The tuple must carry exactly `kind`, `name` and `scope` as **own data**
properties; an extra own key (symbol keys included) is rejected, an inherited-only
field is rejected, and an accessor is rejected rather than invoked. `name` and
`scope` must already be trimmed: outer whitespace is **refused, never stripped**.

- Source: `admission.js:61-81`, `readOwnField` at `:375-382`, `auditClaims` at
  `:428-501` (extra-key check `:437-444`, accessor check `:450-452`/`:467-471`,
  untrimmed-value refusal `:482-490`).
- **The audit performs no trimming and no normalisation of any kind.** It compares
  the caller's string against `value.trim()` and refuses the claim when the two
  differ, so a padded name is rejected as malformed rather than repaired into the
  tuple the caller probably meant. The requirement is therefore that the string
  arrive already trimmed; the module never produces a trimmed variant, and no
  runner may report that one was produced.
- Consequence that must be reported, not smoothed: `'demo'` and `'demo '` are two
  different strings, and the padded one is refused rather than folded onto the
  other. A runner must not report a trimmed tuple as "accepted with
  normalisation"; no normalisation exists.
- The key is `JSON.stringify([kind, name, scope])` (`canonicalKey` at `:242-244`),
  which is injective over three strings, so no separator can be smuggled through
  one member to collide with another tuple.

### 2.3 R3 — A clean close releases the claims

`close()` runs every deferred disposer; **only when all of them settled
successfully** does it release the claims. A resolved `close()` is the caller's
only evidence that nothing this module was told about is still live.

- Source: `admission.js:173-187`, `:731-743` (release inside the resolve branch
  of `scope.close().then(...)`, after success).
- Observable form: the case is `passed` only if the close promise **fulfilled**
  *and* the claim is observably free afterwards (a subsequent reservation of the
  same tuple succeeds).

### 2.4 R4 — A throwing activation quarantines, even when the rollback was clean

If the activation callback throws, the claims are quarantined **unconditionally** —
including when the deferred rollback was perfectly clean — because this module
cannot distinguish "no effects acquired" from "effects it was never told about".

- Source: `admission.js:155-168`, `:683-700` (`quarantineRecord(record)` at `:688`
  precedes the rollback attempt at `:693`).
- Error identity: with a clean rollback the **same** thrown value is rethrown
  (same identity, not a copy, not a wrapper); with a failed rollback,
  `AdmissionActivationRollbackError` (an `AggregateError`) carries
  `[activationError, ...cleanupErrors]`, with `.primary` the original value and
  `.cleanupErrors` the cleanup failures alone (`:323-345`, `:699`).
- What the caller may do instead: `reserve()` + its own activation +
  `lease.release()` on failure is an **explicit caller attestation**. `admit()`
  never makes that attestation on the caller's behalf (`:166-168`).

### 2.5 R5 — A failing cleanup quarantines and rejects with the scope's own aggregate

If any deferred cleanup fails during `close()`, the claims are **quarantined** and
`close()` rejects with the cleanup scope's own `AggregateError`
(`ERR_CLEANUP_SCOPE_FAILED`), unwrapped — not re-wrapped in an admission error.

- Source: `admission.js:182-187`, `:744-752`; the aggregate is built in
  `projects/dsh-plugin-kit/src/cleanup.js:154-162`.
- Two facts must stay distinct in a record, because they are different
  observations about different owners:
  1. the **host's** unload settled (the Loader resolved), and
  2. the **close promise** rejected. The Loader record documents exactly this
     pairing (`c-loader-unload-resolved-anyway` **and**
     `c-close-rejected-independently` with `c-close-rejection-code`), and it is
     the reason a bare "unload succeeded" is not evidence of a clean teardown.
- After such a failure, a retry through the same coordinator **conflicts** — that
  is the accurate outcome, and a record must not present it as a defect.

### 2.6 R6 — Every `close()` returns the same promise object

The first call creates one settlement promise; every later call returns that
**same object**, including after it settled and including its rejection. Two
callers therefore cannot observe two different settlements, and a stale `close()`
cannot touch a newer generation's claims.

- Source: `admission.js:177-181`, `:716-754` (`if (settlement !== undefined) return settlement;`
  at `:717`, promise constructed at `:726-729` *before* `scope.close()` at `:731`).
- Why before, not after: the cleanup scope invokes its first disposer
  synchronously, so a disposer that calls `close()` reentrantly must receive that
  same object rather than a second chain over the same teardown (`admission.js:194-199`).
- Observable form: `samePromise` identity comparison between the original call's
  result and a later call's result — the Loader record's `a-stale-close-same-promise`
  — plus the requirement that the **newer** owner's claims and registration
  identity are unchanged (`a-stale-close-no-effect-on-b-claims`,
  `a-stale-close-no-effect-on-b-registration`).
- A record must distinguish *returning the same promise* from *the same promise
  having the same state*: the Loader record reports both (`samePromise: true`,
  already `fulfilled`).

### 2.7 R7 — Release is identity-bound; a stale lease cannot free a newer owner

`release()` deletes a mapping only when that mapping's value is the same record
(`held.get(key) === record`), never "delete the key". A released lease cannot be
converted to quarantined, and `release()` on a quarantined lease is refused.

- Source: `admission.js:103-127`, `releaseRecord` at `:608-615`,
  `quarantineRecord` at `:630-634`, `AdmissionLeaseStateError` at `:296-314`.
- Refusals carry `code: 'ERR_ADMISSION_LEASE_STATE'` with `attempted` and `state`,
  and change nothing.

### 2.8 R8 — Caller-held coordinator, published by identity, survives a remount only as long as the caller keeps it

The coordinator is created by the caller, retained by the caller, and handed to
every cooperating participant. The optional provider publishes **that exact
object** under the service name `pluginAdmission`
(`projects/dsh-plugin-kit/src/admission-provider.js:103`, `:175-197`), so
`ctx.pluginAdmission === coordinator` holds by identity; it never creates,
copies, wraps, proxies, resets, releases or quarantines anything (`:17-43`).

Two consequences a record must state rather than imply:

- **A remount re-enters the same table.** Reloading the providing plugin can
  cause dependents to unload and cleanly release their claims; a re-mount then
  reserves against the *same* coordinator, so a claim that was never released is
  still held after the remount (`admission-provider.js:41-43`).
- **The provider's own unload is not a claim release.** Unregistering the service
  is the host's effect; the claims are released only by the `close()`/`release()`
  calls a lease holder already makes (`:37-43`).

### 2.9 R9 — Process and visibility limits

- **One process.** The service is a reference inside one running process. Nothing
  survives a restart, and two processes never see each other's table
  (`admission-provider.js:45-55`).
- **One visibility scope.** In Cordis terms a dependent resolves the coordinator
  only when the providing fiber provides it inside the dependent's own isolation
  scope, so "shared" is a load-order property, not a global fact (`:49-53`).
- **One coordinator, by cooperation.** There is no module-level table and no
  ambient default; two coordinators in one process are two disjoint truth tables,
  a bug the module cannot detect (`admission.js:32-37`).
- Observability of sharing is therefore a **provisioning check**, and the only
  honest evidence is the pair: the resolved module URL is provisioned **and** the
  observed object is identical — plus, as the Loader record itself notes, a
  diagnostic token that is **a label, not identity or authenticity proof**.

### 2.10 R10 — No timeouts, no deadlines, and not a security boundary

- There is no timeout, no lease expiry, no heartbeat and no `Promise.race`
  anywhere (`admission.js:38-43`); the cleanup scope is the same by design
  (`cleanup.js:91-104`). A disposer whose promise never settles makes `close()`
  never settle, and the scope cannot recover.
- A caller that needs a deadline must race its own timer and treat the claims as
  unrecoverable when it fires. A record must not present a launcher-level timeout
  as a coordinator behaviour, and a timeout kill is **not** a pass.
- Claim *strings* are author-chosen labels: the module does not authenticate who
  wrote a claim, does not stop a caller from using a name it does not own, and
  does not survive a caller that ignores its lease (`admission.js:44-47`).
- There is no force-clear: no public API drops held claims, empties the table,
  resets a quarantined lease or "releases everything" (`:48-57`). A fresh
  coordinator, a reload or a process restart is **not** recovery, and a record
  must not treat it as one.
- Reentrancy is documented, not prevented: awaiting `close()` from inside its own
  cleanup deadlocks (calling it is safe as long as the result is not awaited);
  `defer()` after close started is refused with `CleanupScopeClosedError` and
  therefore becomes a cleanup failure, which quarantines (`admission.js:189-219`,
  `cleanup.js:120-133`, `:243`).

## 3. What `coexistence-evidence/0.1` can and cannot express about a refusal

This section is deliberately **not** an argument from impossibility. The existing
lane can record an expected refusal today, and a draft that claimed otherwise would
be wrong about a lane that is already in the tree.

### 3.1 The encoding that already works

`CASE_STATUSES = ['passed', 'failed', 'not-run']` at
`projects/dsh-compat-platform/packages/analyzer/src/runtime-evidence.js:72`, and
`checkStatusConsistency` (`:604-655`) requires only that a `passed` case carry at
least one assertion, none of which is `false` (`:608-624`). Nothing in that rule
resists a counter. A record such as

```jsonc
{ "id": "same-name-conflict", "status": "passed",
  "assertions": [
    { "id": "contender-activation-callbacks",  "passed": true },
    { "id": "contender-native-registrations",  "passed": true } ] }
```

is a valid and honest record of "the contender was refused and ran nothing",
provided the runner states in its own summary that `true` means the observed count
was `0`. Zero-valued counters, refusal codes and "the callback never ran" are all
representable in that lane, and this draft nowhere claims otherwise.

That example is legitimate only because the scenario genuinely *is* a same-name
conflict — two contenders contending for one claim tuple. Its case id matches its
subject, participants and expected outcome. The id is not an interchangeable label:
an admission scenario with a different subject or a different expected outcome
cannot reuse it, and reusing it anyway would misreport what was observed (§3.2).

### 3.2 What the lane genuinely lacks

Two limitations, neither of which is a lack of representability:

| Limitation | Consequence | Source |
|---|---|---|
| **Closed case ids.** `CASE_IDS` is a fixed list of three scenarios, enforced by the `MISSING_CASE_ID` / `UNKNOWN_CASE_ID` checks | Only a scenario that genuinely matches one of those three **case semantics** can be encoded there at all; an admission scenario whose subject, participants or expected outcome differs is a *different* case and cannot be expressed by relabelling. It needs a separate or extended contract. | `runtime-evidence.js` `CASE_IDS`; `:402-410` |
| **No first-class refusal semantics.** "Refused" is a convention carried by assertion ids, not by the status | A reader cannot tell from the status alone whether a `passed` case means "the thing worked" or "the thing was correctly refused". Both are `passed`. | `runtime-evidence.js:604-655`; §5 below |

That is the whole gap: **legibility and naming**, not representability. The
four-status vocabulary in §5 is a **proposed design choice** for a separate lane,
justified by that legibility cost and by the wish not to widen a closed,
already-written lane's field set, status list and case list
(`:102-105`, `:78`, `:316`). It is explicitly **not** an established necessity: a
Lead who preferred to keep one lane and encode refusals as `passed` with
zero-count assertions would not be contradicting anything in this draft.

### 3.3 Three events that must never be confused

The word "refused" covers three unrelated events, and the status in §5 names only
the first:

1. **The coordinator refused a contender** — the reservation was rejected before
   any of that contender's code ran. This is the only event that may be recorded as
   `refused`, and it is a *success* of the coordinator.
2. **The runner declined to attempt the case** — a prerequisite was missing, a
   fixture declined to start, an operator aborted. Nothing about admission was
   observed. This is `not-run`, with a `limitations` entry naming the cause; it is
   never `refused` and never `passed`.
3. **The harness or launcher killed the attempt** — a timeout, a crash, a
   supervisor signal. This is **not** `not-run`, because an attempt did happen. If
   every id of the case was evaluated before the kill, the case is `failed` with the
   assertions that came out false; if the kill left the observations incomplete, the
   driver **refuses the conversion** and emits no receipt for that case, keeping the
   raw harness failure outside this lane (§6.4). A kill is never a pass, and "we
   were interrupted" is never rewritten as "nobody tried" (§2.10).

Filing (2) or (3) under `refused` would report a run that never happened as a
correct refusal, which is the most damaging misreading this vocabulary could
enable.

Adding a fourth status to `coexistence-evidence/0.1` itself is not proposed here:
that lane stays as it is, and the vocabulary below is offered for a new lane only
(§4).

## 4. Proposed document shape

The `schemaVersion` literal is **decided**; the field set below is **proposed** and
is closed in the sense that an implementation must refuse any key not listed. No
schema file ships with this revision, and no validator implements it yet.

```jsonc
{
  "schemaVersion": "admission-evidence/0.1-draft.1",
  "baseline": { "commit": "<40 lowercase hex>", "node": "<non-empty string>" },
  "coordination": {
    "coordinatorIdentity": "observed-identical" | "different" | "not-compared",
    "provisioning": "caller-supplied" | "not-determined",
    "scopeVisibility": "same-visibility-scope" | "different-scope" | "not-determined"
  },
  "labels": { "coordinator": "<opaque label>" },   // optional; see below
  "cases": [
    {
      "id": "<one of the closed case ids — §6.1>",
      "status": "passed" | "refused" | "failed" | "not-run",
      "assertions": [{ "id": "<assertion id from that case's set — §6.2>", "passed": true }],
      "limitations": ["<non-empty string>"]
    }
  ],
  "limitations": ["<non-empty string>"]
}
```

Every object is closed: `baseline` has exactly `commit` and `node`;
`coordination` exactly those three members; `labels` at most `coordinator`; each
case exactly `id`, `status`, `assertions`, `limitations`; each assertion exactly
`id` and `passed`.

**No observed value is carried, only verdicts.** There is no `count`, no `message`,
no `error`, no `url`, no `path`, no `target`, no `entry` and no `pluginId` anywhere
in the document. An assertion is a boolean whose *meaning* is fixed by its id
(§6.2), so a runner that observed "0 callbacks" reports `true` for
`contender-activation-ran-zero` and nothing else. Two reasons, both load-bearing:
a free-text field is where a runner accidentally publishes a filesystem path or a
module specifier, and a numeric field invites a reader to re-derive a threshold the
lane does not define.

The optional `labels.coordinator` is an **alias, never an identity**: an opaque
string a runner may add so two documents from one pipeline can be grouped. Its only
rule is the grammar `[A-Za-z0-9._-]{1,64}` — nothing else is checked, and no
heuristic is applied beyond it (`INVALID_LABEL`, §6.7). That grammar alone already
excludes `/`, `\`, `:`, URL schemes and whitespace, so a filesystem path or a URL
cannot be written there; but `.` is legal, so the lane does not and cannot forbid
"a file extension", and an implementation must not invent such a ban.

The grammar is also **not an anonymity guarantee**: `hooks.run.js` and
`svc-abc123` both satisfy it, and a label can still be linkable or identifying in a
way no validator detects. Choosing a safe alias is the caller's responsibility; the
recommended default for a reusable adapter is to omit `labels` entirely.

Design notes on the shape, all of them deliberate:

- **`coordination` is an object of three states, not a boolean.** "The coordinator
  was shared" is a compound claim: a resolved URL is a provisioning fact, object
  identity is an observation, and visibility scope is a third thing the runner
  usually cannot determine at all. Collapsing them into one `shared: true` would
  make an unobserved scope look observed.
- **No `evidenceTier` field.** The existing lane's single accepted tier is the
  literal `'real-host'`. Admission *can* be exercised inside a real host, so such a
  field would not be false in principle; but a tier is a self-declared label in a
  lane with no trust anchor (§7), so it would authenticate nothing. The record at
  hand also happens to be in-process — plugins behind real rows in one built
  checkout — which is a fact about *that record*, not about which subjects this
  lane may describe. Omitting the field is therefore a **design choice about
  unverifiable labelling**, not an assertion that admission evidence is never
  host-produced. Whether an equivalent tier/`runner` field is wanted is an open
  decision (§10, D3).
- **No `pluginId`, no declaration reference.** A record names no plugin identity,
  because the coordinator is not per plugin and a claim is not attributable to one.
- **Closed objects.** Every object's field set is exactly as listed; unknown keys
  are refused. A field a validator does not understand is a claim that would
  otherwise travel unread.

## 5. Status vocabulary — and what each one obliges

> **These four status words are a Lead-frozen draft implementation choice, not
> human ratification and not a published standard.** The user selected the lane and
> its version literal (2026-11-04); the status vocabulary and the case catalog that
> gives it meaning (§6.1) were frozen by the Lead so that implementation could
> begin. A deviation is a recorded contract change with its cost (§10), and the
> `…-draft.1` literal stays draft until a separate acceptance act. Nothing here
> should be read as settled merely because §10 marks D0 and D2 as decided.

What each status is *allowed to be attached to* is fixed by the case catalog
(§6.1), so the status word alone is never ambiguous — and a status is **checked**
against the case, never chosen freely (§6.3).

| Status | Required assertions | Meaning it carries | Where it may appear |
|---|---|---|---|
| `passed` | ≥ 1, **all** `true` | The expected outcome for that case was observed, and the assertions name it. | only cases whose expected outcome is a normal completion (`admission-admitted`, `admission-activation-throw`, `admission-cleanup-failure`, and the optional ones) |
| `refused` | ≥ 1, **all** `true` | The contender's batch was rejected **before any of its own code ran**, and the record asserts the refusal *and* both zero properties. A `refused` case is a **success** of the coordinator, not a failure of the run. | only `admission-refused-conflict` |
| `failed` | ≥ 1, at least one `false` | The expected outcome was **not** observed: a claim that should have been released was still held, a refusal admitted instead, a rethrow delivered a copy instead of the same value. | any case |
| `not-run` | exactly `0` | **Genuinely unattempted**: nobody tried, so no observation exists and a limitation says why. An attempt that lost its observations is a refused conversion, never this (§6.4). Never means "expected refusal", never describes a contender that *was* refused (§3.3). | any case |

Rules that follow from the table and must be enforced by any implementation:

1. `refused` and `failed` are **not** interchangeable, and a case may not carry an
   all-true assertion list with the status `failed` (`failed` without a `false`
   assertion is incoherent, matching `runtime-evidence.js:636-642`).
2. `not-run` carrying assertions is a contradiction (`:646-653`), and `not-run`
   requires at least one `limitation` naming why nothing was observed.
3. A `refused` case must assert the **zero-callback** property *and* the
   **zero-effect** property explicitly (D6 → §6.2), the latter on the driver's own
   counter rather than a host registry. A refusal record that only states the error
   code cannot distinguish "the callback never ran" from "the callback ran and threw
   the same code", which is exactly the distinction R1 exists to make.
4. A case asserting a quarantine must also assert that a later reservation of the
   same tuple **conflicts**; "still held" is the observable form of quarantine.
5. **A missing case is not a status.** An absent case is *absent coverage*: no
   status, no assertion. A missing **required** case is `MISSING_REQUIRED_CASE` and
   the document is invalid (§6.5); a missing **optional** case is named in
   `coverage.unknown` (§6.6), never dropped silently. Either way it is never
   rendered as `passed`, and never as `not-run` either — `not-run` means
   **genuinely unattempted**: nobody tried, so there is no observation and a
   limitation says why. An attempt whose observations were lost is **not**
   `not-run`; it is a refused conversion, and no receipt is produced (§6.4).
6. Status is checked against the case id's allowed set (§6.1). `refused` on a case
   whose expected outcome is a normal completion is refused as
   `STATUS_NOT_ALLOWED_FOR_CASE`, not quietly accepted as a synonym for `passed`.

## 6. Case catalog, assertion sets, and the validator contract

This section is a **Lead-frozen draft implementation contract** (2026-11-04): the
Lead selected the four required cases, the four optional cases, the exact assertion
catalog of §6.2, root-level `coordination`, no `runner`/tier field, zero-effect
alongside zero-callback, optional absence as `coverage.unknown`, and the synchronous
validator return of §6.6. An implementation is expected to follow it exactly, and
deviating from it is a contract change with the costs named in §10.

That is **not human ratification and not a published standard**: the version literal
stays `…-draft.1`, no schema file ships, and the vocabulary and catalog remain draft
until a separate acceptance act. "Frozen for implementation" means "stop re-deciding
it while code is written", not "approved".

### 6.1 The closed case catalog

Eight ids: four required, four optional. An id names a **scenario**, never a
fixture, a file, a Loader arm, a fiber or a row label.

| Case id | Expected outcome | Required | Rules |
|---|---|---|---|
| `admission-admitted` | normal completion | yes | R1, R3, R6 |
| `admission-refused-conflict` | **refusal** | yes | R1, R2 (identity of the holder) |
| `admission-activation-throw` | normal completion of a failure path | yes | R4 |
| `admission-cleanup-failure` | normal completion of a failure path | yes | R5, R7 |
| `admission-lease-state` | normal completion | no | R7 |
| `admission-tuple-shape` | normal completion | no | R2 |
| `admission-remount-same-coordinator` | normal completion | no | R8 |
| `admission-visibility` | normal completion | no | R8, R9 |

Three constraints on *every* case, which is what makes the catalog generic rather
than fixture-shaped:

- A case must be satisfiable by a **direct in-process driver** that holds the
  coordinator and the leases itself. No case may require a Loader API, a fiber
  introspection call, a browser, a GUI, a `.arm`/`.prepare` generated file, or a
  digest of any generated artifact. An in-process run that never materialises a
  fixture can satisfy all eight cases.
- **No case may require the host.** In particular no assertion may require a
  native registration (a host tool table, a plugin registry, a service registry)
  or a provisioned module URL. Where a host run would observe a registration, a
  generic driver observes a **caller-owned effect**: a counter or list the driver
  itself increments or appends inside the activation callback, and whose disposal
  the driver itself instruments. Those counters are the only evidence of "the
  callback took effect", and they are named as caller counters in §6.2 so that no
  reader mistakes them for host state.
- A case must be satisfiable without naming a plugin, a repository, a commit or a
  machine (§7). Only `baseline.commit` may be `"not-recorded"` (§4).

### 6.2 Assertion sets — closed, exact, and boolean-only

Each case has an **exact** assertion set: every listed id must be present, and no
other id may be. An assertion is a boolean the caller evaluated from its own
observation; the id carries the meaning, so no value, count or message travels with
it.

**`admission-admitted`** — `reservation-precedes-activation` (the claim was
observably held before the callback ran), `activation-ran-once`,
`caller-effect-observed-once` (the driver's own counter changed exactly once —
substitute for a native registration, §6.1), `close-fulfilled`,
`close-returns-same-promise` (R6, object identity),
`claim-released-after-close` (a later reservation of the same tuple succeeded),
`disposer-ran-exactly-once` (the driver's own instrumented disposer).
No id here observes a host registry. The two situations must not be conflated:

- **Not attempted** — the case was never run at all ⇒ `not-run`, zero assertions,
  ≥ 1 limitation naming why.
- **Attempted without the required instrumentation** — the activation did run, but
  the driver has no counter or disposer it owns, so `caller-effect-observed-once`
  and `disposer-ran-exactly-once` cannot be evaluated. That is **incomplete
  observation**, not an unattempted case: the driver refuses the conversion and
  emits no receipt for this case (§6.4, rule 5). It must not report `not-run`
  (nobody-tried would be false) and must not report `passed` on the strength of a
  callback merely returning.

**`admission-refused-conflict`** — `refusal-code-conflict` (the refused contender
received `ERR_ADMISSION_CONFLICT`), `refusal-before-any-callback`,
`contender-activation-ran-zero`, `contender-effect-ran-zero`,
`holder-claim-still-held`. The last two are separate on purpose: a callback can
return before it takes effect, so only the effect counter distinguishes "did
nothing" from "started and was cut off" (D6). `contender-effect-ran-zero` means the
*driver's own* counter stayed at zero — the generic form of a register verdict, and
the only form this lane may require (§6.1).

**`admission-activation-throw`** — `activation-entered-then-threw`,
`registered-rollback-callbacks-settled` (every disposer the failed activation had
registered through the scope ran to completion and none threw),
`rethrow-same-error-identity` (the value delivered to the caller is the *same*
value the callback threw — same reference, not a copy and not structural equality;
the coordinator's aggregate case does not satisfy it),
`rollback-disposer-ran-exactly-once` (the driver's own instrumented disposer),
`claim-quarantined-after-throw` (a later reservation of the same tuple conflicts).

Two limits on what this case may claim, both required reading for a driver:

- **The identity assertion is only meaningful on a clean rollback, and the other
  branch is `failed`, never `not-run`.** The set above describes the branch where
  every registered rollback callback settled. If one of them threw, the coordinator
  delivers its own `ERR_ADMISSION_ROLLBACK` aggregate instead, and the driver has a
  real observation to project: `registered-rollback-callbacks-settled` is `false`
  and `rethrow-same-error-identity` is `false`, which makes the case `failed` under
  §5. Reporting `not-run` there would say "nobody tried", which is false — the case
  *was* attempted and the cleanup did not hold it. `not-run` is reserved for a case
  that was genuinely never attempted (§5, §6.4).
- **Nothing is claimed about effects that were not deferred.** A callback can touch
  the world without registering a disposer, and no observation here can see that.
  The assertions above speak only about callbacks that went through the scope; a
  document must not generalise them into "nothing was left behind".

**`admission-cleanup-failure`** — `close-rejected`,
`close-rejection-code-cleanup-failed` (the rejection is the scope's own
`ERR_CLEANUP_SCOPE_FAILED`, unwrapped), `disposer-ran-exactly-once`,
`claim-not-released-after-failed-cleanup`, `later-reservation-conflicts`.

**`admission-lease-state`** (optional) — `release-idempotent`,
`stale-release-frees-nothing`, `release-quarantined-refused`,
`quarantine-released-refused`; both refusals carry
`ERR_ADMISSION_LEASE_STATE` and change nothing.

**`admission-tuple-shape`** (optional) — one verdict per rejection reason, never
collapsed into one boolean: `refuses-extra-own-key`,
`refuses-non-own-field`, `refuses-accessor-field`, `refuses-untrimmed-name`,
`refuses-untrimmed-scope`, `refuses-wrong-kind`, `refuses-empty-string`.

**`admission-remount-same-coordinator`** (optional) —
`same-coordinator-after-remount` (the object the remounted participant resolves is
`===` the provisioned one), `unreleased-claim-still-held`.

**`admission-visibility`** (optional) — `coordinator-object-identical` (the object
resolved after the boundary is `===` the caller-supplied one),
`scope-visibility-recorded` (true when `coordination.scopeVisibility` is stated
honestly, including `not-determined`). No provisioning assertion appears here:
how the object reached the second participant is a provenance fact the driver either
knows or does not, and a driver that cannot observe it states `not-determined`
rather than guessing.

### 6.3 Status is checked against the expectation, never inferred

The expected outcome is a property of the case id (§6.1), so `refused` is legal
only on `admission-refused-conflict`. A document reporting `refused` for
`admission-admitted` is refused as `STATUS_NOT_ALLOWED_FOR_CASE`. A refusal of *no
case at all* is not expressible: there is no free-form "refusal" status, and a
scenario that is not in the catalog is not describable in this lane.

### 6.4 Runner and driver obligations: project, never infer

The driver's job is to **project** verdicts its caller already evaluated, not to
manufacture them:

1. Every assertion value comes from an observation the driver made in that run.
2. `ok: true` from an existing driver or step is **not** evidence for `passed`, and
   must never be mapped onto a case status or an assertion. A step reporting success
   says a step returned; it does not say a claim was held, released or refused.
3. The 57 assertion ids of the 2026-11-02 record are **precedent, not a set**: a
   driver may not copy them, and may not add ids beyond §6.2. Most of them are
   fixture-specific (`a-row-resolves`, `prepare-schema-known`,
   `inputs-runtime-root`) and cannot be honestly asserted by a different
   composition.
4. The driver adds **no field**: no tier, no runner name or version, no timestamp,
   no plugin id, no declaration reference, no counts, no messages, no paths, no
   URLs, no error objects (§4).
5. **Attempted means evaluated.** A case may be reported with assertions only if the
   driver actually evaluated every id in that case's set. If a run was interrupted,
   or an observation is missing for any id, the driver must **not** manufacture a
   `false` and must **not** relabel the attempt as `not-run`: it refuses the
   conversion and produces no receipt for that case. `not-run` is a true statement
   that nobody tried; it is not a bucket for "we tried and lost the data".
6. Mapping, and nothing beyond it: attempted and observed, expectation met ⇒
   `passed` (or `refused` where the expectation is a refusal). Attempted, expectation
   not met ⇒ `failed`, with at least one `false` assertion naming what was not met.
   Not attempted ⇒ `not-run`, zero assertions, ≥ 1 limitation. There is no fourth
   mapping and no default.

### 6.5 The boundary: what validation decides, and what it cannot

Validation decides **internal consistency only**:

- closed field sets, exact types, dense arrays, non-empty strings, the exact
  `schemaVersion` literal, the `baseline.commit` domain, the three `coordination`
  domains, the `labels` pattern;
- case ids are known, unique, and the four required ones are present;
- assertion ids are exactly the set §6.2 gives for that case, unique, boolean;
- status is legal for that case, and consistent with the assertions
  (`passed`/`refused`: ≥ 1, all true; `failed`: ≥ 1 with at least one false;
  `not-run`: exactly 0 plus ≥ 1 limitation);
- no forbidden provenance key (signature, key, certificate, issuer, attestation,
  `verified-by`) and no unknown key anywhere.

Validation **cannot** decide, and therefore never reports: whether the run
happened, whether the callback truly never ran, whether a name was really free,
whether the same object was really compared, whether the named commit exists,
whether two documents describe the same run, or whether the producer is honest.
A validator that started answering those questions would be authenticating
(§7), and a green document would be read as a certificate.

**Validation is a grammar check, not a sanitiser.** `limitations[]` and
`baseline.node` are free-form strings: an operation name, an environment token or a
message fragment can end up inside one, and this lane deliberately does not scan
them, redact them or refuse them for content. A document can be `valid: true` while
holding sensitive text. Any consumer that renders or forwards these strings must
project a whitelist of safe fields and must never echo raw operation text into a
report; keeping secrets out of the record is the producer's job, and keeping them
out of the output is the downstream adapter's.

### 6.6 The exact validator contract

One synchronous, pure function. No I/O, no clock, no randomness, no mutation of
its input. It does not throw for any value that came out of `JSON.parse`: that is
the input class it is written for, and every failure it detects becomes an issue.

That is a promise about **parsed JSON values**, not a sandbox promise. An own
accessor, a proxy trap, or a getter that runs code can still throw from inside the
caller's own object before any validation logic sees a value, and neither this
function nor this lane defends against a hostile object graph. A caller that hands
over such an object observes whatever its own getter did — including a throw — and
that is not a validation verdict about the document.

```js
validateAdmissionEvidence(value) -> { valid: boolean, issues: Issue[], summary?: Summary }
```

- `Issue = { code, path }`. Both members are required, both are closed, and
  `Issue` has no third member. `code` is one of the closed codes in §6.7. `path` is
  a **location and nothing else** — `""` for the document root, `baseline.commit`,
  `coordination.provisioning`, `cases[2].status`, `cases[2].assertions[0].id`. A
  path never contains a value, a URL, a filesystem path or an error message.
- **What "own" and "plain" mean here.** Every object the validator walks must be a
  plain object: an object literal whose prototype is `Object.prototype` or `null`.
  A class instance is refused, because it supplies members from a prototype chain
  that a document is not allowed to rely on. Closedness is evaluated over **all**
  own keys, not only enumerable string keys: a symbol-keyed or non-enumerable own
  property is an unexpected field like any other, and it is reported at its parent
  location so the key's text never enters a path. Array items are read from own
  data descriptors; a hole is an absent own property (never an inherited index),
  and an array carrying an own key that is neither `length` nor an index in range
  is refused. One consequence is deliberate: a rejected value is never re-read to
  build output — a copy is taken only from the values the validator already
  accepted, so a document that is refused cannot have an accessor or a custom
  iterator triggered by the act of reporting it as invalid.
- **The summary rule.** `summary` is present **if and only if** `valid === true`,
  in which case `issues` is `[]`. When `valid === false`, `issues` is non-empty and
  the `summary` key is **absent** — not `null`, not `undefined`, not a partial
  summary. Half-understood evidence must not summarize into something that reads
  like full evidence.
- **Determinism.** The same input yields a deeply equal result. Issues are emitted
  in a fixed traversal order (root, `baseline`, `coordination`, `labels`, `cases`
  in array order, then `limitations`), and within one location the code order of
  §6.7. Two documents differing only in case order produce the same `summary`,
  because `summary.cases` is always in **catalog order** (§6.1), not document
  order.

`Summary` is minimal and stable for downstream rendering:

```js
{
  schemaVersion: "admission-evidence/0.1-draft.1",
  certification: false,              // literal; always false (§7)
  coverage: {
    required: ["admission-admitted", "admission-refused-conflict",
               "admission-activation-throw", "admission-cleanup-failure"],
    present:  ["<every id the document reports, catalog order>"],
    unknown:  ["<catalog id not reported, catalog order>"]
  },
  cases: [ { id, status, assertionCount, failedAssertions: ["<id>"],
             limitations: ["<string as written in the document>"] } ],
  limitations: ["<non-empty string>"]
}
```

`cases[i].failedAssertions` holds **unique** assertion ids in the **catalog order of
that case's assertion set** (§6.2), never document order — so two documents whose
assertion arrays are permuted produce identical summaries. It is `[]` for
`passed`/`refused`/`not-run` (a `not-run` case has no assertions to fail), and for
`failed` it names exactly the ids that came out false, in that fixed order.

Three rules on this shape, each of which fixes a way a summary could quietly
overstate its evidence:

- **Per-case limitations survive summarisation.** `cases[i].limitations` is copied
  from the document, unedited and in document order. A summary that dropped them
  would lose exactly the sentences that say what a case did *not* establish, and a
  consumer reading only the summary would never see them.
- **Absent optional coverage is named, not implied.** `coverage.unknown` lists every
  catalog id the document does not report, so an optional case that was never run
  appears as unknown coverage rather than vanishing. It is never rendered as a pass
  and never as `not-run` (§5, rule 5): the document said nothing about it.
- **There is no always-empty member.** `coverage.unknown` can only ever hold
  optional ids, because a missing **required** case is `valid: false` with
  `MISSING_REQUIRED_CASE` and therefore produces no summary at all. No `absent`
  member is emitted: a field that is empty in every valid document is a field a
  consumer will misread as "we checked and nothing was missing".

`cases` lists only the cases the document reports, in **catalog order** (§6.1), not
document order; two documents differing only in case order therefore summarise
identically.

### 6.7 The closed diagnostic codes

The lane fixes the **issues a validator returns**. It does not fix, and must not be
read as fixing, what a downstream platform does with them: a platform that wraps
this validator, catches a throw from a hostile input, maps these codes into its own
diagnostics, or refuses to propagate an exception is free to do so — that is a
platform contract, specified where the platform is specified, not here (§9). This
lane defines no wrapper signature and no wrapper-level code; if a consumer needs
one, it is a separate document's business.

Closed `code` list, in emission order within a location:

| Code | Raised when |
|---|---|
| `INVALID_INPUT` | root is not a plain object |
| `NOT_INSPECTABLE` | a member is an own accessor, or otherwise cannot be read without running code — reported when the validator notices, and not a guarantee to detect every hostile getter |
| `UNEXPECTED_FIELD` | a key outside the closed set of §4 |
| `MISSING_FIELD` | a required member is absent |
| `WRONG_TYPE` | wrong primitive type, or a non-boolean `passed` |
| `EMPTY_STRING` | a required non-empty string is `""` |
| `INVALID_STRING_FORMAT` | a required string must already be trimmed: it has leading or trailing whitespace (including a whitespace-only string of length ≥ 1). The validator refuses it and performs **no** trimming and no normalisation (§4) |
| `SPARSE_ARRAY` | a dense array has a hole |
| `INVALID_SCHEMA_VERSION` | not exactly `admission-evidence/0.1-draft.1` |
| `INVALID_COMMIT` | not 40 lowercase hex and not `"not-recorded"` |
| `INVALID_COORDINATION_VALUE` | a `coordination` member outside its enum: `coordinatorIdentity` ∉ {`observed-identical`, `different`, `not-compared`}, `provisioning` ∉ {`caller-supplied`, `not-determined`}, `scopeVisibility` ∉ {`same-visibility-scope`, `different-scope`, `not-determined`}. The path names the offending member (`coordination.provisioning`), never the value |
| `INVALID_LABEL` | `labels.coordinator` outside the grammar `[A-Za-z0-9._-]{1,64}` |
| `FORBIDDEN_FIELD` | signature / key / certificate / issuer / attestation / `verified-by` |
| `UNKNOWN_CASE_ID` | id not in §6.1 |
| `DUPLICATE_CASE_ID` | one id twice |
| `MISSING_REQUIRED_CASE` | one of the four required ids absent |
| `UNKNOWN_ASSERTION_ID` | id not in that case's set (§6.2) |
| `DUPLICATE_ASSERTION_ID` | one id twice within a case |
| `MISSING_ASSERTION` | a required id of that case's set absent |
| `INVALID_STATUS` | not one of the four words |
| `STATUS_NOT_ALLOWED_FOR_CASE` | e.g. `refused` on `admission-admitted` |
| `STATUS_ASSERTION_MISMATCH` | status contradicts the assertion list |
| `NOT_RUN_REQUIRES_LIMITATION` | `not-run` with no limitation |

### 6.8 What the generic catalog owes to the one real record

The 2026-11-02 record is the **precedent** for these obligations, not their
source of ids. Mapping, for a reviewer who wants to check that nothing was dropped:

| Generic case | Informs from | Dropped as fixture-specific |
|---|---|---|
| `admission-admitted` | `a-*` (gate, hold, admit, register, close, release) | `a-row-resolves`, `a-fiber-loading-while-paused`, `shared-coordinator-token-matches` |
| `admission-refused-conflict` | `b-*` | `b-fiber-failed`, `b-apply-entry-recorded` |
| `admission-activation-throw` | `d-*` | `d-fiber-failed` |
| `admission-cleanup-failure` | `c-*` | `c-row-resolves`, `c-loader-unload-resolved-anyway` as a *required* assertion (host-level, unobservable in-process; kept only as an optional `admission-visibility` concern) |
| — | `expected-assertions-all-present` | dropped: the exact assertion set in §6.2 replaces a self-referential sentinel |

## 7. Provenance claims are claims, never authentication

Every field in an admission evidence document is supplied by the process that
wrote it. Nothing in this lane can check any of it:

- `baseline.commit` is a **string a runner typed**, not a proof the code at that
  commit is what ran. There is no signature, no key, no issuer, no trust anchor and
  no transparency log in this lane.
- `coordination.coordinatorIdentity: "observed-identical"` means the runner
  compared two references and they were `===`. It does **not** mean the object is
  authentic, unmodified, or the class the module names.
- `coordination.provisioning: "caller-supplied"` says only that the coordinator
  object was **handed to the participants by the caller** rather than resolved
  through a host module loader. It is a provenance label about how the object
  arrived, not about module integrity, caching, or who authored the module — and it
  is emphatically not authentication: the lane has no way to check who supplied it.
  A runner that cannot say how the object arrived states `"not-determined"`; there
  is no third value and no URL is recorded or required.
- The Loader record makes the same reservation about its own shared-coordinator
  token: it is "a diagnostic label, not identity or authenticity proof", and
  module identity "rests on the observed object and resolved URL, not on
  authenticity proof".

Therefore any consumer summary of this lane must carry `certification: false`
unconditionally, for the same reason
`projects/dsh-compat-platform/packages/analyzer/src/runtime-evidence.js:715-720`
does: a pure reader cannot know that a string saying so came from where it claims.

A record **must not** contain, and a validator must refuse: any signature, key,
certificate, issuer, attestation or "verified-by" field. Adding one would make a
self-report look authenticated.

## 8. Assertion rules and strictness

Proposed, drawn from the existing lane's own rules where they already apply:

1. Assertion `id` is a non-empty string, unique **within its case**; two
   assertions with one id make a count ambiguous (`runtime-evidence.js:534-552`).
2. `passed` is a **boolean**, never coerced (`:553-561`).
3. Arrays are **dense**; a hole silently shrinks a count (`:662-685`).
4. Types are strict; `"true"` is not `true`, `1` is not a status.
5. Ordering of `cases` is not significant, and two documents differing only in
   case order must summarize identically (`:692-707`).
6. A document with any issue yields no summary at all — a summary of
   half-understood evidence reads exactly like a summary of full evidence
   (`:235-256`).
7. No assertion may be satisfied by the **absence** of an observation. In
   particular, "no conflict was seen" is not evidence that a claim was held. A
   coordinator whose table was never inspected has not been attempted at all: any
   case depending on it is `not-run` with a limitation saying the table was never
   inspected — and if the table *was* inspected but an id could not be evaluated, the
   driver refuses the conversion instead of reporting either a verdict or `not-run`
   (§6.4, rule 5).

## 9. What this draft deliberately does not define

- No JSON Schema file, no generated mirror, no conformance vectors and no package
  export. The interface is specified in prose (§4–§6) so that an implementation can
  follow it; **no implementation of it exists**, and none is added by this change.
- No wire format for delivering a record, no endpoint, no storage location, no
  CLI flag — and in particular no `bin` entry: this lane's validator is a library
  hook (§6.7), not a command. The existing `evidence-cli.js` belongs to
  `coexistence-evidence/0.1` and is not extended or reused here.
- No evidence **tier** (§4), no `runner` identity field, no timestamp field.
- No cross-process, cross-version or cross-repository comparison.
- No relationship to any plugin's `declaration` — an admission record is not
  attached to a declaration and does not upgrade one.

## 10. Decisions — two settled by the user, the rest Lead-selected draft defaults

`D0` and `D2` are **settled by user selection** (2026-11-04). `D1`, `D3`–`D6` and
`D8` are **Lead-selected draft implementation defaults** (2026-11-04): the Lead
accepted them so an implementation can be written, and they are recorded here with
their costs so the choice is visible. They are **not human ratification and not a
published standard** — the lane, the version literal and the vocabulary remain draft
until a separate acceptance act, and any of these defaults can still be changed with
its cost re-paid. `D7` has moved on: the validator is the next artefact to build.

| # | Decision | State | Recommendation / cost |
|---|---|---|---|
| **D0** | Whether a separate lane with a first-class `refused` status is adopted **at all**, versus recording expected refusals in `coexistence-evidence/0.1` as `passed` with zero-count assertions (§3.1) | **SETTLED by user — separate lane (a)** | Chosen for legibility: the refusal/success distinction is readable off the status, and a closed existing lane is not widened. Cost, stated for the record: `coexistence-evidence/0.1` could already carry the same evidence as `passed` plus zero-count assertions (§3.1), so this buys naming and structure, not representability. |
| **D1** | Exact generic case ids and their assertion sets | **Lead-selected draft default** — §6.1/§6.2 as written: four required cases, four optional | **Adopted as written**: every case is satisfiable by a direct in-process driver, no fixture-specific id, no host requirement, exact set per case. Rejected alternative: adopting the 2026-11-02 record's 57 ids verbatim, which no second composition could honestly assert (`a-row-resolves`, `prepare-schema-known`, `inputs-runtime-root`). Cost: a consumer that already reads those 57 ids must translate. |
| **D2** | `schemaVersion` literal | **SETTLED by user — `admission-evidence/0.1-draft.1`** | The literal may be validated against exactly. It stays a draft literal, so no document carrying it is a released contract; a later promotion to `admission-evidence/0.1` is a separate decision. |
| **D3** | Whether a tier/`runner` identity field is wanted at all | **Lead-selected draft default** — no field in §4 | **Adopted: none.** Admission can be exercised in a real host, so `real-host` would not be false in principle — but a self-declared tier or runner name authenticates nothing in a lane with no trust anchor (§7), while costing a field readers would over-trust. Cost: a consumer cannot tell two runners apart structurally — which is honest, since it cannot trust either. |
| **D4** | Whether `coordination` is required for every case or root-level only | **Lead-selected draft default** — root-level only in §4 | **Adopted: root-level.** Identity sharing is a property of the whole run, not of one case; a per-case copy invites one case asserting a different table than its neighbour. |
| **D5** | Whether the four optional cases become **required** | **Lead-selected draft default** — optional in §6.1, absence named in `coverage.unknown` | **Adopted: optional.** Making `admission-lease-state`, `admission-tuple-shape`, `admission-remount-same-coordinator` and `admission-visibility` required would declare the lane red until fixtures exist, while their absence stays visible as unknown coverage rather than passing by default. Cost: coverage depends on discipline — the exact assertion sets of §6.2 cover omission *within* a case, not omission *of* a case. |
| **D6** | Whether `refused` additionally requires the zero-**effect** assertion, not just zero-callback | **Lead-selected draft default** — yes, both in §6.2 | **Adopted: both.** A callback can return before it takes effect, so only the effect counter distinguishes "did nothing" from "started and was cut off", and it is the driver's own counter, so no host registry is needed. Cost: a driver must instrument its own effect separately from callback entry. |
| **D7** | Where the summary type lives, and whether this lane ever joins the platform CLI | **Lead-selected draft default — build the validator next** | **Adopted: implement `validateAdmissionEvidence` as the next artefact**, synchronous, returning `{ valid, issues, summary iff valid }` with `issues` of `{ code, path }` (§6.6). It is a library hook, so no `bin` entry and no CLI join. Cost: the first implementation fixes the shape in code while the prose is still draft — any later change must be re-paid in both. |
| **D8** | Whether a missing **optional** case should be an error rather than unknown coverage | **Lead-selected draft default** — named as unknown (`coverage.unknown`), never rendered as a pass | **Adopted: name-not-error.** An optional case is optional, and turning its absence into an issue would make every partial run invalid. Naming it in `coverage.unknown` keeps it visible while keeping the document valid; the cost is that a consumer must render `unknown` as "no observation", which is a rendering rule rather than a schema rule. |

## 11. What a green admission record would not establish

- No host acceptance, installation, execution or scheduling of any plugin *derived
  from the grammar itself*. Passing validation is internal consistency, not a host
  fact; a runner may record host-level observations it actually made, but those
  stand on that runner's report, and nothing here verifies or contradicts them.
- No authentication of the producer, the coordinator, the module or the commit.
- No cross-process arbitration: two coordinators in two processes have disjoint
  tables by design, and nothing here speaks to them.
- No atomic publish: a reservation binds only participants routed through the same
  coordinator (`admission.js:26-31`). A host's own registration call is not fenced.
- No security property: claim strings are labels, not capabilities
  (`admission.js:44-47`).
- No duration claim: no assertion may be satisfied by timing, and a timeout kill is
  non-pass (§2.10).
- No general compatibility claim about any DSH version, and no upgrade of the
  static declaration analysis.
- `tool`-kind claims only, in the one composition that was actually run; `service`
  takes the same code path and is **not** separately evidenced.

## 12. Limits of this document itself

This document was written by reading source, retained records and the two lanes it
describes. The stage that produced it ran no code, test, build, install, migration
or host run — and that remains true **of the writing stage**.

It is no longer the whole story about the lane, and this section does not claim
otherwise: an implementation of §6.6 now exists
(`src/admission-evidence.js`). Its first batch ran four test files with **101 tests,
95 passed and 6 failed**
([`../docs/testing/2026-11-04-admission-evidence-batch.md`](../docs/testing/2026-11-04-admission-evidence-batch.md));
one failure was a missing import in this lane's own test file, now corrected, and
the corrected re-run reports **101 tests, 101 passed, 0 failed, 0 skipped** with the
test process exiting 0
([`../docs/testing/2026-11-04-admission-evidence-recheck.md`](../docs/testing/2026-11-04-admission-evidence-recheck.md)).
Passing module tests are not ratification, publication or host acceptance.

Disclosed for completeness, because the opposite would be a false claim: producing
this document did use documentation-level file operations — reading files, searching
them with `grep`, and scripted in-place text replacement — plus read-only repository
status inspection, and **one syntax-only `node --check`** on the new module. That
check violates the no-commands brief of that stage and is recorded rather than
glossed; it does not execute the module.

No before/after hash, byte comparison or checksum of `declaration-protocol.md`,
`declaration.schema.json` or the `coexistence-evidence/0.1` validator was produced.
The statement that this change does not alter them is therefore a **statement of
intent about what was edited**, not a verified byte-identity claim.

No schema file, conformance vector, package export, `bin` entry or CLI flag
accompanies this document. A reference implementation exists, but its existence does
not make this draft normative or ratified: where a rule is stated as proposed or as
a frozen draft default, it is not a description of an accepted contract, and no
claim is made that any of the above is implemented correctly beyond the sources
cited.

## Appendix A. Source quick-reference

| What | Where |
|---|---|
| Reservation before the callback; no atomic publish | `projects/dsh-plugin-kit/src/admission.js:133-135`, `:155-171`, `:667`, `:682` |
| Claim tuple: three own string keys; untrimmed values refused, no normalisation | `projects/dsh-plugin-kit/src/admission.js:61-86`, `:366`, `:375-382`, `:428-501` |
| Canonical key is injective `JSON.stringify` | `projects/dsh-plugin-kit/src/admission.js:242-244` |
| Lease states and identity-bound release | `projects/dsh-plugin-kit/src/admission.js:94-127`, `:608-615`, `:630-634` |
| Conflicts throw `ERR_ADMISSION_CONFLICT`, batch order | `projects/dsh-plugin-kit/src/admission.js:278-289`, `:554-576` |
| Throw ⇒ always quarantine; error identity | `projects/dsh-plugin-kit/src/admission.js:683-700`, `:323-345` |
| Close releases only after all cleanups succeed | `projects/dsh-plugin-kit/src/admission.js:731-743` |
| Same promise, created before the scope starts | `projects/dsh-plugin-kit/src/admission.js:716-754` |
| Cleanup aggregate `ERR_CLEANUP_SCOPE_FAILED` | `projects/dsh-plugin-kit/src/cleanup.js:154-162`, `:217-233` |
| No timeout; never-settling limitation | `projects/dsh-plugin-kit/src/cleanup.js:91-104`; `projects/dsh-plugin-kit/src/admission.js:38-43` |
| Provider publishes by identity; no reset | `projects/dsh-plugin-kit/src/admission-provider.js:17-43`, `:175-197` |
| Service name `pluginAdmission` | `projects/dsh-plugin-kit/src/admission-provider.js:103` |
| Process / visibility-scope limits | `projects/dsh-plugin-kit/src/admission-provider.js:45-55` |
| Existing evidence lane: three statuses, closed schema | `projects/dsh-compat-platform/packages/analyzer/src/runtime-evidence.js:72`, `:78`, `:102-105` |
| Existing lane: status/assertion consistency | `projects/dsh-compat-platform/packages/analyzer/src/runtime-evidence.js:604-655` |
| Existing lane: `certification: false` always | `projects/dsh-compat-platform/packages/analyzer/src/runtime-evidence.js:692-720` |
| One real admission run: 57 assertions, 4 cases | `projects/dsh-plugin-kit/docs/testing/runs/20261102T150305Z-admission-loader/41-arm.json`, `42-run.json`, `43-prepare.json` |
| That run's own non-claims and token caveat | `projects/dsh-plugin-kit/docs/testing/2026-11-02-admission-loader.md` §9.9, §2 |
| Declaration protocol — **no edit intended by this draft; not hash-verified** | `projects/dsh-compat-spec/spec/declaration-protocol.md` |

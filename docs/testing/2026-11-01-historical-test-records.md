# Historical test records — dsh-compat-spec (backfilled)

Date of backfill: 2026-11-01 (Asia/Shanghai). Status: documentation only.

This file backfills the *first-slice* execution evidence that was produced while this
project was being accepted. It is a **record of the past**, not a current guarantee:
every row below describes a code snapshot that existed on 2026-10-31, and **no row was
re-run for this documentation backfill** — every count is transcribed from the retained
summary in §5, not reproduced. §7 appends the one later stage in which this package's
validator actually executed, and states exactly how far that does and does not reach.
Nothing here supersedes or amends any other report in this repository.

## 1. How to read this record

- Evidence tier for **rows 1–3**: **static/source/unit only**. The suite and the
  conformance CLI were executed on a developer machine against this package; no real DSH
  Loader, profile, host or browser was exercised *by those runs*, and no cross-version
  behaviour was exercised by any run. *(Corrected 2026-11-01: the original wording ended
  "…was exercised at any point", which claims more than the evidence supports.)* Later on
  2026-11-01 this package's `validateDeclaration` **did** execute inside a real-host
  bounded systemd unit — as a library call from another project's generator over a
  generated declaration, never mounted as a plugin in a Loader and never in a browser.
  See §7.
- Provenance: the runs were performed by the Lead as independent acceptance and are
  summarized in the parent workspace planning document
  [2026-10-31-first-slice-dev-plan.md](../../../../docs/requirements-and-design/2026-10-31-first-slice-dev-plan.md)
  §7. That file lives in the **parent research workspace, not in this repository**;
  it is an external reference, not a portable artifact of this package. The key facts
  are restated in full below so this record stands alone.
- The original run logs, TAP output and terminal transcripts were **not retained** in
  this repository. Only the summarized counts below survive.

## 2. Evidence ledger

| # | What ran | Result | Tests / vectors | Exit | Limits observed | Evidence tier |
|---|---|---|---|---|---|---|
| 1 | `node --test` (documented suite command) | PASS | 50 tests / 50 pass / 0 fail | not recorded | not recorded | unit |
| 2 | `node tools/schema-sync.mjs --check` | in sync | n/a (generated schema vs code) | not recorded | not recorded | static |
| 3 | `node tools/cli.mjs --conformance` | 40 of 44 vectors pass; 4 report `unimplemented` | 44 published vectors = 6 positive + 34 negative + 4 structural | not recorded | not recorded | static/vector |

Row 3 is the important one to read carefully: the conformance report is **40
implemented vectors passing and 4 structural vectors explicitly unimplemented**. It
must never be restated as "44 passing". The 4 structural vectors are
JSON-text-aware duplicate-key cases (`conformance/structural/*.json.txt`) that require
parsing raw JSON text rather than a parsed document; the value-level validator cannot
decide them, so they are reported as `unimplemented` by design. See
[DEVELOPMENT.md](../DEVELOPMENT.md) and the vector contract in
[2026-10-31-compat-spec-requirements.md](../requirements-and-design/2026-10-31-compat-spec-requirements.md).

## 3. Failure, refusal and limitation detail

- **No test failure is recorded for this project.** The 50/50 and 40-vector results were
  green at the time; the 4 `unimplemented` vectors are a declared scope boundary, not a
  failure, and must not be counted as passing.
- **Review-stage rejection (not a test run).** The first submission of the validator
  was rejected during review for two contract violations: `scope` was wrongly closed to
  `plugin|shared`, and a missing/null `resources` array was wrongly accepted. Both were
  corrected before the green run above. This is a review finding, not an executed test
  result, and is listed to keep the record from reading as if the first version passed.
  Detail: dev plan §5, first bullet.
- **Explicit non-claims.** No JSON Schema engine was installed or executed, so the
  schema was never machine-validated; a schema-only check is not conformance. Two rules
  are not expressible in JSON Schema — repeated field names and cross-list capability
  disjointness — and are enforced only by the executable validator. The `uniqueItems`
  constraint covers `(kind, name, scope)` uniqueness only because resource entries have
  exactly those three fields.

## 4. Provenance gaps (do not invent these)

- **Code revision at run time: NOT RECORDED.** No commit, tag or file digest was
  captured with rows 1–3. This project's own repository currently has an initialized but
  commit-less git history (`git rev-parse --verify HEAD` → "Needed a single revision"),
  and the parent workspace tracks no file under `projects/`, so there is **no revision to
  which an old result can be pinned**. Current tree state is therefore *unknown*
  relative to the recorded results — they cannot be attributed to today's files. **Two
  limits on that inference:** (a) the unborn HEAD explains only why no commit was
  *available at run time*; it does not establish that no per-file digest was ever computed
  or retained — a missing recorded revision is a gap in this record, not a finding that
  all source hashes are absent; (b) digests taken from today's files are not run-time
  digests and must never be backfilled into these rows, and a commit existing in an
  enclosing repository does not retroactively pin a run whose tree state was never
  captured.
- **Exit codes: NOT RECORDED** for rows 1–3.
- **Resource limits, wall time, memory peak: NOT RECORDED.** The first-slice runs were
  not executed under a bounded cgroup envelope, so no cap was requested or observed.
- **Timestamps:** the only retained anchor is the planning date 2026-10-31; the actual
  acceptance run time was not recorded. Time zone, where any applies, is the workspace
  convention Asia/Shanghai.

## 5. Links to the original reports

All of these are relative paths from this file and refer to artifacts in the **parent
workspace**, outside this repository. They are listed for traceability; they are not
portable with this package.

- [First-slice development and acceptance plan](../../../../docs/requirements-and-design/2026-10-31-first-slice-dev-plan.md) — §7 holds the only surviving summary of rows 1–3.
- [This project's requirements and vector contract](../requirements-and-design/2026-10-31-compat-spec-requirements.md) — the 44-vector composition and the 40/4 boundary.
- [DEVELOPMENT.md](../DEVELOPMENT.md) — the documented commands (`node --test`, `tools/schema-sync.mjs --check`, `tools/cli.mjs --conformance`) and the "never as passing" rule for structural vectors.

## 6. Checklist for future test records (mandatory)

Any subagent that executes tests for this repository must write its outcome into a new
dated file under `docs/testing/`, and must satisfy every item below. The Lead reviews
it before the result is cited anywhere.

1. **Outcome first, unambiguously.** One of `PASS`, `FAIL`, `REFUSED`, or `NOTRUN`, stated
   before any narrative. Written-but-unexecuted cases are `NOTRUN`, never pass.
2. **Never replace red with green.** Append new attempts; do not edit or delete an older
   attempt's row. A later pass does not erase an earlier failure or refusal.
3. **Timestamps with time zone.** Start and end, ISO 8601 with offset (e.g.
   `2026-11-01T21:40:12+08:00`), plus the unit/job name if one exists.
4. **Exact commands, verbatim.** The literal command line including every argument. If a
   command is not known from evidence, write "not retained" — never reconstruct it.
5. **Caps requested vs caps observed.** Table both: memory max, swap, task/PID max, CPU
   quota, wall-time limit, Node heap cap; observed values read from the cgroup/unit, not
   assumed. State explicitly when no envelope was used.
6. **Code revision at run time.** Commit hash (and dirty state), or per-file sha256 when
   there is no commit. If none was captured, say so — the record is then unpinnable.
7. **Counts and exit codes.** Tests/vectors total, pass, fail, skipped, cancelled; the
   real process exit code. For this package, always split **implemented** vectors from
   **structural/unimplemented** ones, and never add them into one "passing" number.
8. **Raw logs retained by path.** Where the raw output actually lives; if the raw log was
   not kept, say "not retained" and mark the row summary-only.
9. **Scope and evidence tier.** What was and was not exercised — unit/static versus real
   Loader/profile/host/browser — and which claims therefore do not follow.
10. **Deviations disclosed.** Any step taken outside the instructions (retries, extra
    probes, budget changes, out-of-envelope commands), the memory gate result if one
    applied, and any refusal code with its literal text.
11. **Refusals kept separate from failures.** A gate/preflight refusal is `REFUSED` with
    its reason and code, not a test failure and not a pass.
12. **No cross-attribution.** An old result does not certify newer code; a result from
    another repository or from the parent workspace is not evidence for this package.

## 7. Appended later — the validator executed inside a real-host unit (not a suite re-run)

Appended 2026-11-01. This stage post-dates rows 1–3, does **not** re-run the 50-test
suite or the conformance CLI, and is recorded only because it is the one later point at
which this package's code actually executed.

- **Report:** [host-smoke-generated-kit-lifecycle.md](../../../../experiments/low-memory-build/reports/host-smoke-generated-kit-lifecycle.md), preparation phase (r3).
- **Unit:** `hostsmoke-genprep-20261101t1622z-a7f3r3` — `success`, 253 ms, CPU 215 ms,
  memory peak 15.2 M, swap 0 B, systemd invocation `f03b45aca57c422793a88029ab971edb`.
- **Envelope:** `systemd-run --wait --pipe --collect` with `MemoryMax=1536M`,
  `MemorySwapMax=0`, `TasksMax=32`, `RuntimeMaxSec=120`, inside `bwrap` with
  `--ro-bind /`, private pid/net/ipc/uts, tmpfs `/tmp`, and one rw path
  (`/data/tests`). No install, no build, no network.
- **What executed:** `prepare.mjs validate` rc=0 — the real protocol owner
  `projects/dsh-compat-spec/src/index.js` `validateDeclaration`, called as a library on
  the `declaration.json` the kit had just scaffolded, returned
  `valid:true`, `issues:[]`. The scaffold step itself wrote 7 files from the generator;
  this package contributed only the validator.
- **Context for the number:** the surrounding lifecycle process later exited 1 on an
  unrelated driver disable refusal (`POLICY_CONFIG_INVALID`). The declaration **had**
  validated; that failure is not a validator result and must not be counted as one.

**What it does prove.** A real caller in another project, inside a bounded real-host unit,
received `valid:true` / `issues:[]` from this package's validator on a declaration the
generator produced — a cross-repository consumption data point that the first-slice rows
did not have.

**What it does not prove.** It is not a suite run and adds nothing to the 50/50 count. It
does not exercise the conformance CLI, any of the 44 vectors (in particular none of the 4
`structural/*.json.txt` duplicate-key vectors, which remain `unimplemented`), the
`schema-sync --check` invariant, or cross-version behaviour. No JSON Schema engine was
installed or executed, so nothing here changes the explicit non-claim in §3: "a
schema-only check is not conformance". It does not mount this package under a Loader and
says nothing about the 40-implemented / 4-unimplemented boundary holding on other inputs.
And it is **one** validation call, not a corpus.

Unchanged: rows 1–3 keep their counts, their single review-stage rejection and their
gaps — no exit code, no envelope, no revision (§4).

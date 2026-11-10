# spec-test-batch — candidate core pilot

**Executed pilot, 2026-11-10: 105/105 tests passed in one bounded service run.**
A preceding relative-path invocation refused with exit 77 before creating a run
or launching a unit. Use the absolute entry path below. No automatic retries.
See [the pilot record](../../docs/testing/2026-11-10-config-contract-runner-pilot.md).

## Pinned core source

The repository-local vendored core consists of [common.sh](<../bounded-runner/common.sh>),
[policy.sh](<../bounded-runner/policy.sh>), [host.sh](<../bounded-runner/host.sh>),
[envelope.sh](<../bounded-runner/envelope.sh>), [tap.sh](<../bounded-runner/tap.sh>) and
[core.manifest](<../bounded-runner/core.manifest>). These are copied without intentional
byte changes from canonical platform commit
`ce9f33b80bfd5f81a8d2eddb2707a1af634e2ed9` (the pin advances with each core change;
`UPSTREAM.md` names the current one and the two it superseded), directory
`projects/dsh-compat-platform/scripts/bounded-runner/`. Lead compared all six files
byte-for-byte before the successful pilot. [UPSTREAM.md](../bounded-runner/UPSTREAM.md)
records the pin and explicit maintenance procedure. The manifest retains
`bounded-runner/1 source-review-unreleased`; this is not a released ABI claim.
There is no runtime sibling-repository lookup, sync, or fallback.

## Responsibilities and invocation

- [run.sh](<run.sh>) is a thin `br_host_run` client: workload preflight and selected
  inputs are local policy; lock, unit-family guard, one launch, journal, ownership-safe
  terminal handling, control/selected snapshots and final verdict are core policy.
- [payload.sh](<payload.sh>) enters the core envelope before syntax or workload
  subprocesses, retains the existing static contract and serial Node TAP suite,
  then always calls `br_payload_finish` on explicit exits after valid arguments.
  The host alone writes the unit log. No package installation or acquisition occurs.

Reviewed invocation (use an absolute path so source-closure checks match):

```bash
bash /root/dsh-ecosystem-spec/projects/dsh-compat-spec/scripts/spec-test-batch/run.sh
```

It takes no arguments. Raw artifacts remain outside the repository under
`${SPEC_TEST_RUNS_ROOT:-/data/dsh-ecosystem-test-artifacts/runs}/<stamp>-spec-test-batch-<pid>-<rand>/`.
No new packages are required; the new filename/path dependency is the local core.
Invoke with Bash; executable mode of sourced modules is not required.

## Envelope and workload

Fixed limits: memory 384 MiB, swap 0, tasks 32, CPU 50% of one core, runtime 120s,
Node heap 192 MiB and one `MemAvailable >= 819200 KiB` gate. Core validates actual
unified cgroup membership, invocation identity and effective limits before work.
Both cleaned Node environments explicitly receive `NODE_OPTIONS="$BR_NODE_OPTIONS"`.

The static contract remains unchanged: admission-evidence default/types export
paths must match and exist; dependencies/devDependencies/peerDependencies/
optionalDependencies must be empty; the published file set must include `src/`,
`spec/`, and `conformance/`. It runs under the verified unit as before. This is not
an installed-consumer resolution test, nor evidence of DSH host acceptance/loading.

The test command remains `--test --test-concurrency=1 --test-reporter=tap
'src/test/*.test.js'`: all current tests, including revisions, run serially in
bubblewrap with read-only root, private tmp, PID/IPC/UTS namespaces, `--unshare-net`
and `--die-with-parent`. The core strict-six-TAP helper requires exactly one valid
summary for tests/pass/fail/cancelled/skipped/todo, positive tests, pass=tests and
zero fail/cancelled/skipped/todo, plus the original Node exit of zero.

Evidence gates precede each syntax subprocess and Node workload. Output files are
opened before Node starts; original syntax, static-contract and Node return codes
are retained separately from mapped acceptance verdicts. Evidence failure wins even
when a substep fails. No retry, reset-failed, broad cleanup or second launch is added.

## Selected inputs and control closure

Preflight uses quoted Bash arrays with nullglob/globstar/dotglob (no eval or
word-splitting), rejects empty test/vector sets, and requires the revisions test and
conformance manifest. It selects every `src/test/**/*.test.js` and
`conformance/**/*.json`, including the manifest and positive/negative JSON vectors,
alongside the original explicit package/source/schema inputs and this README.
This is a named selection, **not a dependency closure**. The run uses the original
flat test glob; recursive selection conservatively hashes any nested test files too.

The core API automatically snapshots the launcher, payload, manifest and all five
core modules, including modules not sourced by the host. `BR_EXTRA_CONTROL` also
includes the repository-local `UPSTREAM.md` source pin. The generated static-contract
program is embedded in the hashed payload, not a separately sourced shell helper.
Before/after snapshots do not detect transient edits restored between samples, or
new files added after selection; keep the checkout immutable during an authorized run.

## Exits and evidence changes

Host: 0 green; 70 refusal/unknown workload exit; 71 syntax/static-contract failure;
72 Node/TAP failure; 73 evidence failure; 74 timeout/unconfirmed terminal;
75 lock held; 76 run collision; 77 hash read/manifest failure; 78 input drift.
Precedence is **evidence > hash > terminal > workload**, including payload 73.
Payload outcomes remain 0/70/71/72/73; substep codes are not overwritten by mapping.

Artifact consumers must migrate from the old combined hashes and terminal-query
layout to core control-before/after, selected-before/after, their diffs, terminal,
requested, ownership, payload-result and payload-evidence records. Selection counts
now distinguish controls and workload inputs. Peaks use core measured/unavailable
fields. Syntax, static verdict/log, Node TAP/stderr/return-code and TAP evidence
remain; static-contract return code also has its own record. TAP field diagnostics
use `invalid` for missing, duplicate or malformed fields; raw TAP remains authoritative.
The old TAP byte/line and stderr-byte summaries are not retained.

## Review and remaining scope

Lead compared the six vendored files, pinned their source, reviewed absolute source
closure and test/vector selection, and ran the bounded pilot recorded above.
The successful pilot qualifies this wrapper's observed happy path, not every real
manager failure/cleanup path or the other eleven maintained runners. Mock failure
coverage is recorded separately in the canonical repository.

Crashes/signals can bypass payload finalization; the host treats a missing
payload-evidence marker as evidence failure, not success. This README was updated
after the pilot; the acceptance record retains its measured input hash.

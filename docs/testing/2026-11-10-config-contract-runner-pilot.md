# Configuration-contract revision and bounded-runner pilot — 2026-11-10

## Result and evidence boundary

**Actual result: 105/105 tests passed in one launched bounded service run; final acceptance exit 0.** This report reads existing artifacts; preparing it did not execute the runner, syntax checks or tests, install dependencies, change other files, or create a commit.

The run identifier is `20261109T180728Z-spec-test-batch-1109444-25525`. Its UTC timestamp is 2026-11-09 18:07:28Z (2026-11-10 02:07:28 +08:00). Raw evidence remains outside the repository. The [host status receipt](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/status.txt>) records `abi=bounded-runner/1`, `launch_attempted=yes`, `phase=completed`, `launch_rc=0`, `terminal_ok=yes`, `hash_rc=0`, `write_failures=0`, and `acceptance_exit=0`.

This is a local spec-library and runner pilot, not production qualification, DSH host acceptance, plugin installation/loading/execution evidence, certification, a released runner ABI, or proof of a complete JSON Schema engine.

## Revision under test

The [protocol](<../../spec/declaration-protocol.md>) and [validator source](<../../src/index.js>) introduce exact revision `0.2.0-draft.1`, requiring an own `configSchema` field. Its accepted outer shape is a boolean or plain record (ordinary `Object.prototype` or null prototype). The legacy constant, template, generated schema and default behavior remain `0.1.0-draft.1`; legacy declarations reject the new field rather than silently upgrading.

Only the outer shape is checked. Schema keywords, references, dialect support, formats and configuration values are not evaluated; defaults are not applied and values are not coerced. For example, an object containing an invalid schema keyword value or unresolved reference can pass envelope validation. Full JSON Schema 2020-12 admission/evaluation belongs to a separate engine. The no-throw promise remains scoped to JSON values, not arbitrary hostile JavaScript objects.

Lead's pre-pilot corrections are preserved in this record:

- The stale JSDoc test anchor was replaced with a lookup of `export function validateDeclaration` and its preceding comment in the [no-throw documentation test](<../../src/test/validate.test.js#L434-L443>).
- The prototype predicate is confined to the new configuration field; the legacy object predicate was not globally tightened. See [configuration shape check](<../../src/index.js#L58-L75>).
- [Revision tests](<../../src/test/revisions.test.js>) cover Date, Map, boxed Boolean and class-instance refusal, null-prototype record acceptance, inherited revision/contract getters never being read, required fields, exact revision selection, guarded known getters, and deliberately absent nested schema semantics.

These are corrections and regression coverage, not evidence that every possible JavaScript exotic object is safe. No earlier failing-test count or unavailable failure transcript is invented here.

## Invocation history and preserved refusal

The prior invocation supplied by Lead was:

```bash
/bin/bash projects/dsh-compat-spec/scripts/spec-test-batch/run.sh
```

It refused with **exit 77**, reporting `run_dir=not-created`, before launching a unit or executing tests. The relative `BASH_SOURCE` path differed from the absolute declared control closure. This was a fail-closed path/manifest refusal, not a test failure and not an additional service run. It has no run directory to link; the invocation and refusal are preserved from Lead's account rather than misattributed to the successful artifact set.

The successful exact command was:

```bash
/bin/bash /root/dsh-ecosystem-spec/projects/dsh-compat-spec/scripts/spec-test-batch/run.sh
```

The corrected invocation was a separate invocation after a refusal, not an automatic retry inside the runner. The [recorded launch argv](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/argv.txt>) shows one `systemd-run --wait --pipe --collect` launch with an absolute payload path. The [workload record](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/workload.txt>) names Node `/www/server/nodejs/v24.21.0/bin/node` and flat test glob `src/test/*.test.js`.

The [pilot README](<../../scripts/spec-test-batch/README.md>) describes the retained serial command `--test --test-concurrency=1 --test-reporter=tap`, bubblewrap read-only root, private temporary space, PID/IPC/UTS namespaces, network unsharing and die-with-parent behavior. The static contract checks package export targets, absence of dependency declarations, and the published source/spec/conformance directories; it is not an installed-consumer test.

## TAP and substep receipts

The [TAP summary](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/tap-summary.txt>) and [six-field diagnostics](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/tap-fields.txt>) report:

| TAP field | Actual value | Field validation |
|---|---:|---|
| tests | 105 | ok |
| pass | 105 | ok |
| fail | 0 | ok |
| cancelled | 0 | ok |
| skipped | 0 | ok |
| todo | 0 | ok |

The [TAP verdict](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/tap-verdict.txt>) is `tests_exit=0`, `tap_check_rc=0`, `verdict=pass`; the separate [Node receipt](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/node.rc>) retains `node_rc=0`. Raw output is retained in the [TAP log](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/node-tap.log>).

Both wrapper and payload syntax return codes are 0 in the [syntax receipt](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/syntax.txt>). The [static return code](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/static-contract.rc>) is 0 and the [static verdict](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/static-verdict.txt>) is pass. The [payload result](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/payload-result.txt>) retains `original_exit=0`, `write_failures=0`; the separate [payload evidence marker](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/payload-evidence.txt>) also records zero write failures.

## Effective envelope, ownership and terminal state

[Requested limits](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/requested.txt>) were checked against the [effective envelope](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/envelope-effective.txt>):

| Control | Recorded effective value |
|---|---|
| Service type | `Type=exec` |
| Memory maximum | `memory.max=402653184` bytes (384 MiB) |
| Swap maximum | `memory.swap.max=0` |
| Tasks maximum | `pids.max=32` |
| CPU quota | `cpu.max=50000 100000` (50% of one core) |
| Runtime maximum | `RuntimeMaxUSec=120000000` (120 seconds) |
| Envelope mismatch | `mismatch=0` |

The Node heap setting was 192 MiB, recorded as `NodeHeapMiB=192` in the request; it is distinct from the cgroup memory limit. The README specifies explicit `NODE_OPTIONS` propagation to both cleaned Node environments.

The effective unified-cgroup membership was `0::/system.slice/spec-test-batch-20261109t180728z-1109444-11946.service`. The [ownership receipt](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/ownership.txt>) binds:

```text
unit=spec-test-batch-20261109t180728z-1109444-11946.service
invocation_id=5b6bebb6c1d7470d8f2be8db9a188cf5
```

The [terminal query](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/terminal-before.txt>) returned `query_rc=0`, `MainPID=0`, `LoadState=not-found`, `ActiveState=inactive`, `SubState=dead` and an empty invocation ID after collection. The final [terminal receipt](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/terminal.txt>) records `terminal_ok=yes`, `confirmation=settled`, `stop_rc=not-attempted`. A stop was not required; collection is not represented as a still-running owned unit.

The single [memory gate](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/memory-gate.txt>) read succeeded (`read_rc=0`): `MemAvailableKiB=1463692` against `minimum_kib=819200`. The [peak receipt](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/peaks.txt>) reports `memory_peak=64323584` bytes and `pids_peak=16`, both with state `measured`, not unavailable or estimated. These are run measurements, not a general capacity guarantee.

## Source pin and split hash evidence

The five shell modules and manifest are byte-identical to canonical platform commit **`c8123de9f7bec62f9b09b5a542cd8fe383169a67`**, as recorded by Lead's comparison and the [upstream pin](<../../scripts/bounded-runner/UPSTREAM.md>). This documentation pass did not rerun that comparison. The manifest retains its source-review candidate header; the commit identifies source provenance, not a released ABI or universal manager qualification. Runtime does not resolve a sibling repository.

The [selection receipt](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/selection.txt>) records **9 control files**, **55 selected workload files**, and `workload_dependency_closure=no`.

- Controls: launcher, payload, manifest, all five core modules, and the upstream pin as an extra control. The [launcher](<../../scripts/spec-test-batch/run.sh#L18>) explicitly sets `BR_EXTRA_CONTROL=("$CORE/UPSTREAM.md")`.
- Selected workload inputs: explicit package/source/schema inputs and READMEs, all selected recursive test files, and JSON conformance vectors including the manifest. Recursive hashing does not change the flat execution glob into recursive test execution.
- [Control before hashes](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/control-before.txt>) and [control after hashes](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/control-after.txt>) have an empty [control diff](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/control-diff.txt>).
- [Selected before hashes](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/selected-before.txt>) and [selected after hashes](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/selected-after.txt>) have an empty [selected diff](</data/dsh-ecosystem-test-artifacts/runs/20261109T180728Z-spec-test-batch-1109444-25525/selected-diff.txt>).

The split snapshots establish no observed endpoint drift for those selected files, not a complete dependency closure. They cannot detect transient edits restored between samples or newly added files outside the initial selection. This report and any later documentation edits are not retroactively part of the successful run's hashes.

## Preserved procedural qualifications

1. The relative-path exit-77 refusal remains part of the history. The successful absolute invocation does not erase it or turn it into a passed test.
2. The [pilot README](<../../scripts/spec-test-batch/README.md>) was corrected after the run: its old pending-commit, empty-extra-control and unexecuted-pilot statements now identify the committed pin, UPSTREAM control and successful pilot. These documentation edits are not retroactively part of the measured selected-input hashes.
3. The JSDoc-anchor and new-field-only predicate corrections are explicitly recorded above. This report does not manufacture missing historical failure logs or claim that successful later execution invalidates earlier problems.
4. The runner preserves original substep exits and applies evidence/hash/terminal/workload gates; a passing TAP count alone is insufficient. Here the recorded evidence, hash and terminal gates also passed.
5. There was no execution or requalification during preparation of this report. No production, host-plugin, full-schema-engine, certification or release claim follows from this pilot.

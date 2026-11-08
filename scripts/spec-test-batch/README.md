# spec-test-batch

Two scripts that run the `dsh-compat-spec` suite once, under a fixed resource
envelope, and record what happened.

| Script | Where it runs | What it does |
| --- | --- | --- |
| `run.sh` | on the host | takes the shared acceptance lock, starts ONE transient systemd unit with the limits below, waits, reads back the terminal state, and diffs the selected-input hashes before and after |
| `payload.sh` | inside that unit | re-reads its own cgroup envelope, refuses if it does not match, checks the static contract, then runs the suite in a bubblewrap sandbox |

```bash
bash projects/dsh-compat-spec/scripts/spec-test-batch/run.sh
```

Raw artifacts go to `${SPEC_TEST_RUNS_ROOT:-/data/dsh-ecosystem-test-artifacts/runs}/<stamp>-spec-test-batch-<pid>-<rand>/`,
outside the repository. Only the narrative record is committed
(`docs/testing/…`).

## Envelope

384 MiB memory, swap 0, `TasksMax=32`, CPU quota 50 % of one core,
`RuntimeMaxSec=120`, Node heap 192 MiB, one `MemAvailable >= 819200 KiB` gate.
The payload verifies these from its own cgroup before any work starts; a
mismatch is a refusal (`70`), never a warning.

## What one run establishes

1. `package.json` exposes `./admission-evidence` with a `types` sibling pointing
   at files that exist, the package declares no dependencies, and the published
   `files` list carries `src/`, `spec/` and `conformance/`;
2. the suite under `src/test/` passes on exactly these bytes, with a TAP summary
   that names each count exactly once.

## What it does not establish

- That an installed consumer resolves the subpath the same way. That needs a real
  install of the packed tarball, which this batch never performs.
- That a DSH host accepts these documents, or that anything is loadable.
- Anything about a plugin: no host is booted and no plugin is loaded.
- Dependency provenance: the package has no dependencies, so the payload takes no
  dependency snapshot at all.

## Exit codes

`run.sh`: 0 green · 70 refusal before/inside the launch · 71 static contract
failed · 72 test verdict not green · 73 evidence write failed · 74 unit did not
settle · 75 lock held · 76 run-directory collision · 77 hash manifest unreadable ·
78 selected-input drift.

`payload.sh`: 0 green · 70 envelope refusal · 71 static contract failed · 72 test
verdict not green · 73 evidence write failed.

## Artifacts

`status.txt`, `selection.txt`, `hashes-before.txt`, `hashes-after.txt`,
`envelope-*.txt`, `memory-gate.txt`, `syntax.txt`, `static-contract.log`,
`static-verdict.txt`, `node-tap.log`, `node-stderr.log`, `node.rc`,
`tap-fields.txt`, `tap-summary.txt`, `tap-verdict.txt`, `terminal-query.txt`,
`journal.txt`, `argv.txt`, `launch.txt`.

## Note on file modes

Earlier batches in this workspace were first written `600` and refused at launch
with `rc=126`; the fix was `chmod 755`. File modes are not part of the sha256
manifest, so a mode change does not appear as selected-input drift.

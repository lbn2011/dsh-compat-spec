#!/bin/bash
# Candidate pilot only; not executed or syntax-qualified by this migration.
# Dedicated host shell, one core launch, no retry and no sibling-repo resolution.
set -uo pipefail

PKG=/root/dsh-ecosystem-spec/projects/dsh-compat-spec
SLICE=$PKG/scripts/spec-test-batch
CORE=$PKG/scripts/bounded-runner
NODE=/www/server/nodejs/v24.21.0/bin/node
RUNS=${SPEC_TEST_RUNS_ROOT:-/data/dsh-ecosystem-test-artifacts/runs}
[ "$#" -eq 0 ] || exit 70
source "$CORE/common.sh" || exit 70
source "$CORE/policy.sh" || exit 70
source "$CORE/host.sh" || exit 70
command -v bwrap >/dev/null 2>&1 || exit 70
[ -x "$NODE" ] || exit 70

BR_EXTRA_CONTROL=("$CORE/UPSTREAM.md")
BR_WORKLOAD_EXITS=(0 70 71 72 73)
BR_SELECTED_INPUTS=(
  "$SLICE/README.md"
  "$PKG/package.json"
  "$PKG/README.md"
  "$PKG/src/index.js"
  "$PKG/src/index.d.ts"
  "$PKG/src/admission-evidence.js"
  "$PKG/src/admission-evidence.d.ts"
  "$PKG/spec/declaration.schema.json"
)
# Expand only during preflight, with arrays (no eval/word splitting). Empty sets
# refuse rather than hash literal wildcard strings. Include all test/fixture files,
# not just a hand-maintained list; revisions.test.js is an explicit required guard.
unset GLOBIGNORE
shopt -s nullglob globstar dotglob
TEST_FILES=("$PKG"/src/test/**/*.test.js)
VECTOR_FILES=("$PKG"/conformance/**/*.json)
shopt -u nullglob globstar dotglob
[ "${#TEST_FILES[@]}" -gt 0 ] && [ "${#VECTOR_FILES[@]}" -gt 0 ] || exit 70
[ -f "$PKG/src/test/revisions.test.js" ] || exit 70
[ -f "$PKG/conformance/manifest.json" ] || exit 70
BR_SELECTED_INPUTS+=("${TEST_FILES[@]}" "${VECTOR_FILES[@]}")
for f in "${BR_SELECTED_INPUTS[@]}"; do
  br_path "$f" && [ -f "$f" ] || exit 70
done
# Core API includes wrapper, payload, manifest and ALL five modules automatically.
br_host_run "$CORE" "$SLICE/run.sh" "$SLICE/payload.sh" "$RUNS" spec-test-batch
rc=$?
printf 'run_dir=%s\nacceptance_exit=%s\n' "${BR_RUN:-not-created}" "$rc"
exit "$rc"

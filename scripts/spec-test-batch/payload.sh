#!/bin/bash
# Candidate pilot only; no execution/syntax qualification by this migration.
# The host alone writes unit.log. All explicit exits after valid arguments finalize.
set -uo pipefail

PKG=/root/dsh-ecosystem-spec/projects/dsh-compat-spec
SLICE=$PKG/scripts/spec-test-batch
CORE=$PKG/scripts/bounded-runner
NODE=/www/server/nodejs/v24.21.0/bin/node
EXPECT_EXPORT_DEFAULT='./src/admission-evidence.js'
EXPECT_EXPORT_TYPES='./src/admission-evidence.d.ts'
source "$CORE/common.sh" || exit 70
source "$CORE/policy.sh" || exit 70
source "$CORE/envelope.sh" || exit 70
[ "$#" -eq 2 ] || exit 70
br_unit "$1" && br_path "$2" && [ -d "$2" ] || exit 70
BR_UNIT=$1 BR_RUN=$2
RUN=$BR_RUN

spec_payload() {
  local rc static_rc node_rc tap_rc k value state
  local acc_syntax_run_sh_rc acc_syntax_payload_sh_rc
  source "$CORE/tap.sh" || return 70
  br_envelope_enter "$BR_UNIT" "$BR_RUN"; rc=$?
  [ "$rc" -eq 0 ] || return "$rc"
  [ -d "$PKG" ] && [ -x "$NODE" ] || return 70
  command -v bwrap >/dev/null 2>&1 || return 70

  # These are future in-envelope substeps, not checks performed by the migration.
  br_evidence_gate || return 73
  bash -n "$SLICE/run.sh"; acc_syntax_run_sh_rc=$?
  br_record "$RUN/syntax-run.txt" 'acc_syntax_run_sh_rc=%s\n' "$acc_syntax_run_sh_rc" || :
  br_evidence_gate || return 73
  bash -n "$SLICE/payload.sh"; acc_syntax_payload_sh_rc=$?
  br_record "$RUN/syntax.txt" 'acc_syntax_run_sh_rc=%s\nacc_syntax_payload_sh_rc=%s\n' \
    "$acc_syntax_run_sh_rc" "$acc_syntax_payload_sh_rc" || :
  br_evidence_gate || return 73
  [ "$acc_syntax_run_sh_rc" -eq 0 ] && [ "$acc_syntax_payload_sh_rc" -eq 0 ] || return 71

  # Preserve the package-specific contract, without adding a consumer/host claim.
  br_evidence_gate || return 73
  if ! cat > "$RUN/static-contract.mjs" <<'CONTRACT'
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const pkgDir = process.env.EXPECT_PKG_DIR;
const expectDefault = process.env.EXPECT_EXPORT_DEFAULT;
const expectTypes = process.env.EXPECT_EXPORT_TYPES;
const fail = [];
const say = (line) => process.stdout.write(`${line}\n`);

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
} catch {
  say('manifest_parse=fail');
  process.exit(1);
}
say('manifest_parse=pass');

const entry = manifest.exports?.['./admission-evidence'];
say(`export_present=${entry ? 'pass' : 'fail'}`);
say(`export_default_exact=${entry?.default === expectDefault ? 'pass' : 'fail'}`);
say(`export_types_exact=${entry?.types === expectTypes ? 'pass' : 'fail'}`);
if (!entry) fail.push('export-missing');
if (entry?.default !== expectDefault) fail.push('export-default');
if (entry?.types !== expectTypes) fail.push('export-types');

for (const rel of [expectDefault.slice(2), expectTypes.slice(2)]) {
  say(`export_target_present ${rel}=${existsSync(join(pkgDir, rel)) ? 'yes' : 'no'}`);
  if (!existsSync(join(pkgDir, rel))) fail.push(`target:${rel}`);
}

// The package declares no dependencies: that is what makes a `types` sibling and
// a zero-install consumer install meaningful.
for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
  const names = Object.keys(manifest[field] ?? {});
  say(`no_${field}=${names.length === 0 ? 'pass' : 'fail'}`);
  if (names.length !== 0) fail.push(field);
}

// The published file set must carry both source and schema, or an installed
// consumer would get an export that points at a file the tarball omits.
const files = manifest.files ?? [];
for (const need of ['src/', 'spec/', 'conformance/']) {
  say(`files_includes ${need}=${files.includes(need) ? 'pass' : 'fail'}`);
  if (!files.includes(need)) fail.push(`files:${need}`);
}

say(`static_contract=${fail.length === 0 ? 'pass' : 'fail'}`);
say(`static_contract_failures=${fail.join(',') || 'none'}`);
process.exit(fail.length === 0 ? 0 : 1);
CONTRACT
  then
    br_write_failure static-contract-write
    return 73
  fi
  # Open evidence destinations before starting either Node workload. Redirection
  # failures must be evidence failures, not misreported Node substep exits.
  if ! exec 7>"$RUN/static-contract.log"; then br_write_failure static-contract.log; return 73; fi
  br_evidence_gate || { exec 7>&-; return 73; }
  env -i PATH=/usr/bin:/bin HOME=/tmp \
    NODE_OPTIONS="$BR_NODE_OPTIONS" \
    EXPECT_PKG_DIR="$PKG" \
    EXPECT_EXPORT_DEFAULT="$EXPECT_EXPORT_DEFAULT" \
    EXPECT_EXPORT_TYPES="$EXPECT_EXPORT_TYPES" \
    "$NODE" "$RUN/static-contract.mjs" >&7 2>&1
  static_rc=$?
  exec 7>&-
  br_record "$RUN/static-contract.rc" 'static_contract_rc=%s\n' "$static_rc" || :
  cat "$RUN/static-contract.log" || br_write_failure static-log-relay
  if ! printf 'static_contract_rc=%s\n' "$static_rc" >> "$RUN/static-contract.log"; then
    br_write_failure static-contract-rc-line
  fi
  if [ "$static_rc" -ne 0 ]; then
    br_record "$RUN/static-verdict.txt" 'acc_static_contract=fail\n' || :
    return 71
  fi
  br_record "$RUN/static-verdict.txt" 'acc_static_contract=pass\n' || :
  br_record "$RUN/workload.txt" 'node=%s\nworkdir=%s\ntest_glob=%s\n' \
    "$NODE" "$PKG" 'src/test/*.test.js' || :
  br_evidence_gate || return 73
  if ! exec 7>"$RUN/node-tap.log"; then br_write_failure node-tap.log; return 73; fi
  if ! exec 8>"$RUN/node-stderr.log"; then
    br_write_failure node-stderr.log
    exec 7>&-
    return 73
  fi
  br_evidence_gate || { exec 7>&- 8>&-; return 73; }
  # Preserve the original serial TAP command and read-only, no-network sandbox.
  bwrap --ro-bind / / --dev /dev --proc /proc --tmpfs /tmp \
    --unshare-pid --unshare-net --unshare-ipc --unshare-uts --die-with-parent \
    --chdir "$PKG" \
    -- /usr/bin/env -i PATH=/usr/bin:/bin HOME=/tmp TMPDIR=/tmp \
       NODE_OPTIONS="$BR_NODE_OPTIONS" \
       "$NODE" --test --test-concurrency=1 --test-reporter=tap 'src/test/*.test.js' \
    >&7 2>&8
  node_rc=$?
  exec 7>&- 8>&-
  br_record "$RUN/node.rc" 'node_rc=%s\n' "$node_rc" || :
  cat "$RUN/node-tap.log" || br_write_failure tap-relay
  br_evidence_gate || return 73
  br_tap_check "$RUN/node-tap.log" "$node_rc"; tap_rc=$?
  br_record "$RUN/tap-fields.txt" '%s' '' || :
  br_record "$RUN/tap-summary.txt" '%s' '' || :
  for k in tests pass fail cancelled skipped todo; do
    state=ok
    value=$(br_tap_value "$RUN/node-tap.log" "$k") || { state=invalid; value='<invalid>'; }
    if ! printf 'tap_field_%s=%s\n' "$k" "$state" >> "$RUN/tap-fields.txt"; then br_write_failure tap-fields.txt; fi
    if ! printf 'tap_%s=%s\n' "$k" "$value" >> "$RUN/tap-summary.txt"; then br_write_failure tap-summary.txt; fi
  done
  state=pass
  [ "$tap_rc" -eq 0 ] || state=fail
  br_record "$RUN/tap-verdict.txt" 'tests_exit=%s\ntap_check_rc=%s\nverdict=%s\n' "$node_rc" "$tap_rc" "$state" || :
  return "$tap_rc"
}

spec_payload
rc=$?
br_payload_finish "$rc"
exit "$?"

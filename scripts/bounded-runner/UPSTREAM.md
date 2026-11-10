# Bounded runner source pin

Canonical repository: https://github.com/lbn2011/dsh-compat-platform

Source commit: `ce9f33b` (`policy.sh` gained the `trusted-extraction-hang` prefix and
`trusted-extraction-hang-*` unit family for a new slice that measures the shipped
80 s phase budget; `core.manifest` refreshed to the new `policy.sh` digest
`f68270f4…`). Supersedes the `355d6a5` pin, which added the declared `BR_SETENV`
channel; that pin in turn superseded `1aa87f1`, the `config-check-batch` policy
change.

Source directory: `scripts/bounded-runner/`

The five shell modules and `core.manifest` were compared byte-for-byte against that checkout before the spec pilot. The manifest intentionally retains its source-review candidate header; this pin identifies the source commit, not a released ABI or successful real-manager qualification. No sibling repository is resolved at runtime.

Updates are explicit maintainer operations: review a canonical commit, copy these six files, compare every byte and manifest digest, update this pin, then rerun bounded qualification and the spec pilot. Never synchronize automatically during a test run.

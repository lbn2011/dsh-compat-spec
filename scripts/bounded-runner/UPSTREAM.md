# Bounded runner source pin

Canonical repository: https://github.com/lbn2011/dsh-compat-platform

Source commit: `355d6a5` (`host.sh` gained the declared `BR_SETENV` channel —
`--setenv=NAME=value` only, validated and recorded; `core.manifest` refreshed to
the new `host.sh` digest `08a12b13…`). Supersedes the `1aa87f1` pin, which was the
policy change adding `config-check-batch` to the unit-prefix and unit-family lists.

Source directory: `scripts/bounded-runner/`

The five shell modules and `core.manifest` were compared byte-for-byte against that checkout before the spec pilot. The manifest intentionally retains its source-review candidate header; this pin identifies the source commit, not a released ABI or successful real-manager qualification. No sibling repository is resolved at runtime.

Updates are explicit maintainer operations: review a canonical commit, copy these six files, compare every byte and manifest digest, update this pin, then rerun bounded qualification and the spec pilot. Never synchronize automatically during a test run.

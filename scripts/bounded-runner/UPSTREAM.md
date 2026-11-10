# Bounded runner source pin

Canonical repository: https://github.com/lbn2011/dsh-compat-platform

Source commit: `0ed946e` (`policy.sh` gained the `second-version-baseline` prefix and its unit family for a new slice that reads one published older release's interface from its own bytes; `core.manifest` refreshed to the new `policy.sh` digest `c42d382e…`). Supersedes the `ce9f33b` pin (`trusted-extraction-hang`), which superseded `355d6a5` (the declared `BR_SETENV` channel), which superseded `1aa87f1` (`config-check-batch`).

Source directory: `scripts/bounded-runner/`

The five shell modules and `core.manifest` were compared byte-for-byte against that checkout before the spec pilot. The manifest intentionally retains its source-review candidate header; this pin identifies the source commit, not a released ABI or successful real-manager qualification. No sibling repository is resolved at runtime.

Updates are explicit maintainer operations: review a canonical commit, copy these six files, compare every byte and manifest digest, update this pin, then rerun bounded qualification and the spec pilot. Never synchronize automatically during a test run.

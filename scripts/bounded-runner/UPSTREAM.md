# Bounded runner source pin

Canonical repository: https://github.com/lbn2011/dsh-compat-platform

Source commit: `f40ab29` (`policy.sh` gained the `second-version-observe` prefix and its unit family for a slice that observes a published older release with the same adapter; `core.manifest` refreshed to the new `policy.sh` digest `8a70501a…`). Supersedes the `0ed946e` pin (`second-version-baseline`), which superseded the `ce9f33b` pin (`trusted-extraction-hang`), which superseded `355d6a5` (the declared `BR_SETENV` channel), which superseded `1aa87f1` (`config-check-batch`).

Source directory: `scripts/bounded-runner/`

The five shell modules and `core.manifest` were compared byte-for-byte against that checkout before the spec pilot. The manifest intentionally retains its source-review candidate header; this pin identifies the source commit, not a released ABI or successful real-manager qualification. No sibling repository is resolved at runtime.

Updates are explicit maintainer operations: review a canonical commit, copy these six files, compare every byte and manifest digest, update this pin, then rerun bounded qualification and the spec pilot. Never synchronize automatically during a test run.

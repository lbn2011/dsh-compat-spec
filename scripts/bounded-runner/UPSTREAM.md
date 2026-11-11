# Bounded runner source pin

Canonical repository: https://github.com/lbn2011/dsh-compat-platform

Source commit: `a50a1ca` (`policy.sh` gained the `second-install-tree` prefix and its unit family for a slice that receipts a reconstructed installation tree of a published older release; `core.manifest` refreshed to the new `policy.sh` digest `9fd4fce1…`). Supersedes the `f40ab29` pin (`second-version-observe`), which superseded the `0ed946e` pin (`second-version-baseline`), which superseded the `ce9f33b` pin (`trusted-extraction-hang`), which superseded `355d6a5` (the declared `BR_SETENV` channel), which superseded `1aa87f1` (`config-check-batch`).

Source directory: `scripts/bounded-runner/`

The five shell modules and `core.manifest` were compared byte-for-byte against that checkout before the spec pilot. The manifest intentionally retains its source-review candidate header; this pin identifies the source commit, not a released ABI or successful real-manager qualification. No sibling repository is resolved at runtime.

Updates are explicit maintainer operations: review a canonical commit, copy these six files, compare every byte and manifest digest, update this pin, then rerun bounded qualification and the spec pilot. Never synchronize automatically during a test run.

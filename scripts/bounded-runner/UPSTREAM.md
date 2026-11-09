# Bounded runner source pin

Canonical repository: https://github.com/lbn2011/dsh-compat-platform

Source commit: `c8123de9f7bec62f9b09b5a542cd8fe383169a67`

Source directory: `scripts/bounded-runner/`

The five shell modules and `core.manifest` were compared byte-for-byte against that checkout before the spec pilot. The manifest intentionally retains its source-review candidate header; this pin identifies the source commit, not a released ABI or successful real-manager qualification. No sibling repository is resolved at runtime.

Updates are explicit maintainer operations: review a canonical commit, copy these six files, compare every byte and manifest digest, update this pin, then rerun bounded qualification and the spec pilot. Never synchronize automatically during a test run.

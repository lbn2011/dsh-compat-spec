# Spec `./admission-evidence` export (2026-11-09)

Status: **executed, four bounded rounds, all green.** The last two rounds ran the
committed bytes; the first two ran the same payload before peak capture was added
and are kept at their own numbers.

Slice S2 of `../../../dsh-compat-platform/docs/requirements-and-design/2026-11-09-platform-dev-plan.md`.

## 0. Scope and non-claims

- This does **not** prove a consumer resolves the subpath the same way. Self-reference
  proves resolution *from inside the package*; the install-time route is exercised
  only by an actual `npm pack` + install, which this batch never performs (that is
  slice S5).
- No host was booted, no plugin was loaded, nothing was admitted or activated.
- `94/94` is the count for **this** package's suite on these bytes. It is not a
  protocol certification and is not additive with any other package's counts.
- The earlier historical records for this repository (`54/54` in the 2026-11-01
  notes) describe an older, smaller suite. Nothing is retracted; the numbers are
  simply not comparable.

## 1. What changed

| Repository | File | Change |
| --- | --- | --- |
| spec | `package.json` | new `exports["./admission-evidence"]` → `{types: ./src/admission-evidence.d.ts, default: ./src/admission-evidence.js}` |
| spec | `src/test/package.test.js` | new test: the export map names both targets, both files exist, and `import('dsh-compat-spec/admission-evidence')` resolves from inside the package and exposes `validateAdmissionEvidence` |
| spec | `scripts/spec-test-batch/{run.sh,payload.sh,README.md}` | new: the bounded acceptance batch for this repository |
| platform | `packages/analyzer/tests/helpers/spec-module.mjs` | new: `resolveSpecModule(subpath)` — package specifier first, sibling checkout second, throws when neither is present |
| platform | `packages/analyzer/tests/diagnose-spec-wiring.test.js` | validators now come from the helper; assertions unchanged |
| platform | `packages/analyzer/tests/admission-cli.test.mjs` | same; assertions unchanged |

The platform tests keep their failure semantics: a missing grammar is a **failure**,
never a skip. What changed is only *how* the module is found.

## 2. Rounds

| Round | Run dir | Result |
| --- | --- | --- |
| 1 | `20261108T194226Z-spec-test-batch-870893-2241` | exit 0, `94/94`, `mem_available_kib=1376896` |
| 2 | `20261108T194244Z-spec-test-batch-871165-28648` | exit 0, `94/94` |
| 3 | `20261108T194309Z-spec-test-batch-871464-5087` | exit 0, `94/94`, `memory_peak_bytes=37416960`, `pids_peak=16` |
| 4 | `20261108T194311Z-spec-test-batch-871752-32478` | exit 0, `94/94`, `memory_peak_bytes=37404672`, `pids_peak=16` |

All four: `write_failures=0`, `selected_inputs=14`, `hashes=identical` (before ==
after), terminal `LoadState=not-found ActiveState=inactive SubState=dead MainPID=0`
with `confirmation=settled`, `stderr_bytes=0`, envelope `mismatch=none`
(`memory.max=402653184`, `memory.swap.max=0`, `pids.max=32`, `cpu.max=50000 100000`,
`Type=exec`, `RuntimeMaxUSec=120000000`), memory gate `>= 819200 KiB`.

Rounds 3 and 4 share byte-identical `hashes-before.txt`; rounds 1–2 differ from them
only because `payload.sh` gained the peak capture between round 2 and round 3.

## 3. Static contract, as measured (round 3)

```
manifest_parse=pass
export_present=pass
export_default_exact=pass
export_types_exact=pass
export_target_present src/admission-evidence.js=yes
export_target_present src/admission-evidence.d.ts=yes
no_dependencies=pass  no_devDependencies=pass
no_peerDependencies=pass  no_optionalDependencies=pass
files_includes src/=pass  files_includes spec/=pass  files_includes conformance/=pass
static_contract=pass
```

The self-reference check lives in the suite itself, not in the static contract, so it
runs as a test: `import('dsh-compat-spec/admission-evidence')` from inside
`src/test/package.test.js`.

## 4. Deviations

- Two rounds ran before the peak capture existed. They are recorded with their own
  numbers and no peaks; the payload was edited between round 2 and round 3, so no
  single payload hash covers all four rounds.
- Before the first round I ran a manual `node -e` self-reference probe and two local
  `node --test` invocations of the platform suites, outside any envelope. They are
  diagnostic only and are not evidence; the bounded rounds are the evidence.
- `chmod 755` was applied to both new scripts before round 1 (written `600`). File
  modes are not in the sha256 manifest.
- The suite glob was passed as `'src/test/*.test.js'`; the payload's TAP parse
  requires each count to appear exactly once, which it does.
- `README.md` was edited **after** the four rounds (it gained the admission-evidence
  usage section and the batch note). Its hash in §5 (`7e4f7a85…`) is the value the
  rounds ran against; the committed file differs. The other thirteen selected inputs
  are unchanged by that edit.

## 5. Selected inputs at run time (rounds 3–4)

| File | sha256 |
| --- | --- |
| `scripts/spec-test-batch/run.sh` | `43199b40a1aff9cb415977e8ab654ef0659a5f6cea4222056c8f6054c13755f4` |
| `scripts/spec-test-batch/payload.sh` | `8157174467d482465afeef332efa2486a7bf00d1e49fb173a2da5a54469c2a6e` |
| `package.json` | `62223926508c663d6c2058b00e6ca60303b31ffb05357d9403716a489c859c58` |
| `README.md` | `7e4f7a85e1ec455be3090ae1834e67d3c991289f94df93aa5c3a2f7321225f9c` |
| `src/index.js` | `432cdf437e44b0e770fb24309994e56f77ef262f757379cba19927e63647f3a1` |
| `src/index.d.ts` | `3a382725b16ee54ed0ab74c23464ed78f9b43c2b722511e951ec70b33ec08419` |
| `src/admission-evidence.js` | `2bb37db73350a416d542de6d36fedc66f4cb8cc4870a42116d5f9e528aae14c7` |
| `src/admission-evidence.d.ts` | `f29c5da36384c4edab23d62d2209e94b63bda77f415402bb26983c0a571b4949` |
| `spec/declaration.schema.json` | `98d153eb19d36a70b55ab05b8c486462a314dda7d6de71a44f0510b150b9d855` |
| `src/test/admission-evidence.test.js` | `9432e3150474aa17795b7d811ccb2f6921ad911617c7a50ccab6c7aeb0dde2cb` |
| `src/test/conformance.test.js` | `5aeef50fb1a4d58f6697d273d9888e0027597ccca69f7ef10a9b17f5b3edf261` |
| `src/test/package.test.js` | `eaf69d0102d30e0c57f94ae2dc7baa10305e788e873c3f4ca83d783025dfbcd8` |
| `src/test/schema.test.js` | `0829ea465421a50b6054a065a8cd83c74685f7eb8cea393f277967e3eea26a9c` |
| `src/test/validate.test.js` | `a79cddd8d25fe6ef5e9332d3623ec8e3954dee8e926858a49cf62f568965d73c` |

## 6. Reproduce

```bash
bash projects/dsh-compat-spec/scripts/spec-test-batch/run.sh
# <run_dir>/static-contract.log and tap-verdict.txt hold the two answers
```

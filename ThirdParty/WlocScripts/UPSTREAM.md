# WLOC Upstream Provenance

## Pinned source

- Original repository: `https://github.com/Yu9191/wloc` (deleted)
- Community restoration: `https://github.com/xepes0/wloc`
- Pinned restoration commit: `7f28c5e4fb6b802862988735b92e5c800382f2a2`
- Recovered original baseline: `529fcd841952571e79f40faf2d3e0ef90a7bdfa6`
- License: GNU Affero General Public License v3.0; retained in `LICENSE`

The restoration preserves the original repository history and attributes the
scripts to Yu9191 and the original contributors.

## Included file integrity

| File | SHA-256 |
| --- | --- |
| `dist/v1/wloc.js` | `a1b361e60f0b434585260fb59c65d1ddbe3bff89ace3639f592e7d8af432b3c1` |
| `dist/v1/wloc-settings.js` | `cbff047a7f42055615ee19e208ddfc2ec66833e6f2b75555eac84f1c299a66cf` |
| `LICENSE` | `8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef` |

The response-script hash also matches the independent `pixian5/wloc`
restoration at the time of import.

## Local differences

The two files under `dist/v1/` and `LICENSE` are byte-for-byte copies from the
pinned restoration. Module files retain the recovered interception behavior but
replace homepage, documentation, icon, and script URLs with project-owned URLs.
The mirrored module variants use `gh-proxy.org`; direct variants use GitHub Raw.
Both now use the maintained `dist/v2/` runtime with cache version `1.0.9-control2`.

### Maintained v2 runtime

`src/state.js` is the shared effective-state policy. It accepts existing saved
coordinates and makes an explicit disable marker override all module arguments.
`src/settings.js` implements save/query/clear with verified persistence.
`build.js` combines these sources with the pinned v1 response engine, replacing
its settings resolver to produce `dist/v2/`. No v1 artifact or license is changed.
Run `npm run build` to reproduce the shipped v2 runtime. Update both scripts
together; mixed v1/v2 module installations are unsupported.

## Regression checks

Run `npm test` in this directory. Tests pin the exact artifact and license
hashes and exercise Shadowrocket save/query behavior with the `wloc_settings`
persistent key. Additional runtime tests cover storage failures, readback mismatches,
explicit disabling, custom module arguments, all six client storage adapters,
and actual response rewriting before/after clear. Project contract and Xcode tests validate module URLs and app
integration.

## Exit condition

Re-evaluate these copies when an authoritative maintained upstream becomes
available. Return to an upstream dependency only after its license, provenance,
protocol compatibility, cache behavior, and regression tests have been checked.

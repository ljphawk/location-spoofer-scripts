# Third-party proxy modules

The private App repository is `ljphawk/location-spoofer`. Downloadable scripts
and modules are published separately in the public
`ljphawk/location-spoofer-scripts` repository, based on `xweiba/location-spoofer`.
Original script author attribution and upstream provenance are retained.

The third-party proxy modules and recovered WLOC scripts are hosted in this
repository. The original `Yu9191/wloc` repository was deleted, so it is retained
as provenance and is not a runtime dependency.

## Hosted files

- Mirrored module subscriptions: `Resources/ThirdPartyProxyModules/`
- Direct module subscriptions: `ThirdParty/WlocScripts/modules/direct/`
- Pinned recovered scripts: `ThirdParty/WlocScripts/dist/v1/`
- Maintained runtime scripts: `ThirdParty/WlocScripts/dist/v2/`
- Integrity and runtime tests: `ThirdParty/WlocScripts/test/`

The App appends `?v=1.0.9-control2` to module subscription URLs, and every module uses
the same cache version for its script URLs:

- default mirror:
  `https://gh-proxy.org/https://raw.githubusercontent.com/ljphawk/location-spoofer-scripts/main/Resources/ThirdPartyProxyModules/<file>?v=1.0.9-control2`
- direct:
  `https://raw.githubusercontent.com/ljphawk/location-spoofer-scripts/main/ThirdParty/WlocScripts/modules/direct/<file>?v=1.0.9-control2`

| Module file | Client |
|---|---|
| `wloc.module` | Shadowrocket |
| `wloc.sgmodule` | Surge and Egern |
| `wloc.conf` | Quantumult X |
| `wloc.lpx` | Loon |
| `wloc.stoverride` | Stash |

These URLs become downloadable after the change is merged into `main`. Until
then, validate them from the checked-out paths.

## Script protocol

`dist/v2/wloc.js` patches Apple WLOC responses using only the shared
`wloc_settings` persistent state. Module coordinate arguments no longer activate
spoofing. This makes the query result and the response script use the same state.
Legacy saved coordinates remain readable; an explicit `enabled: false` marker
always disables response rewriting, including after a client restart.

`dist/v2/wloc-settings.js` implements query, clear, and save actions using
`lon`/`lat`/`acc`/`randomRadius` parameters. Both write operations check the storage
API's return value and read back the effective state before reporting success.
A clear persists `{ "enabled": false }` rather than deleting the state.

The state API returns `protocolVersion: 2` and an explicit `enabled` boolean.
A disabled query returns:

```json
{"success":true,"enabled":false,"protocolVersion":2}
```

An enabled query also includes valid WGS-84 `longitude`/`latitude`, `accuracy`,
and `randomRadius`. Failures return `success: false` with an error message.
The App queries again after saving or clearing, and only reports success after
confirming the intended state. Legacy responses cannot prove the module is off;
the App reports an unconfirmed state and asks the user to update the subscription.

The App refreshes on returning to the foreground and every ten seconds while
active. Failed queries show an unconfirmed state rather than disabled. This is
the responding module's configuration, not proof that iOS has discarded cached
location data or that a disconnected proxy client has no saved coordinates.

Update/re-import the module subscription to load **both v2 scripts** after these
changes are published. Local edits do not update the hosted `main` URLs. Replacing
only one script is unsupported; old response scripts do not honor disable markers.

The App's third-party save sends WGS-84 `lon`/`lat`/`acc` values. Motion-state
simulation is unavailable in third-party mode; it remains available in App Mode
through the built-in proxy.

## Provenance and maintenance

The prebuilt scripts and license were copied byte-for-byte from the
`xepes0/wloc` community restoration pinned at
`7f28c5e4fb6b802862988735b92e5c800382f2a2`. The recovered original baseline is
`529fcd841952571e79f40faf2d3e0ef90a7bdfa6`. Module metadata keeps the original
author attribution while runtime URLs point to this project.

Full hashes, local differences, regression checks, licensing notes, and the
maintenance exit condition are recorded in
`ThirdParty/WlocScripts/UPSTREAM.md` and
`ThirdParty/WlocScripts/THIRD_PARTY_NOTICES.md`.

Build the maintained v2 scripts and run their regression tests with:

```bash
cd ThirdParty/WlocScripts
npm run build
npm test
```

The v1 engine remains byte-for-byte pinned. `build.js` replaces only its state
resolver using maintained sources under `src/`; the settings endpoint is fully
maintained there. Rebuilding the recovered upstream engine itself remains unavailable.

## Local control endpoint (control1)

The App uses `https://wloc-control.invalid/wloc-settings/save` for query, save,
and clear. The module maps this reserved name to the documentation-only address
`192.0.2.1`, routes it DIRECT, includes it in MITM, and returns the script response
before contacting an upstream. No server or registered domain is required.
Without the module, this endpoint must fail rather than forward coordinates to
an unrelated public website. Do not replace the mapping with a public service.

The Apple location response script and its matching rules are unchanged. Using
an Apple location hostname for the control API can trigger Apple-specific trust
pinning even with a user-trusted MITM root (device diagnostic error -67880).
Both App and module must be updated. Legacy Apple control patterns remain for
older App versions, but the new App never falls back to an Apple control URL.
The v2 state protocol and persistent `wloc_settings` key are unchanged.

On Shadowrocket, disable the old module, import the updated module into the
active profile, save, and reconnect. Verify that the reserved control host appears
in DNS mappings and HTTPS decryption. Test query first, then save, switch target,
and clear with readback. A successful module query does not prove system GPS or
Apple's location requests bypass their own pinning or cached fixes.

## Response execution diagnostics

The control2 runtime stores one bounded `wloc_runtime_diagnostics` record locally.
Query responses optionally expose it as `runtimeDiagnostics`: hook timestamp,
host/path without query parameters, completion stage, HTTP status, body byte
counts, whether spoofing was enabled, and whether output bytes changed.
It contains no response bodies, headers or coordinate values. Diagnostic storage
failure must not prevent the original script completion. A missing or stale
record means there is no recent observed response-hook execution; it does not
identify a trust failure by itself. A changed body is not proof that Core
Location accepted it. The App includes this metadata in `ThirdPartyRuntime` logs.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const settingsSource = fs.readFileSync(new URL('../dist/v2/wloc-settings.js', import.meta.url), 'utf8');
const responseSource = fs.readFileSync(new URL('../dist/v2/wloc.js', import.meta.url), 'utf8');
function harness(client = 'Shadowrocket') {
  const storage = new Map();
  let writeMode = 'ok';
  const read = key => storage.get(key) ?? null;
  const write = (value, key) => {
    if (writeMode === 'false') return false;
    if (writeMode === 'throw') throw new Error('disk unavailable');
    if (writeMode !== 'ignore') storage.set(key, value);
    return true;
  };
  const common = {
    ...(client === 'Quantumult X' ? { $task: {}, $prefs: { valueForKey: read, setValueForKey: write } } : {
      ...(client === 'Shadowrocket' ? { $rocket: {} } : client === 'Loon' ? { $loon: {} } :
        client === 'Egern' ? { Egern: {} } : { $environment: { [client === 'Stash' ? 'stash-version' : 'surge-version']: '1' } }),
      $persistentStore: { read, write }
    }),
    $script: { startTime: Date.now() }, console: { log() {} }
  };
  return {
    storage,
    failWrites(mode) { writeMode = mode; },
    request(query) {
      let result;
      vm.runInNewContext(settingsSource, { ...common, $request: { url: `https://wloc-control.invalid/wloc-settings/save?${query}` },
        $done(value) { result = JSON.parse((value.response ?? value).body); } });
      return result;
    },
    async response(argument = 'longitude=120.5&latitude=30.5', body = [1, 2, 3]) {
      let result;
      const logs = [];
      const original = new Uint8Array(body);
      const context = vm.createContext({ ...common, console: { log: (...args) => logs.push(args.join(' ')) },
        $argument: argument, $request: { url: 'https://gs-loc.apple.com/clls/wloc' },
        $response: { body: original, headers: {}, status: 200 }, $done(value) { result = value.response ?? value; } });
      vm.runInContext(responseSource, context);
      for (let i = 0; i < 10; i++) await Promise.resolve();
      return { result, original, logs };
    }
  };
}
for (const client of ['Shadowrocket', 'Surge', 'Loon', 'Stash', 'Egern', 'Quantumult X']) {
  test(`${client}: clear persists an explicit disable state and query confirms it`, () => {
    const h = harness(client);
    assert.equal(h.request('lon=121.1&lat=31.2&acc=25').enabled, true);
    assert.equal(h.request('action=clear').enabled, false);
    assert.equal(JSON.parse(h.storage.get('wloc_settings')).enabled, false);
    assert.deepEqual(h.request('action=query'), { success: true, enabled: false, protocolVersion: 2 });
  });
}
for (const mode of ['false', 'throw', 'ignore']) {
  test(`clear does not report success when storage writes ${mode}`, () => {
    const h = harness();
    h.request('lon=121.1&lat=31.2');
    h.failWrites(mode);
    assert.equal(h.request('action=clear').success, false);
    assert.equal(h.request('action=query').enabled, true);
  });
  test(`save does not report success when storage writes ${mode}`, () => {
    const h = harness();
    h.failWrites(mode);
    assert.equal(h.request('lon=121.1&lat=31.2').success, false);
  });
}
test('clear overrides custom module arguments after the script restarts', async () => {
  const h = harness();
  h.request('lon=121.1&lat=31.2');
  h.request('action=clear');
  const { result, original, logs } = await h.response();
  assert.deepEqual(result.body, original);
  assert.ok(logs.some(line => line.includes('透传模式')));
  assert.ok(!logs.some(line => line.includes('no patchable')));
});
test('without saved coordinates, custom module arguments cannot activate spoofing', async () => {
  const { result, original, logs } = await harness().response();
  assert.deepEqual(result.body, original);
  assert.ok(logs.some(line => line.includes('透传模式')));
});
test('query recognizes legacy saved coordinates including zero latitude', () => {
  const h = harness();
  h.storage.set('wloc_settings', JSON.stringify({ longitude: 120, latitude: 0, accuracy: 25 }));
  assert.equal(h.request('action=query').enabled, true);
});
test('save after clear explicitly re-enables the newly selected location', () => {
  const h = harness();
  h.request('action=clear');
  h.request('lon=120&lat=0&acc=20&randomRadius=50');
  const state = h.request('action=query');
  assert.equal(state.enabled, true);
  assert.equal(state.latitude, 0);
  assert.equal(state.randomRadius, 50);
});
test('malformed saved coordinates and missing save parameters fail explicitly', () => {
  const h = harness();
  h.storage.set('wloc_settings', 'not-json');
  assert.equal(h.request('action=query').success, false);
  for (const query of ['lon=1', 'lat=1', 'lon=&lat=1', 'lon=nan&lat=1', 'lon=181&lat=1']) {
    assert.equal(h.request(query).success, false, query);
  }
});

function varint(value) {
  let n = BigInt(value);
  const bytes = [];
  while (n >= 128n) { bytes.push(Number(n & 127n) | 128); n >>= 7n; }
  return [...bytes, Number(n)];
}
function message(field, bytes) { return [...varint(field * 8 + 2), ...varint(bytes.length), ...bytes]; }
function locationFrame() {
  const location = [8, ...varint(100), 16, ...varint(200), 24, ...varint(25)];
  const wifi = [...message(1, [...Buffer.from('aa:bb:cc:dd:ee:ff')]), ...message(2, location)];
  const payload = message(2, wifi);
  return [0, 1, 0, 0, 0, 1, 0, 0, payload.length >> 8, payload.length & 255, ...payload];
}
test('response engine applies the queried saved state and stops modifying payloads after clear', async () => {
  const h = harness();
  h.request('lon=121.1&lat=31.2&acc=25');
  const frame = locationFrame();
  const active = await h.response('', frame);
  assert.notDeepEqual(Array.from(active.result.body), frame);
  assert.ok(active.logs.some(line => line.includes('121.1,31.2')));
  h.request('action=clear');
  const disabled = await h.response('longitude=120.5&latitude=30.5', frame);
  assert.deepEqual(Array.from(disabled.result.body), frame);
});

test('every hosted module uses both maintained scripts and the App cache version', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const version = manifest.moduleSubscriptionVersion;
  for (const directory of ['../modules/direct/', '../../../Resources/ThirdPartyProxyModules/']) {
    for (const file of ['wloc.module', 'wloc.sgmodule', 'wloc.conf', 'wloc.lpx', 'wloc.stoverride']) {
      const module = fs.readFileSync(new URL(directory + file, import.meta.url), 'utf8');
      const urls = module.match(/https:\/\/\S+\/dist\/v2\/wloc(?:-settings)?\.js\?v=[^\s,]+/g) ?? [];
      assert.equal(urls.length, 2, file);
      assert.ok(urls.some(url => url.includes('/wloc.js?')));
      assert.ok(urls.some(url => url.includes('/wloc-settings.js?')));
      assert.ok(urls.every(url => new URL(url).searchParams.get('v') === version), file);
      assert.ok(!module.includes('longitude='), 'module arguments must not activate spoofing');
    }
  }
});


test('Shadowrocket control module resolves and intercepts the dedicated host', () => {
  for (const directory of ['../modules/direct/', '../../../Resources/ThirdPartyProxyModules/']) {
    const module = fs.readFileSync(new URL(directory + 'wloc.module', import.meta.url), 'utf8');
    const line = module.split('\n').find(line => line.startsWith('WLOC Settings ='));
    const pattern = new RegExp(line.match(/pattern=([^,]+),/)[1]);
    assert.ok(pattern.test('https://wloc-control.invalid/wloc-settings/save?action=query'));
    assert.ok(pattern.test('https://gs-loc.apple.com/wloc-settings/save?action=query'), 'legacy module compatibility');
    assert.ok(!pattern.test('https://unrelated.invalid/wloc-settings/save?action=query'));
    assert.match(module, /\[Host\]\s+wloc-control\.invalid = 192\.0\.2\.1/);
    assert.match(module, /DOMAIN,wloc-control\.invalid,DIRECT/);
    assert.ok(module.split('\n').some(line => line.startsWith('hostname =') && line.includes('wloc-control.invalid')));
  }
});


test('response diagnostics report the actual patch and return through the query endpoint', async () => {
  const h = harness();
  h.request('lon=121.1&lat=31.2');
  await h.response('', locationFrame());
  const diag = h.request('action=query').runtimeDiagnostics;
  assert.equal(diag.stage, 'completed');
  assert.equal(diag.host, 'gs-loc.apple.com');
  assert.equal(diag.path, '/clls/wloc');
  assert.equal(diag.enabled, true);
  assert.equal(diag.changed, true);
  assert.ok(diag.inputBytes > 0);
  assert.ok(diag.outputBytes > 0);
  assert.deepEqual(Object.keys(diag).sort(), ['timestamp', 'stage', 'host', 'path', 'status', 'inputBytes', 'outputBytes', 'enabled', 'changed'].sort());
  h.request('action=clear');
  await h.response('', locationFrame());
  assert.equal(h.request('action=query').runtimeDiagnostics.changed, false);
});

test('diagnostic storage failures do not interrupt response passthrough', async () => {
  const h = harness();
  h.failWrites('throw');
  const { result, original } = await h.response();
  assert.deepEqual(result.body, original);
});

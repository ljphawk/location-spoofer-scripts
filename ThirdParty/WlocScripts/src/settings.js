// Project-maintained WLOC settings endpoint. See ../UPSTREAM.md for provenance.
(function () {
  const isQuantumult = typeof $task !== 'undefined';
  function read() {
    const raw = isQuantumult ? $prefs.valueForKey('wloc_settings') : $persistentStore.read('wloc_settings');
    return raw == null || raw === '' ? null : JSON.parse(raw);
  }
  function writeVerified(value) {
    const raw = JSON.stringify(value);
    const written = isQuantumult ? $prefs.setValueForKey(raw, 'wloc_settings') : $persistentStore.write(raw, 'wloc_settings');
    if (!written) throw new Error('定位状态保存失败');
    const actual = wlocResolveState(read());
    const expected = wlocResolveState(value);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('定位状态写入后校验失败');
    return actual;
  }
  function parameters(url) {
    const values = {};
    for (const pair of (url.split('?')[1] || '').split('&')) {
      if (!pair) continue;
      const index = pair.indexOf('=');
      const key = decodeURIComponent(index < 0 ? pair : pair.slice(0, index));
      const value = decodeURIComponent(index < 0 ? '' : pair.slice(index + 1));
      if (!Object.prototype.hasOwnProperty.call(values, key)) values[key] = value;
    }
    return values;
  }
  let result;
  try {
    const values = parameters($request.url || '');
    const action = values.action || 'save';
    let state;
    if (action === 'query') {
      state = wlocResolveState(read());
    } else if (action === 'clear') {
      // Keep a durable disable marker so no stale module arguments can reactivate it.
      state = writeVerified({ enabled: false });
    } else if (action === 'save') {
      const lon = values.lon ?? values.longitude;
      const lat = values.lat ?? values.latitude;
      if (lon == null || lat == null || lon.trim() === '' || lat.trim() === '') throw new Error('缺少 lon/lat 参数');
      const latitude = Number(lat.replace(',', '.'));
      const longitude = Number(lon.replace(',', '.'));
      const accuracy = Number(values.acc ?? values.accuracy ?? 25);
      const randomRadius = Number(values.randomRadius ?? 0);
      if (!Number.isFinite(accuracy) || accuracy <= 0 || !Number.isFinite(randomRadius) || randomRadius < 0) {
        throw new Error('定位精度或随机半径无效');
      }
      const saved = { enabled: true, latitude, longitude, accuracy, randomRadius };
      wlocResolveState(saved);
      state = writeVerified(saved);
    } else {
      throw new Error('不支持的定位操作');
    }
    result = { success: true, ...state, protocolVersion: 2 };
  } catch (error) {
    result = { success: false, error: error.message || '定位操作失败', protocolVersion: 2 };
  }
  const response = {
    status: isQuantumult ? 'HTTP/1.1 200 OK' : 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(result)
  };
  $done(isQuantumult ? response : { response });
})();

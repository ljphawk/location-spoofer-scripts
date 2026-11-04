// Bounded local metadata only. Never stores packet bodies, coordinates or headers.
(function () {
  const isQuantumult = typeof $task !== 'undefined';
  const key = 'wloc_runtime_diagnostics';
  const originalDone = $done;
  function bytes(body) {
    if (body instanceof ArrayBuffer) return new Uint8Array(body);
    if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    return body;
  }
  const originalBody = bytes($response.body);
  const url = String($request.url || '');
  const match = url.match(/^https?:\/\/([^/?]+)([^?]*)/);
  const diagnostic = {
    timestamp: new Date().toISOString(), stage: 'started',
    host: match ? match[1] : '', path: match ? match[2] : '',
    status: String($response.status || ''),
    inputBytes: originalBody ? originalBody.length || 0 : 0,
    enabled: false, changed: false
  };
  function persist() {
    try {
      const raw = JSON.stringify(diagnostic);
      if (isQuantumult) $prefs.setValueForKey(raw, key);
      else $persistentStore.write(raw, key);
    } catch (_) { /* Diagnostics must not interrupt location responses. */ }
  }
  try {
    const raw = isQuantumult ? $prefs.valueForKey('wloc_settings') : $persistentStore.read('wloc_settings');
    diagnostic.enabled = wlocResolveState(raw ? JSON.parse(raw) : null).enabled;
  } catch (_) { /* The state resolver will handle invalid settings. */ }
  persist();
  $done = function (value) {
    try {
      const response = value && (value.response || value);
      const output = bytes(response && (response.bodyBytes || response.body));
      diagnostic.stage = 'completed';
      diagnostic.outputBytes = output ? output.length || 0 : diagnostic.inputBytes;
      if (output != null && originalBody != null) {
        diagnostic.changed = output.length !== originalBody.length;
        for (let i = 0; !diagnostic.changed && i < output.length; i++) {
          if (output[i] !== originalBody[i]) diagnostic.changed = true;
        }
      }
      persist();
    } catch (_) { /* Always forward the original completion. */ }
    originalDone(value);
  };
})();

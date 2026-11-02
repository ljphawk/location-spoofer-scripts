// Project-maintained state policy shared by the settings and response scripts.
// Module arguments never activate spoofing; only an explicit saved state can.
function wlocResolveState(stored) {
  if (stored == null || stored.enabled === false) return { enabled: false };
  if (typeof stored !== 'object') throw new Error('保存的定位状态无效');
  const latitude = stored.latitude;
  const longitude = stored.longitude;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error('保存的定位坐标无效');
  }
  return {
    enabled: true, latitude, longitude,
    accuracy: Number.isFinite(stored.accuracy) && stored.accuracy > 0 ? stored.accuracy : 25,
    randomRadius: Number.isFinite(stored.randomRadius) && stored.randomRadius >= 0 ? stored.randomRadius : 0
  };
}

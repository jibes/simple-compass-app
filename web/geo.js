/* Pure math helpers. Classic script (no modules) so it loads from any origin,
   including the Android asset loader; also importable from Node for tests. */
(function (root) {
  'use strict';

  const RAD = Math.PI / 180;
  const norm = (deg) => ((deg % 360) + 360) % 360;
  /** Signed shortest rotation from a to b, in (-180, 180]. */
  const delta = (a, b) => {
    const d = norm(b - a);
    return d > 180 ? d - 360 : d;
  };

  /**
   * Tilt-compensated heading from W3C DeviceOrientation Euler angles (Z-X'-Y'').
   * Uses the screen's "up" axis while the device is near flat and blends toward
   * the rear-camera axis as it is raised upright, so the reading never degenerates.
   * @returns heading in degrees [0, 360) or null when undefined.
   */
  function headingFromEuler(alpha, beta, gamma, screenAngle = 0) {
    const cA = Math.cos(alpha * RAD), sA = Math.sin(alpha * RAD);
    const cB = Math.cos(beta * RAD), sB = Math.sin(beta * RAD);
    const cG = Math.cos(gamma * RAD), sG = Math.sin(gamma * RAD);
    // Rotation matrix columns (device axes expressed in East, North, Up).
    const xE = cA * cG - sA * sB * sG, xN = cG * sA + cA * sB * sG;
    const yE = -cB * sA, yN = cA * cB;
    const zE = cG * sA * sB + cA * sG, zN = sA * sG - cA * cG * sB;
    const cS = Math.cos(screenAngle * RAD), sS = Math.sin(screenAngle * RAD);
    return headingFromAxes(cS * yE + sS * xE, cS * yN + sS * xN, -zE, -zN);
  }

  /** Blend horizontal projections of the up axis (u) and rear axis (b). */
  function headingFromAxes(uE, uN, bE, bN) {
    const h2 = Math.min(1, uE * uE + uN * uN);
    const w = (1 - h2) * (1 - h2);
    const e = uE + w * bE, n = uN + w * bN;
    if (Math.hypot(e, n) < 1e-6) return null;
    return norm(Math.atan2(e, n) / RAD);
  }

  /** Solar azimuth (deg from true north) and elevation (deg). Accurate to ~0.5°. */
  function sunPosition(date, lat, lon) {
    const d = date.getTime() / 86400000 - 10957.5; // days since J2000.0
    const g = norm(357.529 + 0.98560028 * d) * RAD;
    const q = norm(280.459 + 0.98564736 * d);
    const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
    const e = (23.439 - 0.00000036 * d) * RAD;
    const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
    const dec = Math.asin(Math.sin(e) * Math.sin(L));
    const gmst = norm((18.697374558 + 24.06570982441908 * d) * 15);
    const H = (gmst + lon) * RAD - ra;
    const phi = lat * RAD;
    const el = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
    const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(H));
    return { azimuth: norm(az / RAD), elevation: el / RAD };
  }

  const POINTS = [
    ['N', 'North'], ['NNE', 'North-northeast'], ['NE', 'Northeast'], ['ENE', 'East-northeast'],
    ['E', 'East'], ['ESE', 'East-southeast'], ['SE', 'Southeast'], ['SSE', 'South-southeast'],
    ['S', 'South'], ['SSW', 'South-southwest'], ['SW', 'Southwest'], ['WSW', 'West-southwest'],
    ['W', 'West'], ['WNW', 'West-northwest'], ['NW', 'Northwest'], ['NNW', 'North-northwest'],
  ];
  const cardinal = (deg) => POINTS[Math.round(norm(deg) / 22.5) % 16];

  const formatCoord = (v, axis) =>
    `${Math.abs(v).toFixed(5)}° ${axis === 'lat' ? (v >= 0 ? 'N' : 'S') : (v >= 0 ? 'E' : 'W')}`;

  const api = { norm, delta, headingFromEuler, headingFromAxes, sunPosition, cardinal, formatCoord };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CompassGeo = api;
})(typeof self !== 'undefined' ? self : this);

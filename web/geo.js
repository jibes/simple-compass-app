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

  /** Great-circle distance in metres. */
  function distance(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * RAD, dLon = (lon2 - lon1) * RAD;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371008.8 * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /**
   * Robust ground speed from noisy location fixes.
   * - drops fixes worse than maxAccuracy;
   * - prefers the receiver's Doppler speed; otherwise measures displacement from an
   *   anchor only once it exceeds the combined position error (no jitter "walking");
   * - clamps implausible acceleration, low-passes with time constant tau;
   * - reports `moving` with hysteresis and hold times so a bad fix never flickers it.
   * Times are in seconds, speeds in m/s.
   */
  function createSpeedFilter(options) {
    const o = Object.assign({
      maxAccuracy: 40, tau: 3, maxAccel: 4, startSpeed: 0.9, stopSpeed: 0.45,
      startHold: 3, stopHold: 6, anchorWindow: 10, stale: 15,
    }, options);
    let v = 0, moving = false, since = null, lastT = null, anchor = null;

    function measure(m, t) {
      const dt = lastT === null ? 1 : Math.max(0.1, t - lastT);
      m = Math.min(Math.max(m, v - o.maxAccel * dt), v + o.maxAccel * dt);
      v += (1 - Math.exp(-dt / o.tau)) * (m - v);
      if (v < 0.05) v = 0;
      lastT = t;
      const crossing = moving ? v < o.stopSpeed : v > o.startSpeed;
      if (!crossing) since = null;
      else if (since === null) since = t;
      if (crossing && t - since >= (moving ? o.stopHold : o.startHold)) { moving = !moving; since = null; }
    }

    return {
      update(fix) {
        if (!(fix.accuracy <= o.maxAccuracy)) return this.state();
        if (Number.isFinite(fix.speed) && fix.speed >= 0) {
          anchor = fix;
          measure(fix.speed, fix.t);
        } else if (!anchor) {
          anchor = fix;
        } else {
          const dt = fix.t - anchor.t;
          if (dt <= 0) return this.state();
          const d = distance(anchor.lat, anchor.lon, fix.lat, fix.lon);
          const noise = Math.hypot(fix.accuracy, anchor.accuracy);
          if (d > noise) { measure(d / dt, fix.t); anchor = fix; }
          else if (dt > o.anchorWindow) { measure(0, fix.t); anchor = fix; }
        }
        return this.state();
      },
      /** Call periodically: with no usable fix for `stale` seconds, decay to rest. */
      tick(t) {
        if (lastT !== null && t - lastT > o.stale && (v > 0 || moving)) {
          v = 0; moving = false; since = null; anchor = null;
        }
        return this.state();
      },
      state: () => ({ speed: v, moving }),
    };
  }

  const formatSpeed = (ms) => {
    const k = ms * 3.6;
    return `${k < 10 ? k.toFixed(1) : Math.round(k)} km/h`;
  };

  const api = { norm, delta, headingFromEuler, headingFromAxes, sunPosition, cardinal, formatCoord, distance, createSpeedFilter, formatSpeed };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CompassGeo = api;
})(typeof self !== 'undefined' ? self : this);

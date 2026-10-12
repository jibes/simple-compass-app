/* World Magnetic Model 2025 (NOAA NCEI / BGS, public domain), valid 2025.0–2030.0.
   Spherical-harmonic synthesis to degree 12; returns magnetic declination.
   Verified against the official WMM2025 test values in tests/wmm.test.js. */
(function (root) {
  'use strict';

  const EPOCH = 2025.0;
  const N = 12;
  // g, h (nT) and their secular variation (nT/yr), ordered n = 1..12, m = 0..n.
  const COEF = [
    -29351.8, 0, 12, 0, // 1 0
    -1410.8, 4545.4, 9.7, -21.5, // 1 1
    -2556.6, 0, -11.6, 0, // 2 0
    2951.1, -3133.6, -5.2, -27.7, // 2 1
    1649.3, -815.1, -8, -12.1, // 2 2
    1361, 0, -1.3, 0, // 3 0
    -2404.1, -56.6, -4.2, 4, // 3 1
    1243.8, 237.5, 0.4, -0.3, // 3 2
    453.6, -549.5, -15.6, -4.1, // 3 3
    895, 0, -1.6, 0, // 4 0
    799.5, 278.6, -2.4, -1.1, // 4 1
    55.7, -133.9, -6, 4.1, // 4 2
    -281.1, 212, 5.6, 1.6, // 4 3
    12.1, -375.6, -7, -4.4, // 4 4
    -233.2, 0, 0.6, 0, // 5 0
    368.9, 45.4, 1.4, -0.5, // 5 1
    187.2, 220.2, 0, 2.2, // 5 2
    -138.7, -122.9, 0.6, 0.4, // 5 3
    -142, 43, 2.2, 1.7, // 5 4
    20.9, 106.1, 0.9, 1.9, // 5 5
    64.4, 0, -0.2, 0, // 6 0
    63.8, -18.4, -0.4, 0.3, // 6 1
    76.9, 16.8, 0.9, -1.6, // 6 2
    -115.7, 48.8, 1.2, -0.4, // 6 3
    -40.9, -59.8, -0.9, 0.9, // 6 4
    14.9, 10.9, 0.3, 0.7, // 6 5
    -60.7, 72.7, 0.9, 0.9, // 6 6
    79.5, 0, 0, 0, // 7 0
    -77, -48.9, -0.1, 0.6, // 7 1
    -8.8, -14.4, -0.1, 0.5, // 7 2
    59.3, -1, 0.5, -0.8, // 7 3
    15.8, 23.4, -0.1, 0, // 7 4
    2.5, -7.4, -0.8, -1, // 7 5
    -11.1, -25.1, -0.8, 0.6, // 7 6
    14.2, -2.3, 0.8, -0.2, // 7 7
    23.2, 0, -0.1, 0, // 8 0
    10.8, 7.1, 0.2, -0.2, // 8 1
    -17.5, -12.6, 0, 0.5, // 8 2
    2, 11.4, 0.5, -0.4, // 8 3
    -21.7, -9.7, -0.1, 0.4, // 8 4
    16.9, 12.7, 0.3, -0.5, // 8 5
    15, 0.7, 0.2, -0.6, // 8 6
    -16.8, -5.2, 0, 0.3, // 8 7
    0.9, 3.9, 0.2, 0.2, // 8 8
    4.6, 0, 0, 0, // 9 0
    7.8, -24.8, -0.1, -0.3, // 9 1
    3, 12.2, 0.1, 0.3, // 9 2
    -0.2, 8.3, 0.3, -0.3, // 9 3
    -2.5, -3.3, -0.3, 0.3, // 9 4
    -13.1, -5.2, 0, 0.2, // 9 5
    2.4, 7.2, 0.3, -0.1, // 9 6
    8.6, -0.6, -0.1, -0.2, // 9 7
    -8.7, 0.8, 0.1, 0.4, // 9 8
    -12.9, 10, -0.1, 0.1, // 9 9
    -1.3, 0, 0.1, 0, // 10 0
    -6.4, 3.3, 0, 0, // 10 1
    0.2, 0, 0.1, 0, // 10 2
    2, 2.4, 0.1, -0.2, // 10 3
    -1, 5.3, 0, 0.1, // 10 4
    -0.6, -9.1, -0.3, -0.1, // 10 5
    -0.9, 0.4, 0, 0.1, // 10 6
    1.5, -4.2, -0.1, 0, // 10 7
    0.9, -3.8, -0.1, -0.1, // 10 8
    -2.7, 0.9, 0, 0.2, // 10 9
    -3.9, -9.1, 0, 0, // 10 10
    2.9, 0, 0, 0, // 11 0
    -1.5, 0, 0, 0, // 11 1
    -2.5, 2.9, 0, 0.1, // 11 2
    2.4, -0.6, 0, 0, // 11 3
    -0.6, 0.2, 0, 0.1, // 11 4
    -0.1, 0.5, -0.1, 0, // 11 5
    -0.6, -0.3, 0, 0, // 11 6
    -0.1, -1.2, 0, 0.1, // 11 7
    1.1, -1.7, -0.1, 0, // 11 8
    -1, -2.9, -0.1, 0, // 11 9
    -0.2, -1.8, -0.1, 0, // 11 10
    2.6, -2.3, -0.1, 0, // 11 11
    -2, 0, 0, 0, // 12 0
    -0.2, -1.3, 0, 0, // 12 1
    0.3, 0.7, 0, 0, // 12 2
    1.2, 1, 0, -0.1, // 12 3
    -1.3, -1.4, 0, 0.1, // 12 4
    0.6, 0, 0, 0, // 12 5
    0.6, 0.6, 0.1, 0, // 12 6
    0.5, -0.1, 0, 0, // 12 7
    -0.1, 0.8, 0, 0, // 12 8
    -0.4, 0.1, 0, 0, // 12 9
    -0.2, -1, -0.1, 0, // 12 10
    -1.3, 0.1, 0, 0, // 12 11
    -0.7, 0.2, -0.1, -0.1, // 12 12
  ];

  const RAD = Math.PI / 180;
  const A = 6378.137, F = 1 / 298.257223563, E2 = F * (2 - F), RE = 6371.2;

  // Schmidt quasi-normalisation factors.
  const fact = [1];
  for (let i = 1; i <= 2 * N; i++) fact[i] = fact[i - 1] * i;
  const schmidt = (n, m) => Math.sqrt(((m ? 2 : 1) * fact[n - m]) / fact[n + m]);

  /**
   * Geomagnetic field at a geodetic position.
   * @param lat, lon degrees; altKm height above WGS-84 ellipsoid in km; year decimal year.
   * @returns { x, y, z } north/east/down in nT and declination in degrees (east positive).
   */
  function field(lat, lon, altKm = 0, year = decimalYear(new Date())) {
    const dt = year - EPOCH;
    const sLat = Math.sin(lat * RAD), cLat = Math.cos(lat * RAD);

    // Geodetic → geocentric spherical.
    const rc = A / Math.sqrt(1 - E2 * sLat * sLat);
    const p = (rc + altKm) * cLat, zc = (rc * (1 - E2) + altKm) * sLat;
    const r = Math.hypot(p, zc);
    const latC = Math.asin(zc / r);
    const x = Math.sin(latC), s = Math.max(Math.cos(latC), 1e-10); // cos θ, sin θ (θ = colatitude)

    // Unnormalised associated Legendre functions and θ-derivatives.
    const P = [[1]], dP = [[0]];
    for (let n = 1; n <= N; n++) {
      P[n] = []; dP[n] = [];
      for (let m = 0; m <= n; m++) {
        if (m === n) {
          P[n][m] = (2 * n - 1) * s * P[n - 1][m - 1];
          dP[n][m] = (2 * n - 1) * (s * dP[n - 1][m - 1] + x * P[n - 1][m - 1]);
        } else {
          const p2 = n - 2 >= m ? P[n - 2][m] : 0, d2 = n - 2 >= m ? dP[n - 2][m] : 0;
          P[n][m] = ((2 * n - 1) * x * P[n - 1][m] - (n + m - 1) * p2) / (n - m);
          dP[n][m] = ((2 * n - 1) * (x * dP[n - 1][m] - s * P[n - 1][m]) - (n + m - 1) * d2) / (n - m);
        }
      }
    }

    let X = 0, Y = 0, Z = 0, i = 0;
    for (let n = 1; n <= N; n++) {
      const ratio = Math.pow(RE / r, n + 2);
      for (let m = 0; m <= n; m++, i += 4) {
        const g = COEF[i] + dt * COEF[i + 2], h = COEF[i + 1] + dt * COEF[i + 3];
        const cm = Math.cos(m * lon * RAD), sm = Math.sin(m * lon * RAD);
        const k = schmidt(n, m) * ratio;
        X += k * (g * cm + h * sm) * dP[n][m];
        Y += k * m * (g * sm - h * cm) * P[n][m] / s;
        Z -= k * (n + 1) * (g * cm + h * sm) * P[n][m];
      }
    }

    // Rotate from geocentric back to geodetic frame.
    const psi = latC - lat * RAD;
    const xg = X * Math.cos(psi) - Z * Math.sin(psi);
    const zg = X * Math.sin(psi) + Z * Math.cos(psi);
    return { x: xg, y: Y, z: zg, declination: Math.atan2(Y, xg) / RAD };
  }

  function decimalYear(date) {
    const y = date.getUTCFullYear();
    const start = Date.UTC(y, 0, 1), end = Date.UTC(y + 1, 0, 1);
    return y + (date.getTime() - start) / (end - start);
  }

  const declination = (lat, lon, altKm, year) => field(lat, lon, altKm, year).declination;

  const api = { field, declination, decimalYear, EPOCH };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WMM = api;
})(typeof self !== 'undefined' ? self : this);

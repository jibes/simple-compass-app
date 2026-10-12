const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WMM = require('../web/wmm.js');

// Official WMM2025 test values (NOAA NCEI): date, alt km, lat, lon, X, Y, Z, H, F, I, D, GV.
const rows = fs.readFileSync(path.join(__dirname, 'wmm2025-testvalues.csv'), 'utf8')
  .trim().split('\n').slice(1).map((l) => l.split(',').map(Number));

test(`matches ${rows.length} official WMM2025 test points`, () => {
  assert.ok(rows.length >= 100);
  for (const [year, alt, lat, lon, X, Y, Z, , , , D] of rows) {
    const f = WMM.field(lat, lon, alt, year);
    const where = `${year} ${lat},${lon} ${alt}km`;
    assert.ok(Math.abs(f.x - X) < 0.1, `X ${f.x} vs ${X} @ ${where}`);
    assert.ok(Math.abs(f.y - Y) < 0.1, `Y ${f.y} vs ${Y} @ ${where}`);
    assert.ok(Math.abs(f.z - Z) < 0.1, `Z ${f.z} vs ${Z} @ ${where}`);
    assert.ok(Math.abs(f.declination - D) < 0.01, `D ${f.declination} vs ${D} @ ${where}`);
  }
});

test('decimal year', () => {
  assert.equal(WMM.decimalYear(new Date('2026-01-01T00:00:00Z')), 2026);
  assert.ok(Math.abs(WMM.decimalYear(new Date('2026-07-02T12:00:00Z')) - 2026.5) < 0.001);
});

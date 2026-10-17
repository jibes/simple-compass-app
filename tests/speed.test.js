const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../web/geo.js');

// Deterministic pseudo-random noise.
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31) - 0.5;
const M_PER_DEG = 111320;

function run(fixes, opts) {
  const f = G.createSpeedFilter(opts);
  return fixes.map((x) => ({ t: x.t, ...f.update(x) }));
}

function walk({ seconds, speed, accuracy = 8, jitter = 8, doppler = false, from = 0 }) {
  const out = [];
  for (let t = from; t < from + seconds; t++) {
    const north = speed * t + jitter * rnd();
    out.push({
      t, lat: 52 + north / M_PER_DEG, lon: 13 + (jitter * rnd()) / M_PER_DEG,
      accuracy, speed: doppler ? Math.max(0, speed + 0.3 * rnd()) : null,
    });
  }
  return out;
}

test('standing still with jittery fixes never reports movement', () => {
  for (const doppler of [false, true]) {
    const r = run(walk({ seconds: 300, speed: 0, doppler }));
    assert.ok(r.every((s) => !s.moving), `doppler=${doppler}`);
  }
});

test('walking pace is detected after a short delay and is accurate', () => {
  for (const doppler of [false, true]) {
    const r = run(walk({ seconds: 90, speed: 1.4, doppler }));
    const firstMoving = r.findIndex((s) => s.moving);
    assert.ok(firstMoving >= 3 && firstMoving < 30, `start at ${firstMoving}s, doppler=${doppler}`);
    const tail = r.slice(-20).map((s) => s.speed);
    const mean = tail.reduce((a, b) => a + b) / tail.length;
    assert.ok(Math.abs(mean - 1.4) < 0.35, `mean ${mean}, doppler=${doppler}`);
  }
});

test('a single wild fix does not trigger movement', () => {
  const fixes = walk({ seconds: 60, speed: 0, doppler: true });
  fixes[20].speed = 40;
  fixes[21].lat += 300 / M_PER_DEG;
  assert.ok(run(fixes).every((s) => !s.moving));
});

test('inaccurate fixes are ignored', () => {
  const fixes = walk({ seconds: 60, speed: 15, accuracy: 120, doppler: true });
  assert.ok(run(fixes).every((s) => !s.moving && s.speed === 0));
});

test('stopping is reported after the hold time', () => {
  const fixes = [...walk({ seconds: 60, speed: 1.5, doppler: true }), ...walk({ seconds: 60, speed: 0, doppler: true, from: 60 })];
  const r = run(fixes);
  assert.ok(r[59].moving);
  const stopAt = r.findIndex((s, i) => i > 60 && !s.moving);
  assert.ok(stopAt > 62 && stopAt < 85, `stopped at ${stopAt}s`);
});

test('stale signal decays to rest', () => {
  const f = G.createSpeedFilter();
  for (const x of walk({ seconds: 30, speed: 2, doppler: true })) f.update(x);
  assert.ok(f.state().moving);
  assert.ok(!f.tick(29 + 16).moving);
});

test('speed formatting', () => {
  assert.equal(G.formatSpeed(1.4), '5.0 km/h');
  assert.equal(G.formatSpeed(13.9), '50 km/h');
});

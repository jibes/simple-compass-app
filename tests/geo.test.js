const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../web/geo.js');

const near = (a, b, tol = 0.5) =>
  assert.ok(Math.abs(G.delta(a, b)) <= tol, `expected ${a} ≈ ${b} (±${tol})`);

test('flat device: heading = 360 - alpha', () => {
  for (const a of [0, 10, 90, 180, 271, 359]) near(G.headingFromEuler(a, 0, 0), G.norm(360 - a));
});

test('upright device uses rear-camera direction', () => {
  for (const a of [0, 45, 200]) near(G.headingFromEuler(a, 90, 0), G.norm(360 - a));
});

test('rolled while flat stays on the top-edge axis', () => {
  near(G.headingFromEuler(30, 0, 25), 330, 0.01);
  near(G.headingFromEuler(30, 5, -40), 330, 1.5);
});

test('raising the phone never flips the reading', () => {
  for (let b = 0; b <= 90; b += 5) near(G.headingFromEuler(120, b, 0), 240);
});

test('landscape screen rotation shifts heading by the screen angle', () => {
  near(G.headingFromEuler(0, 0, 0, 90), 90);
  near(G.headingFromEuler(0, 0, 0, 270), 270);
});

test('sun: equator at June solstice noon UTC is high in the north', () => {
  const s = G.sunPosition(new Date('2024-06-20T12:00:00Z'), 0, 0);
  near(s.azimuth, 0, 3);
  assert.ok(Math.abs(s.elevation - 66.6) < 1);
});

test('sun: Berlin afternoon is southwest and above horizon', () => {
  const s = G.sunPosition(new Date('2024-03-20T14:00:00Z'), 52.52, 13.405);
  assert.ok(s.azimuth > 200 && s.azimuth < 240, `az ${s.azimuth}`);
  assert.ok(s.elevation > 20 && s.elevation < 35, `el ${s.elevation}`);
});

test('cardinal + coords formatting', () => {
  assert.equal(G.cardinal(359)[0], 'N');
  assert.equal(G.cardinal(247)[0], 'WSW');
  assert.equal(G.formatCoord(-33.865143, 'lat'), '33.86514° S');
  assert.equal(G.formatCoord(151.2099, 'lon'), '151.20990° E');
});

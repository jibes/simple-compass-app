(() => {
  'use strict';

  const G = window.CompassGeo;
  const $ = (id) => document.getElementById(id);
  const native = window.AndroidCompass || null;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  };

  const el = {
    app: $('app'), dial: $('dial'), ticks: $('ticks'), marks: $('marks'), arc: $('arc'), bubble: $('bubble'),
    deg: $('deg'), caption: $('caption'), north: $('north'), quality: $('quality'), enable: $('enable'),
    position: $('position'), posAcc: $('pos-acc'), lat: $('lat'), lon: $('lon'), alt: $('alt'), sun: $('sun'),
    toast: $('toast'),
  };

  const state = {
    heading: null,          // magnetic, degrees
    source: null,           // 'native' | 'ios' | 'absolute' | 'manual'
    accuracy: null,         // degrees, if the platform reports it
    calibration: null,      // 0..3 (Android), low = needs calibration
    tilt: null,             // { x, y } degrees
    position: null,
    declination: store.get('declination', null),
    trueNorth: store.get('trueNorth', true),
    lock: store.get('lock', null), // stored in the frame it was taken in (true/magnetic) — see reference()
    lockFrame: store.get('lockFrame', 'magnetic'),
    display: null,
    lastDeg: null,
    sector: null,
    aligned: false,
  };

  const screenAngle = () =>
    (screen.orientation && typeof screen.orientation.angle === 'number')
      ? screen.orientation.angle : (Number(window.orientation) || 0);

  /* ── Haptics ───────────────────────────────────────── */
  let lastHaptic = 0;
  function haptic(kind) {
    const now = performance.now();
    if (now - lastHaptic < 70) return;
    lastHaptic = now;
    if (native && native.haptic) { native.haptic(kind); return; }
    if (navigator.vibrate) { try { navigator.vibrate(kind === 'confirm' ? [12, 60, 12] : 6); } catch { /* ignore */ } }
  }

  /* ── Toast ─────────────────────────────────────────── */
  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.setAttribute('data-show', '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.removeAttribute('data-show'), 1800);
  }

  /* ── Dial construction ─────────────────────────────── */
  function buildDial() {
    const ns = 'http://www.w3.org/2000/svg';
    const paths = { minor: '', mid: '', major: '', north: '' };
    const R = 186;
    for (let i = 0; i < 360; i++) {
      const kind = i === 0 ? 'north' : i % 10 === 0 ? 'major' : i % 5 === 0 ? 'mid' : 'minor';
      const len = { north: 18, major: 14, mid: 9, minor: 5 }[kind];
      const a = (i * Math.PI) / 180, s = Math.sin(a), c = -Math.cos(a);
      paths[kind] += `M${(s * R).toFixed(2)} ${(c * R).toFixed(2)}L${(s * (R - len)).toFixed(2)} ${(c * (R - len)).toFixed(2)}`;
    }
    for (const [kind, d] of Object.entries(paths)) {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', `tick tick--${kind}`);
      el.ticks.appendChild(p);
    }

    const mark = (cls, b, text) => {
      const m = document.createElement('span');
      m.className = `mark ${cls}`;
      m.style.setProperty('--b', b);
      if (text) m.textContent = text;
      el.marks.appendChild(m);
      return m;
    };
    ['N', 'E', 'S', 'W'].forEach((t, i) => {
      const m = mark('mark--card', i * 90, t);
      if (t === 'N') m.dataset.n = '';
    });
    for (let b = 30; b < 360; b += 30) if (b % 90) mark('mark--num', b, String(b));
    el.sunMark = mark('mark--sun', 0);
    el.sunMark.hidden = true;
    el.lockMark = mark('mark--lock', 0);
    el.lockMark.hidden = true;
  }

  /* ── Frames of reference ───────────────────────────── */
  const useTrue = () => state.trueNorth && state.declination !== null;
  /** Converts a magnetic bearing into the frame currently displayed. */
  const toDisplay = (magnetic) => G.norm(magnetic + (useTrue() ? state.declination : 0));
  /** Bearing lock expressed in the displayed frame. */
  function lockInDisplay() {
    if (state.lock === null) return null;
    const decl = state.declination || 0;
    const magnetic = state.lockFrame === 'true' ? state.lock - decl : state.lock;
    return toDisplay(magnetic);
  }

  /* ── Sensor input ──────────────────────────────────── */
  function setHeading(h, source) {
    if (h === null || Number.isNaN(h)) return;
    if (state.source === 'native' && source !== 'native') return;
    if (state.source !== source) {
      state.source = source;
      el.app.dataset.state = 'live';
      el.enable.hidden = true;
    }
    state.heading = h;
  }

  function onAbsolute(e) {
    if (e.alpha === null) return;
    setHeading(G.headingFromEuler(e.alpha, e.beta, e.gamma, screenAngle()), 'absolute');
  }

  function onOrientation(e) {
    if (e.beta !== null && e.gamma !== null) state.tilt = { x: e.gamma, y: e.beta };
    if (typeof e.webkitCompassHeading === 'number' && e.webkitCompassHeading >= 0) {
      state.accuracy = e.webkitCompassAccuracy >= 0 ? e.webkitCompassAccuracy : null;
      setHeading(G.norm(e.webkitCompassHeading + screenAngle()), 'ios');
    } else if (e.absolute && !('ondeviceorientationabsolute' in window)) {
      onAbsolute(e); // Firefox reports absolute frames on the regular event
    }
  }

  // Called by the Android shell with rotation-vector data.
  window.Compass = {
    onNativeHeading(h, accuracy, calibration) {
      state.accuracy = accuracy >= 0 ? accuracy : null;
      state.calibration = calibration;
      setHeading(G.norm(h + screenAngle()), 'native');
    },
  };

  let started = false;
  function startSensors() {
    if (started) return;
    started = true;
    window.addEventListener('deviceorientation', onOrientation);
    if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', onAbsolute);
    setTimeout(() => { if (!state.source) enterManual(); }, 1600);
  }

  function needsPermission() {
    return typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
  }

  async function requestPermission() {
    try {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== 'granted') { toast('Motion access denied'); enterManual(); return; }
    } catch { /* not a user gesture or unsupported */ }
    el.enable.hidden = true;
    startSensors();
  }

  /* ── Manual mode (no sensor): drag to explore ──────── */
  function enterManual() {
    if (state.source) return;
    state.source = 'manual';
    state.heading = state.heading ?? 0;
    el.app.dataset.state = 'nosensor';
  }

  /* ── Location ──────────────────────────────────────── */
  function startLocation() {
    if (!('geolocation' in navigator)) { el.lat.textContent = 'Location unavailable'; return; }
    navigator.geolocation.watchPosition(onPosition, (err) => {
      el.lat.textContent = err.code === 1 ? 'Location off' : 'No fix yet';
      el.lon.textContent = '';
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
  }

  let declinationAt = null;
  function onPosition(pos) {
    const c = pos.coords;
    state.position = c;
    el.lat.textContent = G.formatCoord(c.latitude, 'lat');
    el.lon.textContent = G.formatCoord(c.longitude, 'lon');
    el.posAcc.textContent = c.accuracy ? `±${Math.round(c.accuracy)} m` : '';
    el.alt.textContent = c.altitude !== null && c.altitude !== undefined ? `${Math.round(c.altitude)} m` : '—';

    const moved = !declinationAt || Math.abs(declinationAt[0] - c.latitude) + Math.abs(declinationAt[1] - c.longitude) > 0.05;
    if (moved && window.WMM) {
      state.declination = window.WMM.declination(c.latitude, c.longitude, (c.altitude || 0) / 1000);
      declinationAt = [c.latitude, c.longitude];
      store.set('declination', state.declination);
    }
    updateSun();
    renderStatus();
  }

  function updateSun() {
    if (!state.position) return;
    const s = G.sunPosition(new Date(), state.position.latitude, state.position.longitude);
    state.sun = s;
    const up = s.elevation > -0.833;
    el.sun.textContent = `${Math.round(s.azimuth)}° · ${Math.abs(Math.round(s.elevation))}° ${up ? 'up' : 'below'}`;
    el.sunMark.hidden = false;
    el.sunMark.toggleAttribute('data-below', !up);
  }

  /* ── Status line ───────────────────────────────────── */
  function renderStatus() {
    const canTrue = state.declination !== null;
    el.north.disabled = !canTrue;
    el.north.setAttribute('aria-pressed', String(useTrue()));
    if (useTrue()) {
      const d = state.declination;
      el.north.textContent = `True north · ${Math.abs(d).toFixed(1)}° ${d >= 0 ? 'E' : 'W'}`;
    } else {
      el.north.textContent = 'Magnetic north';
    }

    let q = '', warn = false;
    const acc = state.accuracy;
    if (state.source === 'native' && state.calibration >= 0 && state.calibration <= 1) { q = 'Calibrate · wave in ∞'; warn = true; }
    else if (state.source === 'ios' && acc !== null && acc > 25) { q = `Low accuracy ±${Math.round(acc)}°`; warn = true; }
    else if (acc !== null && acc <= 25) q = `±${Math.round(acc)}°`;
    else if (state.source === 'manual') q = 'No sensor · drag dial';
    el.quality.textContent = q;
    el.quality.toggleAttribute('data-warn', warn);
  }

  /* ── Interaction ───────────────────────────────────── */
  function toggleLock() {
    if (state.display === null) return;
    if (state.lock === null) {
      state.lock = Math.round(G.norm(state.display));
      state.lockFrame = useTrue() ? 'true' : 'magnetic';
      haptic('confirm');
      toast(`Bearing locked at ${state.lock}°`);
    } else {
      state.lock = null;
      haptic('tick');
      toast('Bearing released');
    }
    state.aligned = false;
    store.set('lock', state.lock);
    store.set('lockFrame', state.lockFrame);
  }

  let drag = null;
  el.dial.addEventListener('pointerdown', (e) => {
    const r = el.dial.getBoundingClientRect();
    drag = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, x: e.clientX, y: e.clientY, moved: false, last: null };
    if (state.source === 'manual') el.dial.setPointerCapture(e.pointerId);
  });
  el.dial.addEventListener('pointermove', (e) => {
    if (!drag || state.source !== 'manual') return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true;
    if (!drag.moved) return;
    const a = Math.atan2(e.clientX - drag.cx, drag.cy - e.clientY) * 180 / Math.PI;
    if (drag.last !== null) state.heading = G.norm(state.heading - G.delta(drag.last, a));
    drag.last = a;
  });
  el.dial.addEventListener('pointerup', () => { if (drag && !drag.moved) toggleLock(); drag = null; });
  el.dial.addEventListener('pointercancel', () => { drag = null; });
  el.dial.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleLock(); } });

  el.north.addEventListener('click', () => {
    if (state.declination === null) return;
    state.trueNorth = !state.trueNorth;
    store.set('trueNorth', state.trueNorth);
    haptic('tick');
    renderStatus();
  });

  el.position.addEventListener('click', async () => {
    if (!state.position) return;
    const text = `${state.position.latitude.toFixed(6)}, ${state.position.longitude.toFixed(6)}`;
    try { await navigator.clipboard.writeText(text); toast('Coordinates copied'); }
    catch { toast(text); }
  });

  el.enable.addEventListener('click', requestPermission);

  /* ── Render loop ───────────────────────────────────── */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;

    if (state.heading !== null) {
      const target = toDisplay(state.heading);
      if (state.display === null) state.display = target;
      const k = state.source === 'manual' ? 1 : 1 - Math.exp(-dt / 85);
      state.display = G.norm(state.display + G.delta(state.display, target) * k);
      const d = state.display;
      el.dial.style.setProperty('--h', d.toFixed(2));

      const deg = Math.round(d) % 360;
      if (deg !== state.lastDeg) {
        state.lastDeg = deg;
        el.deg.textContent = String(deg);
      }

      const sector = Math.round(d / 45) % 8;
      if (state.sector !== null && sector !== state.sector && state.source !== 'manual') haptic('tick');
      state.sector = sector;

      renderLock(d);
      if (state.lock === null) el.caption.textContent = G.cardinal(d)[1];
    }

    if (state.sun) el.sunMark.style.setProperty('--b', toDisplay(state.sun.azimuth - (state.declination || 0)).toFixed(2));
    renderBubble();
    requestAnimationFrame(frame);
  }

  function renderLock(d) {
    const lock = lockInDisplay();
    if (lock === null) {
      el.lockMark.hidden = true;
      el.arc.setAttribute('d', '');
      delete el.app.dataset.lock;
      return;
    }
    const off = G.delta(d, lock);
    const aligned = Math.abs(off) < 2;
    if (aligned && !state.aligned) haptic('confirm');
    state.aligned = aligned;
    el.app.dataset.lock = aligned ? 'aligned' : 'set';
    el.lockMark.hidden = false;
    el.lockMark.style.setProperty('--b', lock.toFixed(2));

    const R = 198, rad = off * Math.PI / 180;
    const x = (R * Math.sin(rad)).toFixed(2), y = (-R * Math.cos(rad)).toFixed(2);
    el.arc.setAttribute('d', Math.abs(off) < 0.5 ? '' : `M0 ${-R} A${R} ${R} 0 0 ${off > 0 ? 1 : 0} ${x} ${y}`);

    const n = Math.round(lock) % 360;
    el.caption.textContent = aligned
      ? `On bearing ${n}°`
      : `Bearing ${n}° · ${Math.abs(Math.round(off))}° ${off > 0 ? 'right' : 'left'}`;
  }

  function renderBubble() {
    const t = state.tilt;
    if (!t || state.source === 'manual') return;
    const max = 22; // degrees of tilt mapped to the full travel
    let x = -t.x / max, y = -t.y / max;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    const travel = el.dial.clientWidth * 0.11;
    el.bubble.style.transform = `translate(${(x * travel).toFixed(1)}px, ${(y * travel).toFixed(1)}px)`;
    el.bubble.style.opacity = Math.abs(t.x) > 40 || Math.abs(t.y) > 40 ? '0.15' : '0.9';
    el.app.toggleAttribute('data-level', Math.hypot(t.x, t.y) < 1.5);
  }

  /* ── Lifecycle ─────────────────────────────────────── */
  let wakeLock = null;
  async function keepAwake() {
    if (native || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch { wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { keepAwake(); updateSun(); }
  });
  setInterval(() => { updateSun(); renderStatus(); }, 30000);

  buildDial();
  renderStatus();
  startLocation();
  keepAwake();

  if (!native && needsPermission()) {
    el.enable.hidden = false;
    el.caption.textContent = 'Motion access needed';
  } else {
    startSensors();
  }
  // Status reflects sensor quality changes without needing per-frame DOM writes.
  setInterval(renderStatus, 1000);
  requestAnimationFrame(frame);

  if (!native && 'serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();

// main.js — LKNZMZD Elite Mechanical Systems Division (UPDATED, STABLE)
// Fixes:
// - Removes the broken/duplicate diagnostics block from your earlier file
// - Keeps Three.js tick loop clean and perf-mode aware
// - Diagnostics: real-ish GPU (WEBGL_debug_renderer_info), WebGL version, memory usage,
//   Performance Mode toggle, DPR slider (dynamic), Low Power detection
// - Intro timing knobs at top (so you can slow/fast the Ilkin→LKNZMZD morph)

import * as THREE from "three";

console.log("LKNZMZD main.js running ✅");

// =========================================================
// PWA: Service Worker registration (single, safe)
// =========================================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const swUrl = new URL("./sw.js", location.href);
      const reg = await navigator.serviceWorker.register(swUrl, { scope: "/" });
      reg.update?.();
    } catch (e) {
      console.warn("SW registration failed:", e);
    }
  });
}

// Only register Service Worker in production (not localhost)
const isLocalhost =
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1";

if ("serviceWorker" in navigator && !isLocalhost) {
  window.addEventListener("load", async () => {
    try {
      const swUrl = new URL("./sw.js", location.href);
      const reg = await navigator.serviceWorker.register(swUrl, { scope: "/" });
      reg.update?.();
    } catch (e) {
      console.warn("SW registration failed:", e);
    }
  });
}


// =========================================================
// HELPERS / GLOBAL STATE
// =========================================================
const $ = (q) => document.querySelector(q);
const byId = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const prefersReducedMotion =
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const STORAGE_SKIP = "lknzmzd_skip_intro";
const STORAGE_AMBIENT = "lknzmzd_ambient_on";

window.__LKNZMZD = window.__LKNZMZD || {};
const STATE = window.__LKNZMZD;

// defaults (don’t overwrite if already set)
if (typeof STATE.perfMode !== "boolean") STATE.perfMode = false;
if (typeof STATE.dprLimit !== "number") STATE.dprLimit = 2.0;
if (typeof STATE.ambientOn !== "boolean") STATE.ambientOn = false;

// =========================================================
// INTRO TIMING KNOBS (ADJUST HERE)
// =========================================================
const INTRO_TIMING = {
  showFullNameMs: 1500,   // how long "ILKIN AZIMZADE" stays
  vowelStaggerMs: 140,    // delay between each vowel ejection
  afterEjectHoldMs: 900,  // pause after vowels fly out
  slideMs: 900,           // slide into final brand name
  lockHoldMs: 1100,       // hold after clamp lock before hiding
};

// =========================================================
// DOM REFS
// =========================================================
const introEl = $("#intro");
const morphEl = $("#morphText");
const enableSoundBtn = byId("enableSound");
const skipIntroBtn = byId("skipIntro");

const diagToggleBtn = byId("diagToggle");
const diagPanel = byId("diagPanel");
const diagClose = byId("diagClose");

const ambientToggle = byId("ambientToggle");
const glitchToggle = byId("glitchToggle");
const perfModeToggle = byId("perfMode");
const dprSlider = byId("dprSlider");
const dprSliderVal = byId("dprSliderVal");

const consoleEl = byId("console");
const cmdLog = byId("cmdLog");

const dRenderer = byId("dRenderer");
const dGPU = byId("dGPU");
const dWebGL = byId("dWebGL");
const dDPR = byId("dDPR");
const dFPS = byId("dFPS");
const dMem = byId("dMem");
const dRM = byId("dRM");
const dLP = byId("dLP");

// =========================================================
// WEB AUDIO — Servo + clamp + ambient (no external files)
// =========================================================
let audioCtx = null;
let ambientNode = null;

function getAudioCtx() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playServoStart() {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(70, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(170, ctx.currentTime + 0.18);
  osc.frequency.exponentialRampToValueAtTime(95, ctx.currentTime + 0.55);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.001, ctx.currentTime);
  env.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.03);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);

  osc.connect(env);
  env.connect(master);

  const bufferSize = Math.floor(ctx.sampleRate * 0.12);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.6;

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 900;
  noiseFilter.Q.value = 2.2;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.001, ctx.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0.30, ctx.currentTime + 0.01);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);

  osc.start();
  noise.start();
  osc.stop(ctx.currentTime + 0.8);
  noise.stop(ctx.currentTime + 0.13);
}

function playClampImpact() {
  const ctx = getAudioCtx();
  if (!ctx) return;

  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);

  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(62, ctx.currentTime);
  sub.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.18);

  const subEnv = ctx.createGain();
  subEnv.gain.setValueAtTime(0.001, ctx.currentTime);
  subEnv.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.01);
  subEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

  sub.connect(subEnv);
  subEnv.connect(master);

  const tick = ctx.createOscillator();
  tick.type = "square";
  tick.frequency.setValueAtTime(210, ctx.currentTime);
  tick.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.03);

  const tickEnv = ctx.createGain();
  tickEnv.gain.setValueAtTime(0.001, ctx.currentTime);
  tickEnv.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 0.005);
  tickEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

  const delay = ctx.createDelay(0.25);
  delay.delayTime.value = 0.11;
  const fb = ctx.createGain();
  fb.gain.value = 0.35;
  delay.connect(fb);
  fb.connect(delay);

  const echoGain = ctx.createGain();
  echoGain.gain.value = 0.22;

  tick.connect(tickEnv);
  tickEnv.connect(master);
  tickEnv.connect(delay);
  delay.connect(echoGain);
  echoGain.connect(master);

  sub.start();
  tick.start();
  sub.stop(ctx.currentTime + 0.25);
  tick.stop(ctx.currentTime + 0.12);
}

function setAmbient(on) {
  const ctx = getAudioCtx();
  if (!ctx) return;

  STATE.ambientOn = !!on;
  localStorage.setItem(STORAGE_AMBIENT, on ? "1" : "0");

  if (!on) {
    if (ambientNode) {
      try { ambientNode.stop?.(); } catch {}
      try { ambientNode.disconnect?.(); } catch {}
      ambientNode = null;
    }
    return;
  }

  const master = ctx.createGain();
  master.gain.value = 0.06;
  master.connect(ctx.destination);

  const dur = 1.0;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.25;

  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 220;

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 120;
  bp.Q.value = 1.2;

  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.06;

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 60;
  lfo.connect(lfoGain);
  lfoGain.connect(lp.frequency);

  src.connect(bp);
  bp.connect(lp);
  lp.connect(master);

  src.start();
  lfo.start();

  ambientNode = {
    stop: () => { src.stop(); lfo.stop(); },
    disconnect: () => { master.disconnect(); },
  };
}

// =========================================================
// INTRO — Ilkin Azimzade → LKNZMZD
// =========================================================
const FULL_NAME = "ILKIN AZIMZADE";
const TARGET = "LKNZMZD";
const VOWELS = new Set(["A", "E", "I", "O", "U"]);

function clearMorph() {
  if (!morphEl) return;
  morphEl.innerHTML = "";
}

function setMorphTextAsSpans(text) {
  if (!morphEl) return;
  clearMorph();

  const frag = document.createDocumentFragment();

  const scan = document.createElement("div");
  scan.className = "scanline";
  frag.appendChild(scan);

  for (const ch of text) {
    const s = document.createElement("span");
    s.className = "ch";
    s.textContent = ch === " " ? "\u00A0" : ch;
    if (VOWELS.has(ch)) s.classList.add("vowel");
    frag.appendChild(s);
  }

  morphEl.appendChild(frag);
}

function createSparksAtRect(rect, count = 10) {
  for (let i = 0; i < count; i++) {
    const sp = document.createElement("div");
    sp.className = "spark";

    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    sp.style.left = x + "px";
    sp.style.top = y + "px";

    const ang = Math.random() * Math.PI * 2;
    const dist = 24 + Math.random() * 46;
    const sx = Math.cos(ang) * dist;
    const sy = Math.sin(ang) * dist - 18;

    sp.style.setProperty("--sx", sx.toFixed(1) + "px");
    sp.style.setProperty("--sy", sy.toFixed(1) + "px");

    document.body.appendChild(sp);
    setTimeout(() => sp.remove(), 560);
  }
}

async function runIdentityFormation() {
  if (!introEl || !morphEl) return;

  // 1) show full name
  setMorphTextAsSpans(FULL_NAME);
  await wait(INTRO_TIMING.showFullNameMs);

  // 2) eject vowels
  const letters = Array.from(morphEl.querySelectorAll(".ch"));
  for (const el of letters) {
    const t = el.textContent.replace("\u00A0", " ");
    if (t !== " " && VOWELS.has(t)) {
      const rect = el.getBoundingClientRect();
      createSparksAtRect(rect, 12);
      el.classList.add("eject");
      await wait(INTRO_TIMING.vowelStaggerMs);
    }
  }
  await wait(INTRO_TIMING.afterEjectHoldMs);

  // 3) lock to brand name with slide mapping
  const beforeChars = Array.from(morphEl.querySelectorAll(".ch"));
  const beforeRects = beforeChars.map((c) => c.getBoundingClientRect());

  setMorphTextAsSpans(TARGET);

  const afterChars = Array.from(morphEl.querySelectorAll(".ch")).filter(
    (ch) => ch.textContent !== "\u00A0"
  );
  const afterRects = afterChars.map((c) => c.getBoundingClientRect());

  const n = Math.min(beforeRects.length, afterRects.length);
  for (let i = 0; i < n; i++) {
    const from = beforeRects[i];
    const to = afterRects[i];

    const dx = (from.left + from.width / 2) - (to.left + to.width / 2);
    const dy = (from.top + from.height / 2) - (to.top + to.height / 2);

    const ch = afterChars[i];
    ch.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    ch.style.opacity = "0.85";
  }

  void morphEl.offsetWidth;

  afterChars.forEach((ch) => {
    ch.style.transition = prefersReducedMotion
      ? "none"
      : `transform ${INTRO_TIMING.slideMs}ms cubic-bezier(.12,.92,.18,1), opacity 520ms ease`;
    ch.style.transform = "translate3d(0,0,0)";
    ch.style.opacity = "1";
  });

  await wait(prefersReducedMotion ? 0 : INTRO_TIMING.slideMs + 250);

  // 4) scan + clamp
  morphEl.classList.add("scan");
  document.body.classList.add("shake");
  setTimeout(() => document.body.classList.remove("shake"), 300);

  energy = 1;
  playClampImpact();
  morphEl.classList.add("locked");

  await wait(INTRO_TIMING.lockHoldMs);

  localStorage.setItem(STORAGE_SKIP, "1");
  introEl.classList.add("hidden");
}

// Intro control
function shouldSkipIntro() {
  const url = new URL(location.href);
  if (url.searchParams.get("intro") === "1") return false;
  return localStorage.getItem(STORAGE_SKIP) === "1";
}
function hideIntroInstant() {
  if (!introEl) return;
  introEl.classList.add("hidden");
}

skipIntroBtn?.addEventListener("click", () => {
  localStorage.setItem(STORAGE_SKIP, "1");
  hideIntroInstant();
});

enableSoundBtn?.addEventListener("click", async () => {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "suspended") {
    try { await ctx.resume(); } catch {}
  }

  playServoStart();

  if (enableSoundBtn) {
    enableSoundBtn.textContent = "Sound enabled ✓";
    enableSoundBtn.disabled = true;
    enableSoundBtn.style.opacity = "0.65";
    enableSoundBtn.style.cursor = "default";
  }

  const wantAmbient = localStorage.getItem(STORAGE_AMBIENT) === "1";
  if (ambientToggle) ambientToggle.checked = wantAmbient;
  if (wantAmbient) setAmbient(true);
});

// =========================================================
// THREE.JS BACKGROUND (perf-mode + DPR aware)
// =========================================================
let renderer, scene, camera, core, ring, stars, pMat, coreMat, ringMat;

// energy surge (0..1)
let energy = 0;

// fps diagnostics
let fps = 0;
let _fpsFrames = 0;
let _fpsLast = performance.now();

const canvas = byId("c");

function effectiveDpr() {
  const base = window.devicePixelRatio || 1;
  const limit = Number(STATE.dprLimit || 2);
  return Math.min(base, limit);
}

function applyRendererDpr() {
  if (!renderer) return;
  renderer.setPixelRatio(effectiveDpr());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}

if (!canvas) {
  console.warn("Canvas #c not found. Three.js background skipped.");
} else {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: STATE.perfMode ? "low-power" : "high-performance",
  });

  applyRendererDpr();

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 0, 6.2);

  // Core
  const coreGeo = new THREE.IcosahedronGeometry(2.85, 4);
  coreMat = new THREE.MeshBasicMaterial({
    wireframe: true,
    transparent: true,
    opacity: 0.24,
  });
  core = new THREE.Mesh(coreGeo, coreMat);
  scene.add(core);

  // Ring
  const ringGeo = new THREE.TorusGeometry(3.35, 0.03, 12, 260);
  ringMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.18,
  });
  ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2.2;
  scene.add(ring);

  // Particles
  const COUNT = 1800;
  const positions = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    positions[i3 + 0] = (Math.random() - 0.5) * 24;
    positions[i3 + 1] = (Math.random() - 0.5) * 16;
    positions[i3 + 2] = (Math.random() - 0.5) * 24;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  pMat = new THREE.PointsMaterial({
    size: 0.02,
    transparent: true,
    opacity: 0.55,
  });

  stars = new THREE.Points(pGeo, pMat);
  scene.add(stars);

  function onResize() {
    applyRendererDpr();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", onResize);

  const clock = new THREE.Clock();

  function tick() {
    const t = clock.getElapsedTime();

    // FPS sampling
    _fpsFrames++;
    const now = performance.now();
    if (now - _fpsLast >= 500) {
      fps = Math.round((_fpsFrames * 1000) / (now - _fpsLast));
      _fpsFrames = 0;
      _fpsLast = now;
    }

    // energy decay
    energy = Math.max(0, energy - 0.02);

    // perf-mode affects rotation speed + particle opacity
    const perf = !!STATE.perfMode;
    const e = energy;

    const coreY = perf ? 0.10 : 0.20;
    const coreX = perf ? 0.06 : 0.11;
    const ringZ = perf ? 0.08 : 0.14;
    const starsY = perf ? 0.01 : 0.02;

    if (coreMat) coreMat.opacity = 0.24 + e * 0.18;
    if (ringMat) ringMat.opacity = 0.18 + e * 0.12;
    if (pMat) pMat.opacity = (perf ? 0.35 : 0.55) + e * 0.18;

    if (!prefersReducedMotion) {
      core.rotation.y = t * (coreY + e * 0.05);
      core.rotation.x = t * (coreX + e * 0.03);
      ring.rotation.z = t * (ringZ + e * 0.04);
      stars.rotation.y = t * (starsY + e * 0.01);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
}

// expose renderer for diagnostics
STATE.renderer = renderer;

// =========================================================
// BUTTON INTERACTIONS (glow inertia + magnet)
// =========================================================
(() => {
  const buttons = document.querySelectorAll(".links a");
  if (!buttons.length) return;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  buttons.forEach((btn) => {
    if (!btn.querySelector(".fx-glow")) {
      const glow = document.createElement("span");
      glow.className = "fx-glow";
      btn.appendChild(glow);
    }

    let tgx = 50, tgy = 50;
    let cgx = 50, cgy = 50;
    let vx = 0, vy = 0;

    let tmx = 0, tmy = 0;
    let cmx = 0, cmy = 0;
    let mvx = 0, mvy = 0;

    const glowStiff = 0.12;
    const glowDamp = 0.85;
    const magStiff = 0.10;
    const magDamp = 0.82;

    const magnetStrength = 10;
    const magnetClamp = 10;

    let hover = false;

    function raf() {
      const dx = tgx - cgx;
      const dy = tgy - cgy;
      vx += dx * glowStiff;
      vy += dy * glowStiff;
      vx *= glowDamp;
      vy *= glowDamp;
      cgx += vx;
      cgy += vy;

      btn.style.setProperty("--mx", cgx.toFixed(2) + "%");
      btn.style.setProperty("--my", cgy.toFixed(2) + "%");

      const mdx = tmx - cmx;
      const mdy = tmy - cmy;
      mvx += mdx * magStiff;
      mvy += mdy * magStiff;
      mvx *= magDamp;
      mvy *= magDamp;
      cmx += mvx;
      cmy += mvy;

      if (hover) {
        btn.style.setProperty("--magX", cmx.toFixed(2) + "px");
        btn.style.setProperty("--magY", cmy.toFixed(2) + "px");
      } else {
        btn.style.setProperty("--magX", "0px");
        btn.style.setProperty("--magY", "0px");
      }

      requestAnimationFrame(raf);
    }
    raf();

    btn.addEventListener("pointerenter", () => { hover = true; });
    btn.addEventListener("pointerleave", () => {
      hover = false;
      tgx = 50; tgy = 50;
      tmx = 0;  tmy = 0;
    });

    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      tgx = ((e.clientX - r.left) / r.width) * 100;
      tgy = ((e.clientY - r.top) / r.height) * 100;

      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;

      const ox = (e.clientX - cx) / (r.width / 2);
      const oy = (e.clientY - cy) / (r.height / 2);

      const px = clamp(ox * magnetStrength, -magnetClamp, magnetClamp);
      const py = clamp(oy * magnetStrength, -magnetClamp, magnetClamp);

      tmx = px;
      tmy = py;
    }, { passive: true });

    btn.addEventListener("pointerdown", () => {
      btn.classList.remove("is-clicked");
      void btn.offsetWidth;
      btn.classList.add("is-clicked");
      setTimeout(() => btn.classList.remove("is-clicked"), 520);
    });

    btn.addEventListener("focus", () => {
      btn.classList.remove("is-focuspulse");
      void btn.offsetWidth;
      btn.classList.add("is-focuspulse");
      setTimeout(() => btn.classList.remove("is-focuspulse"), 700);
    });
  });
})();

// =========================================================
// CARD LIGHTING (cursor-follow)
// =========================================================
(() => {
  const card = document.querySelector(".card");
  if (!card) return;

  const set = (x, y) => {
    card.style.setProperty("--lx", x + "%");
    card.style.setProperty("--ly", y + "%");
  };

  const move = (e) => {
    const r = card.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    set(x.toFixed(2), y.toFixed(2));
  };

  card.addEventListener("pointerenter", move, { passive: true });
  card.addEventListener("pointermove", move, { passive: true });
  card.addEventListener("pointerleave", () => set(50, 35), { passive: true });
})();

// =========================================================
// DIAGNOSTICS — GPU/WebGL/Memory/PerfMode/DPR/LowPower
// =========================================================
async function detectLowPower() {
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const mem = navigator.deviceMemory || null;
  const cores = navigator.hardwareConcurrency || null;

  let batteryHint = false;
  try {
    if (navigator.getBattery) {
      const bat = await navigator.getBattery();
      batteryHint = (!bat.charging && bat.level <= 0.20);
    }
  } catch {}

  if (saveData) return true;
  if (mem && mem <= 4) return true;
  if (cores && cores <= 4) return true;
  if (prefersReducedMotion) return true;
  if (batteryHint) return true;

  return false;
}

let lowPowerCached = null;
detectLowPower().then((v) => (lowPowerCached = v));

function getGLFromRenderer() {
  if (renderer && renderer.getContext) return renderer.getContext();
  return null;
}

function getGPUString(gl) {
  if (!gl) return "Unknown";
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  if (!dbg) return "Blocked / Private";
  const vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL);
  const ren = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
  return `${ren || "Unknown"} (${vendor || "Unknown"})`;
}

function getWebGLString(gl) {
  if (!gl) return "Unknown";
  const is2 =
    typeof WebGL2RenderingContext !== "undefined" &&
    gl instanceof WebGL2RenderingContext;

  const ver = gl.getParameter(gl.VERSION) || "";
  const sl = gl.getParameter(gl.SHADING_LANGUAGE_VERSION) || "";
  return (is2 ? "WebGL2" : "WebGL1") + ` • ${ver} • GLSL ${sl}`;
}

function getMemoryString() {
  const pm = performance && performance.memory;
  if (!pm) return "n/a (browser)";
  const used = pm.usedJSHeapSize / (1024 * 1024);
  const total = pm.totalJSHeapSize / (1024 * 1024);
  const limit = pm.jsHeapSizeLimit / (1024 * 1024);
  return `${used.toFixed(0)}MB / ${total.toFixed(0)}MB (limit ${limit.toFixed(0)}MB)`;
}

function syncDiagnostics(force = false) {
  if (!diagPanel) return;
  if (!force && !diagPanel.classList.contains("open")) return;

  const gl = getGLFromRenderer();

  if (dRenderer) dRenderer.textContent = renderer ? "Three.js" : "—";
  if (dGPU) dGPU.textContent = getGPUString(gl);
  if (dWebGL) dWebGL.textContent = getWebGLString(gl);

  const currentDpr = renderer ? renderer.getPixelRatio() : (window.devicePixelRatio || 1);
  if (dDPR) dDPR.textContent = Number(currentDpr).toFixed(2);

  if (dFPS) dFPS.textContent = fps ? String(fps) : "—";
  if (dMem) dMem.textContent = getMemoryString();

  if (dRM) dRM.textContent = prefersReducedMotion ? "ON" : "OFF";
  if (dLP) dLP.textContent = (lowPowerCached == null) ? "—" : (lowPowerCached ? "ON" : "OFF");
}

// UI wiring
if (diagToggleBtn && diagPanel) {
  diagToggleBtn.addEventListener("click", () => {
    diagPanel.classList.toggle("open");
    syncDiagnostics(true);
  });

  diagClose?.addEventListener("click", () => {
    diagPanel.classList.remove("open");
  });

  // initial values
  if (ambientToggle) {
    const wantAmbient = localStorage.getItem(STORAGE_AMBIENT) === "1";
    ambientToggle.checked = wantAmbient;
    STATE.ambientOn = wantAmbient;
  }
  if (perfModeToggle) {
    perfModeToggle.checked = !!STATE.perfMode;
    document.documentElement.classList.toggle("perf-mode", !!STATE.perfMode);
  }
  if (dprSlider) {
    dprSlider.value = String(STATE.dprLimit ?? 2);
    if (dprSliderVal) dprSliderVal.textContent = Number(dprSlider.value).toFixed(2);
  }

  ambientToggle?.addEventListener("change", (e) => {
    const on = !!e.target.checked;
    const ctx = getAudioCtx();
    if (ctx && ctx.state === "suspended") {
      localStorage.setItem(STORAGE_AMBIENT, on ? "1" : "0");
      STATE.ambientOn = on;
      return;
    }
    setAmbient(on);
  });

  glitchToggle?.addEventListener("change", (e) => {
    const on = !!e.target.checked;
    document.body.classList.toggle("glitch", on);
  });

  perfModeToggle?.addEventListener("change", (e) => {
    const on = !!e.target.checked;
    STATE.perfMode = on;
    document.documentElement.classList.toggle("perf-mode", on);

    // perf mode sets a sane DPR default
    const target = on ? 1.0 : 2.0;
    STATE.dprLimit = target;

    if (dprSlider) dprSlider.value = String(target);
    if (dprSliderVal) dprSliderVal.textContent = target.toFixed(2);

    applyRendererDpr();
    syncDiagnostics(true);
  });

  dprSlider?.addEventListener("input", (e) => {
    const v = Number(e.target.value);
    STATE.dprLimit = v;
    if (dprSliderVal) dprSliderVal.textContent = v.toFixed(2);
    applyRendererDpr();
    syncDiagnostics(true);
  });

  // refresh while open
  setInterval(() => syncDiagnostics(false), 600);
}

// =========================================================
// COMMAND CONSOLE (type LKNZMZD)
// =========================================================
let keyBuffer = "";
window.addEventListener("keydown", (e) => {
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea") return;

  const k = e.key.toUpperCase();
  if (k.length === 1 && /[A-Z0-9]/.test(k)) {
    keyBuffer = (keyBuffer + k).slice(-24);
  } else {
    return;
  }

  if (keyBuffer.endsWith("LKNZMZD")) {
    const open = !consoleEl?.classList.contains("open");
    consoleEl?.classList.toggle("open", open);
    consoleEl?.setAttribute("aria-hidden", open ? "false" : "true");

    document.body.classList.toggle("glitch", open);
    if (glitchToggle) glitchToggle.checked = open;

    if (cmdLog) {
      const line = document.createElement("div");
      line.textContent = open ? "> CONSOLE OPENED" : "> CONSOLE CLOSED";
      cmdLog.appendChild(line);
      cmdLog.scrollTop = cmdLog.scrollHeight;
    }
  }
});

// =========================================================
// BREATHING PULSE LOOP
// =========================================================
function breatheLoop(ts) {
  const t = ts / 1000;
  const p = 0.5 + 0.5 * Math.sin(t * 0.55);
  document.documentElement.style.setProperty("--bgPulse", p.toFixed(3));
  requestAnimationFrame(breatheLoop);
}

// =========================================================
// BOOT
// =========================================================
window.addEventListener("load", async () => {
  requestAnimationFrame(breatheLoop);

  if (shouldSkipIntro()) {
    hideIntroInstant();
  } else {
    await runIdentityFormation();
  }

  // idle micro shake
  setInterval(() => {
    if (prefersReducedMotion) return;
    document.body.classList.add("shake");
    setTimeout(() => document.body.classList.remove("shake"), 120);
  }, 40000);
});

// main.js — LKNZMZD Elite Mechanical Systems Division
import * as THREE from "three";

console.log("LKNZMZD main.js running ✅");
// PWA: Service Worker registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// =========================================================
// GLOBALS
// =========================================================
const $ = (q) => document.querySelector(q);

const introEl = $("#intro");
const morphEl = $("#morphText");
const enableSoundBtn = $("#enableSound");
const skipIntroBtn = $("#skipIntro");

const diagToggle = $("#diagToggle");
const diagPanel = $("#diagPanel");
const diagClose = $("#diagClose");
const glitchToggle = $("#glitchToggle");
const soundToggle = $("#soundToggle");

const consoleEl = $("#console");
const cmdLog = $("#cmdLog");

const prefersReducedMotion =
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const STORAGE_SKIP = "lknzmzd_skip_intro";
const STORAGE_AMBIENT = "lknzmzd_ambient_on";

// background breathing pulse
let breatheT = 0;

// three.js energy surge (0..1)
let energy = 0;

// fps diagnostics
let fps = 0;
let _fpsFrames = 0;
let _fpsLast = performance.now();

// =========================================================
// WEB AUDIO — Servo + clamp + ambient (no external files)
// =========================================================
let audioCtx = null;
let ambientNode = null;
let ambientOn = false;

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

  // gear engage noise
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

  // master
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);

  // sub impact
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

  // metallic clamp "tick"
  const tick = ctx.createOscillator();
  tick.type = "square";
  tick.frequency.setValueAtTime(210, ctx.currentTime);
  tick.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.03);

  const tickEnv = ctx.createGain();
  tickEnv.gain.setValueAtTime(0.001, ctx.currentTime);
  tickEnv.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 0.005);
  tickEnv.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

  // simple echo (delay)
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

  ambientOn = on;
  localStorage.setItem(STORAGE_AMBIENT, on ? "1" : "0");

  if (!on) {
    if (ambientNode) {
      try { ambientNode.stop?.(); } catch {}
      try { ambientNode.disconnect?.(); } catch {}
      ambientNode = null;
    }
    return;
  }

  // industrial ambient loop: filtered noise + slow LFO
  const master = ctx.createGain();
  master.gain.value = 0.06;
  master.connect(ctx.destination);

  // noise buffer loop
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

  // slow LFO to "breathe"
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.06;

  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 60; // mod amount
  lfo.connect(lfoGain);
  lfoGain.connect(lp.frequency);

  src.connect(bp);
  bp.connect(lp);
  lp.connect(master);

  src.start();
  lfo.start();

  ambientNode = {
    stop: () => { src.stop(); lfo.stop(); },
    disconnect: () => { master.disconnect(); }
  };
}

// =========================================================
// INTRO — Ilkin Azimzade → LKNZMZD (drop vowels)
// =========================================================
const FULL_NAME = "ILKIN AZIMZADE";
const TARGET = "LKNZMZD";
const VOWELS = new Set(["A","E","I","O","U"]);

function clearMorph() {
  if (!morphEl) return;
  morphEl.innerHTML = "";
}

function setMorphTextAsSpans(text) {
  clearMorph();
  const frag = document.createDocumentFragment();

  // scanline layer
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
    const x = rect.left + rect.width/2;
    const y = rect.top + rect.height/2;

    sp.style.left = x + "px";
    sp.style.top = y + "px";

    const ang = Math.random() * Math.PI * 2;
    const dist = 24 + Math.random() * 46;
    const sx = Math.cos(ang) * dist;
    const sy = Math.sin(ang) * dist - 18; // upward bias

    sp.style.setProperty("--sx", sx.toFixed(1) + "px");
    sp.style.setProperty("--sy", sy.toFixed(1) + "px");

    document.body.appendChild(sp);
    setTimeout(() => sp.remove(), 560);
  }
}

function computeDropVowels(text) {
  return text.replace(/[AEIOU]/g, "").replace(/\s+/g, " ").trim();
}

async function runIdentityFormation() {
  if (!introEl || !morphEl) return;

  // build initial
  setMorphTextAsSpans(FULL_NAME);

  // small delay (boot feel)
  await wait(520);

  const letters = Array.from(morphEl.querySelectorAll(".ch"));
  // eject vowels only (ignore spaces)
  for (const el of letters) {
    const t = el.textContent.replace("\u00A0"," ");
    if (t !== " " && VOWELS.has(t)) {
      const rect = el.getBoundingClientRect();
      createSparksAtRect(rect, 12);
      el.classList.add("eject");
      await wait(45); // stagger
    }
  }

  // allow ejections to finish
  await wait(520);

  // rebuild into consonant-only, then slide into TARGET alignment
  const consonants = computeDropVowels(FULL_NAME).replaceAll(" ", "");
  // expectation: "LKNMZDZD" vs desired "LKNZMZD" — your brand is LKNZMZD
  // we force final lock to TARGET (doctrine)
  setMorphTextAsSpans(consonants);
  await wait(80);

  // slide/lock into TARGET
  // We do it by replacing content but animating each char in from its old position
  const beforeChars = Array.from(morphEl.querySelectorAll(".ch"));
  const beforeRects = beforeChars.map((c) => c.getBoundingClientRect());
  const containerRect = morphEl.getBoundingClientRect();

  // set final target
  setMorphTextAsSpans(TARGET);
  const afterChars = Array.from(morphEl.querySelectorAll(".ch")).filter(ch => ch.textContent !== "\u00A0");
  const afterRects = afterChars.map((c) => c.getBoundingClientRect());

  // animate from old → new (best-effort mapping by index)
  const n = Math.min(beforeChars.length, afterChars.length);
  for (let i = 0; i < n; i++) {
    const from = beforeRects[i];
    const to = afterRects[i];
    const dx = (from.left + from.width/2) - (to.left + to.width/2);
    const dy = (from.top + from.height/2) - (to.top + to.height/2);

    const ch = afterChars[i];
    ch.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    ch.style.opacity = "0.85";
  }

  // trigger reflow then animate to zero transform
  void morphEl.offsetWidth;
  afterChars.forEach((ch) => {
    ch.style.transition = prefersReducedMotion ? "none" : "transform 520ms cubic-bezier(.12,.92,.18,1), opacity 320ms ease";
    ch.style.transform = "translate3d(0,0,0)";
    ch.style.opacity = "1";
  });

  await wait(prefersReducedMotion ? 0 : 520);

  // scanline + clamp + shake + energy surge
  morphEl.classList.add("scan");
  document.body.classList.add("shake");
  setTimeout(() => document.body.classList.remove("shake"), 300);

  // energy surge for three.js
  energy = 1;

  // clamp sound
  playClampImpact();

  // micro vibration final letters
  morphEl.classList.add("locked");

  await wait(520);

  // hide intro & mark returning user
  localStorage.setItem(STORAGE_SKIP, "1");
  introEl.classList.add("hidden");
}

// helper
function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

// =========================================================
// INTRO CONTROL: skip mode / returning users
// =========================================================
function shouldSkipIntro() {
  const url = new URL(location.href);
  if (url.searchParams.get("intro") === "1") return false; // force intro
  return localStorage.getItem(STORAGE_SKIP) === "1";
}

function hideIntroInstant() {
  if (!introEl) return;
  introEl.classList.add("hidden");
}

if (skipIntroBtn) {
  skipIntroBtn.addEventListener("click", () => {
    localStorage.setItem(STORAGE_SKIP, "1");
    hideIntroInstant();
  });
}

if (enableSoundBtn) {
  enableSoundBtn.addEventListener("click", async () => {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === "suspended") {
      try { await ctx.resume(); } catch {}
    }
    playServoStart();
    enableSoundBtn.textContent = "Sound enabled ✓";
    enableSoundBtn.disabled = true;
    enableSoundBtn.style.opacity = "0.65";
    enableSoundBtn.style.cursor = "default";

    // respect stored ambient preference
    const wantAmbient = localStorage.getItem(STORAGE_AMBIENT) === "1";
    if (wantAmbient) setAmbient(true);
    if (soundToggle) soundToggle.checked = wantAmbient;
  });
}

// boot
window.addEventListener("load", async () => {
  // breathing pulse loop
  requestAnimationFrame(breatheLoop);

  if (shouldSkipIntro()) {
    hideIntroInstant();
  } else {
    await runIdentityFormation();
  }

  // idle servo twitch every ~40s (micro)
  setInterval(() => {
    if (prefersReducedMotion) return;
    document.body.classList.add("shake");
    setTimeout(() => document.body.classList.remove("shake"), 120);
  }, 40000);
});

// =========================================================
// THREE.JS BACKGROUND
// =========================================================
let renderer, scene, camera, core, ring, stars, pMat, coreMat, ringMat;

const canvas = document.getElementById("c");
if (!canvas) {
  console.warn("Canvas #c not found. Three.js background skipped.");
} else {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });

  function getDpr() {
    const dpr = window.devicePixelRatio || 1;
    return Math.min(dpr, 2);
  }

  renderer.setPixelRatio(getDpr());
  renderer.setSize(window.innerWidth, window.innerHeight, false);

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
    const w = window.innerWidth;
    const h = window.innerHeight;

    renderer.setPixelRatio(getDpr());
    renderer.setSize(w, h, false);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", onResize);

  const clock = new THREE.Clock();

  function tick() {
    const t = clock.getElapsedTime();

    // fps sampling for diagnostics
    _fpsFrames++;
    const now = performance.now();
    if (now - _fpsLast >= 500) {
      fps = Math.round((_fpsFrames * 1000) / (now - _fpsLast));
      _fpsFrames = 0;
      _fpsLast = now;
    }

    // energy surge decay
    energy = Math.max(0, energy - 0.03);

    // apply energy to visuals (subtle)
    const e = energy;
    if (coreMat) coreMat.opacity = 0.24 + e * 0.18;
    if (ringMat) ringMat.opacity = 0.18 + e * 0.12;
    if (pMat) pMat.opacity = 0.55 + e * 0.22;

    if (!prefersReducedMotion) {
      core.rotation.y = t * (0.20 + e * 0.06);
      core.rotation.x = t * (0.11 + e * 0.04);
      ring.rotation.z = t * (0.14 + e * 0.05);
      stars.rotation.y = t * (0.02 + e * 0.01);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
}

// =========================================================
// ELITE MECHANICAL BUTTON INTERACTIONS (glow inertia + magnet)
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
    const glowDamp  = 0.85;
    const magStiff  = 0.10;
    const magDamp   = 0.82;

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
// DIAGNOSTICS TOGGLE (fixes your "does nothing" issue)
// =========================================================
function openDiagnostics(open) {
  if (!diagPanel) return;
  diagPanel.classList.toggle("open", open);
  diagPanel.setAttribute("aria-hidden", open ? "false" : "true");
}

if (diagToggle) diagToggle.addEventListener("click", () => openDiagnostics(true));
if (diagClose) diagClose.addEventListener("click", () => openDiagnostics(false));

// fill values
function diagUpdateLoop() {
  const dDpr = $("#dDpr");
  const dFps = $("#dFps");
  const dPrm = $("#dPrm");

  if (dDpr) dDpr.textContent = String(Math.min(window.devicePixelRatio || 1, 2));
  if (dFps) dFps.textContent = fps ? String(fps) : "—";
  if (dPrm) dPrm.textContent = prefersReducedMotion ? "ON" : "OFF";

  requestAnimationFrame(diagUpdateLoop);
}
diagUpdateLoop();

// glitch toggle
if (glitchToggle) {
  glitchToggle.addEventListener("change", () => {
    document.body.classList.toggle("glitch", glitchToggle.checked);
  });
}

// ambient toggle (only works after audio enabled)
if (soundToggle) {
  soundToggle.checked = localStorage.getItem(STORAGE_AMBIENT) === "1";
  soundToggle.addEventListener("change", () => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    setAmbient(soundToggle.checked);
  });
}

// =========================================================
// COMMAND CONSOLE (type LKNZMZD)
// =========================================================
let keyBuffer = "";
window.addEventListener("keydown", (e) => {
  // ignore if typing in an input (not used now, but safe)
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea") return;

  const k = e.key.toUpperCase();
  if (k.length === 1 && /[A-Z0-9]/.test(k)) {
    keyBuffer = (keyBuffer + k).slice(-24);
  } else {
    return;
  }

  if (keyBuffer.endsWith("LKNZMZD")) {
    const open = !consoleEl.classList.contains("open");
    consoleEl.classList.toggle("open", open);
    consoleEl.setAttribute("aria-hidden", open ? "false" : "true");

    // glitch follows console state
    document.body.classList.toggle("glitch", open);
    if (glitchToggle) glitchToggle.checked = open;

    // log
    if (cmdLog) {
      const line = document.createElement("div");
      line.textContent = open ? "> CONSOLE OPENED" : "> CONSOLE CLOSED";
      cmdLog.appendChild(line);
      cmdLog.scrollTop = cmdLog.scrollHeight;
    }
  }
});

// =========================================================
// BREATHING PULSE LOOP (updates CSS var)
// =========================================================
function breatheLoop(ts) {
  // ts is ms
  const t = ts / 1000;
  // slow pulse
  const p = 0.5 + 0.5 * Math.sin(t * 0.55);
  document.documentElement.style.setProperty("--bgPulse", p.toFixed(3));
  requestAnimationFrame(breatheLoop);
}

// main.js
// LKNZMZD — Mechanical loader + subtle servo startup sound + Three.js background
import * as THREE from "three";

console.log("LKNZMZD main.js running ✅");

/* =========================
   1) INTRO LOADER CONTROL
   ========================= */

const introEl = document.getElementById("intro");
const soundBtn =
  document.getElementById("enableSound") ||
  document.getElementById("introSoundBtn") ||
  document.getElementById("introSound") ||
  null;

/**
 * Subtle “servo startup” using WebAudio (no external files).
 * Note: browsers require a user gesture to play sound.
 */
function playServoStart() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();

  // master output (subtle volume)
  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);

  // motor hum
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(70, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(170, ctx.currentTime + 0.18);
  osc.frequency.exponentialRampToValueAtTime(95, ctx.currentTime + 0.55);

  // envelope
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0, ctx.currentTime);
  env.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.03);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.75);

  osc.connect(env);
  env.connect(master);

  // gear “engage” noise burst
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
  noiseGain.gain.setValueAtTime(0.0, ctx.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0.30, ctx.currentTime + 0.01);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);

  osc.start();
  noise.start();
  osc.stop(ctx.currentTime + 0.8);
  noise.stop(ctx.currentTime + 0.13);

  setTimeout(() => ctx.close().catch(() => {}), 1200);
}

if (soundBtn) {
  soundBtn.addEventListener("click", () => {
    playServoStart();
    soundBtn.textContent = "Sound enabled ✓";
    soundBtn.disabled = true;
    soundBtn.style.opacity = "0.65";
    soundBtn.style.cursor = "default";
  });
}

// Hide loader after window load (matches CSS animation ~2.2s)
window.addEventListener("load", () => {
  if (!introEl) return;
  setTimeout(() => {
    introEl.classList.add("hidden");
  }, 2400);
});

/* =========================
   2) THREE.JS BACKGROUND
   ========================= */

const canvas = document.getElementById("c");
if (!canvas) {
  console.warn("Canvas #c not found. Three.js background skipped.");
} else {
  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });

  // Adaptive DPR (keeps it smooth on weaker devices)
  function getDpr() {
    const dpr = window.devicePixelRatio || 1;
    return Math.min(dpr, 2);
  }

  renderer.setPixelRatio(getDpr());
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  // Scene + Camera
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );

  // Slightly closer so the “earth/core” feels bigger
  camera.position.set(0, 0, 6.2);

  // --- “Core” wireframe (your “earth” vibe)
  const coreGeo = new THREE.IcosahedronGeometry(2.85, 4); // bigger + smoother
  const coreMat = new THREE.MeshBasicMaterial({
    wireframe: true,
    transparent: true,
    opacity: 0.24,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  scene.add(core);

  // --- Secondary ring
  const ringGeo = new THREE.TorusGeometry(3.35, 0.03, 12, 260);
  const ringMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.18,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2.2;
  scene.add(ring);

  // --- Particles
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

  const pMat = new THREE.PointsMaterial({
    size: 0.02,
    transparent: true,
    opacity: 0.55,
  });

  const stars = new THREE.Points(pGeo, pMat);
  scene.add(stars);

  // Resize
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    renderer.setPixelRatio(getDpr());
    renderer.setSize(w, h, false);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", onResize);

  // Animate
  const clock = new THREE.Clock();

  // Optional: reduce motion if user prefers reduced motion
  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function tick() {
    const t = clock.getElapsedTime();

    if (!prefersReducedMotion) {
      core.rotation.y = t * 0.20;
      core.rotation.x = t * 0.11;

      ring.rotation.z = t * 0.14;
      stars.rotation.y = t * 0.02;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  tick();
}

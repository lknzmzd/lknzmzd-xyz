// main.js
import * as THREE from "three";

console.log("LKNZMZD background running ✅");

const canvas = document.getElementById("c");

// -------------------- Renderer --------------------
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);

// -------------------- Scene + Camera --------------------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(0, 0, 10);

// -------------------- Materials (subtle, background-friendly) --------------------
const matWire = new THREE.MeshBasicMaterial({
  wireframe: true,
  transparent: true,
  opacity: 0.22,
});

const matSoft = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0.18,
});

const matSolid = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0.28,
});

// -------------------- Core (wire) --------------------
const coreGeo = new THREE.IcosahedronGeometry(4.2, 3);
const core = new THREE.Mesh(coreGeo, matWire);
scene.add(core);

// -------------------- Ring --------------------
const ringGeo = new THREE.TorusGeometry(2.8, 0.02, 10, 220);
const ring = new THREE.Mesh(ringGeo, matSoft);
ring.rotation.x = Math.PI / 2.2;
scene.add(ring);

// -------------------- Stars / Particles --------------------
const COUNT = 1600;
const positions = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  const i3 = i * 3;
  positions[i3 + 0] = (Math.random() - 0.5) * 28;
  positions[i3 + 1] = (Math.random() - 0.5) * 18;
  positions[i3 + 2] = (Math.random() - 0.5) * 28;
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

// -------------------- Robot Builder (simple geometry robot) --------------------
function makeRobot() {
  const g = new THREE.Group();

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), matSolid);
  body.position.y = 0.0;
  g.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.5), matSolid);
  head.position.y = 0.95;
  g.add(head);

  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.45,
  });
  const eyeGeo = new THREE.SphereGeometry(0.06, 10, 10);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.18, 0.98, 0.27);
  eyeR.position.set(0.18, 0.98, 0.27);
  g.add(eyeL, eyeR);

  // Antenna
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 10), matWire);
  ant.position.set(0, 1.33, 0);
  g.add(ant);
  const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), matSoft);
  antTip.position.set(0, 1.52, 0);
  g.add(antTip);

  // Arms (separate groups for animation)
  const armGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18);

  const armL = new THREE.Group();
  const armLMesh = new THREE.Mesh(armGeo, matWire);
  armLMesh.position.y = -0.2;
  armL.add(armLMesh);
  armL.position.set(-0.62, 0.35, 0);
  g.add(armL);

  const armR = new THREE.Group();
  const armRMesh = new THREE.Mesh(armGeo, matWire);
  armRMesh.position.y = -0.2;
  armR.add(armRMesh);
  armR.position.set(0.62, 0.35, 0);
  g.add(armR);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.22, 0.55, 0.22);
  const legL = new THREE.Mesh(legGeo, matWire);
  const legR = new THREE.Mesh(legGeo, matWire);
  legL.position.set(-0.22, -0.95, 0);
  legR.position.set(0.22, -0.95, 0);
  g.add(legL, legR);

  // Store refs for animation
  g.userData = { armL, armR, head };

  return g;
}

// -------------------- Add TWO robots (left + right) --------------------
const robotLeft = makeRobot();
robotLeft.position.set(-7.2, -0.6, -2.0);
robotLeft.scale.setScalar(1.05);
scene.add(robotLeft);

const robotRight = makeRobot();
robotRight.position.set(7.2, -0.6, -2.0);
robotRight.scale.setScalar(1.05);
// mirror a bit so it "faces" inward
robotRight.rotation.y = Math.PI;
scene.add(robotRight);

// -------------------- Resize --------------------
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);

// -------------------- Animate --------------------
const clock = new THREE.Clock();

function animateRobot(robot, t, side = 1) {
  // Float (up/down) + tiny sway
  robot.position.y = -0.6 + Math.sin(t * 1.1 + side) * 0.25;
  robot.rotation.z = Math.sin(t * 0.7 + side) * 0.06;

  // Head nod
  if (robot.userData?.head) {
    robot.userData.head.rotation.y = Math.sin(t * 0.9 + side) * 0.25;
    robot.userData.head.rotation.x = Math.sin(t * 0.6 + side) * 0.12;
  }

  // Arm wave (opposite phase)
  if (robot.userData?.armL && robot.userData?.armR) {
    robot.userData.armL.rotation.z = Math.sin(t * 1.6 + side) * 0.55;
    robot.userData.armR.rotation.z = Math.sin(t * 1.6 + side + Math.PI) * 0.55;
  }
}

function tick() {
  const t = clock.getElapsedTime();

  // Core motion
  core.rotation.y = t * 0.22;
  core.rotation.x = t * 0.12;

  ring.rotation.z = t * 0.15;

  // Stars drift
  stars.rotation.y = t * 0.02;
  stars.rotation.x = t * 0.006;

  // Robots animate
  animateRobot(robotLeft, t, 1);
  animateRobot(robotRight, t, -1);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

tick();

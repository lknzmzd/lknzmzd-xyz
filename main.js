const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const FALLBACK_SYSTEMS = [
  { id: "PL-01", name: "Engineering Lab", layer: "public", type: "Public Layer", status: "ACTIVE", url: "https://www.lknzmzd.com/", description: "Primary project surface for robotics, embedded systems, experiments, and engineering builds.", input: "robotics concepts, hardware builds, project logs", process: "prototype, document, iterate, publish", output: "public engineering archive" },
  { id: "TL-01", name: "TK Service Tool", layer: "tooling", type: "Field Operations Tool", status: "LIVE", url: "https://tkservice.lknzmzd.xyz/", description: "Warehouse robot incident parser and reporting interface for operational teams.", input: "raw incidents, robot IDs, shift logs", process: "parse, classify, validate, export", output: "Feishu-ready TSV + analytics" },
  { id: "AI-01", name: "Instagram AI Manager", layer: "ai", type: "AI Automation Layer", status: "DEV", url: "https://ai.lknzmzd.xyz/", description: "Content generation, image rendering, approval, scheduling, and publishing pipeline.", input: "ideas, prompts, schedules", process: "generate, approve, render, publish", output: "scheduled AI content" },
  { id: "DOC-01", name: "Division Doctrine", layer: "public", type: "Documentation Layer", status: "ACTIVE", url: "./division.html", description: "Operating philosophy and standards behind the LKNZMZD system identity.", input: "principles, constraints, direction", process: "define, compress, enforce", output: "system doctrine" }
];

const ROUTES = {
  lab: "https://www.lknzmzd.com/",
  portfolio: "https://www.lknzmzd.net/",
  tk: "https://tkservice.lknzmzd.xyz/",
  ai: "https://ai.lknzmzd.xyz/",
  noctivis: "https://instagram.com/noctivis.lab",
  doctrine: "./division.html",
  status: "./status.html",
  home: "./index.html"
};

let systems = FALLBACK_SYSTEMS;
let activeFilter = "all";

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

const IDENTITY_FULL_NAME = "ILKIN AZIMZADE";
const IDENTITY_TARGET = "LKNZMZD";
const IDENTITY_VOWELS = new Set(["A", "E", "I", "O", "U"]);
const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function setBootLogoText(text) {
  const logo = $("#bootLogo");
  if (!logo) return [];
  logo.innerHTML = "";

  const fragment = document.createDocumentFragment();
  const scan = document.createElement("span");
  scan.className = "scan-sweep";
  fragment.appendChild(scan);

  for (const character of text) {
    const span = document.createElement("span");
    span.className = "ch";
    span.textContent = character === " " ? "\u00A0" : character;
    if (IDENTITY_VOWELS.has(character)) span.classList.add("vowel");
    fragment.appendChild(span);
  }

  logo.appendChild(fragment);
  return $$(".ch", logo);
}

function createIdentitySparks(element, count = 9) {
  const rect = element.getBoundingClientRect();
  for (let i = 0; i < count; i += 1) {
    const spark = document.createElement("i");
    spark.className = "identity-spark";
    spark.style.left = `${rect.left + rect.width / 2}px`;
    spark.style.top = `${rect.top + rect.height / 2}px`;
    const angle = Math.random() * Math.PI * 2;
    const distance = 18 + Math.random() * 42;
    spark.style.setProperty("--sx", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--sy", `${Math.sin(angle) * distance - 12}px`);
    document.body.appendChild(spark);
    window.setTimeout(() => spark.remove(), 620);
  }
}

async function runIdentityMorph(boot) {
  const logo = $("#bootLogo");
  if (!logo) {
    boot.classList.add("is-hidden");
    document.body.classList.remove("boot-running");
    return;
  }

  document.body.classList.add("boot-running");
  setBootLogoText(IDENTITY_FULL_NAME);
  await wait(900);

  const firstLetters = $$(".ch", logo);
  for (const letter of firstLetters) {
    const text = letter.textContent.replace("\u00A0", " ");
    if (text !== " " && IDENTITY_VOWELS.has(text)) {
      createIdentitySparks(letter, 8);
      letter.classList.add("is-ejected");
      await wait(70);
    }
  }

  await wait(280);

  const beforeLetters = $$(".ch", logo).filter((letter) => !letter.classList.contains("is-ejected") && letter.textContent !== "\u00A0");
  const beforeRects = beforeLetters.map((letter) => letter.getBoundingClientRect());
  const targetLetters = setBootLogoText(IDENTITY_TARGET).filter((letter) => letter.textContent !== "\u00A0");
  const targetRects = targetLetters.map((letter) => letter.getBoundingClientRect());

  targetLetters.forEach((letter, index) => {
    const from = beforeRects[index];
    const to = targetRects[index];
    if (!from || !to) return;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    letter.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    letter.style.opacity = "0.78";
  });

  void logo.offsetWidth;

  targetLetters.forEach((letter) => {
    letter.style.transition = "transform 760ms cubic-bezier(.12,.92,.18,1), opacity 520ms ease";
    letter.style.transform = "translate3d(0,0,0)";
    letter.style.opacity = "1";
  });

  await wait(840);
  logo.classList.add("is-scanning", "is-locked");
  await wait(760);
  boot.classList.add("is-hidden");
  window.setTimeout(() => document.body.classList.remove("boot-running"), 720);
}

function initBoot() {
  const boot = $("#boot");
  if (!boot || prefersReducedMotion()) {
    boot?.classList.add("is-hidden");
    document.body.classList.remove("boot-running");
    return;
  }

  const forceIntro = new URLSearchParams(window.location.search).get("intro") === "1";
  const seen = sessionStorage.getItem("lknzmzd-v23-identity-seen");
  if (seen && !forceIntro) {
    boot.classList.add("is-hidden");
    document.body.classList.remove("boot-running");
    return;
  }

  sessionStorage.setItem("lknzmzd-v23-identity-seen", "1");
  runIdentityMorph(boot).catch(() => {
    boot.classList.add("is-hidden");
    document.body.classList.remove("boot-running");
  });
}

function initCanvas() {
  const canvas = $("#systemCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let frame = 0;
  const lowPower = prefersReducedMotion() || window.innerWidth < 620;
  const count = lowPower ? 42 : 86;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.8);
    width = Math.floor(window.innerWidth);
    height = Math.floor(window.innerHeight);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * (lowPower ? 0.12 : 0.24),
      vy: (Math.random() - 0.5) * (lowPower ? 0.12 : 0.24),
      r: Math.random() * 1.8 + 0.5,
      seed: i * 17.17
    }));
  }

  function drawGrid() {
    const grid = 58;
    ctx.save();
    ctx.strokeStyle = "rgba(120,234,255,0.045)";
    ctx.lineWidth = 1;
    const offset = (frame * 0.08) % grid;
    for (let x = -grid + offset; x < width + grid; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = -grid + offset; y < height + grid; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;
      const glow = 0.24 + Math.sin(frame * 0.018 + p.seed) * 0.12;
      ctx.fillStyle = `rgba(120,234,255,${Math.max(0.08, glow)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(120,234,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 128) {
          ctx.globalAlpha = (1 - dist / 128) * 0.42;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawCore() {
    const cx = width * 0.72;
    const cy = height * 0.45;
    const pulse = 0.5 + Math.sin(frame * 0.025) * 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(frame * 0.002);
    for (let i = 0; i < 4; i++) {
      const r = 72 + i * 34 + pulse * 10;
      ctx.strokeStyle = `rgba(120,234,255,${0.16 - i * 0.025})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI * (0.15 + i * 0.06), Math.PI * (1.45 + i * 0.05));
      ctx.stroke();
    }
    ctx.restore();
  }

  function tick() {
    frame += 1;
    ctx.clearRect(0, 0, width, height);
    drawGrid();
    drawParticles();
    drawCore();
    if (!prefersReducedMotion()) requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  if (!prefersReducedMotion()) requestAnimationFrame(tick);
  else {
    drawGrid();
    drawParticles();
    drawCore();
  }
}

async function loadSystems() {
  try {
    const response = await fetch("./systems.json", { cache: "no-store" });
    if (!response.ok) throw new Error("systems.json not available");
    systems = await response.json();
  } catch (error) {
    systems = FALLBACK_SYSTEMS;
    console.warn("Using fallback systems:", error);
  }
  updateModuleMetric();
}

function updateModuleMetric() {
  const metric = $("#metricModules");
  if (metric) metric.textContent = String(systems.length).padStart(2, "0");
}

function statusClass(status = "") {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createModuleCard(module) {
  const linkEnabled = module.url && module.url !== "#";
  const external = linkEnabled && !module.url.startsWith("./") && !module.url.startsWith("#");
  return `
    <article class="module-card reveal" data-layer="${escapeHtml(module.layer)}">
      <div class="module-meta">
        <span class="module-id">${escapeHtml(module.id)}</span>
        <span class="module-status ${statusClass(module.status)}">${escapeHtml(module.status)}</span>
      </div>
      <div class="module-type">${escapeHtml(module.type)}</div>
      <h3>${escapeHtml(module.name)}</h3>
      <p class="module-desc">${escapeHtml(module.description)}</p>
      <div class="io-flow" aria-label="Input process output flow">
        <div><small>INPUT</small><span>${escapeHtml(module.input)}</span></div>
        <div><small>PROCESS</small><span>${escapeHtml(module.process)}</span></div>
        <div><small>OUTPUT</small><span>${escapeHtml(module.output)}</span></div>
      </div>
      <a class="module-link ${linkEnabled ? "" : "is-disabled"}" href="${escapeHtml(module.url || "#")}" ${external ? 'target="_blank" rel="noreferrer"' : ""}>
        <span>${linkEnabled ? "ENTER MODULE" : "ROUTE PENDING"}</span><span>→</span>
      </a>
    </article>
  `;
}

function renderModules() {
  const grid = $("#moduleGrid");
  if (!grid) return;
  const filtered = systems.filter((module) => activeFilter === "all" || module.layer === activeFilter);
  grid.innerHTML = filtered.map(createModuleCard).join("");
  initReveal();
}

function renderStatusPage() {
  const grid = $("#statusGrid");
  if (!grid) return;
  grid.innerHTML = systems.map((module) => `
    <article class="status-card reveal">
      <div class="module-meta">
        <span class="module-id">${escapeHtml(module.id)}</span>
        <span class="module-status ${statusClass(module.status)}">${escapeHtml(module.status)}</span>
      </div>
      <h3>${escapeHtml(module.name)}</h3>
      <p>${escapeHtml(module.description)}</p>
      <a class="module-link ${module.url && module.url !== "#" ? "" : "is-disabled"}" href="${escapeHtml(module.url || "#")}"><span>${module.url && module.url !== "#" ? "OPEN ROUTE" : "NO PUBLIC ROUTE"}</span><span>→</span></a>
    </article>
  `).join("");
  initReveal();
}

function initFilters() {
  const buttons = $$(".filter-btn");
  if (!buttons.length) return;
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter || "all";
      buttons.forEach((btn) => btn.classList.toggle("active", btn === button));
      renderModules();
    });
  });
}

function initReveal() {
  const items = $$(".reveal:not(.is-visible)");
  if (!items.length) return;
  if (!("IntersectionObserver" in window) || prefersReducedMotion()) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });
  items.forEach((item) => observer.observe(item));
}

function routeTo(key) {
  const url = ROUTES[key];
  if (!url) return false;
  if (url.startsWith("http")) window.open(url, "_blank", "noopener,noreferrer");
  else window.location.href = url;
  return true;
}

function commandHelp() {
  return `
    <div class="command-row"><span><b>open lab</b><br/>Engineering Lab / lknzmzd.com</span><button data-route="lab">RUN</button></div>
    <div class="command-row"><span><b>open portfolio</b><br/>Professional profile route</span><button data-route="portfolio">RUN</button></div>
    <div class="command-row"><span><b>open tk</b><br/>TK Service field tool</span><button data-route="tk">RUN</button></div>
    <div class="command-row"><span><b>open ai</b><br/>Instagram AI Manager</span><button data-route="ai">RUN</button></div>
    <div class="command-row"><span><b>status</b><br/>Open systems status page</span><button data-route="status">RUN</button></div>
    <div class="command-row"><span><b>doctrine</b><br/>Open division doctrine</span><button data-route="doctrine">RUN</button></div>
  `;
}

function runCommand(raw) {
  const output = $("#commandOutput");
  const input = raw.trim().toLowerCase();
  if (!output) return;

  if (!input || input === "help") {
    output.innerHTML = commandHelp();
    wireCommandButtons();
    return;
  }

  const normalized = input.replace(/^open\s+/, "").replace(/^go\s+/, "");
  const alias = {
    lknzmzd: "lab",
    engineering: "lab",
    portfolio: "portfolio",
    cv: "portfolio",
    tkservice: "tk",
    tk: "tk",
    tool: "tk",
    shiftlog: "status",
    ai: "ai",
    instagram: "ai",
    noctivis: "noctivis",
    docs: "doctrine",
    doctrine: "doctrine",
    status: "status",
    home: "home"
  }[normalized];

  if (alias && routeTo(alias)) {
    output.innerHTML = `<p><b>routing</b> — opening <code>${escapeHtml(alias)}</code>...</p>`;
    return;
  }

  if (input === "modules") {
    output.innerHTML = systems.map((m) => `<div class="command-row"><span><b>${escapeHtml(m.id)} / ${escapeHtml(m.name)}</b><br/>${escapeHtml(m.status)} · ${escapeHtml(m.type)}</span><button data-url="${escapeHtml(m.url)}">OPEN</button></div>`).join("");
    wireCommandButtons();
    return;
  }

  output.innerHTML = `<p><b>unknown command</b> — <code>${escapeHtml(input)}</code></p>${commandHelp()}`;
  wireCommandButtons();
}

function wireCommandButtons() {
  $$("#commandOutput [data-route]").forEach((button) => {
    button.addEventListener("click", () => routeTo(button.dataset.route));
  });
  $$("#commandOutput [data-url]").forEach((button) => {
    button.addEventListener("click", () => {
      const url = button.dataset.url;
      if (!url || url === "#") return;
      if (url.startsWith("http")) window.open(url, "_blank", "noopener,noreferrer");
      else window.location.href = url;
    });
  });
}

function initCommandPalette() {
  const dialog = $("#commandDialog");
  const open = $("#openCommand");
  const close = $("#closeCommand");
  const input = $("#commandInput");
  const shortcut = $('[data-command-shortcut="open command"]');
  if (!dialog || !input) return;

  function openDialog() {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    setTimeout(() => input.focus(), 50);
  }
  function closeDialog() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  open?.addEventListener("click", openDialog);
  shortcut?.addEventListener("click", openDialog);
  close?.addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
  document.addEventListener("keydown", (event) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    if ((isMac ? event.metaKey : event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openDialog();
    }
    if (event.key === "/" && document.activeElement === document.body) {
      event.preventDefault();
      openDialog();
    }
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") runCommand(input.value);
  });
  wireCommandButtons();
}

function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (isLocal) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => console.warn("SW registration failed", error));
  });
}

async function init() {
  initBoot();
  initCanvas();
  await loadSystems();
  renderModules();
  renderStatusPage();
  initFilters();
  initReveal();
  initCommandPalette();
  initServiceWorker();
}

init();

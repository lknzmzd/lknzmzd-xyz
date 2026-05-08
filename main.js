const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const FALLBACK_SYSTEMS = [
  { id: "PL-01", name: "Engineering Lab", layer: "public", type: "Public Layer", status: "ACTIVE", url: "https://www.lknzmzd.com/", description: "Primary project surface for robotics, embedded systems, experiments, and engineering builds.", input: "robotics concepts, hardware builds, project logs", process: "prototype, document, iterate, publish", output: "public engineering archive" },
  { id: "TL-01", name: "TK Service Tool", layer: "tooling", type: "Field Operations Tool", status: "LIVE", url: "https://tkservice.lknzmzd.xyz/", description: "Warehouse robot incident parser and reporting interface for operational teams.", input: "raw incidents, robot IDs, shift logs", process: "parse, classify, validate, export", output: "Feishu-ready TSV + analytics" },
  { id: "AI-01", name: "Instagram AI Manager", layer: "ai", type: "AI Automation Layer", status: "DEV", url: "https://ai.lknzmzd.xyz/", description: "Content generation, image rendering, approval, scheduling, and publishing pipeline.", input: "ideas, prompts, schedules", process: "generate, approve, render, publish", output: "scheduled AI content" },
  { id: "SIG-01", name: "LKNZMZD Signals", layer: "public", type: "Signals / Update Layer", status: "ACTIVE", url: "./updates.html", description: "Project updates, release notes, build logs, and subscription intake.", input: "project changes, build logs, field notes", process: "classify, compress, publish", output: "signals feed" },
  { id: "DOC-01", name: "Division Doctrine", layer: "public", type: "Documentation Layer", status: "ACTIVE", url: "./division.html", description: "Operating philosophy and standards behind the LKNZMZD system identity.", input: "principles, constraints, direction", process: "define, compress, enforce", output: "system doctrine" }
];

const FALLBACK_UPDATES = [
  {
    "id": "SIGNAL-000",
    "date": "2026-05-03",
    "type": "RELEASE",
    "module": "LKNZMZD Signals",
    "status": "EMAIL READY",
    "title": "Email Sending Integration V2.7 prepared",
    "summary": "LKNZMZD Signals now includes Resend email integration, test sends, controlled broadcasts, campaign logs, delivery logs, and tokenized unsubscribe links in every email.",
    "tags": [
      "SYSTEM",
      "RELEASE",
      "EMAIL"
    ]
  },
  {
    "id": "SIGNAL-002",
    "date": "2026-05-03",
    "type": "RELEASE",
    "module": "LKNZMZD.XYZ",
    "status": "LIVE",
    "title": "V2.3 identity intro deployed",
    "summary": "The opening sequence restores the ILKIN AZIMZADE \u2192 LKNZMZD identity compression without box framing or messy background text.",
    "tags": [
      "SYSTEM",
      "IDENTITY",
      "FRONTEND"
    ]
  },
  {
    "id": "SIGNAL-003",
    "date": "2026-05-02",
    "type": "TOOLING",
    "module": "ShiftLog",
    "status": "DEV",
    "title": "ShiftLog production hardening branch started",
    "summary": "The work-log system moved toward stronger API routes, dashboard summaries, reporting, export flow, templates, and work-day reliability.",
    "tags": [
      "TOOLING",
      "OPERATIONS",
      "SHIFTLOG"
    ]
  },
  {
    "id": "SIGNAL-004",
    "date": "2026-05-01",
    "type": "FIELD OPS",
    "module": "TK Service Tool",
    "status": "LIVE",
    "title": "TK Service reporting layer separated from experiments",
    "summary": "Production and test surfaces are treated separately so warehouse teams can keep using the stable parser while new reporting features are tested safely.",
    "tags": [
      "FIELD OPS",
      "WAREHOUSE",
      "ROBOTICS"
    ]
  },
  {
    "id": "SIGNAL-005",
    "date": "2026-04-29",
    "type": "AI",
    "module": "Instagram AI Manager",
    "status": "DEV",
    "title": "Automation worker moved toward scheduled publishing discipline",
    "summary": "The content pipeline continues toward reliable generation, approval, render, queue, retry, and publish slots instead of one-off assisted chaos.",
    "tags": [
      "AI",
      "AUTOMATION",
      "CONTENT"
    ]
  },
  {
    "id": "SIGNAL-006",
    "date": "2026-04-25",
    "type": "SYSTEM",
    "module": "Obsidian AI Bridge",
    "status": "PROTOTYPE",
    "title": "Obsidian Brain V16 direction defined",
    "summary": "The vault architecture shifted toward an auto-processing agent layer that can ingest, classify, route, and retrieve project intelligence.",
    "tags": [
      "MEMORY",
      "OBSIDIAN",
      "AI"
    ]
  },
  {
    "id": "SIGNAL-007",
    "date": "2026-04-18",
    "type": "ROBOTICS",
    "module": "Observer / Robotics Layer",
    "status": "ACTIVE",
    "title": "Robotics projects promoted into system modules",
    "summary": "Observer, InMoov, compact robot concepts, and smart chess board direction are positioned as physical execution layers of the LKNZMZD ecosystem.",
    "tags": [
      "ROBOTICS",
      "HARDWARE",
      "SYSTEMS"
    ]
  },
  {
    "id": "SIGNAL-008",
    "date": "2026-04-01",
    "type": "LAB",
    "module": "Noctivis Lab",
    "status": "ACTIVE",
    "title": "Dark visual experiment stream initialized",
    "summary": "Noctivis Lab begins operating as an experimental visual layer for cinematic AI loops, abstract identity systems, and short-form media tests.",
    "tags": [
      "LAB",
      "VISUAL",
      "EXPERIMENT"
    ]
  }
];

const ROUTES = {
  lab: "https://www.lknzmzd.com/",
  portfolio: "https://www.lknzmzd.net/",
  tk: "https://tkservice.lknzmzd.xyz/",
  ai: "https://ai.lknzmzd.xyz/",
  noctivis: "https://instagram.com/noctivis.lab",
  doctrine: "./division.html",
  status: "./status.html",
  updates: "./updates.html",
  signals: "./updates.html",
  subscribe: "./subscribe.html",
  unsubscribe: "./unsubscribe.html",
  admin: "./admin.html",
  home: "./index.html"
};

const SIGNALS_ENDPOINT = document.querySelector('meta[name="signals-endpoint"]')?.getAttribute("content")?.trim() || "https://signals.lknzmzd.xyz/subscribe";
const SIGNALS_BASE = document.querySelector('meta[name="signals-base"]')?.getAttribute("content")?.trim() || SIGNALS_ENDPOINT.replace(/\/subscribe\/?$/, "");
const UNSUBSCRIBE_ENDPOINT = `${SIGNALS_BASE}/unsubscribe`;
const SIGNALS_COUNT_ENDPOINT = `${SIGNALS_BASE}/count`;
const ADMIN_COUNTS_ENDPOINT = `${SIGNALS_BASE}/admin/counts`;
const ADMIN_EXPORT_ENDPOINT = `${SIGNALS_BASE}/admin/export`;
const ADMIN_EMAIL_STATUS_ENDPOINT = `${SIGNALS_BASE}/admin/email/status`;
const ADMIN_EMAIL_TEST_ENDPOINT = `${SIGNALS_BASE}/admin/email/test`;
const ADMIN_EMAIL_BROADCAST_ENDPOINT = `${SIGNALS_BASE}/admin/email/broadcast`;
const ADMIN_CAMPAIGNS_ENDPOINT = `${SIGNALS_BASE}/admin/campaigns`;
const SIGNALS_CONTACT_EMAIL = "ilkinazimzade@lknzmzd.com";

let systems = FALLBACK_SYSTEMS;
let updates = FALLBACK_UPDATES;
let activeFilter = "all";
let activeSignalFilter = "all";

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
  const seen = sessionStorage.getItem("lknzmzd-v24-identity-seen");
  if (seen && !forceIntro) {
    boot.classList.add("is-hidden");
    document.body.classList.remove("boot-running");
    return;
  }

  sessionStorage.setItem("lknzmzd-v24-identity-seen", "1");
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

async function loadUpdates() {
  try {
    const response = await fetch("./updates.json", { cache: "no-store" });
    if (!response.ok) throw new Error("updates.json not available");
    updates = await response.json();
  } catch (error) {
    updates = FALLBACK_UPDATES;
    console.warn("Using fallback updates:", error);
  }
}

function updateModuleMetric() {
  const metric = $("#metricModules");
  if (metric) metric.textContent = String(systems.length).padStart(2, "0");
}

function statusClass(status = "") {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function signalTypeClass(type = "") {
  return type.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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
  grid.innerHTML = systems.map((module) => {
    const external = module.url && module.url !== "#" && !module.url.startsWith("./") && !module.url.startsWith("#");
    return `
      <article class="status-card reveal">
        <div class="module-meta">
          <span class="module-id">${escapeHtml(module.id)}</span>
          <span class="module-status ${statusClass(module.status)}">${escapeHtml(module.status)}</span>
        </div>
        <h3>${escapeHtml(module.name)}</h3>
        <p>${escapeHtml(module.description)}</p>
        <a class="module-link ${module.url && module.url !== "#" ? "" : "is-disabled"}" href="${escapeHtml(module.url || "#")}" ${external ? 'target="_blank" rel="noreferrer"' : ""}><span>${module.url && module.url !== "#" ? "OPEN ROUTE" : "NO PUBLIC ROUTE"}</span><span>→</span></a>
      </article>
    `;
  }).join("");
  initReveal();
}

function createSignalCard(signal, compact = false) {
  const tags = Array.isArray(signal.tags) ? signal.tags : [];
  return `
    <article class="signal-card reveal ${compact ? "compact" : ""}" data-signal-type="${signalTypeClass(signal.type)}">
      <div class="signal-topline">
        <span class="signal-id">${escapeHtml(signal.id)}</span>
        <span class="signal-status ${statusClass(signal.status)}">${escapeHtml(signal.status)}</span>
      </div>
      <div class="signal-date"><time datetime="${escapeHtml(signal.date)}">${escapeHtml(signal.date)}</time> · ${escapeHtml(signal.type)} · ${escapeHtml(signal.module)}</div>
      <h3>${escapeHtml(signal.title)}</h3>
      <p>${escapeHtml(signal.summary)}</p>
      <div class="signal-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    </article>
  `;
}

function renderHomeSignals() {
  const list = $("#homeSignals");
  if (!list) return;
  list.innerHTML = updates.slice(0, 4).map((signal) => createSignalCard(signal, true)).join("");
  initReveal();
}

function renderUpdatesPage() {
  const grid = $("#updatesGrid");
  if (!grid) return;
  const filtered = updates.filter((signal) => activeSignalFilter === "all" || signalTypeClass(signal.type) === activeSignalFilter || (signal.tags || []).some((tag) => signalTypeClass(tag) === activeSignalFilter));
  grid.innerHTML = filtered.map((signal) => createSignalCard(signal)).join("");
  const count = $("#signalsCount");
  if (count) count.textContent = String(filtered.length).padStart(2, "0");
  initReveal();
}

function initSignalFilters() {
  const buttons = $$(".signal-filter-btn");
  if (!buttons.length) return;
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      activeSignalFilter = button.dataset.signalFilter || "all";
      buttons.forEach((btn) => btn.classList.toggle("active", btn === button));
      renderUpdatesPage();
    });
  });
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
    <div class="command-row"><span><b>signals</b><br/>Open updates and build signals</span><button data-route="signals">RUN</button></div>
    <div class="command-row"><span><b>subscribe</b><br/>Open Signals intake surface</span><button data-route="subscribe">RUN</button></div>
    <div class="command-row"><span><b>unsubscribe</b><br/>Open Signals removal surface</span><button data-route="unsubscribe">RUN</button></div>
    <div class="command-row"><span><b>admin</b><br/>Open protected subscriber control</span><button data-route="admin">RUN</button></div>
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
    lab: "lab",
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
    update: "signals",
    updates: "signals",
    signal: "signals",
    signals: "signals",
    subscribe: "subscribe",
    subscription: "subscribe",
    unsubscribe: "unsubscribe",
    remove: "unsubscribe",
    admin: "admin",
    control: "admin",
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

  if (input === "latest" || input === "feed") {
    output.innerHTML = updates.slice(0, 5).map((s) => `<div class="command-row"><span><b>${escapeHtml(s.id)} / ${escapeHtml(s.title)}</b><br/>${escapeHtml(s.date)} · ${escapeHtml(s.type)} · ${escapeHtml(s.module)}</span><button data-route="signals">VIEW</button></div>`).join("");
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

function initSubscribeForm() {
  const form = $("#subscribeForm");
  const output = $("#subscribeOutput");
  if (!form || !output) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const interests = formData.getAll("interests").map(String);
    const honeypot = String(formData.get("company") || "").trim();
    const consent = formData.get("consent") === "yes";
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : "Subscribe to Signals";

    function setButtonLoading(isLoading) {
      if (!submitButton) return;
      submitButton.disabled = isLoading;
      submitButton.classList.toggle("is-loading", isLoading);
      submitButton.textContent = isLoading ? "Submitting..." : originalButtonText;
    }

    if (honeypot) {
      output.innerHTML = `<p class="form-error">Bot check failed. Submission ignored.</p>`;
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      output.innerHTML = `<p class="form-error">Invalid email format. Check the address and try again.</p>`;
      return;
    }

    if (!consent) {
      output.innerHTML = `<p class="form-error">Consent is required before storing this subscription request.</p>`;
      return;
    }

    const payload = {
      email,
      interests: interests.length ? interests : ["All Updates"],
      source: "lknzmzd.xyz/v2.7.1-signals",
      consent_version: "signals-v1",
      referrer: document.referrer || "direct",
      created_at: new Date().toISOString()
    };

    if (SIGNALS_ENDPOINT) {
      try {
        output.innerHTML = `<p class="form-pending">Activating signal subscription...</p>`;
        setButtonLoading(true);

        const response = await fetch(SIGNALS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.ok === false) {
          throw new Error(result.error || `Endpoint returned ${response.status}`);
        }

        const mode = result.mode || "subscribe";
        const duplicate = Boolean(result.duplicate);

        let title = "Signal access confirmed.";
        let detail = "Your subscription is active. A confirmation email has been sent — check your inbox, and if needed, your spam or promotions folder.";

        if (mode === "resubscribe") {
          title = "Signal access reactivated.";
          detail = "Your subscription is active again. A confirmation email has been sent — check your inbox, and if needed, your spam or promotions folder.";
        }

        if (duplicate || mode === "update") {
          title = "Subscription preferences updated.";
          detail = "This email was already subscribed, so the selected signal channels were updated. If you recently subscribed, check the confirmation email already sent to your inbox or spam/promotions folder.";
        }

        output.innerHTML = `
          <div class="form-success">
            <p><b>${escapeHtml(title)}</b> ${escapeHtml(detail)}</p>
            <div class="success-actions">
              <a href="./updates.html">Open Signals Archive</a>
              <a href="./index.html">Return to Gateway</a>
              <a href="./unsubscribe.html">Unsubscribe Control</a>
            </div>
          </div>
        `;

        form.reset();

        const allUpdates = form.querySelector('input[name="interests"][value="All Updates"]');
        if (allUpdates) allUpdates.checked = true;

        const consentBox = form.querySelector('input[name="consent"]');
        if (consentBox) consentBox.checked = false;

        return;
      } catch (error) {
        output.innerHTML = `
          <p class="form-error">
            Subscription endpoint failed: ${escapeHtml(error.message || "unknown error")}.
            Try again in a few minutes. If it still fails, contact ${escapeHtml(SIGNALS_CONTACT_EMAIL)}.
          </p>
        `;
      } finally {
        setButtonLoading(false);
      }
    }

    const existing = JSON.parse(localStorage.getItem("lknzmzd-signal-intake") || "[]");
    existing.push(payload);
    localStorage.setItem("lknzmzd-signal-intake", JSON.stringify(existing.slice(-25)));

    const subject = encodeURIComponent("LKNZMZD Signals subscription request");
    const body = encodeURIComponent(`Subscribe request\n\nEmail: ${payload.email}\nInterests: ${payload.interests.join(", ")}\nSource: ${payload.source}\nCreated: ${payload.created_at}`);
    const mailto = `mailto:${SIGNALS_CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    output.innerHTML = `
      <p class="form-error"><b>Live intake is unavailable.</b> Use the fallback link below to send the subscription request manually.</p>
      <a class="module-link subscribe-mailto" href="${mailto}"><span>SEND SUBSCRIPTION REQUEST</span><span>→</span></a>
    `;
  });
}

function initUnsubscribeForm() {
  const form = $("#unsubscribeForm");
  const output = $("#unsubscribeOutput");
  if (!form || !output) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const token = String(formData.get("token") || "").trim();
    const submitButton = form.querySelector('button[type="submit"]');

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      output.innerHTML = `<p class="form-error">Invalid email format. Fix the input before sending unsubscribe request.</p>`;
      return;
    }

    try {
      output.innerHTML = `<p class="form-pending">Transmitting unsubscribe request...</p>`;
      if (submitButton) submitButton.disabled = true;
      const response = await fetch(UNSUBSCRIBE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, source: "lknzmzd.xyz/unsubscribe" })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.error || `Endpoint returned ${response.status}`);
      output.innerHTML = `<p class="form-success"><b>Unsubscribe request accepted.</b> Status: <code>${escapeHtml(result.status || "unsubscribed")}</code>.</p>`;
      form.reset();
    } catch (error) {
      output.innerHTML = `<p class="form-error">Unsubscribe failed: ${escapeHtml(error.message || "unknown error")}. Email ${SIGNALS_CONTACT_EMAIL} if the issue continues.</p>`;
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function initAdminPanel() {
  const form = $("#adminForm");
  const output = $("#adminOutput");
  const countsBtn = $("#adminLoadCounts");
  const csvBtn = $("#adminExportCsv");
  const jsonBtn = $("#adminExportJson");
  const emailStatusBtn = $("#adminEmailStatus");
  const sendTestBtn = $("#adminSendTest");
  const sendBroadcastBtn = $("#adminSendBroadcast");
  const campaignsBtn = $("#adminLoadCampaigns");
  if (!form || !output) return;

  const getForm = () => new FormData(form);
  const getToken = () => String(getForm().get("adminToken") || "").trim();
  const headers = () => ({ Authorization: `Bearer ${getToken()}` });
  const jsonHeaders = () => ({ ...headers(), "Content-Type": "application/json" });

  async function requireToken() {
    if (!getToken()) throw new Error("Admin token is required.");
  }

  function getEmailPayload(mode = "test") {
    const data = getForm();
    return {
      to: String(data.get("testTo") || "").trim(),
      subject: String(data.get("emailSubject") || "").trim(),
      title: String(data.get("emailTitle") || "").trim(),
      preheader: String(data.get("emailPreheader") || "").trim(),
      body_text: String(data.get("emailBody") || "").trim(),
      cta_url: String(data.get("ctaUrl") || "https://lknzmzd.xyz/updates.html").trim(),
      cta_label: String(data.get("ctaLabel") || "Open Signals Feed").trim(),
      limit: Number(data.get("broadcastLimit") || 50),
      confirm: mode === "broadcast" ? String(data.get("broadcastConfirm") || "").trim() : undefined,
      status: "active"
    };
  }

  countsBtn?.addEventListener("click", async () => {
    try {
      await requireToken();
      output.innerHTML = `<p class="form-pending">Loading subscriber counts...</p>`;
      const response = await fetch(ADMIN_COUNTS_ENDPOINT, { headers: headers() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.error || `Endpoint returned ${response.status}`);
      const counts = result.counts || {};
      output.innerHTML = `
        <div class="admin-count-grid">
          <div><span>ACTIVE</span><strong>${Number(counts.active || 0)}</strong></div>
          <div><span>UNSUB</span><strong>${Number(counts.unsubscribed || 0)}</strong></div>
          <div><span>BOUNCED</span><strong>${Number(counts.bounced || 0)}</strong></div>
          <div><span>TOTAL</span><strong>${Number(counts.total || 0)}</strong></div>
        </div>
        <p class="form-note">Generated: ${escapeHtml(result.generated_at || new Date().toISOString())}</p>
      `;
    } catch (error) {
      output.innerHTML = `<p class="form-error">Admin count failed: ${escapeHtml(error.message || "unknown error")}</p>`;
    }
  });

  csvBtn?.addEventListener("click", async () => {
    try {
      await requireToken();
      output.innerHTML = `<p class="form-pending">Preparing CSV export...</p>`;
      const response = await fetch(`${ADMIN_EXPORT_ENDPOINT}?format=csv&status=active`, { headers: headers() });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Endpoint returned ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lknzmzd-signals-active-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      output.innerHTML = `<p class="form-success"><b>CSV export generated.</b> Active subscriber file downloaded.</p>`;
    } catch (error) {
      output.innerHTML = `<p class="form-error">CSV export failed: ${escapeHtml(error.message || "unknown error")}</p>`;
    }
  });

  jsonBtn?.addEventListener("click", async () => {
    try {
      await requireToken();
      output.innerHTML = `<p class="form-pending">Loading JSON preview...</p>`;
      const response = await fetch(`${ADMIN_EXPORT_ENDPOINT}?format=json&status=all`, { headers: headers() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.error || `Endpoint returned ${response.status}`);
      output.innerHTML = `<pre class="admin-json">${escapeHtml(JSON.stringify(result, null, 2))}</pre>`;
    } catch (error) {
      output.innerHTML = `<p class="form-error">JSON preview failed: ${escapeHtml(error.message || "unknown error")}</p>`;
    }
  });

  emailStatusBtn?.addEventListener("click", async () => {
    try {
      await requireToken();
      output.innerHTML = `<p class="form-pending">Checking email provider configuration...</p>`;
      const response = await fetch(ADMIN_EMAIL_STATUS_ENDPOINT, { headers: headers() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.error || `Endpoint returned ${response.status}`);
      output.innerHTML = `
        <div class="email-status-grid">
          <div><span>PROVIDER</span><strong>${escapeHtml(result.provider || "unknown")}</strong></div>
          <div><span>SENDING</span><strong>${result.sending_enabled ? "ENABLED" : "DISABLED"}</strong></div>
          <div><span>DRY RUN</span><strong>${result.dry_run ? "YES" : "NO"}</strong></div>
          <div><span>RESEND KEY</span><strong>${result.resend_configured ? "SET" : "MISSING"}</strong></div>
        </div>
        <p class="form-note">Public base: <code>${escapeHtml(result.public_base || SIGNALS_BASE)}</code></p>
      `;
    } catch (error) {
      output.innerHTML = `<p class="form-error">Email status failed: ${escapeHtml(error.message || "unknown error")}</p>`;
    }
  });

  sendTestBtn?.addEventListener("click", async () => {
    try {
      await requireToken();
      const payload = getEmailPayload("test");
      if (!/^\S+@\S+\.\S+$/.test(payload.to)) throw new Error("Valid test recipient is required.");
      output.innerHTML = `<p class="form-pending">Sending test email...</p>`;
      const response = await fetch(ADMIN_EMAIL_TEST_ENDPOINT, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.error || `Endpoint returned ${response.status}`);
      output.innerHTML = `<p class="form-success"><b>Test email ${escapeHtml(result.mode || "sent")}.</b> Campaign: <code>${escapeHtml(result.campaign_id || "n/a")}</code></p>`;
    } catch (error) {
      output.innerHTML = `<p class="form-error">Test send failed: ${escapeHtml(error.message || "unknown error")}</p>`;
    }
  });

  sendBroadcastBtn?.addEventListener("click", async () => {
    try {
      await requireToken();
      const payload = getEmailPayload("broadcast");
      if (payload.confirm !== "SEND_LKNZMZD_SIGNAL") throw new Error("Broadcast confirmation phrase must be SEND_LKNZMZD_SIGNAL.");
      output.innerHTML = `<p class="form-pending">Broadcast request accepted. Sending to active subscribers...</p>`;
      const response = await fetch(ADMIN_EMAIL_BROADCAST_ENDPOINT, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.error || `Endpoint returned ${response.status}`);
      output.innerHTML = `<p class="form-success"><b>Broadcast ${escapeHtml(result.mode || "completed")}.</b> Target: ${Number(result.target_count || 0)}, sent: ${Number(result.sent_count || 0)}, failed: ${Number(result.failed_count || 0)}. Campaign: <code>${escapeHtml(result.campaign_id || "n/a")}</code></p>`;
    } catch (error) {
      output.innerHTML = `<p class="form-error">Broadcast failed: ${escapeHtml(error.message || "unknown error")}</p>`;
    }
  });

  campaignsBtn?.addEventListener("click", async () => {
    try {
      await requireToken();
      output.innerHTML = `<p class="form-pending">Loading campaign logs...</p>`;
      const response = await fetch(`${ADMIN_CAMPAIGNS_ENDPOINT}?limit=20`, { headers: headers() });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok === false) throw new Error(result.error || `Endpoint returned ${response.status}`);
      output.innerHTML = `<pre class="admin-json">${escapeHtml(JSON.stringify(result, null, 2))}</pre>`;
    } catch (error) {
      output.innerHTML = `<p class="form-error">Campaign fetch failed: ${escapeHtml(error.message || "unknown error")}</p>`;
    }
  });
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
  await Promise.all([loadSystems(), loadUpdates()]);
  renderModules();
  renderStatusPage();
  renderHomeSignals();
  renderUpdatesPage();
  initFilters();
  initSignalFilters();
  initSubscribeForm();
  initUnsubscribeForm();
  initAdminPanel();
  initReveal();
  initCommandPalette();
  initServiceWorker();
}

init();

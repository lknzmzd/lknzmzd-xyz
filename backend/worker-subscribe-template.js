// LKNZMZD Signals — Cloudflare Worker subscription endpoint
// V2.5 target endpoint: https://signals.lknzmzd.xyz/subscribe
// Deploy this as a Worker, bind it to the signals.lknzmzd.xyz custom domain, then run the SQL schema in Supabase.

const DEFAULT_ALLOWED_ORIGINS = [
  "https://lknzmzd.xyz",
  "https://www.lknzmzd.xyz"
];

const ALLOWED_INTERESTS = new Set([
  "Robotics",
  "AI Systems",
  "Tools",
  "Field Engineering",
  "Build Logs",
  "All Updates"
]);

function getAllowedOrigins(env) {
  const raw = env.ALLOWED_ORIGINS || "";
  const extra = raw.split(",").map((x) => x.trim()).filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]);
}

function getCorsHeaders(request, env) {
  const allowed = getAllowedOrigins(env);
  const origin = request.headers.get("origin") || "";
  const allowOrigin = allowed.has(origin) ? origin : DEFAULT_ALLOWED_ORIGINS[0];

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}

function json(data, status = 200, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...getCorsHeaders(request, env)
    }
  });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

function cleanInterests(value) {
  const incoming = Array.isArray(value) ? value : ["All Updates"];
  const clean = incoming.map((x) => String(x).trim()).filter((x) => ALLOWED_INTERESTS.has(x));
  return clean.length ? [...new Set(clean)] : ["All Updates"];
}

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildIpHash(request, env) {
  if (!env.IP_HASH_SECRET) return null;
  const ip = request.headers.get("cf-connecting-ip") || "";
  if (!ip) return null;
  return sha256Hex(`${env.IP_HASH_SECRET}:${ip}`);
}

async function verifyTurnstileIfConfigured(payload, request, env) {
  if (!env.TURNSTILE_SECRET_KEY) return { ok: true, skipped: true };

  const token = String(payload.turnstileToken || payload.cf_turnstile_response || "").trim();
  if (!token) return { ok: false, error: "Turnstile token missing" };

  const formData = new FormData();
  formData.append("secret", env.TURNSTILE_SECRET_KEY);
  formData.append("response", token);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) formData.append("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData
  });
  const result = await response.json().catch(() => ({}));
  if (!result.success) return { ok: false, error: "Turnstile verification failed", detail: result["error-codes"] || [] };
  return { ok: true };
}

async function supabaseFetch(env, path, options = {}) {
  const supabaseUrl = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Worker environment is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": serviceRoleKey,
      "authorization": `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
}

async function handleSubscribe(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigins = getAllowedOrigins(env);
  if (origin && !allowedOrigins.has(origin)) {
    return json({ ok: false, error: "Origin not allowed" }, 403, request, env);
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 12000) {
    return json({ ok: false, error: "Payload too large" }, 413, request, env);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400, request, env);
  }

  // Honeypot field. Real humans never fill this invisible field.
  if (String(payload.company || "").trim()) {
    return json({ ok: true, ignored: true }, 200, request, env);
  }

  const turnstile = await verifyTurnstileIfConfigured(payload, request, env);
  if (!turnstile.ok) return json({ ok: false, error: turnstile.error, detail: turnstile.detail || null }, 400, request, env);

  const email = normalizeEmail(payload.email);
  if (!isValidEmail(email)) {
    return json({ ok: false, error: "Invalid email" }, 400, request, env);
  }

  const interests = cleanInterests(payload.interests);
  const ipHash = await buildIpHash(request, env);
  const now = new Date().toISOString();
  const source = String(payload.source || "lknzmzd.xyz").slice(0, 120);
  const referrer = String(payload.referrer || request.headers.get("referer") || "").slice(0, 300);
  const userAgent = String(request.headers.get("user-agent") || "").slice(0, 300);
  const consentVersion = String(payload.consent_version || "signals-v1").slice(0, 60);

  const subscriberBody = {
    email,
    interests,
    source,
    referrer,
    user_agent: userAgent,
    ip_hash: ipHash,
    consent_version: consentVersion,
    status: "active",
    subscribed_at: now,
    unsubscribed_at: null,
    updated_at: now
  };

  const upsert = await supabaseFetch(env, "lknzmzd_signal_subscribers?on_conflict=email", {
    method: "POST",
    headers: { "prefer": "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(subscriberBody)
  });

  if (!upsert.ok) {
    const detail = await upsert.text();
    return json({ ok: false, error: "Supabase subscriber upsert failed", detail }, 500, request, env);
  }

  const rows = await upsert.json().catch(() => []);
  const subscriber = Array.isArray(rows) ? rows[0] : null;

  await supabaseFetch(env, "lknzmzd_signal_subscription_events", {
    method: "POST",
    headers: { "prefer": "return=minimal" },
    body: JSON.stringify({
      subscriber_id: subscriber?.id || null,
      email,
      event_type: "subscribe",
      source,
      ip_hash: ipHash,
      metadata: {
        interests,
        referrer,
        consent_version: consentVersion,
        turnstile: turnstile.skipped ? "not_configured" : "verified"
      }
    })
  }).catch(() => null);

  return json({ ok: true, status: "active", subscriber_id: subscriber?.id || null }, 200, request, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: getCorsHeaders(request, env) });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, service: "lknzmzd-signals-worker", version: "2.5.0" }, 200, request, env);
    }

    if (url.pathname === "/subscribe" && request.method === "POST") {
      return handleSubscribe(request, env);
    }

    return json({ ok: false, error: "Not found" }, 404, request, env);
  }
};

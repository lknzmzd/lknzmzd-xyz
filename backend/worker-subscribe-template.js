// LKNZMZD Signals — Cloudflare Worker subscription + control + email endpoint
// V2.7 target domain: https://signals.lknzmzd.xyz
// Email provider: Resend REST API by default.
// Endpoints:
//   GET  /health
//   GET  /count
//   POST /subscribe
//   POST /unsubscribe
//   GET  /unsubscribe?email=...&token=...
//   GET  /admin/counts              Authorization: Bearer <ADMIN_TOKEN>
//   GET  /admin/export?format=csv   Authorization: Bearer <ADMIN_TOKEN>
//   GET  /admin/subscribers         Authorization: Bearer <ADMIN_TOKEN>
//   GET  /admin/campaigns           Authorization: Bearer <ADMIN_TOKEN>
//   GET  /admin/email/status        Authorization: Bearer <ADMIN_TOKEN>
//   POST /admin/email/test          Authorization: Bearer <ADMIN_TOKEN>
//   POST /admin/email/broadcast     Authorization: Bearer <ADMIN_TOKEN>

const VERSION = "2.7.0";

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

const ALLOWED_STATUSES = new Set(["active", "unsubscribed", "bounced", "blocked", "all"]);
const CAMPAIGN_STATUSES = new Set(["draft", "test", "sending", "sent", "failed", "dry_run"]);
const DELIVERY_STATUSES = new Set(["queued", "sent", "failed", "dry_run"]);

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
    "access-control-allow-headers": "content-type, authorization, x-admin-token",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}

function json(data, status = 200, request, env, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...getCorsHeaders(request, env),
      ...extraHeaders
    }
  });
}

function html(markup, status = 200, request, env) {
  return new Response(markup, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      ...getCorsHeaders(request, env)
    }
  });
}

function text(data, status = 200, request, env, extraHeaders = {}) {
  return new Response(data, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      ...getCorsHeaders(request, env),
      ...extraHeaders
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

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
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

async function getSubscriberByEmail(env, email) {
  const response = await supabaseFetch(env, `lknzmzd_signal_subscribers?email=eq.${encodeURIComponent(email)}&select=id,email,status,interests,unsubscribe_token,created_at,subscribed_at,unsubscribed_at&limit=1`, {
    method: "GET"
  });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function ensureUnsubscribeToken(env, subscriber) {
  if (subscriber.unsubscribe_token) return subscriber;
  const token = randomToken();
  const response = await supabaseFetch(env, `lknzmzd_signal_subscribers?id=eq.${encodeURIComponent(subscriber.id)}`, {
    method: "PATCH",
    headers: { "prefer": "return=representation" },
    body: JSON.stringify({ unsubscribe_token: token, updated_at: new Date().toISOString() })
  });
  if (!response.ok) return { ...subscriber, unsubscribe_token: token };
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows[0] ? rows[0] : { ...subscriber, unsubscribe_token: token };
}

async function insertEvent(env, data) {
  return supabaseFetch(env, "lknzmzd_signal_subscription_events", {
    method: "POST",
    headers: { "prefer": "return=minimal" },
    body: JSON.stringify(data)
  }).catch(() => null);
}

async function countByStatus(env, status) {
  const statusFilter = status === "all" ? "" : `&status=eq.${encodeURIComponent(status)}`;
  const response = await supabaseFetch(env, `lknzmzd_signal_subscribers?select=id${statusFilter}`, {
    method: "HEAD",
    headers: { "prefer": "count=exact" }
  });
  if (!response.ok) return null;
  const range = response.headers.get("content-range") || "*/0";
  const total = range.split("/").pop();
  return Number(total || 0);
}

function getAdminToken(request) {
  const auth = request.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return (request.headers.get("x-admin-token") || "").trim();
}

async function isAdminAuthorized(request, env) {
  if (!env.ADMIN_TOKEN) return { ok: false, error: "ADMIN_TOKEN secret is not configured" };
  const incoming = getAdminToken(request);
  if (!incoming) return { ok: false, error: "Admin token missing" };

  const expectedHash = await sha256Hex(env.ADMIN_TOKEN);
  const incomingHash = await sha256Hex(incoming);
  return expectedHash === incomingHash ? { ok: true } : { ok: false, error: "Admin token invalid" };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function csvEscape(value) {
  if (Array.isArray(value)) value = value.join(" | ");
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(rows) {
  const headers = ["email", "interests", "source", "status", "created_at", "updated_at", "subscribed_at", "unsubscribed_at"];
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((key) => csvEscape(row[key])).join(","));
  });
  return `${lines.join("\n")}\n`;
}

function getSignalsBase(env) {
  return String(env.PUBLIC_SIGNALS_BASE || "https://signals.lknzmzd.xyz").replace(/\/$/, "");
}

function getEmailConfig(env) {
  const sendingEnabled = String(env.EMAIL_SENDING_ENABLED || "false").toLowerCase() === "true";
  const dryRun = String(env.EMAIL_DRY_RUN || (sendingEnabled ? "false" : "true")).toLowerCase() === "true";
  return {
    provider: "resend",
    sendingEnabled,
    dryRun,
    resendConfigured: Boolean(env.RESEND_API_KEY),
    from: env.EMAIL_FROM || "LKNZMZD Signals <signals@lknzmzd.xyz>",
    replyTo: env.EMAIL_REPLY_TO || "ilkinazimzade@lknzmzd.com"
  };
}

function normalizeEmailPayload(payload) {
  const subject = String(payload.subject || "LKNZMZD Signals Update").trim().slice(0, 140);
  const title = String(payload.title || subject).trim().slice(0, 160);
  const preheader = String(payload.preheader || "New update from the LKNZMZD system layer.").trim().slice(0, 220);
  const bodyText = String(payload.body_text || payload.body || "").trim().slice(0, 12000);
  const ctaUrl = String(payload.cta_url || "https://lknzmzd.xyz/updates.html").trim().slice(0, 500);
  const ctaLabel = String(payload.cta_label || "Open Signals Feed").trim().slice(0, 80);
  if (!subject || subject.length < 4) throw new Error("Subject is too short.");
  if (!title || title.length < 4) throw new Error("Title is too short.");
  if (!bodyText || bodyText.length < 12) throw new Error("Body text is too short.");
  return { subject, title, preheader, bodyText, ctaUrl, ctaLabel };
}

function paragraphsFromText(value) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

function renderSignalEmail({ title, preheader, bodyText, ctaUrl, ctaLabel, unsubscribeUrl }) {
  const bodyHtml = paragraphsFromText(bodyText);
  const safeCtaUrl = escapeHtml(ctaUrl || "https://lknzmzd.xyz/updates.html");
  const safeUnsub = escapeHtml(unsubscribeUrl || "https://lknzmzd.xyz/unsubscribe.html");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;background:#02060a;color:#dff7ff;font-family:Inter,Segoe UI,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#02060a;padding:28px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#08121d;border:1px solid rgba(120,234,255,.20);border-radius:24px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.38);">
        <tr><td style="padding:26px 28px;border-bottom:1px solid rgba(120,234,255,.14);">
          <div style="font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;letter-spacing:.16em;color:#78eaff;text-transform:uppercase;">LKNZMZD SIGNALS / SYSTEM UPDATE</div>
          <h1 style="margin:16px 0 0;font-size:36px;line-height:1.02;color:#eefcff;letter-spacing:-.04em;">${escapeHtml(title)}</h1>
        </td></tr>
        <tr><td style="padding:28px;color:#b8cbd5;font-size:16px;line-height:1.72;">
          ${bodyHtml}
          <p style="margin:30px 0 0;"><a href="${safeCtaUrl}" style="display:inline-block;background:#78eaff;color:#001116;text-decoration:none;font-weight:800;border-radius:999px;padding:13px 18px;">${escapeHtml(ctaLabel)}</a></p>
        </td></tr>
        <tr><td style="padding:22px 28px;border-top:1px solid rgba(120,234,255,.12);color:#78909b;font-size:12px;line-height:1.6;">
          <div>You received this because you subscribed to LKNZMZD Signals.</div>
          <div><a href="${safeUnsub}" style="color:#78eaff;">Unsubscribe from LKNZMZD Signals</a></div>
          <div style="margin-top:10px;">LKNZMZD.XYZ — robotics, AI systems, tooling, and build logs.</div>
          <div style="margin-top:10px;">
            <a href="https://lknzmzd.xyz" style="color:#78eaff;">Main Website</a>
            · <a href="https://lknzmzd.com" style="color:#78eaff;">Engineering Lab</a>
            · <a href="https://instagram.com/lknzmzdx" style="color:#78eaff;">Instagram</a>
            · <a href="https://instagram.com/lknzmzdlab" style="color:#78eaff;">Lab Instagram</a>
            · <a href="https://instagram.com/noctivis.lab" style="color:#78eaff;">Noctivis</a>
            · <a href="https://youtube.com/@Lknzmzd" style="color:#78eaff;">YouTube</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderSignalText({ title, bodyText, ctaUrl, unsubscribeUrl }) {
  return `${title}\n\n${bodyText}\n\nOpen: ${ctaUrl}\n\nUnsubscribe: ${unsubscribeUrl}\n\nLKNZMZD Signals`;
}

async function sendResendEmail(env, message, idempotencyKey) {
  const config = getEmailConfig(env);
  if (config.dryRun || !config.sendingEnabled) {
    return { ok: true, dry_run: true, provider: "resend", id: `dry_${await sha256Hex(idempotencyKey || `${message.to}:${message.subject}`)}` };
  }
  if (!env.RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY secret is not configured" };
  if (!config.from) return { ok: false, error: "EMAIL_FROM is not configured" };

  const payload = {
    from: config.from,
    to: [message.to],
    subject: message.subject,
    html: message.html,
    text: message.text,
    tags: message.tags || [{ name: "system", value: "lknzmzd-signals" }]
  };
  if (config.replyTo) payload.reply_to = [config.replyTo];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
      ...(idempotencyKey ? { "Resend-Idempotency-Key": idempotencyKey } : {})
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(async () => ({ raw: await response.text().catch(() => "") }));
  if (!response.ok) return { ok: false, status: response.status, error: result.message || result.error || "Resend send failed", detail: result };
  return { ok: true, provider: "resend", id: result.id || null, detail: result };
}

async function insertCampaign(env, data) {
  const body = {
    title: data.title,
    subject: data.subject,
    status: CAMPAIGN_STATUSES.has(data.status) ? data.status : "draft",
    audience_status: data.audience_status || "active",
    target_count: data.target_count || 0,
    sent_count: data.sent_count || 0,
    failed_count: data.failed_count || 0,
    dry_run: Boolean(data.dry_run),
    created_by: data.created_by || "admin",
    metadata: data.metadata || {}
  };
  const response = await supabaseFetch(env, "lknzmzd_signal_email_campaigns", {
    method: "POST",
    headers: { "prefer": "return=representation" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json().catch(() => []);
  return rows[0];
}

async function updateCampaign(env, id, data) {
  const response = await supabaseFetch(env, `lknzmzd_signal_email_campaigns?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "prefer": "return=representation" },
    body: JSON.stringify({ ...data, updated_at: new Date().toISOString() })
  });
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json().catch(() => []);
  return rows[0];
}

async function insertDelivery(env, data) {
  const safeStatus = DELIVERY_STATUSES.has(data.status) ? data.status : "failed";
  return supabaseFetch(env, "lknzmzd_signal_email_deliveries", {
    method: "POST",
    headers: { "prefer": "return=minimal" },
    body: JSON.stringify({
      campaign_id: data.campaign_id || null,
      subscriber_id: data.subscriber_id || null,
      email: data.email,
      provider: data.provider || "resend",
      provider_message_id: data.provider_message_id || null,
      status: safeStatus,
      error: data.error || null,
      metadata: data.metadata || {},
      sent_at: ["sent", "dry_run"].includes(safeStatus) ? new Date().toISOString() : null
    })
  }).catch(() => null);
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

  if (String(payload.company || "").trim()) {
    return json({ ok: true, ignored: true }, 200, request, env);
  }

  const turnstile = await verifyTurnstileIfConfigured(payload, request, env);
  if (!turnstile.ok) return json({ ok: false, error: turnstile.error, detail: turnstile.detail || null }, 400, request, env);

  const email = normalizeEmail(payload.email);
  if (!isValidEmail(email)) {
    return json({ ok: false, error: "Invalid email" }, 400, request, env);
  }

  const existing = await getSubscriberByEmail(env, email);
  const interests = cleanInterests(payload.interests);
  const ipHash = await buildIpHash(request, env);
  const now = new Date().toISOString();
  const source = String(payload.source || "lknzmzd.xyz").slice(0, 120);
  const referrer = String(payload.referrer || request.headers.get("referer") || "").slice(0, 300);
  const userAgent = String(request.headers.get("user-agent") || "").slice(0, 300);
  const consentVersion = String(payload.consent_version || "signals-v1").slice(0, 60);
  const unsubscribeToken = existing?.unsubscribe_token || randomToken();
  const eventType = !existing ? "subscribe" : existing.status === "unsubscribed" ? "resubscribe" : "update";

  const subscriberBody = {
    email,
    interests,
    source,
    referrer,
    user_agent: userAgent,
    ip_hash: ipHash,
    consent_version: consentVersion,
    status: "active",
    unsubscribe_token: unsubscribeToken,
    subscribed_at: now,
    unsubscribed_at: null,
    updated_at: now,
    metadata: {
      last_event: eventType,
      last_source: source
    }
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

  await insertEvent(env, {
    subscriber_id: subscriber?.id || existing?.id || null,
    email,
    event_type: eventType,
    source,
    ip_hash: ipHash,
    metadata: {
      interests,
      referrer,
      consent_version: consentVersion,
      previous_status: existing?.status || null,
      turnstile: turnstile.skipped ? "not_configured" : "verified"
    }
  });

  if (String(env.SEND_WELCOME_EMAIL || "false").toLowerCase() === "true" && eventType !== "update") {
    const unsubscribeUrl = `${getSignalsBase(env)}/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(unsubscribeToken)}`;
    const template = {
      subject: "Your LKNZMZD Signals subscription is active",
      title: "Thanks — your signal channel is active",
      preheader: "Your email was submitted successfully to LKNZMZD Signals.",
      bodyText:
        "Your email was submitted successfully.\n\n" +
        "You are now subscribed to LKNZMZD Signals. You will receive selected updates about robotics builds, AI systems, internal tools, field-engineering notes, and project releases when new signals go live.\n\n" +
        "Main system gateway: https://lknzmzd.xyz\n" +
        "Signals archive: https://lknzmzd.xyz/updates.html\n" +
        "Engineering lab: https://lknzmzd.com\n\n" +
        "Social channels:\n" +
        "Instagram: https://instagram.com/lknzmzdx\n" +
        "Lab Instagram: https://instagram.com/lknzmzdlab\n" +
        "Noctivis Lab: https://instagram.com/noctivis.lab\n" +
        "YouTube: https://youtube.com/@Lknzmzd\n\n" +
        "You can unsubscribe anytime using the link at the bottom of this email.",
      ctaUrl: "https://lknzmzd.xyz/updates.html",
      ctaLabel: "Open Signals Feed"
    };
    const htmlBody = renderSignalEmail({ ...template, unsubscribeUrl });
    const textBody = renderSignalText({ ...template, unsubscribeUrl });
    await sendResendEmail(env, {
      to: email,
      subject: template.subject,
      html: htmlBody,
      text: textBody,
      tags: [{ name: "type", value: "welcome" }, { name: "system", value: "lknzmzd-signals" }]
    }, `welcome-${email}-${subscriber?.id || "unknown"}`);
  }

  return json({
    ok: true,
    status: "active",
    mode: eventType,
    duplicate: eventType === "update",
    subscriber_id: subscriber?.id || existing?.id || null
  }, 200, request, env);
}

async function unsubscribeEmail(request, env, input) {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) return { ok: false, status: 400, error: "Invalid email" };

  const existing = await getSubscriberByEmail(env, email);
  if (!existing) return { ok: true, status: 200, result: "not_found_or_already_removed" };

  const providedToken = String(input.token || "").trim();
  if (providedToken && existing.unsubscribe_token && providedToken !== existing.unsubscribe_token) {
    return { ok: false, status: 403, error: "Invalid unsubscribe token" };
  }

  const now = new Date().toISOString();
  const ipHash = await buildIpHash(request, env);
  const source = String(input.source || "unsubscribe-endpoint").slice(0, 120);

  const update = await supabaseFetch(env, `lknzmzd_signal_subscribers?email=eq.${encodeURIComponent(email)}`, {
    method: "PATCH",
    headers: { "prefer": "return=representation" },
    body: JSON.stringify({
      status: "unsubscribed",
      unsubscribed_at: now,
      updated_at: now,
      metadata: {
        last_event: "unsubscribe",
        unsubscribe_source: source,
        token_used: Boolean(providedToken)
      }
    })
  });

  if (!update.ok) {
    const detail = await update.text();
    return { ok: false, status: 500, error: "Supabase unsubscribe update failed", detail };
  }

  await insertEvent(env, {
    subscriber_id: existing.id,
    email,
    event_type: "unsubscribe",
    source,
    ip_hash: ipHash,
    metadata: {
      previous_status: existing.status,
      token_used: Boolean(providedToken)
    }
  });

  return { ok: true, status: 200, result: "unsubscribed" };
}

async function handleUnsubscribePost(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400, request, env);
  }
  const result = await unsubscribeEmail(request, env, payload);
  if (!result.ok) return json(result, result.status || 400, request, env);
  return json({ ok: true, status: result.result }, 200, request, env);
}

async function handleUnsubscribeGet(request, env, url) {
  const result = await unsubscribeEmail(request, env, {
    email: url.searchParams.get("email"),
    token: url.searchParams.get("token"),
    source: "email-link"
  });

  const title = result.ok ? "Signal channel closed" : "Unsubscribe failed";
  const message = result.ok
    ? "This email is now marked as unsubscribed from LKNZMZD Signals."
    : result.error || "The unsubscribe request could not be completed.";

  return html(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{margin:0;background:#02060a;color:#dff7ff;font-family:Inter,Arial,sans-serif;display:grid;min-height:100vh;place-items:center}.card{width:min(680px,calc(100vw - 32px));border:1px solid rgba(120,234,255,.18);border-radius:28px;padding:34px;background:rgba(8,18,29,.86);box-shadow:0 24px 90px rgba(0,0,0,.45)}.eyebrow{font:12px ui-monospace,monospace;letter-spacing:.14em;color:#78eaff;text-transform:uppercase}h1{font-size:clamp(38px,6vw,72px);line-height:.92;margin:16px 0}p{color:#9fb4c0;line-height:1.7}a{color:#78eaff}</style></head><body><main class="card"><div class="eyebrow">LKNZMZD SIGNALS / V2.7</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a href="https://lknzmzd.xyz/">Return to LKNZMZD.XYZ</a></p></main></body></html>`, result.ok ? 200 : result.status || 400, request, env);
}

async function handleCount(request, env) {
  const active = await countByStatus(env, "active");
  if (active === null) return json({ ok: false, error: "Count failed" }, 500, request, env);
  return json({ ok: true, active, version: VERSION }, 200, request, env);
}

async function handleAdminCounts(request, env) {
  const auth = await isAdminAuthorized(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.error.includes("configured") ? 500 : 401, request, env);

  const statuses = ["active", "unsubscribed", "bounced", "blocked"];
  const counts = {};
  for (const status of statuses) counts[status] = await countByStatus(env, status);
  counts.total = await countByStatus(env, "all");
  return json({ ok: true, counts, generated_at: new Date().toISOString(), version: VERSION }, 200, request, env);
}

async function fetchSubscribers(env, status, limit = 10000, includeToken = false) {
  const safeStatus = ALLOWED_STATUSES.has(status) ? status : "active";
  const statusFilter = safeStatus === "all" ? "" : `&status=eq.${encodeURIComponent(safeStatus)}`;
  const select = includeToken
    ? "id,email,interests,source,status,created_at,updated_at,subscribed_at,unsubscribed_at,unsubscribe_token"
    : "email,interests,source,status,created_at,updated_at,subscribed_at,unsubscribed_at";
  const path = `lknzmzd_signal_subscribers?select=${select}${statusFilter}&order=created_at.desc&limit=${Math.min(Math.max(limit, 1), 10000)}`;
  const response = await supabaseFetch(env, path, { method: "GET" });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function handleAdminSubscribers(request, env, url) {
  const auth = await isAdminAuthorized(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.error.includes("configured") ? 500 : 401, request, env);
  const status = url.searchParams.get("status") || "active";
  const limit = Number(url.searchParams.get("limit") || "250");
  try {
    const rows = await fetchSubscribers(env, status, limit, false);
    return json({ ok: true, status, count: rows.length, rows }, 200, request, env);
  } catch (error) {
    return json({ ok: false, error: "Subscriber fetch failed", detail: error.message }, 500, request, env);
  }
}

async function handleAdminExport(request, env, url) {
  const auth = await isAdminAuthorized(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.error.includes("configured") ? 500 : 401, request, env);
  const status = url.searchParams.get("status") || "active";
  const format = (url.searchParams.get("format") || "csv").toLowerCase();
  try {
    const rows = await fetchSubscribers(env, status, 10000, false);
    if (format === "json") {
      return json({ ok: true, status, count: rows.length, rows }, 200, request, env);
    }
    return text(toCsv(rows), 200, request, env, {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="lknzmzd-signals-${status}-${new Date().toISOString().slice(0, 10)}.csv"`
    });
  } catch (error) {
    return json({ ok: false, error: "Subscriber export failed", detail: error.message }, 500, request, env);
  }
}

async function handleAdminEmailStatus(request, env) {
  const auth = await isAdminAuthorized(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.error.includes("configured") ? 500 : 401, request, env);
  const config = getEmailConfig(env);
  return json({
    ok: true,
    version: VERSION,
    provider: config.provider,
    sending_enabled: config.sendingEnabled,
    dry_run: config.dryRun,
    resend_configured: config.resendConfigured,
    from_configured: Boolean(config.from),
    reply_to_configured: Boolean(config.replyTo),
    public_base: getSignalsBase(env)
  }, 200, request, env);
}

async function handleAdminEmailTest(request, env) {
  const auth = await isAdminAuthorized(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.error.includes("configured") ? 500 : 401, request, env);

  let payload;
  try { payload = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400, request, env); }

  const to = normalizeEmail(payload.to || payload.test_to);
  if (!isValidEmail(to)) return json({ ok: false, error: "Invalid test recipient" }, 400, request, env);

  let template;
  try { template = normalizeEmailPayload(payload); } catch (error) { return json({ ok: false, error: error.message }, 400, request, env); }

  const config = getEmailConfig(env);
  const unsubscribeUrl = "https://lknzmzd.xyz/unsubscribe.html";
  const htmlBody = renderSignalEmail({ ...template, unsubscribeUrl });
  const textBody = renderSignalText({ ...template, unsubscribeUrl });
  const idempotencyKey = `test-${await sha256Hex(`${to}:${template.subject}:${Date.now()}`)}`;
  const campaign = await insertCampaign(env, {
    title: template.title,
    subject: template.subject,
    status: config.dryRun || !config.sendingEnabled ? "dry_run" : "test",
    audience_status: "test",
    target_count: 1,
    dry_run: config.dryRun || !config.sendingEnabled,
    metadata: { type: "test", to, cta_url: template.ctaUrl }
  });
  const send = await sendResendEmail(env, {
    to,
    subject: template.subject,
    html: htmlBody,
    text: textBody,
    tags: [{ name: "type", value: "test" }, { name: "system", value: "lknzmzd-signals" }]
  }, idempotencyKey);

  await insertDelivery(env, {
    campaign_id: campaign.id,
    email: to,
    provider: "resend",
    provider_message_id: send.id || null,
    status: send.ok ? (send.dry_run ? "dry_run" : "sent") : "failed",
    error: send.ok ? null : send.error,
    metadata: { test: true, detail: send.detail || null }
  });

  await updateCampaign(env, campaign.id, {
    status: send.ok ? (send.dry_run ? "dry_run" : "test") : "failed",
    sent_count: send.ok ? 1 : 0,
    failed_count: send.ok ? 0 : 1,
    sent_at: new Date().toISOString(),
    metadata: { type: "test", to, dry_run: Boolean(send.dry_run), provider_id: send.id || null, error: send.error || null }
  }).catch(() => null);

  if (!send.ok) return json({ ok: false, error: send.error, detail: send.detail || null, campaign_id: campaign.id }, 502, request, env);
  return json({ ok: true, mode: send.dry_run ? "dry_run" : "sent", provider: "resend", provider_message_id: send.id || null, campaign_id: campaign.id }, 200, request, env);
}

async function handleAdminEmailBroadcast(request, env) {
  const auth = await isAdminAuthorized(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.error.includes("configured") ? 500 : 401, request, env);

  let payload;
  try { payload = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400, request, env); }

  if (String(payload.confirm || "") !== "SEND_LKNZMZD_SIGNAL") {
    return json({ ok: false, error: "Broadcast confirmation phrase missing. Use SEND_LKNZMZD_SIGNAL." }, 400, request, env);
  }

  let template;
  try { template = normalizeEmailPayload(payload); } catch (error) { return json({ ok: false, error: error.message }, 400, request, env); }

  const limit = Math.min(Math.max(Number(payload.limit || 50), 1), 100);
  const audienceStatus = ALLOWED_STATUSES.has(payload.status) && payload.status !== "all" ? payload.status : "active";
  const subscribers = await fetchSubscribers(env, audienceStatus, limit, true);
  if (!subscribers.length) return json({ ok: false, error: "No subscribers found for selected audience" }, 400, request, env);

  const config = getEmailConfig(env);
  const dryRun = config.dryRun || !config.sendingEnabled;
  const campaign = await insertCampaign(env, {
    title: template.title,
    subject: template.subject,
    status: dryRun ? "dry_run" : "sending",
    audience_status: audienceStatus,
    target_count: subscribers.length,
    dry_run: dryRun,
    metadata: {
      type: "broadcast",
      limit,
      cta_url: template.ctaUrl,
      dry_run: dryRun
    }
  });

  let sent = 0;
  let failed = 0;
  const failures = [];
  for (const rawSubscriber of subscribers) {
    const subscriber = await ensureUnsubscribeToken(env, rawSubscriber);
    const unsubscribeUrl = `${getSignalsBase(env)}/unsubscribe?email=${encodeURIComponent(subscriber.email)}&token=${encodeURIComponent(subscriber.unsubscribe_token || "")}`;
    const htmlBody = renderSignalEmail({ ...template, unsubscribeUrl });
    const textBody = renderSignalText({ ...template, unsubscribeUrl });
    const idempotencyKey = `campaign-${campaign.id}-${subscriber.id || subscriber.email}`;
    const send = await sendResendEmail(env, {
      to: subscriber.email,
      subject: template.subject,
      html: htmlBody,
      text: textBody,
      tags: [{ name: "type", value: "broadcast" }, { name: "campaign", value: campaign.id.slice(0, 8) }]
    }, idempotencyKey);

    if (send.ok) sent += 1;
    else {
      failed += 1;
      failures.push({ email: subscriber.email, error: send.error || "send failed" });
    }

    await insertDelivery(env, {
      campaign_id: campaign.id,
      subscriber_id: subscriber.id || null,
      email: subscriber.email,
      provider: "resend",
      provider_message_id: send.id || null,
      status: send.ok ? (send.dry_run ? "dry_run" : "sent") : "failed",
      error: send.ok ? null : send.error,
      metadata: { interests: subscriber.interests || [], detail: send.detail || null }
    });
  }

  const finalStatus = dryRun ? "dry_run" : failed > 0 && sent === 0 ? "failed" : "sent";
  await updateCampaign(env, campaign.id, {
    status: finalStatus,
    sent_count: sent,
    failed_count: failed,
    sent_at: new Date().toISOString(),
    metadata: {
      type: "broadcast",
      dry_run: dryRun,
      cta_url: template.ctaUrl,
      failures: failures.slice(0, 20)
    }
  }).catch(() => null);

  return json({
    ok: failed === 0 || sent > 0,
    mode: dryRun ? "dry_run" : "broadcast",
    campaign_id: campaign.id,
    target_count: subscribers.length,
    sent_count: sent,
    failed_count: failed,
    failures: failures.slice(0, 20)
  }, failed > 0 && sent === 0 ? 502 : 200, request, env);
}

async function handleAdminCampaigns(request, env, url) {
  const auth = await isAdminAuthorized(request, env);
  if (!auth.ok) return json({ ok: false, error: auth.error }, auth.error.includes("configured") ? 500 : 401, request, env);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || "20"), 1), 100);
  const response = await supabaseFetch(env, `lknzmzd_signal_email_campaigns?select=id,title,subject,status,audience_status,target_count,sent_count,failed_count,dry_run,created_at,updated_at,sent_at,metadata&order=created_at.desc&limit=${limit}`, { method: "GET" });
  if (!response.ok) return json({ ok: false, error: "Campaign fetch failed", detail: await response.text() }, 500, request, env);
  const rows = await response.json().catch(() => []);
  return json({ ok: true, count: rows.length, rows }, 200, request, env);
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: getCorsHeaders(request, env) });
      }

      if (url.pathname === "/health" && request.method === "GET") {
        return json({
          ok: true,
          service: "lknzmzd-signals-worker",
          version: VERSION,
          endpoints: [
            "/count",
            "/subscribe",
            "/unsubscribe",
            "/admin/counts",
            "/admin/export",
            "/admin/subscribers",
            "/admin/campaigns",
            "/admin/email/status",
            "/admin/email/test",
            "/admin/email/broadcast"
          ]
        }, 200, request, env);
      }

      if (url.pathname === "/count" && request.method === "GET") return handleCount(request, env);
      if (url.pathname === "/subscribe" && request.method === "POST") return handleSubscribe(request, env);
      if (url.pathname === "/unsubscribe" && request.method === "POST") return handleUnsubscribePost(request, env);
      if (url.pathname === "/unsubscribe" && request.method === "GET") return handleUnsubscribeGet(request, env, url);
      if (url.pathname === "/admin/counts" && request.method === "GET") return handleAdminCounts(request, env);
      if (url.pathname === "/admin/subscribers" && request.method === "GET") return handleAdminSubscribers(request, env, url);
      if (url.pathname === "/admin/export" && request.method === "GET") return handleAdminExport(request, env, url);
      if (url.pathname === "/admin/campaigns" && request.method === "GET") return handleAdminCampaigns(request, env, url);
      if (url.pathname === "/admin/email/status" && request.method === "GET") return handleAdminEmailStatus(request, env);
      if (url.pathname === "/admin/email/test" && request.method === "POST") return handleAdminEmailTest(request, env);
      if (url.pathname === "/admin/email/broadcast" && request.method === "POST") return handleAdminEmailBroadcast(request, env);

      return json({ ok: false, error: "Not found" }, 404, request, env);
    } catch (error) {
      return json({
        ok: false,
        error: "Worker runtime error",
        message: error && error.message ? error.message : String(error),
        version: VERSION
      }, 500, request, env);
    }
  }
};

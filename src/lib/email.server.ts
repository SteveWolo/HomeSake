/**
 * Server-only Resend email helper + Homesake-branded HTML templates.
 *
 * The API key never reaches the browser: this file is a `.server.ts` module and
 * must be loaded with `await import(...)` from inside server-fn handlers.
 */

const FROM = process.env["RESEND_FROM"] || "Homesake Care <noreply@yourhomesake.com>";

export function siteUrl() {
  return (process.env["SITE_URL"] || "https://yourhomesake.com").replace(/\/$/, "");
}

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("Email is not configured yet (missing RESEND_API_KEY).");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [input.to], subject: input.subject, html: input.html }),
  });

  const body = (await res.json().catch(() => ({}))) as { message?: string; id?: string };
  if (!res.ok) {
    console.error(`[resend] send failed [${res.status}]: ${JSON.stringify(body)}`);
    throw new Error(body.message ?? `Email send failed (${res.status}).`);
  }
  return { id: body.id ?? null };
}

/* ------------------------------------------------------------------ */
/* Branded layout                                                      */
/* ------------------------------------------------------------------ */

const NAVY = "#0B132B";
const GOLD = "#C9A227";

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function layout(opts: {
  title: string;
  intro: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:${NAVY};font-family:Helvetica,Arial,sans-serif;color:#EDE8DF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${NAVY};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111A34;border:1px solid rgba(201,162,39,.28);border-radius:6px;">
        <tr><td style="padding:28px 32px 8px 32px;">
          <p style="margin:0;font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:${GOLD};">Homesake Care</p>
          <h1 style="margin:14px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:28px;line-height:1.25;color:#FFFFFF;">${esc(opts.title)}</h1>
        </td></tr>
        <tr><td style="padding:12px 32px 0 32px;">
          <p style="margin:0;font-size:15px;line-height:1.7;color:#C8CEDC;">${esc(opts.intro)}</p>
        </td></tr>
        <tr><td style="padding:20px 32px 0 32px;">${opts.bodyHtml}</td></tr>
        <tr><td style="padding:28px 32px 32px 32px;">
          <a href="${esc(opts.ctaHref)}" style="display:inline-block;background:${GOLD};color:${NAVY};font-weight:700;font-size:14px;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:999px;">${esc(opts.ctaLabel)}</a>
        </td></tr>
        <tr><td style="padding:0 32px 28px 32px;border-top:1px solid rgba(255,255,255,.08);">
          <p style="margin:18px 0 0 0;font-size:12px;line-height:1.6;color:#8A93A6;">Homesake Care · Proactive home maintenance for discerning homeowners.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function sectionHtml(heading: string, items: string[]) {
  if (!items.length) return "";
  return `<div style="margin:0 0 18px 0;">
    <p style="margin:0 0 8px 0;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${GOLD};">${esc(heading)}</p>
    <ul style="margin:0;padding-left:18px;color:#DDE2EC;font-size:14px;line-height:1.8;">
      ${items.map((i) => `<li>${esc(i)}</li>`).join("")}
    </ul>
  </div>`;
}

export function statHtml(rows: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,.10);border-radius:4px;">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:12px 16px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8A93A6;">${esc(k)}</td><td style="padding:12px 16px;text-align:right;font-size:15px;color:#FFFFFF;font-weight:600;">${esc(v)}</td></tr>`,
      )
      .join("")}
  </table>`;
}

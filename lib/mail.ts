// Transactional email via Resend's REST API. Without RESEND_API_KEY and
// RESEND_FROM (local dev) the message is logged instead, so forms still work.

const esc = (s = "") => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function htmlTable(title: string, rows: [string, string | undefined][]) {
  return `<h2>${esc(title)}</h2><table cellpadding="6">${rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v).replace(/\n/g, "<br>")}</td></tr>`)
    .join("")}</table>`;
}

/** Returns true if delivered, false if only logged; throws on a send failure. */
export async function sendMail(msg: { to: string; subject: string; html: string; replyTo?: string; log?: unknown }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) {
    console.info("[mail] not configured; would send to", msg.to, msg.subject, msg.log ?? "");
    return false;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: msg.to, reply_to: msg.replyTo, subject: msg.subject, html: msg.html }),
  });
  if (!r.ok) throw new Error(`resend ${r.status}: ${await r.text()}`);
  return true;
}

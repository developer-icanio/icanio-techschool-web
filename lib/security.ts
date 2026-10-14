import { createHash, timingSafeEqual } from "node:crypto";

/** Constant-time string comparison, so a secret can't be guessed from response timing. */
export function safeEqual(a: string, b: string) {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y) && a.length === b.length;
}

/** True when the request carries "Authorization: Bearer $CRON_SECRET". */
export function hasCronSecret(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`);
}

/**
 * Browsers always send Origin on cross-site POSTs. Rejecting a foreign
 * Origin stops other websites from submitting forms to our API on a
 * visitor's behalf.
 */
export function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from old browsers, curl, server-to-server
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return false;
  }
}

/** Only redirects inside /admin after sign-in: no other sites, no protocol-relative tricks. */
export function safeAdminPath(v: unknown, fallback: string) {
  const s = typeof v === "string" ? v : "";
  return /^\/admin(\/[A-Za-z0-9\-._~/%?=&]*)?$/.test(s) && !s.includes("//") && !s.includes("\\") ? s : fallback;
}

const UNSAFE_URL = /^\s*(javascript|data|vbscript|file|blob):/i;

/** Blocks script and data URLs in links and media set from the dashboard. */
export const safeUrl = (v: string) => (UNSAFE_URL.test(v.replace(/[\u0000-\u001F\u007F\s]+/g, "")) ? "" : v);

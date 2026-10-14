import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

// Fixed-window rate limits shared by every server instance (rows in the
// rate_limits table). Keys are hashed, so no raw IP addresses are stored.
// If the database is unreachable it falls back to a per-instance memory
// counter: weaker, but forms keep working and abuse is still slowed down.

const memory = new Map<string, { count: number; resetAt: number }>();

function inMemory(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (memory.size > 5000) for (const [k, v] of memory) if (v.resetAt < now) memory.delete(k);
  const cur = memory.get(key);
  if (!cur || cur.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  cur.count++;
  return { ok: cur.count <= limit, retryAfter: Math.ceil((cur.resetAt - now) / 1000) };
}

/** Counts one hit for `bucket` + `id`; ok is false once `limit` hits land inside `windowMs`. */
export async function rateLimit(bucket: string, id: string, limit: number, windowMs: number) {
  const key = createHash("sha256").update(`${process.env.AUTH_SECRET ?? ""}|${bucket}|${id}`).digest("hex");
  try {
    const db = await getDb();
    if (!db) return inMemory(key, limit, windowMs);
    const reset = new Date(Date.now() + windowMs).toISOString();
    const res = await db.execute(sql`
      INSERT INTO rate_limits (key, count, reset_at) VALUES (${key}, 1, ${reset})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = CASE WHEN rate_limits.reset_at < now() THEN excluded.reset_at ELSE rate_limits.reset_at END
      RETURNING count, reset_at`);
    const row = ((res as unknown as { rows?: { count: number; reset_at: string | Date }[] }).rows ?? (res as unknown as { count: number; reset_at: string | Date }[]))[0];
    // Now and then, clear expired windows so the table stays small.
    if (Math.random() < 0.02) await db.execute(sql`DELETE FROM rate_limits WHERE reset_at < now()`).catch(() => {});
    return { ok: Number(row.count) <= limit, retryAfter: Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000)) };
  } catch (e) {
    console.error("[rate-limit] database unavailable, using memory:", (e as Error).message);
    return inMemory(key, limit, windowMs);
  }
}

/** The caller's IP as Vercel reports it (first x-forwarded-for hop). */
export function clientIp(headers: Headers) {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

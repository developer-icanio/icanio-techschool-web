import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth, noLogin } from "@/auth";
import { dbKind, getDb } from "@/db";
import { hasCronSecret } from "@/lib/security";

// Service status. The public sees only whether the site is healthy; signed-in
// admins (or a request with the cron secret) also see what is configured and
// the table counts. Never reports keys or connection details.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const detailed = noLogin || hasCronSecret(req) || Boolean((await auth())?.user?.role);
  const started = Date.now();
  let database: { status: "connected" | "not configured" | "local embedded" | "error"; tables?: Record<string, number>; ms?: number; error?: string };

  if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
    database = { status: "not configured" };
  } else {
    try {
      const db = await getDb();
      if (!db) throw new Error("Could not connect. Check DATABASE_URL.");
      const count = async (t: string) => Number(((await db.execute(sql.raw(`select count(*)::int as n from ${t}`))) as unknown as { rows: { n: number }[] }).rows[0].n);
      const tables = Object.fromEntries(
        await Promise.all(["admin_users", "content_pages", "content_revisions", "library_items", "seo_snapshots"].map(async (t) => [t, await count(t)] as const)),
      );
      database = { status: dbKind() === "postgres" ? "connected" : "local embedded", tables, ms: Date.now() - started };
    } catch (e) {
      // Short, non-sensitive reason (no connection string).
      database = { status: "error", error: (e as Error).message.replace(/postgres(ql)?:\/\/\S+/gi, "[url]").slice(0, 160) };
    }
  }

  const ok = database.status === "connected" || database.status === "local embedded";
  if (!detailed) return NextResponse.json({ ok, checkedAt: new Date().toISOString() }, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });

  return NextResponse.json(
    {
      ok: database.status === "connected" || database.status === "local embedded",
      database,
      fileStorage: process.env.BLOB_READ_WRITE_TOKEN ? "vercel blob" : process.env.NODE_ENV === "production" ? "not configured" : "local folder",
      googleLogin: Boolean(process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
      owners: Boolean(process.env.ADMIN_EMAILS),
      leadEmail: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM),
      dailySnapshot: Boolean(process.env.CRON_SECRET),
      pagespeed: Boolean(process.env.GOOGLE_PAGESPEED_API_KEY),
      checkedAt: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

import { db } from "@/db";
import { redirects } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export interface RedirectEntry {
  id: string;
  destinationPath: string;
  type: "permanent" | "temporary";
}

// Cached in-memory so proxy.ts isn't hitting Postgres on every single
// page request — warm serverless invocations reuse this for up to
// CACHE_TTL_MS before refetching. A cold start just pays one query.
let cachedMap: Map<string, RedirectEntry> | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

// This runs on every non-admin page request via proxy.ts, so a DB
// hiccup (or the table not existing yet, mid-deploy) must never take
// the whole site down with it — fail open to an empty map and let the
// request proceed as if there were no redirects configured.
export async function getRedirectMap(): Promise<Map<string, RedirectEntry>> {
  const now = Date.now();
  if (cachedMap && now - cachedAt < CACHE_TTL_MS) return cachedMap;

  try {
    const rows = await db
      .select({
        id: redirects.id,
        sourcePath: redirects.sourcePath,
        destinationPath: redirects.destinationPath,
        type: redirects.type,
      })
      .from(redirects)
      .where(eq(redirects.isActive, true));

    cachedMap = new Map(rows.map((row) => [row.sourcePath, row]));
    cachedAt = now;
    return cachedMap;
  } catch (err) {
    console.error("[redirects] failed to load redirect map, continuing without redirects:", err);
    return cachedMap ?? new Map();
  }
}

// Fire-and-forget — proxy.ts shouldn't wait on this before redirecting.
export function trackRedirectHit(id: string): void {
  db.update(redirects)
    .set({ hitCount: sql`${redirects.hitCount} + 1`, lastHitAt: new Date() })
    .where(eq(redirects.id, id))
    .catch(() => {});
}

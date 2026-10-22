import "server-only";
import fs from "node:fs";
import { redirect } from "next/navigation";
import { auth, noLogin } from "@/auth";
import { getDb, schema } from "@/db";
import type { AdminRole } from "@/db/schema";
import { scoreboard } from "@/lib/seo-report";
import { desc } from "drizzle-orm";
import { cdn } from "@/lib/images";

/** Second lock after proxy.ts: every admin page and action calls this. */
export async function requireAdmin(roles?: AdminRole[]) {
  // Admin pages always show the latest dashboard edits.
  await (await import("@/lib/content/store")).ensureContent();
  // Local dev without login (ADMIN_NO_LOGIN=1): act as the first owner.
  if (noLogin) {
    const email = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim() || "dev@localhost";
    return { email, name: "Local dev", role: "owner" as AdminRole };
  }
  const session = await auth();
  const role = session?.user?.role;
  if (!role) redirect("/admin/login");
  if (roles && !roles.includes(role)) redirect("/admin/seo");
  return { email: session!.user!.email ?? "", name: session!.user!.name ?? "", role };
}

export const canManageTeam = (role: AdminRole) => role === "owner" || role === "admin";

export async function saveSnapshot(takenBy: string, note?: string) {
  const db = await getDb();
  if (!db) return false;
  const s = scoreboard();
  await db.insert(schema.seoSnapshots).values({
    takenBy,
    note,
    averageScore: s.averageScore,
    pages: s.rows.length,
    perfectPages: s.perfect,
    rows: s.rows.map((r) => ({ path: r.path, score: r.score, passed: r.passed, words: r.words, failed: r.failed.map((f) => f.id) })),
  });
  return true;
}

export async function recentSnapshots(limit = 30) {
  const db = await getDb();
  if (!db) return null;
  return db.select().from(schema.seoSnapshots).orderBy(desc(schema.seoSnapshots.takenAt)).limit(limit);
}

/** Who may edit content (the seo role is read-only). */
export const canEdit = (role: AdminRole) => role !== "seo";

/** WordPress filename -> optimised image URL, for previews in the editor. */
export function assetMap(): Record<string, string> {
  const map = JSON.parse(fs.readFileSync(`${process.cwd()}/lib/images.json`, "utf8")) as Record<string, { src: string }>;
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, cdn(v.src)]));
}

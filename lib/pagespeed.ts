import "server-only";
import { sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { SpeedIssue, SpeedMetrics } from "@/db/schema";
import { SITE } from "@/lib/site";

// Google PageSpeed Insights (Lighthouse run by Google, plus real-user Chrome
// data when a page has enough traffic). Needs GOOGLE_PAGESPEED_API_KEY.

export type Strategy = "mobile" | "desktop";

/** Site the tests run against. Locally this should be the live site, since Google can't reach localhost. */
export const speedBaseUrl = () => (process.env.PAGESPEED_BASE_URL || SITE.url).replace(/\/$/, "");
export const hasSpeedKey = () => Boolean(process.env.GOOGLE_PAGESPEED_API_KEY);

const CATEGORY_TITLE: Record<string, string> = { performance: "Performance", accessibility: "Accessibility", "best-practices": "Best practices", seo: "SEO" };

interface LhAudit { title: string; score: number | null; scoreDisplayMode?: string; displayValue?: string; numericValue?: number }
interface LhCategory { score: number | null; auditRefs: { id: string; weight: number }[] }
interface PsiResponse {
  error?: { message: string };
  loadingExperience?: { overall_category?: string };
  lighthouseResult?: { categories: Record<string, LhCategory>; audits: Record<string, LhAudit> };
}

const pct = (s: number | null | undefined) => (s === null || s === undefined ? null : Math.round(s * 100));

export async function runPageSpeed(path: string, strategy: Strategy, runBy: string, timeoutMs = 55_000) {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!key) throw new Error("Add GOOGLE_PAGESPEED_API_KEY to the environment to run PageSpeed tests.");
  const url = `${speedBaseUrl()}${path === "/" ? "/" : path}`;
  const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  api.searchParams.set("url", url);
  api.searchParams.set("strategy", strategy);
  for (const c of ["PERFORMANCE", "ACCESSIBILITY", "BEST_PRACTICES", "SEO"]) api.searchParams.append("category", c);
  api.searchParams.set("key", key);

  const res = await fetch(api, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  const data = (await res.json()) as PsiResponse;
  if (!res.ok || data.error || !data.lighthouseResult) throw new Error(data.error?.message?.replace(/key=[^&\s]+/g, "key=…") ?? `PageSpeed returned ${res.status}`);

  const { categories: cat, audits } = data.lighthouseResult;
  const a = (id: string) => audits[id];
  const metrics: SpeedMetrics = {
    fcp: a("first-contentful-paint")?.displayValue,
    lcp: a("largest-contentful-paint")?.displayValue,
    tbt: a("total-blocking-time")?.displayValue,
    cls: a("cumulative-layout-shift")?.displayValue,
    si: a("speed-index")?.displayValue,
    lcpMs: a("largest-contentful-paint")?.numericValue,
  };

  // Failing audits, heaviest first, across all four categories.
  const seen = new Set<string>();
  const issues: (SpeedIssue & { weight: number })[] = [];
  for (const [cid, c] of Object.entries(cat))
    for (const ref of c.auditRefs) {
      const au = audits[ref.id];
      if (!au || seen.has(ref.id) || au.score === null || au.score >= 0.9) continue;
      if (["notApplicable", "manual", "informative"].includes(au.scoreDisplayMode ?? "")) continue;
      seen.add(ref.id);
      issues.push({ title: au.title, value: au.displayValue, category: CATEGORY_TITLE[cid] ?? cid, weight: ref.weight + (1 - au.score) });
    }
  issues.sort((x, y) => y.weight - x.weight);

  const row = {
    path,
    strategy,
    performance: pct(cat.performance?.score),
    accessibility: pct(cat.accessibility?.score),
    bestPractices: pct(cat["best-practices"]?.score),
    seo: pct(cat.seo?.score),
    metrics,
    issues: issues.slice(0, 12).map(({ title, value, category }) => ({ title, value, category })),
    fieldData: data.loadingExperience?.overall_category ?? null,
    runBy,
  };
  const db = await getDb();
  if (db) await db.insert(schema.pagespeedResults).values(row);
  return { ...row, createdAt: new Date().toISOString(), url };
}

export type SpeedRow = Awaited<ReturnType<typeof runPageSpeed>>;

/** Latest result per page and device. */
export async function latestSpeed() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (path, strategy) path, strategy, performance, accessibility, best_practices, seo, metrics, issues, field_data, run_by, created_at
    FROM pagespeed_results ORDER BY path, strategy, created_at DESC`);
  const list = (rows as unknown as { rows: Record<string, unknown>[] }).rows ?? (rows as unknown as Record<string, unknown>[]);
  return list.map((r) => ({
    path: r.path as string,
    strategy: r.strategy as Strategy,
    performance: r.performance as number | null,
    accessibility: r.accessibility as number | null,
    bestPractices: r.best_practices as number | null,
    seo: r.seo as number | null,
    metrics: r.metrics as SpeedMetrics,
    issues: r.issues as SpeedIssue[],
    fieldData: r.field_data as string | null,
    runBy: r.run_by as string | null,
    createdAt: new Date(r.created_at as string).toISOString(),
  }));
}

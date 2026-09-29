import fs from "fs";
import path from "path";
import { db } from "@/db";
import { linkCheckRuns, linkCheckResults } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getAllContentItems, getPublishedPaths, extractInternalLinks, extractExternalLinks } from "@/lib/siteContent";

const USER_AGENT = "Mozilla/5.0 (compatible; LamblilyLinkChecker/1.0; +https://lamblily.com)";
const FETCH_TIMEOUT_MS = 6000;
const BATCH_SIZE = 25;
const CONCURRENCY = 6;

const SYSTEM_ROUTES = ["/robots.txt", "/sitemap.xml"];

function normalizeInternalPath(link: string): string {
  const withoutHash = link.split("#")[0].split("?")[0];
  return withoutHash === "" ? "/" : withoutHash;
}

// A link to a static asset (image, PDF, etc. under public/) won't be in
// the published-paths set either — check the filesystem directly.
function isPublicAsset(pathname: string): boolean {
  const filePath = path.join(process.cwd(), "public", pathname);
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

// Starts a new run: scans every published blog post for internal +
// external links, resolves internal links synchronously against the set
// of known published paths, and queues external links as pending rows.
export async function startLinkCheckRun(): Promise<string> {
  const items = getAllContentItems().filter((item) => !item.draft);
  const publishedPaths = await getPublishedPaths();
  SYSTEM_ROUTES.forEach((route) => publishedPaths.add(route));

  const [run] = await db.insert(linkCheckRuns).values({ status: "running" }).returning();

  type PendingResult = typeof linkCheckResults.$inferInsert;
  const results: PendingResult[] = [];

  for (const item of items) {
    const internalLinks = extractInternalLinks(item.content);
    for (const link of internalLinks) {
      const normalized = normalizeInternalPath(link);
      const ok = publishedPaths.has(normalized) || isPublicAsset(normalized);
      results.push({
        runId: run.id,
        sourceType: item.type,
        sourceSlug: item.slug,
        sourceTitle: item.title,
        linkUrl: link,
        linkType: "internal",
        ok,
        checkedAt: new Date(),
      });
    }

    const externalLinks = extractExternalLinks(item.content);
    for (const link of externalLinks) {
      results.push({
        runId: run.id,
        sourceType: item.type,
        sourceSlug: item.slug,
        sourceTitle: item.title,
        linkUrl: link,
        linkType: "external",
        ok: null,
      });
    }
  }

  if (results.length > 0) {
    await db.insert(linkCheckResults).values(results);
  }

  const brokenInternalCount = results.filter((r) => r.linkType === "internal" && r.ok === false).length;
  const internalCount = results.filter((r) => r.linkType === "internal").length;
  const hasExternalPending = results.some((r) => r.linkType === "external");

  await db
    .update(linkCheckRuns)
    .set({
      totalLinks: results.length,
      checkedLinks: internalCount,
      brokenCount: brokenInternalCount,
      status: hasExternalPending ? "running" : "completed",
      completedAt: hasExternalPending ? null : new Date(),
    })
    .where(eq(linkCheckRuns.id, run.id));

  return run.id;
}

async function checkExternalLink(
  url: string
): Promise<{ ok: boolean; httpStatus?: number; errorMessage?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });

    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT },
      });
    }

    if (res.status === 403) {
      return { ok: true, httpStatus: res.status, errorMessage: "403 Forbidden, verify manually" };
    }

    return { ok: res.status < 400, httpStatus: res.status };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : "Fetch failed" };
  } finally {
    clearTimeout(timeout);
  }
}

// Processes one batch of pending external links. Call this from a cron
// route (see app/api/cron/link-check) since a full site scan of external
// links can take longer than a single request should run.
export async function processPendingExternalLinks(): Promise<number> {
  const pending = await db
    .select()
    .from(linkCheckResults)
    .where(and(eq(linkCheckResults.linkType, "external"), isNull(linkCheckResults.ok)))
    .limit(BATCH_SIZE);

  if (pending.length === 0) return 0;

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const chunk = pending.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (result) => {
        const outcome = await checkExternalLink(result.linkUrl);
        await db
          .update(linkCheckResults)
          .set({
            ok: outcome.ok,
            httpStatus: outcome.httpStatus,
            errorMessage: outcome.errorMessage,
            checkedAt: new Date(),
          })
          .where(eq(linkCheckResults.id, result.id));
      })
    );
  }

  const affectedRunIds = Array.from(new Set(pending.map((r) => r.runId)));
  for (const runId of affectedRunIds) {
    await refreshRunAggregates(runId);
  }

  return pending.length;
}

async function refreshRunAggregates(runId: string): Promise<void> {
  const allResults = await db
    .select()
    .from(linkCheckResults)
    .where(eq(linkCheckResults.runId, runId));

  const checkedLinks = allResults.filter((r) => r.ok !== null).length;
  const brokenCount = allResults.filter((r) => r.ok === false).length;
  const stillPending = allResults.some((r) => r.ok === null);

  await db
    .update(linkCheckRuns)
    .set({
      checkedLinks,
      brokenCount,
      status: stillPending ? "running" : "completed",
      completedAt: stillPending ? null : new Date(),
    })
    .where(eq(linkCheckRuns.id, runId));
}

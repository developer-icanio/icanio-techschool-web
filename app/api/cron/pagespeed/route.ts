import { after, NextResponse } from "next/server";
import { allPages } from "@/lib/content/pages";
import { ensureContent } from "@/lib/content/store";
import { hasSpeedKey, latestSpeed, runPageSpeed, type Strategy } from "@/lib/pagespeed";

// Daily PageSpeed run for every page, mobile and desktop (vercel.json cron).
// 76 Google tests take far longer than one function may run (60 s), so each
// call runs ONE parallel set of the stalest tests (each capped at 50 s), then
// hands over to a fresh call of itself until every page has a result from
// the last 20 hours.

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const FRESH_MS = 20 * 60 * 60 * 1000; // a result newer than this counts as done today
const PARALLEL = 8; // tests per call, all started at once
const MAX_HOPS = 20; // safety stop for the relay (76 tests need about 10)

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse(null, { status: 401 });
  if (!hasSpeedKey()) return NextResponse.json({ ok: false, error: "GOOGLE_PAGESPEED_API_KEY is not set." }, { status: 503 });

  const url = new URL(req.url);
  const hop = Number(url.searchParams.get("hop") ?? 0);
  const started = Date.now();

  await ensureContent();
  const latest = (await latestSpeed()) ?? [];
  const lastRun = new Map(latest.map((r) => [`${r.path}|${r.strategy}`, new Date(r.createdAt).getTime()]));
  // Stalest first: never-tested pages, then the oldest results.
  const queue = allPages()
    .flatMap((p) => (["mobile", "desktop"] as Strategy[]).map((s) => ({ path: p.path, strategy: s, at: lastRun.get(`${p.path}|${s}`) ?? 0 })))
    .filter((j) => started - j.at > FRESH_MS)
    .sort((a, b) => a.at - b.at);

  let done = 0;
  const failed: string[] = [];
  await Promise.all(
    queue.slice(0, PARALLEL).map(async (job) => {
      try {
        await runPageSpeed(job.path, job.strategy, "daily schedule", 50_000);
        done++;
      } catch (e) {
        failed.push(`${job.path} (${job.strategy}): ${(e as Error).message.slice(0, 80)}`);
      }
    }),
  );

  const remaining = queue.length - done - failed.length;
  if (remaining > 0 && hop < MAX_HOPS) {
    // Hand over after this response is sent, so this call ends on time.
    const next = new URL(url);
    next.searchParams.set("hop", String(hop + 1));
    after(() => fetch(next, { headers: { authorization: `Bearer ${secret}` } }).catch(() => {}));
  }

  return NextResponse.json({ ok: true, hop, tested: done, failed, remaining, seconds: Math.round((Date.now() - started) / 1000) });
}

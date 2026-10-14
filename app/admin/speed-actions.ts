"use server";

import { requireAdmin } from "@/lib/admin";
import { allPages } from "@/lib/content/pages";
import { rateLimit } from "@/lib/rate-limit";
import { runPageSpeed, type SpeedRow, type Strategy } from "@/lib/pagespeed";

export async function testPage(path: string, strategy: Strategy): Promise<{ ok: true; row: SpeedRow } | { ok: false; error: string }> {
  const me = await requireAdmin();
  // Only this site's own pages, so the Google key can't be used to test other URLs.
  if (!allPages().some((p) => p.path === path) || (strategy !== "mobile" && strategy !== "desktop")) return { ok: false, error: "Unknown page." };
  // Each test spends Google API quota; "Test all pages" uses 76.
  if (!(await rateLimit("pagespeed:hour", me.email, 200, 60 * 60_000)).ok) return { ok: false, error: "Too many tests in the last hour (200 max). Try again later." };
  try {
    return { ok: true, row: await runPageSpeed(path, strategy, me.email) };
  } catch (e) {
    return { ok: false, error: (e as Error).message.slice(0, 300) };
  }
}

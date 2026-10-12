"use server";

import { requireAdmin } from "@/lib/admin";
import { runPageSpeed, type SpeedRow, type Strategy } from "@/lib/pagespeed";

export async function testPage(path: string, strategy: Strategy): Promise<{ ok: true; row: SpeedRow } | { ok: false; error: string }> {
  const me = await requireAdmin();
  try {
    return { ok: true, row: await runPageSpeed(path, strategy, me.email) };
  } catch (e) {
    return { ok: false, error: (e as Error).message.slice(0, 300) };
  }
}

import { NextResponse } from "next/server";
import { saveSnapshot } from "@/lib/admin";

// Daily snapshot for the scoreboard trend. Vercel Cron sends
// "Authorization: Bearer $CRON_SECRET" (see vercel.json).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse(null, { status: 401 });
  const saved = await saveSnapshot("cron", "Daily snapshot");
  return NextResponse.json({ ok: saved });
}

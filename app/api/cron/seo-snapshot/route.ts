import { NextResponse } from "next/server";
import { saveSnapshot } from "@/lib/admin";
import { hasCronSecret } from "@/lib/security";

// Daily snapshot for the scoreboard trend. Vercel Cron sends
// "Authorization: Bearer $CRON_SECRET" (see vercel.json).
export async function GET(req: Request) {
  if (!hasCronSecret(req)) return new NextResponse(null, { status: 401 });
  const saved = await saveSnapshot("cron", "Daily snapshot");
  return NextResponse.json({ ok: saved });
}

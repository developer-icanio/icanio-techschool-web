import { processPendingExternalLinks } from "@/lib/linkChecker";

// Triggered once/day by vercel.json's cron entry. Not covered by
// proxy.ts, so it's guarded by its own shared-secret check instead of
// admin session auth — Vercel Cron can't carry a logged-in user's
// session.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const checked = await processPendingExternalLinks();
  return Response.json({ checked });
}

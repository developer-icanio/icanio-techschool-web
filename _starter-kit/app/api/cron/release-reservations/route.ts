import { expireStaleReservations } from "@/lib/inventory";

// Vercel's free tier caps cron frequency at once/day, so this is
// cleanup, not the release mechanism — getAvailableStock() already
// excludes reservations past their expiresAt in real time regardless of
// whether this has run. This just flips their status so the admin
// Reservations view shows "expired" instead of a stale "active" label.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const count = await expireStaleReservations();
  return Response.json({ expired: count });
}

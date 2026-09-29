import { db } from "@/db";
import { orders } from "@/db/schema";
import { and, eq, isNull, isNotNull, gte, lte } from "drizzle-orm";
import { sendAbandonedCartReminder } from "@/lib/resend";
import { getSitewideOffers } from "@/lib/discounts";

// A "pending" order is a checkout that was started (order + items written,
// stock reserved) but never paid. This emails one reminder for each such
// order that has an email address and hasn't been reminded yet.
//
// Vercel's free tier runs crons once/day, so the window is wide (2h to
// 3 days old) rather than the ideal 1-4h nudge. For faster cadence, point
// an external scheduler (cron-job.org, etc.) at this same endpoint with
// the CRON_SECRET bearer token.
const MIN_AGE_HOURS = 2;
const MAX_AGE_DAYS = 3;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = Date.now();
  const notBefore = new Date(now - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const notAfter = new Date(now - MIN_AGE_HOURS * 60 * 60 * 1000);

  const abandoned = await db.query.orders.findMany({
    where: and(
      eq(orders.status, "pending"),
      isNotNull(orders.guestEmail),
      isNull(orders.cartReminderSentAt),
      gte(orders.createdAt, notBefore),
      lte(orders.createdAt, notAfter),
    ),
    with: { items: true },
  });

  const offers = await getSitewideOffers().catch(() => []);
  const firstOrderCode = offers.find((o) => o.firstOrderOnly)?.code ?? null;

  let sent = 0;
  for (const order of abandoned) {
    if (!order.guestEmail || order.items.length === 0) continue;
    await sendAbandonedCartReminder({
      orderNumber: order.orderNumber,
      customerName: order.guestName ?? "there",
      customerEmail: order.guestEmail,
      total: order.total,
      items: order.items.map((item) => ({
        productName: item.productName,
        options: (item.variantOptionsJson as Record<string, string> | null) ?? null,
        sku: null,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
      firstOrderCode,
    });
    await db
      .update(orders)
      .set({ cartReminderSentAt: new Date() })
      .where(eq(orders.id, order.id));
    sent += 1;
  }

  return Response.json({ candidates: abandoned.length, sent });
}

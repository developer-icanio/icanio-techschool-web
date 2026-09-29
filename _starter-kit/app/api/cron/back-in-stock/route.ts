import { db } from "@/db";
import { stockNotifications, products, productVariants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAvailableStockBatch } from "@/lib/inventory";
import { sendBackInStockEmail } from "@/lib/resend";

// Daily sweep of "email me when it's back" requests. For each pending
// row whose variant is purchasable again (availability computed through
// the InventoryService, so order-based products are handled), sends one
// alert and marks the row "notified".
//
// Vercel's free tier runs crons once/day; that cadence is fine here since
// the alert is "it's available" not "it's about to sell out". Point an
// external scheduler at this endpoint with the CRON_SECRET bearer token
// for a tighter loop.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const pending = await db
    .select({
      id: stockNotifications.id,
      email: stockNotifications.email,
      variantId: stockNotifications.variantId,
      options: productVariants.optionsJson,
      productName: products.name,
      productSlug: products.slug,
    })
    .from(stockNotifications)
    .innerJoin(productVariants, eq(productVariants.id, stockNotifications.variantId))
    .innerJoin(products, eq(products.id, stockNotifications.productId))
    .where(eq(stockNotifications.status, "pending"));

  if (pending.length === 0) {
    return Response.json({ candidates: 0, sent: 0 });
  }

  const availability = await getAvailableStockBatch([
    ...new Set(pending.map((row) => row.variantId)),
  ]);

  let sent = 0;
  for (const row of pending) {
    if ((availability.get(row.variantId) ?? 0) <= 0) continue;

    const options = (row.options as Record<string, string> | null) ?? {};
    await sendBackInStockEmail({
      email: row.email,
      productName: row.productName,
      productSlug: row.productSlug,
      optionLabel: Object.values(options).filter(Boolean).join(" / "),
    });
    await db
      .update(stockNotifications)
      .set({ status: "notified", notifiedAt: new Date() })
      .where(eq(stockNotifications.id, row.id));
    sent += 1;
  }

  return Response.json({ candidates: pending.length, sent });
}

"use server";

import { db } from "@/db";
import { orders, orderStatusEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// No auth check inside this action itself — same as every other admin
// actions.ts file in this codebase (leads, inventory, ...): proxy.ts's
// /admin gate already covers a server action's POST, since Next routes
// it through the originating page's own URL.
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, orderId));
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

// Records the courier + tracking number and moves the order to "shipped"
// in one step (the natural moment to capture both). Empty strings are
// stored as null so a cleared field doesn't leave a stray "".
export async function saveShipment(
  orderId: string,
  courierPartner: string,
  trackingNumber: string
): Promise<void> {
  await db
    .update(orders)
    .set({
      courierPartner: courierPartner.trim() || null,
      trackingNumber: trackingNumber.trim() || null,
      status: "shipped",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

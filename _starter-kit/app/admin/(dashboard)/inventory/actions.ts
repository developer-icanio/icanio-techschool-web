"use server";

import { db } from "@/db";
import { warehouses, components, componentStock, productComponentMapping, products, productVariants, orders, componentCategoryEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/auth";
import { applyComponentStockDelta, applyFinishedStockDelta, getMainWarehouseId } from "@/lib/inventory";

async function currentUserId(): Promise<string | undefined> {
  const session = await auth();
  return session?.user?.id;
}

export async function createWarehouse(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!name || !code) return;

  await db.insert(warehouses).values({ name, code });
  revalidatePath("/admin/inventory/warehouses");
}

export async function toggleWarehouseActive(id: string, isActive: boolean) {
  await db.update(warehouses).set({ isActive }).where(eq(warehouses.id, id));
  revalidatePath("/admin/inventory/warehouses");
}

// Creating a component also seeds a zero-stock row for every active
// warehouse so later stock adjustments always have a row to update
// instead of silently no-op'ing against a row that doesn't exist yet.
export async function createComponent(formData: FormData) {
  const type = String(formData.get("type") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  if (!type || !name || !sku) return;

  const color = String(formData.get("color") ?? "").trim();
  const size = String(formData.get("size") ?? "").trim();
  const attributes: Record<string, string> = {};
  if (color) attributes.color = color;
  if (size) attributes.size = size;

  const costPriceRaw = String(formData.get("costPrice") ?? "").trim();
  const costPriceNum = costPriceRaw === "" ? null : Number(costPriceRaw);
  const costPrice = costPriceNum !== null && Number.isFinite(costPriceNum) && costPriceNum > 0 ? String(costPriceNum) : null;

  const categoryRaw = String(formData.get("category") ?? "").trim();
  const category = (componentCategoryEnum.enumValues as readonly string[]).includes(categoryRaw)
    ? (categoryRaw as (typeof componentCategoryEnum.enumValues)[number])
    : "raw_material";

  const [component] = await db
    .insert(components)
    .values({ type, name, sku, attributes: Object.keys(attributes).length ? attributes : null, costPrice, category })
    .returning();

  const allWarehouses = await db.select().from(warehouses).where(eq(warehouses.isActive, true));
  if (allWarehouses.length > 0) {
    await db.insert(componentStock).values(
      allWarehouses.map((w) => ({ componentId: component.id, warehouseId: w.id, quantity: 0 }))
    );
  }

  revalidatePath("/admin/inventory/components");
}

// Editable after creation too — the create form is where you'd know a
// cost right away, but plenty of components will get their real cost
// filled in later (a purchase invoice comes in, a supplier price
// changes). A blank input clears the value rather than being ignored,
// matching how you'd expect "clear the field, hit save" to behave on a
// single-record edit form (unlike the master-data bulk-edit spreadsheet,
// where blank means "don't touch this row" across hundreds of rows at
// once — different UI, different right default).
export async function updateComponentCostPrice(componentId: string, costPriceInput: string) {
  const trimmed = costPriceInput.trim();
  let costPrice: string | null = null;
  if (trimmed !== "") {
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0) return;
    costPrice = String(n);
  }
  await db.update(components).set({ costPrice }).where(eq(components.id, componentId));
  revalidatePath("/admin/inventory/components");
  revalidatePath(`/admin/inventory/components/${componentId}`);
}

// Which working-capital bucket this component counts toward. Defaults
// to raw_material at creation, but that's a guess for anything that
// isn't obviously a blank or a print — this is how it gets corrected.
export async function updateComponentCategory(
  componentId: string,
  category: (typeof componentCategoryEnum.enumValues)[number]
) {
  if (!(componentCategoryEnum.enumValues as readonly string[]).includes(category)) return;
  await db.update(components).set({ category }).where(eq(components.id, componentId));
  revalidatePath("/admin/inventory/components");
  revalidatePath(`/admin/inventory/components/${componentId}`);
}

export async function recordComponentStockChange(input: {
  componentId: string;
  warehouseId: string;
  quantity: number;
  type: "purchase_in" | "manufacturing_in" | "adjustment_in" | "adjustment_out";
  note?: string;
}) {
  const userId = await currentUserId();
  const delta = input.type === "adjustment_out" ? -Math.abs(input.quantity) : Math.abs(input.quantity);

  await db.transaction(async (tx) => {
    await applyComponentStockDelta(tx, input.componentId, input.warehouseId, delta, {
      type: input.type,
      referenceType: "manual",
      note: input.note,
      performedByUserId: userId,
    });
  });

  revalidatePath("/admin/inventory/components");
  revalidatePath(`/admin/inventory/components/${input.componentId}`);
  revalidatePath("/admin/inventory/movements");
}

export async function recordFinishedGoodsStockChange(input: {
  variantId: string;
  quantity: number;
  type: "purchase_in" | "manufacturing_in" | "adjustment_in" | "adjustment_out";
  note?: string;
}) {
  const userId = await currentUserId();
  const delta = input.type === "adjustment_out" ? -Math.abs(input.quantity) : Math.abs(input.quantity);

  await db.transaction(async (tx) => {
    await applyFinishedStockDelta(tx, input.variantId, delta, {
      type: input.type,
      referenceType: "manual",
      note: input.note,
      performedByUserId: userId,
    });
  });

  revalidatePath("/admin/inventory/finished-goods");
  revalidatePath("/admin/inventory/movements");
  // Stock is part of the cached getAllProducts() shape (see lib/products.ts),
  // so bust it or the storefront's in-stock/out-of-stock state keeps
  // showing the pre-adjustment number for up to an hour.
  updateTag("products");
}

export type SaleChannel = "myntra" | "flipkart" | "website_order";

// Records an out-of-band sale (a marketplace order placed on Myntra or
// Flipkart, which never touches our own checkout/reservation flow, or a
// backfill of a website order) as a manual sale_out movement. For a
// website order the admin links it to a real `orders` row by order
// number so the ledger can be traced back to it; Myntra/Flipkart have no
// local order record, so their reference is just the free-text note.
// Deducts the same way checkout's consumeReservation() does: finished-
// goods variants lose stock directly, order-based (component) variants
// deduct every mapped component (blank tee + DTF film) by its
// quantityRequired, so a sale on any design still reduces the shared
// blank-tee pool for every other design in that color/size.
export async function recordSale(input: {
  sku: string;
  quantity: number;
  channel: SaleChannel;
  orderNumber?: string;
  note?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const sku = input.sku.trim();
  const quantity = Math.abs(Math.trunc(input.quantity));
  if (!sku) return { success: false, error: "Enter a variant SKU." };
  if (!quantity) return { success: false, error: "Enter a quantity greater than 0." };

  const variant = await db.query.productVariants.findFirst({
    where: eq(productVariants.sku, sku),
    with: { product: true },
  });
  if (!variant) return { success: false, error: `No variant found with SKU "${sku}".` };

  let referenceId: string | undefined;
  if (input.channel === "website_order") {
    const orderNumber = (input.orderNumber ?? "").trim();
    if (!orderNumber) return { success: false, error: "Enter the website order number to link." };
    const order = await db.query.orders.findFirst({ where: eq(orders.orderNumber, orderNumber) });
    if (!order) return { success: false, error: `No website order found with number "${orderNumber}".` };
    referenceId = order.id;
  }

  const userId = await currentUserId();
  const note = [input.channel === "website_order" ? input.orderNumber?.trim() : undefined, input.note?.trim()]
    .filter(Boolean)
    .join(" - ") || undefined;
  const movementBase = {
    type: "sale_out" as const,
    referenceType: input.channel,
    referenceId,
    note,
    performedByUserId: userId,
  };

  await db.transaction(async (tx) => {
    if (variant.product.inventoryStrategy === "finished_goods") {
      await applyFinishedStockDelta(tx, variant.id, -quantity, movementBase);
    } else {
      const mappings = await tx
        .select()
        .from(productComponentMapping)
        .where(eq(productComponentMapping.variantId, variant.id));
      const warehouseId = await getMainWarehouseId();
      for (const mapping of mappings) {
        await applyComponentStockDelta(tx, mapping.componentId, warehouseId, -(mapping.quantityRequired * quantity), movementBase);
      }
    }
  });

  revalidatePath("/admin/inventory/movements");
  revalidatePath("/admin/inventory/finished-goods");
  revalidatePath("/admin/inventory/components");
  return { success: true };
}

export async function updateProductStrategy(productId: string, strategy: "order_based" | "finished_goods") {
  await db.update(products).set({ inventoryStrategy: strategy }).where(eq(products.id, productId));
  revalidatePath("/admin/products");
  updateTag("products");
}

export async function addComponentMapping(variantId: string, componentId: string, quantityRequired: number) {
  if (!componentId || quantityRequired < 1) return;
  await db
    .insert(productComponentMapping)
    .values({ variantId, componentId, quantityRequired })
    .onConflictDoUpdate({
      target: [productComponentMapping.variantId, productComponentMapping.componentId],
      set: { quantityRequired },
    });
  revalidatePath(`/admin/products`);
}

export async function removeComponentMapping(mappingId: string) {
  await db.delete(productComponentMapping).where(eq(productComponentMapping.id, mappingId));
  revalidatePath(`/admin/products`);
}

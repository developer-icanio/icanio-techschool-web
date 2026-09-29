"use server";

import { db } from "@/db";
import { productVariants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

export async function updateVariantCompareAtPrice(
  variantId: string,
  compareAtPrice: string
) {
  const trimmed = compareAtPrice.trim();
  const value = trimmed === "" ? null : trimmed;

  if (value !== null) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error("Compare-at price must be a positive number");
    }
  }

  await db
    .update(productVariants)
    .set({ compareAtPrice: value })
    .where(eq(productVariants.id, variantId));

  revalidatePath("/admin/products");
  revalidatePath("/shop");
  // compareAtPrice is part of the cached getAllProducts() shape (see
  // lib/products.ts), so bust it too or the storefront keeps showing the
  // old offer price for up to an hour.
  updateTag("products");
}

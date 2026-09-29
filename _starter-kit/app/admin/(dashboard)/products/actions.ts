"use server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

export async function updateProductSku(id: string, sku: string) {
  await db
    .update(products)
    .set({ sku: sku.trim() || null })
    .where(eq(products.id, id));
  revalidatePath("/admin/products");
  // SKU is part of the cached getAllProducts() shape (see lib/products.ts),
  // so bust it or the storefront/shop keep showing the old value for up to
  // an hour.
  updateTag("products");
}

// Hides/shows a product on the storefront — getAllProducts() (shop grid,
// homepage, sitemaps, the Google Shopping feed, everywhere public) already
// filters to isActive=true; nothing before this action could ever set it
// to false, so every product has been permanently "live" regardless of
// whether it actually has photos/is ready. The product page at
// /shop/[slug] is a separate direct query (not gated on isActive), so a
// hidden product's URL still resolves if someone has the direct link —
// only the listings/discovery surfaces hide it.
export async function toggleProductActive(id: string, isActive: boolean) {
  await db.update(products).set({ isActive }).where(eq(products.id, id));
  revalidatePath("/admin/products");
  updateTag("products");
}

export async function updateProductSeo(
  id: string,
  metaTitle: string,
  metaDescription: string,
  focusKeyword: string,
  richContent: string,
  slug: string
) {
  await db
    .update(products)
    .set({
      metaTitle: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      focusKeyword: focusKeyword.trim() || null,
      richContent: richContent.trim() || null,
    })
    .where(eq(products.id, id));
  revalidatePath("/admin/seo");
  revalidatePath(`/admin/products/${id}/seo`);
  revalidatePath(`/admin/seo/product/${id}`);
  // richContent renders directly on the live product page
  // (ProductRichContent) — getProductBySlug() isn't cached via
  // unstable_cache, only the route segment's own revalidate=3600, so bust
  // that or the new content won't show for up to an hour.
  revalidatePath(`/shop/${slug}`);
}

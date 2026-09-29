"use server";

import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

export async function updateCategorySeo(
  id: string,
  fields: { seoTitle: string; metaDescription: string; shortDescription: string; keyword: string }
) {
  await db
    .update(categories)
    .set({
      seoTitle: fields.seoTitle.trim() || null,
      metaDescription: fields.metaDescription.trim() || null,
      shortDescription: fields.shortDescription.trim() || null,
      keyword: fields.keyword.trim() || null,
    })
    .where(eq(categories.id, id));

  revalidatePath("/admin/categories");
  revalidatePath(`/admin/categories/${id}/seo`);
  // shortDescription is rendered on the live category page, so bust the
  // cached category list (see lib/products.ts) too.
  updateTag("categories");
}

export async function updateCategoryImage(id: string, imageUrl: string) {
  await db
    .update(categories)
    .set({ imageUrl: imageUrl.trim() || null })
    .where(eq(categories.id, id));

  revalidatePath("/admin/categories");
  revalidatePath(`/admin/categories/${id}/image`);
  updateTag("categories");
}

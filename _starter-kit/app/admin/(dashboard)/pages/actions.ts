"use server";

import { db } from "@/db";
import { pageSeo } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";

export async function updatePageSeo(path: string, metaTitle: string, metaDescription: string) {
  const existing = await db.query.pageSeo.findFirst({ where: eq(pageSeo.path, path) });

  const values = {
    metaTitle: metaTitle.trim() || null,
    metaDescription: metaDescription.trim() || null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(pageSeo).set(values).where(eq(pageSeo.path, path));
  } else {
    await db.insert(pageSeo).values({ path, ...values });
  }

  revalidatePath("/admin/pages");
  revalidatePath(path);
  updateTag("page-seo");
}

"use server";

import { db } from "@/db";
import { heroSlides } from "@/db/schema";
import { eq, asc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface HeroSlideInput {
  eyebrow: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string | null;
  gradient: string;
  isActive: boolean;
}

// Homepage is revalidate: 3600 (ISR) — without this, a slide edit
// wouldn't show live on the homepage for up to an hour, same class of
// bug fixed elsewhere in this app's cache handling.
function revalidateHomepage() {
  revalidatePath("/", "layout");
}

export async function createHeroSlide(input: HeroSlideInput) {
  const [{ value }] = await db.select({ value: count() }).from(heroSlides);

  await db.insert(heroSlides).values({
    ...input,
    subheadline: input.subheadline || null,
    position: Number(value),
  });
  revalidateHomepage();
}

export async function updateHeroSlide(id: string, input: HeroSlideInput) {
  await db
    .update(heroSlides)
    .set({ ...input, subheadline: input.subheadline || null })
    .where(eq(heroSlides.id, id));
  revalidateHomepage();
}

export async function deleteHeroSlide(id: string) {
  await db.delete(heroSlides).where(eq(heroSlides.id, id));
  revalidateHomepage();
}

export async function toggleHeroSlideActive(id: string, isActive: boolean) {
  await db.update(heroSlides).set({ isActive }).where(eq(heroSlides.id, id));
  revalidateHomepage();
}

// Swaps this slide's position with its neighbor in the given direction —
// simplest correct reorder for a handful of rows, no drag-and-drop
// library needed.
export async function moveHeroSlide(id: string, direction: "up" | "down") {
  const all = await db.query.heroSlides.findMany({ orderBy: asc(heroSlides.position) });
  const index = all.findIndex((s) => s.id === id);
  if (index === -1) return;

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= all.length) return;

  const current = all[index];
  const swapWith = all[swapIndex];

  await db.transaction(async (tx) => {
    await tx.update(heroSlides).set({ position: swapWith.position }).where(eq(heroSlides.id, current.id));
    await tx.update(heroSlides).set({ position: current.position }).where(eq(heroSlides.id, swapWith.id));
  });
  revalidateHomepage();
}

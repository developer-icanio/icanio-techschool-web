import { notFound } from "next/navigation";
import { db } from "@/db";
import { heroSlides } from "@/db/schema";
import { eq } from "drizzle-orm";
import HeroSlideForm from "../HeroSlideForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditHeroSlidePage({ params }: PageProps) {
  const { id } = await params;
  const slide = await db.query.heroSlides.findFirst({ where: eq(heroSlides.id, id) });
  if (!slide) notFound();

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold">Edit Hero Slide</h1>
      <HeroSlideForm slide={slide} />
    </div>
  );
}

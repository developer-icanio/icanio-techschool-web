import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { categoryLeafName } from "@/lib/products";
import CategoryImageForm from "./CategoryImageForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CategoryImagePage({ params }: PageProps) {
  const { id } = await params;

  const category = await db.query.categories.findFirst({ where: eq(categories.id, id) });
  if (!category) notFound();

  const leafName = categoryLeafName(category.name);
  // A starting-point prompt for an AI image generator — categories only
  // have one cover image (unlike blog posts' three, with their own
  // generator + upload pipeline), so this is a suggestion to paste
  // elsewhere rather than a full generate-and-upload workflow.
  const suggestedPrompt = `Studio product photograph for an Indian kidswear e-commerce category page titled "${leafName}". Bright, clean, softly lit flat-lay or on-model shot of 100% cotton children's clothing, pastel background, no text or logos, high resolution, editorial e-commerce style.`;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/categories" className="text-sm text-slate-500 hover:underline">
          &larr; Back to Categories
        </Link>
        <h1 className="mt-2 text-4xl font-bold">{category.name}</h1>
        <p className="mt-2 text-gray-500">
          Cover image URL for this category. Upload the image to R2 or another host first, then
          paste the resulting URL here.
        </p>
      </div>

      <div className="max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
        <CategoryImageForm id={category.id} imageUrl={category.imageUrl ?? ""} />
      </div>

      <div className="max-w-2xl rounded-xl border bg-gray-50 p-6">
        <h2 className="text-sm font-semibold text-gray-700">Suggested AI Image Prompt</h2>
        <p className="mt-2 text-sm text-gray-600">{suggestedPrompt}</p>
      </div>
    </div>
  );
}

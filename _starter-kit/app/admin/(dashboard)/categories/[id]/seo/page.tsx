import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import CategorySeoForm from "./CategorySeoForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CategorySeoPage({ params }: PageProps) {
  const { id } = await params;

  const category = await db.query.categories.findFirst({ where: eq(categories.id, id) });
  if (!category) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/categories" className="text-sm text-slate-500 hover:underline">
          &larr; Back to Categories
        </Link>
        <h1 className="mt-2 text-4xl font-bold">{category.name}</h1>
        <p className="mt-2 text-gray-500">
          SEO title, meta description, short description (shown on the live category page under
          the heading), and the primary focus keyword.
        </p>
      </div>

      <div className="max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
        <CategorySeoForm
          id={category.id}
          seoTitle={category.seoTitle ?? ""}
          metaDescription={category.metaDescription ?? ""}
          shortDescription={category.shortDescription ?? ""}
          keyword={category.keyword ?? ""}
        />
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import ProductSeoForm from "./ProductSeoForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductSeoPage({ params }: PageProps) {
  const { id } = await params;

  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/seo?tab=products" className="text-sm text-slate-500 hover:underline">
          &larr; Back to SEO Dashboard
        </Link>
        <h1 className="mt-2 text-4xl font-bold">{product.name}</h1>
        <p className="mt-2 text-gray-500">
          Meta title and description control how this product appears in search results.
          Leave blank to fall back to the product name / description on the storefront.
          Focus keyword is optional: if left blank, the product&apos;s category keyword is
          used instead for the keyword-based SEO rules.
        </p>
      </div>

      <div className="max-w-4xl rounded-xl border bg-white p-6 shadow-sm">
        <ProductSeoForm
          id={product.id}
          slug={product.slug}
          metaTitle={product.metaTitle ?? ""}
          metaDescription={product.metaDescription ?? ""}
          focusKeyword={product.focusKeyword ?? ""}
          richContent={product.richContent ?? ""}
        />
      </div>
    </div>
  );
}

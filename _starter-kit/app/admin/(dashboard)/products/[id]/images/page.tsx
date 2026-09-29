import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { products, productVariants, productImages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import ImageManager from "./ImageManager";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductImagesPage({ params }: PageProps) {
  const { id } = await params;

  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) notFound();

  const [variants, images] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, id)),
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position)),
  ]);

  const colors = [
    ...new Set(
      variants
        .map((v) => (v.optionsJson as Record<string, string> | null)?.color)
        .filter((c): c is string => Boolean(c))
    ),
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/products" className="text-sm text-slate-500 hover:underline">
          &larr; Back to Products
        </Link>
        <h1 className="mt-2 text-4xl font-bold">{product.name}</h1>
        <p className="mt-2 text-gray-500">
          Upload one photo per color so the color swatch on the product page swaps the
          displayed image. Leave color unset for a generic shot shown regardless of the
          selected color.
        </p>
      </div>

      <ImageManager
        productId={id}
        colors={colors}
        initialImages={images.map((img) => ({
          id: img.id,
          url: img.url,
          color: img.color,
        }))}
      />
    </div>
  );
}

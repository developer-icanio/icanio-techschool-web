import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { products, productVariants } from "@/db/schema";
import { eq } from "drizzle-orm";
import CompareAtPriceCell from "./CompareAtPriceCell";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductOffersPage({ params }: PageProps) {
  const { id } = await params;

  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) notFound();

  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/products" className="text-sm text-slate-500 hover:underline">
          &larr; Back to Products
        </Link>
        <h1 className="mt-2 text-4xl font-bold">{product.name}</h1>
        <p className="mt-2 text-gray-500">
          Set an offer price (MRP) per variant to show a strikethrough price, discount badge,
          and savings on the shop grid and product page. Leave blank for no offer.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Variant</th>
              <th className="p-3 text-center">SKU</th>
              <th className="p-3 text-center">Selling Price</th>
              <th className="p-3 text-center">Offer Price (MRP)</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => (
              <tr key={variant.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">
                  {Object.entries((variant.optionsJson as Record<string, string>) ?? {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ") || "-"}
                </td>
                <td className="p-3 text-center font-mono text-xs text-gray-500">
                  {variant.sku}
                </td>
                <td className="p-3 text-center font-medium">
                  ₹{Number(variant.price).toFixed(0)}
                </td>
                <td className="p-3 text-center">
                  <CompareAtPriceCell
                    variantId={variant.id}
                    price={variant.price}
                    compareAtPrice={variant.compareAtPrice}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {variants.length === 0 && (
          <p className="p-10 text-center text-gray-400">
            This product has no variants yet.
          </p>
        )}
      </div>
    </div>
  );
}

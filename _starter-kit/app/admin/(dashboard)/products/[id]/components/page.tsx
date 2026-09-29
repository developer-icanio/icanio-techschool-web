import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { products, productVariants, components, productComponentMapping } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import MappingEditor from "./MappingEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductComponentsPage({ params }: PageProps) {
  const { id } = await params;

  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) notFound();

  const [variants, allComponents] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, id)),
    db.select().from(components).where(eq(components.isActive, true)),
  ]);

  const variantIds = variants.map((v) => v.id);
  const allMappings =
    variantIds.length === 0
      ? []
      : await db
          .select({
            id: productComponentMapping.id,
            variantId: productComponentMapping.variantId,
            componentId: productComponentMapping.componentId,
            quantityRequired: productComponentMapping.quantityRequired,
            componentName: components.name,
            componentSku: components.sku,
          })
          .from(productComponentMapping)
          .innerJoin(components, eq(productComponentMapping.componentId, components.id))
          .where(inArray(productComponentMapping.variantId, variantIds));

  const mappingsByVariant = new Map<string, typeof allMappings>();
  for (const m of allMappings) {
    const list = mappingsByVariant.get(m.variantId) ?? [];
    list.push(m);
    mappingsByVariant.set(m.variantId, list);
  }

  const componentOptions = allComponents.map((c) => ({ id: c.id, name: c.name, sku: c.sku }));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/products" className="text-sm text-slate-500 hover:underline">
          &larr; Back to Products
        </Link>
        <h1 className="mt-2 text-4xl font-bold">{product.name}</h1>
        <p className="mt-2 text-gray-500">
          Order-based - no finished stock exists for this product. Map each variant to the
          components (blank apparel, DTF print, ...) it&apos;s assembled from at packing time.
        </p>
      </div>

      <div className="space-y-6">
        {variants.map((variant) => (
          <div key={variant.id} className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {Object.entries((variant.optionsJson as Record<string, string>) ?? {})
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ") || variant.sku}
              </h2>
              <span className="font-mono text-xs text-gray-400">{variant.sku}</span>
            </div>
            <div className="mt-4">
              <MappingEditor
                variantId={variant.id}
                mappings={mappingsByVariant.get(variant.id) ?? []}
                componentOptions={componentOptions}
              />
            </div>
          </div>
        ))}
        {variants.length === 0 && (
          <p className="rounded-xl border bg-white p-6 text-center text-gray-400 shadow-sm">
            This product has no variants yet.
          </p>
        )}
      </div>
    </div>
  );
}

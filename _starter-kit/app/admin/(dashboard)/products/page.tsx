import Link from "next/link";

import { db } from "@/db";
import { productImages, productVariants } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import SkuCell from "./SkuCell";
import StrategyCell from "./StrategyCell";
import StatusCell from "./StatusCell";

type SortOption = "sku" | "name" | "category";

interface PageProps {
  searchParams: Promise<{ q?: string; sort?: string; attention?: string }>;
}

// Deliberately NOT getAllProducts() — that's the public-facing query and
// already filters to isActive=true (so the storefront never shows a
// hidden product). The admin list needs the opposite: see every product,
// active or hidden, or a hidden product would vanish from here too the
// moment someone hides it, with no way back short of a direct DB edit.
async function getAllProductsForAdmin() {
  const rows = await db.query.products.findMany({
    with: {
      category: true,
      images: { orderBy: asc(productImages.position) },
      variants: { where: eq(productVariants.isActive, true) },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    isActive: p.isActive,
    inventoryStrategy: p.inventoryStrategy,
    categoryName: p.category?.name ?? null,
    imageCount: p.images.length,
    variants: p.variants.map((v) => ({ price: v.price, stock: v.stock })),
    // Same fallback as lib/products.ts's getStartingPrice(): only used
    // when a product genuinely has zero active variants.
    startingPrice:
      p.variants.length > 0
        ? Math.min(...p.variants.map((v) => parseFloat(v.price)))
        : parseFloat(p.basePrice),
  }));
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const { q, sort, attention } = await searchParams;
  const allProducts = await getAllProductsForAdmin();

  // A Live product with no photo at all is the one combination that
  // actually looks broken to a shopper — same "needs attention" idea as
  // master-data's warning pill, applied to the storefront catalog now
  // that hiding a product is possible at all.
  const attentionOnly = attention === "1";
  const needsAttention = (p: (typeof allProducts)[number]) => p.isActive && p.imageCount === 0;
  const attentionCount = allProducts.filter(needsAttention).length;

  const query = (q ?? "").trim().toLowerCase();
  const filtered = allProducts.filter((p) => {
    if (attentionOnly && !needsAttention(p)) return false;
    if (!query) return true;
    return (
      p.name.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      p.slug.toLowerCase().includes(query)
    );
  });

  const sortBy: SortOption = sort === "name" || sort === "category" ? sort : "sku";
  const productsSorted = [...filtered].sort((a, b) => {
    if (sortBy === "sku") {
      // Products without a SKU yet sort to the end rather than dumping
      // them first (empty string would otherwise sort before every real
      // SKU).
      if (!a.sku && !b.sku) return a.name.localeCompare(b.name);
      if (!a.sku) return 1;
      if (!b.sku) return -1;
      return a.sku.localeCompare(b.sku, undefined, { numeric: true });
    }
    if (sortBy === "category") {
      return (a.categoryName ?? "").localeCompare(b.categoryName ?? "") || a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Products</h1>
          <p className="mt-2 text-gray-500">
            {allProducts.length} products total{filtered.length !== allProducts.length ? ` (${productsSorted.length} shown)` : ""}.
          </p>
        </div>

        <form className="flex flex-wrap gap-3">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search name or SKU…"
            className="w-72 rounded-lg border px-4 py-2"
          />
          <select name="sort" defaultValue={sortBy} className="rounded-lg border px-4 py-2">
            <option value="sku">Sort by SKU</option>
            <option value="name">Sort by Name</option>
            <option value="category">Sort by Category</option>
          </select>
          <label className="flex items-center gap-1.5 rounded-lg border px-3 text-sm text-gray-700">
            <input type="checkbox" name="attention" value="1" defaultChecked={attentionOnly} className="h-4 w-4 rounded border-gray-300" />
            Needs attention
            {attentionCount > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                {attentionCount}
              </span>
            )}
          </label>
          <button type="submit" className="rounded-lg border px-4 py-2 hover:bg-gray-100">
            Search
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="whitespace-nowrap bg-gray-100">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-center">SKU</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-center">Strategy</th>
              <th className="p-3 text-center">Variants</th>
              <th className="p-3 text-center">From</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {productsSorted.map((product) => (
              <tr key={product.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{product.name}</td>

                <td className="whitespace-nowrap p-3 text-center">
                  <SkuCell id={product.id} sku={product.sku} />
                </td>

                <td className="p-3 text-gray-600">
                  {product.categoryName ?? "Uncategorized"}
                </td>

                <td className="whitespace-nowrap p-3 text-center">
                  <StrategyCell productId={product.id} strategy={product.inventoryStrategy} />
                </td>

                <td className="p-3 text-center text-gray-600">
                  {product.variants.length}
                </td>

                <td className="whitespace-nowrap p-3 text-center font-medium">
                  ₹{product.startingPrice.toFixed(0)}
                </td>

                <td className="whitespace-nowrap p-3 text-center">
                  <StatusCell
                    productId={product.id}
                    isActive={product.isActive}
                    missingPhoto={product.imageCount === 0}
                  />
                </td>

                <td className="whitespace-nowrap p-3 text-center">
                  <div className="flex justify-center gap-2">
                    {product.inventoryStrategy === "order_based" && (
                      <Link
                        href={`/admin/products/${product.id}/components`}
                        className="whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                      >
                        Components
                      </Link>
                    )}
                    <Link
                      href={`/admin/products/${product.id}/offers`}
                      className="whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      Offers
                    </Link>
                    <Link
                      href={`/admin/products/${product.id}/images`}
                      className="whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      Images
                    </Link>
                    <Link
                      href={`/admin/seo/product/${product.id}`}
                      className="whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      SEO
                    </Link>
                    <Link
                      href={`/shop/${product.slug}`}
                      target="_blank"
                      className="whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      View
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {productsSorted.length === 0 && (
          <p className="p-10 text-center text-gray-500">
            No products found.
          </p>
        )}
      </div>
    </div>
  );
}

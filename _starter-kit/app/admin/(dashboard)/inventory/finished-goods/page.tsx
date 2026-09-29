import { db } from "@/db";
import { productVariants, products } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import FinishedStockCell from "./FinishedStockCell";

type SortOption = "sku" | "design";

interface PageProps {
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export default async function FinishedGoodsPage({ searchParams }: PageProps) {
  const { q, sort } = await searchParams;

  const rows = await db
    .select({
      variantId: productVariants.id,
      sku: productVariants.sku,
      optionsJson: productVariants.optionsJson,
      stock: productVariants.stock,
      productName: products.name,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(products.inventoryStrategy, "finished_goods"), eq(productVariants.isActive, true)))
    .orderBy(asc(products.name));

  const query = (q ?? "").trim().toLowerCase();
  const filtered = query
    ? rows.filter((r) => r.productName.toLowerCase().includes(query) || r.sku.toLowerCase().includes(query))
    : rows;

  const sortBy: SortOption = sort === "sku" ? "sku" : "design";
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "sku") return a.sku.localeCompare(b.sku, undefined, { numeric: true });
    return a.productName.localeCompare(b.productName) || a.sku.localeCompare(b.sku, undefined, { numeric: true });
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Finished Goods Inventory</h1>
        <p className="mt-2 text-gray-500">
          {rows.length} variants already manufactured and held as finished stock - click a number
          to adjust it.
        </p>
      </div>

      <form className="flex gap-3">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search product or SKU…"
          className="w-72 rounded-lg border px-4 py-2"
        />
        <select name="sort" defaultValue={sortBy} className="rounded-lg border px-4 py-2">
          <option value="design">Sort by Design</option>
          <option value="sku">Sort by SKU</option>
        </select>
        <button type="submit" className="rounded-lg border px-4 py-2 hover:bg-gray-100">
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-left">SKU</th>
              <th className="p-3 text-left">Options</th>
              <th className="p-3 text-center">Stock</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.variantId} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{r.productName}</td>
                <td className="p-3 font-mono text-xs text-gray-600">{r.sku}</td>
                <td className="p-3 text-gray-600">
                  {Object.entries((r.optionsJson as Record<string, string>) ?? {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")}
                </td>
                <td className="p-3 text-center">
                  <FinishedStockCell variantId={r.variantId} stock={r.stock} />
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400">
                  No finished-goods variants match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

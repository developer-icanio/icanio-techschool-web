import Link from "next/link";
import { db } from "@/db";
import { components, componentStock } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { createComponent, updateComponentCategory } from "../actions";

type SortOption = "sku" | "name" | "type" | "stock";
type Category = "raw_material" | "consumable";

const CATEGORY_LABELS: Record<Category, string> = {
  raw_material: "Raw Material",
  consumable: "Consumable",
};

interface PageProps {
  searchParams: Promise<{ q?: string; type?: string; category?: string; sort?: string }>;
}

export default async function ComponentsPage({ searchParams }: PageProps) {
  const { q, type: typeFilter, category: categoryFilter, sort } = await searchParams;

  const allRows = await db
    .select({
      id: components.id,
      type: components.type,
      name: components.name,
      sku: components.sku,
      attributes: components.attributes,
      isActive: components.isActive,
      costPrice: components.costPrice,
      category: components.category,
      totalStock: sql<number>`COALESCE(SUM(${componentStock.quantity}), 0)`,
    })
    .from(components)
    .leftJoin(componentStock, eq(componentStock.componentId, components.id))
    .groupBy(components.id)
    .orderBy(desc(components.createdAt));

  // Split by category rather than one combined figure — raw materials
  // (blanks, DTF: become part of the sellable product) and consumables
  // (packing covers, hang tags, ...: used in fulfilment, never part of
  // the product) are different kinds of capital tied up, worth seeing
  // separately rather than merged into one number that answers neither
  // question precisely.
  function valueFor(cat: Category): number {
    return allRows
      .filter((c) => c.category === cat)
      .reduce((sum, c) => sum + (c.costPrice ? Number(c.costPrice) * Number(c.totalStock) : 0), 0);
  }
  function costedCountFor(cat: Category): { costed: number; total: number } {
    const rows = allRows.filter((c) => c.category === cat);
    return { costed: rows.filter((c) => c.costPrice).length, total: rows.length };
  }
  const rawMaterialValue = valueFor("raw_material");
  const consumableValue = valueFor("consumable");
  const rawMaterialCounts = costedCountFor("raw_material");
  const consumableCounts = costedCountFor("consumable");

  const distinctTypes = [...new Set(allRows.map((c) => c.type))].sort();

  const query = (q ?? "").trim().toLowerCase();
  const filtered = allRows.filter((c) => {
    if (typeFilter && c.type !== typeFilter) return false;
    if (categoryFilter && c.category !== categoryFilter) return false;
    if (!query) return true;
    const attrText = c.attributes
      ? Object.values(c.attributes as Record<string, string>).join(" ").toLowerCase()
      : "";
    return (
      c.name.toLowerCase().includes(query) ||
      c.sku.toLowerCase().includes(query) ||
      attrText.includes(query)
    );
  });

  const sortBy: SortOption =
    sort === "name" || sort === "type" || sort === "stock" ? sort : "sku";
  const rows = [...filtered].sort((a, b) => {
    if (sortBy === "sku") return a.sku.localeCompare(b.sku, undefined, { numeric: true });
    if (sortBy === "type") return a.type.localeCompare(b.type) || a.sku.localeCompare(b.sku, undefined, { numeric: true });
    if (sortBy === "stock") return Number(b.totalStock) - Number(a.totalStock);
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Components</h1>
        <p className="mt-2 text-gray-500">
          {allRows.length} components{filtered.length !== allRows.length ? ` (${rows.length} shown)` : ""}. Blanks, DTF prints, and any future component type (hang tags,
          polybags, ...) all live here; the type field is free text, not a fixed list.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Raw material working capital</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            ₹{rawMaterialValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {rawMaterialCounts.costed} of {rawMaterialCounts.total} raw materials have a cost on file
            {rawMaterialCounts.costed < rawMaterialCounts.total ? " - a floor until the rest do too" : ""}.
          </p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Consumables working capital</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">
            ₹{consumableValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {consumableCounts.costed} of {consumableCounts.total} consumables have a cost on file
            {consumableCounts.costed < consumableCounts.total ? " - a floor until the rest do too" : ""}.
          </p>
        </div>
      </div>

      <form
        action={createComponent}
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Type</label>
          <input
            name="type"
            type="text"
            required
            placeholder="blank_apparel / dtf_print / ..."
            className="w-48 rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Name</label>
          <input
            name="name"
            type="text"
            required
            placeholder="Blank Tshirt Black 5-6Y"
            className="w-56 rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">SKU</label>
          <input name="sku" type="text" required className="w-40 rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Category</label>
          <select name="category" defaultValue="raw_material" className="w-36 rounded-lg border px-3 py-2 text-sm">
            <option value="raw_material">Raw Material</option>
            <option value="consumable">Consumable</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Color (optional)</label>
          <input name="color" type="text" className="w-32 rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Size (optional)</label>
          <input name="size" type="text" className="w-32 rounded-lg border px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Cost price ₹ (optional)</label>
          <input
            name="costPrice"
            type="number"
            min={0}
            step="0.001"
            placeholder="e.g. 85.00"
            className="w-32 rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          Add Component
        </button>
      </form>

      <form className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Search</label>
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Name, SKU, color, size…"
            className="w-64 rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Type</label>
          <select name="type" defaultValue={typeFilter ?? ""} className="w-48 rounded-lg border px-3 py-2 text-sm">
            <option value="">All types</option>
            {distinctTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Category</label>
          <select name="category" defaultValue={categoryFilter ?? ""} className="w-40 rounded-lg border px-3 py-2 text-sm">
            <option value="">All categories</option>
            <option value="raw_material">Raw Material</option>
            <option value="consumable">Consumable</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Sort by</label>
          <select name="sort" defaultValue={sortBy} className="w-40 rounded-lg border px-3 py-2 text-sm">
            <option value="sku">SKU</option>
            <option value="name">Name</option>
            <option value="type">Type</option>
            <option value="stock">Total Stock</option>
          </select>
        </div>
        <button type="submit" className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100">
          Filter
        </button>
        {(query || typeFilter || categoryFilter || sort) && (
          <Link href="/admin/inventory/components" className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100">
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="whitespace-nowrap bg-gray-100">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">SKU</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-center">Attributes</th>
              <th className="p-3 text-center">Category</th>
              <th className="p-3 text-center">Cost Price</th>
              <th className="p-3 text-center">Total Stock</th>
              <th className="p-3 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const otherCategory: Category = c.category === "raw_material" ? "consumable" : "raw_material";
              return (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="whitespace-nowrap p-3 font-mono text-xs text-gray-600">{c.sku}</td>
                  <td className="p-3 text-gray-600">{c.type}</td>
                  <td className="p-3 text-center text-xs text-gray-500">
                    {c.attributes
                      ? Object.entries(c.attributes as Record<string, string>)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")
                      : " - "}
                  </td>
                  <td className="whitespace-nowrap p-3 text-center">
                    <form
                      action={async () => {
                        "use server";
                        await updateComponentCategory(c.id, otherCategory);
                      }}
                    >
                      <button
                        type="submit"
                        title={`Click to mark as ${CATEGORY_LABELS[otherCategory]}`}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          c.category === "raw_material"
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                        }`}
                      >
                        {CATEGORY_LABELS[c.category as Category]}
                      </button>
                    </form>
                  </td>
                  <td className="whitespace-nowrap p-3 text-center text-gray-700">
                    {c.costPrice ? (
                      // Up to 3 decimals (matches the column's real
                      // precision — a bulk-purchase unit cost like
                      // ₹2.183 shouldn't silently show as ₹2.18), but
                      // trimmed of trailing zeros so a plain ₹105 doesn't
                      // render as "₹105.000".
                      `₹${Number(Number(c.costPrice).toFixed(3))}`
                    ) : (
                      <span className="text-gray-400">–</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 text-center">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        Number(c.totalStock) <= 0
                          ? "bg-red-100 text-red-700"
                          : Number(c.totalStock) <= 10
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                      }`}
                    >
                      {Number(c.totalStock)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-3 text-center">
                    <Link
                      href={`/admin/inventory/components/${c.id}`}
                      className="whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      Manage Stock
                    </Link>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  No components yet. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

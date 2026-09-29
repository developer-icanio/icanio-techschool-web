import { getMasterProductList } from "@/lib/masterData";
import MasterDataTable from "./MasterDataTable";
import BulkEditPanel from "./BulkEditPanel";

export default async function MasterDataListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const allProducts = await getMasterProductList();
  const query = q?.trim().toLowerCase();
  const products = query
    ? allProducts.filter(
        (p) => p.itemName?.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)
      )
    : allProducts;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Marketplace Listings</h1>
        <p className="mt-2 text-gray-500">
          {allProducts.length} product design{allProducts.length === 1 ? "" : "s"} - edit details,
          enable/disable colors, manage photos, and generate a bulk-upload file for any marketplace.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or SKU…"
          className="w-full max-w-sm rounded-lg border px-4 py-2.5 text-sm"
        />
        <button type="submit" className="rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-gray-50">
          Search
        </button>
      </form>

      <BulkEditPanel />

      <MasterDataTable products={products} />
    </div>
  );
}

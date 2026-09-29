import { db } from "@/db";
import { stockMovements, components, productVariants, products, warehouses, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatDisplayDate } from "@/lib/formatDate";
import RecordSaleForm from "./RecordSaleForm";

const REFERENCE_LABELS: Record<string, string> = {
  website_order: "Website",
  myntra: "Myntra",
  flipkart: "Flipkart",
  order: "Website",
  manual: "Manual",
};

const TYPE_LABELS: Record<string, string> = {
  purchase_in: "Purchase",
  manufacturing_in: "Manufacturing",
  sale_out: "Sale",
  adjustment_in: "Adjustment +",
  adjustment_out: "Adjustment -",
};

const TYPE_COLORS: Record<string, string> = {
  purchase_in: "bg-green-100 text-green-700",
  manufacturing_in: "bg-green-100 text-green-700",
  sale_out: "bg-blue-100 text-blue-700",
  adjustment_in: "bg-amber-100 text-amber-700",
  adjustment_out: "bg-red-100 text-red-700",
};

export default async function MovementsPage() {
  const rows = await db
    .select({
      id: stockMovements.id,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      note: stockMovements.note,
      referenceType: stockMovements.referenceType,
      createdAt: stockMovements.createdAt,
      componentName: components.name,
      productName: products.name,
      variantSku: productVariants.sku,
      warehouseName: warehouses.name,
      performedByName: users.name,
      performedByEmail: users.email,
    })
    .from(stockMovements)
    .leftJoin(components, eq(stockMovements.componentId, components.id))
    .leftJoin(productVariants, eq(stockMovements.variantId, productVariants.id))
    .leftJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(warehouses, eq(stockMovements.warehouseId, warehouses.id))
    .leftJoin(users, eq(stockMovements.performedByUserId, users.id))
    .orderBy(desc(stockMovements.createdAt))
    .limit(200);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Stock Movements</h1>
        <p className="mt-2 text-gray-500">
          Append-only ledger of every purchase entry, manufacturing entry, sale, and manual
          adjustment - the history the deferred fast/slow-moving reports will need later.
        </p>
      </div>

      <RecordSaleForm />

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-left">Warehouse</th>
              <th className="p-3 text-center">Type</th>
              <th className="p-3 text-center">Channel</th>
              <th className="p-3 text-center">Qty</th>
              <th className="p-3 text-left">Note</th>
              <th className="p-3 text-left">By</th>
              <th className="p-3 text-center">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">
                  {m.componentName ?? (m.productName ? `${m.productName} (${m.variantSku})` : " - ")}
                </td>
                <td className="p-3 text-gray-600">{m.warehouseName ?? " - "}</td>
                <td className="p-3 text-center">
                  <span className={`rounded px-2 py-1 text-xs font-medium ${TYPE_COLORS[m.type] ?? "bg-slate-100"}`}>
                    {TYPE_LABELS[m.type] ?? m.type}
                  </span>
                </td>
                <td className="p-3 text-center text-xs text-gray-500">
                  {m.referenceType ? REFERENCE_LABELS[m.referenceType] ?? m.referenceType : " - "}
                </td>
                <td className="p-3 text-center font-medium">{m.quantity}</td>
                <td className="p-3 text-sm text-gray-600">{m.note ?? " - "}</td>
                <td className="p-3 text-sm text-gray-600">{m.performedByName ?? m.performedByEmail ?? "System"}</td>
                <td className="p-3 text-center text-gray-500">{formatDisplayDate(m.createdAt.toISOString())}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  No stock movements recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

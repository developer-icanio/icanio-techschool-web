import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { components, componentStock, warehouses, stockMovements } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatDisplayDate } from "@/lib/formatDate";
import StockEntryForm from "./StockEntryForm";
import CostPriceForm from "./CostPriceForm";
import { updateComponentCategory } from "../../actions";

type Category = "raw_material" | "consumable";
const CATEGORY_LABELS: Record<Category, string> = { raw_material: "Raw Material", consumable: "Consumable" };

interface PageProps {
  params: Promise<{ id: string }>;
}

const MOVEMENT_LABELS: Record<string, string> = {
  purchase_in: "Purchase",
  manufacturing_in: "Manufacturing",
  sale_out: "Sale",
  adjustment_in: "Adjustment +",
  adjustment_out: "Adjustment -",
};

export default async function ComponentDetailPage({ params }: PageProps) {
  const { id } = await params;

  const component = await db.query.components.findFirst({ where: eq(components.id, id) });
  if (!component) notFound();

  const [stockRows, allWarehouses, movements] = await Promise.all([
    db.select().from(componentStock).where(eq(componentStock.componentId, id)),
    db.select().from(warehouses).where(eq(warehouses.isActive, true)),
    db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.componentId, id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(50),
  ]);

  const stockByWarehouse = new Map(stockRows.map((s) => [s.warehouseId, s.quantity]));
  const totalStock = stockRows.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/inventory/components" className="text-sm text-slate-500 hover:underline">
          &larr; Back to Components
        </Link>
        <h1 className="mt-2 text-4xl font-bold">{component.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-gray-500">
          <span>
            SKU {component.sku} · {component.type} · {totalStock} total in stock ·
          </span>
          <form
            action={async () => {
              "use server";
              const other: Category = component.category === "raw_material" ? "consumable" : "raw_material";
              await updateComponentCategory(id, other);
            }}
          >
            <button
              type="submit"
              title={`Click to mark as ${CATEGORY_LABELS[component.category === "raw_material" ? "consumable" : "raw_material"]}`}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                component.category === "raw_material"
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "bg-purple-100 text-purple-700 hover:bg-purple-200"
              }`}
            >
              {CATEGORY_LABELS[component.category as Category]}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-semibold text-gray-900">Cost price</h2>
        <p className="mb-4 text-sm text-gray-500">
          What LAMBLILY pays per unit of this component - never shown to customers, used for margin
          and {component.category === "raw_material" ? "raw-material" : "consumables"} working-capital tracking.
          {component.costPrice && (
            <>
              {" "}
              At {totalStock} on hand, this component alone represents{" "}
              <strong>₹{(Number(component.costPrice) * totalStock).toLocaleString("en-IN")}</strong>{" "}
              tied up in stock.
            </>
          )}
        </p>
        <CostPriceForm componentId={id} initialCostPrice={component.costPrice} />
      </div>

      <div className="space-y-4">
        {allWarehouses.map((w) => (
          <div key={w.id} className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{w.name}</h2>
              <span className="text-2xl font-bold">{stockByWarehouse.get(w.id) ?? 0}</span>
            </div>
            <div className="mt-4">
              <StockEntryForm
                componentId={id}
                warehouseId={w.id}
                warehouseName={w.name}
                currentStock={stockByWarehouse.get(w.id) ?? 0}
              />
            </div>
          </div>
        ))}
        {allWarehouses.length === 0 && (
          <p className="rounded-xl border bg-white p-6 text-center text-gray-400 shadow-sm">
            No active warehouses. <Link href="/admin/inventory/warehouses" className="text-blue-600 hover:underline">Add one</Link> before recording stock.
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Movement History</h2>
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-center">Type</th>
                <th className="p-3 text-center">Quantity</th>
                <th className="p-3 text-left">Note</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-gray-600">{formatDisplayDate(m.createdAt.toISOString())}</td>
                  <td className="p-3 text-center">{MOVEMENT_LABELS[m.type] ?? m.type}</td>
                  <td className="p-3 text-center font-medium">{m.quantity}</td>
                  <td className="p-3 text-gray-600">{m.note ?? " - "}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    No movements recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

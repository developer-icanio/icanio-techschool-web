import Link from "next/link";
import { db } from "@/db";
import { components, componentStock, productVariants, products, reservations, warehouses } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export default async function InventoryDashboardPage() {
  const [componentCount, warehouseCount, activeReservations] = await Promise.all([
    db.$count(components),
    db.$count(warehouses),
    db.$count(reservations, eq(reservations.status, "active")),
  ]);

  // Components whose total stock across all warehouses is at or below a
  // simple flat threshold — a smarter reorder-point calculation belongs
  // in the deferred reports work, not here.
  const LOW_STOCK_THRESHOLD = 10;
  const componentStockTotals = await db
    .select({
      componentId: components.id,
      name: components.name,
      sku: components.sku,
      total: sql<number>`COALESCE(SUM(${componentStock.quantity}), 0)`,
    })
    .from(components)
    .leftJoin(componentStock, eq(componentStock.componentId, components.id))
    .where(eq(components.isActive, true))
    .groupBy(components.id, components.name, components.sku);

  const lowStockComponents = componentStockTotals.filter((c) => Number(c.total) <= LOW_STOCK_THRESHOLD && Number(c.total) > 0);
  const outOfStockComponents = componentStockTotals.filter((c) => Number(c.total) <= 0);

  const finishedGoodsVariants = await db
    .select({
      variantId: productVariants.id,
      sku: productVariants.sku,
      productName: products.name,
      stock: productVariants.stock,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(products.inventoryStrategy, "finished_goods"), eq(productVariants.isActive, true)));

  const lowStockFinished = finishedGoodsVariants.filter((v) => v.stock <= LOW_STOCK_THRESHOLD && v.stock > 0);
  const outOfStockFinished = finishedGoodsVariants.filter((v) => v.stock <= 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Inventory</h1>
        <p className="mt-2 text-gray-500">
          {componentCount} components across {warehouseCount} warehouse{warehouseCount === 1 ? "" : "s"} · {activeReservations} active reservations
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Link href="/admin/inventory/components" className="rounded-xl border bg-white p-5 shadow-sm hover:border-slate-300">
          <p className="text-sm text-gray-500">Components</p>
          <h2 className="mt-2 text-3xl font-bold">{componentCount}</h2>
        </Link>
        <Link href="/admin/inventory/warehouses" className="rounded-xl border bg-white p-5 shadow-sm hover:border-slate-300">
          <p className="text-sm text-gray-500">Warehouses</p>
          <h2 className="mt-2 text-3xl font-bold">{warehouseCount}</h2>
        </Link>
        <Link href="/admin/inventory/reservations" className="rounded-xl border bg-white p-5 shadow-sm hover:border-slate-300">
          <p className="text-sm text-gray-500">Active Reservations</p>
          <h2 className="mt-2 text-3xl font-bold">{activeReservations}</h2>
        </Link>
        <Link href="/admin/inventory/movements" className="rounded-xl border bg-white p-5 shadow-sm hover:border-slate-300">
          <p className="text-sm text-gray-500">Stock Movements</p>
          <h2 className="mt-2 text-3xl font-bold">View Ledger</h2>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-red-700">Out of Stock ({outOfStockComponents.length + outOfStockFinished.length})</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {outOfStockComponents.map((c) => (
              <li key={c.componentId} className="flex justify-between">
                <span>{c.name}</span>
                <span className="font-mono text-gray-400">{c.sku}</span>
              </li>
            ))}
            {outOfStockFinished.map((v) => (
              <li key={v.variantId} className="flex justify-between">
                <span>{v.productName}</span>
                <span className="font-mono text-gray-400">{v.sku}</span>
              </li>
            ))}
            {outOfStockComponents.length + outOfStockFinished.length === 0 && (
              <li className="text-gray-400">Nothing out of stock.</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-amber-700">
            Low Stock (&le;{LOW_STOCK_THRESHOLD}) ({lowStockComponents.length + lowStockFinished.length})
          </h2>
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm">
            {lowStockComponents.slice(0, 20).map((c) => (
              <li key={c.componentId} className="flex justify-between">
                <span>{c.name}</span>
                <span className="font-mono text-gray-400">{Number(c.total)} left</span>
              </li>
            ))}
            {lowStockFinished.slice(0, 20).map((v) => (
              <li key={v.variantId} className="flex justify-between">
                <span className="truncate pr-2">
                  {v.productName} <span className="text-gray-400">({v.sku})</span>
                </span>
                <span className="shrink-0 font-mono text-gray-400">{v.stock} left</span>
              </li>
            ))}
            {lowStockComponents.length + lowStockFinished.length === 0 && (
              <li className="text-gray-400">Nothing running low.</li>
            )}
            {lowStockComponents.length + lowStockFinished.length > 40 && (
              <li className="pt-1 text-xs text-gray-400">
                +{lowStockComponents.length + lowStockFinished.length - 40} more
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

import { db } from "@/db";
import { reservations, productVariants, products, orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatDisplayDate } from "@/lib/formatDate";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  consumed: "bg-green-100 text-green-700",
  released: "bg-slate-100 text-slate-500",
  expired: "bg-amber-100 text-amber-700",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_FILTERS = ["active", "consumed", "released", "expired"] as const;

export default async function ReservationsPage({ searchParams }: PageProps) {
  const { status } = await searchParams;

  const rows = await db
    .select({
      id: reservations.id,
      quantity: reservations.quantity,
      status: reservations.status,
      expiresAt: reservations.expiresAt,
      createdAt: reservations.createdAt,
      productName: products.name,
      variantSku: productVariants.sku,
      orderNumber: orders.orderNumber,
    })
    .from(reservations)
    .innerJoin(productVariants, eq(reservations.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(orders, eq(reservations.orderId, orders.id))
    .where(status && STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number]) ? eq(reservations.status, status as (typeof STATUS_FILTERS)[number]) : undefined)
    .orderBy(desc(reservations.createdAt))
    .limit(200);

  function filterHref(next: string | null) {
    return next ? `/admin/inventory/reservations?status=${next}` : "/admin/inventory/reservations";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Reservations</h1>
        <p className="mt-2 text-gray-500">
          Soft holds placed at checkout. "Active" reservations are what actually reduce available
          stock - nothing else touches it until an order is confirmed or a hold expires.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={filterHref(null)}
          className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${!status ? "bg-brand-700 text-white" : "hover:bg-gray-100"}`}
        >
          All
        </a>
        {STATUS_FILTERS.map((s) => (
          <a
            key={s}
            href={filterHref(s)}
            className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${status === s ? "bg-brand-700 text-white" : "hover:bg-gray-100"}`}
          >
            {s}
          </a>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-left">Order</th>
              <th className="p-3 text-center">Qty</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Expires</th>
              <th className="p-3 text-center">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">
                  {r.productName}
                  <span className="ml-2 font-mono text-xs text-gray-400">{r.variantSku}</span>
                </td>
                <td className="p-3 text-gray-600">{r.orderNumber ?? " - "}</td>
                <td className="p-3 text-center">{r.quantity}</td>
                <td className="p-3 text-center">
                  <span className={`rounded px-3 py-1 text-xs capitalize ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                </td>
                <td className="p-3 text-center text-gray-500">{formatDisplayDate(r.expiresAt.toISOString())}</td>
                <td className="p-3 text-center text-gray-500">{formatDisplayDate(r.createdAt.toISOString())}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No reservations match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

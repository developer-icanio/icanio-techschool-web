import Link from "next/link";
import { db } from "@/db";
import { orders, orderStatusEnum } from "@/db/schema";
import { desc, eq, count } from "drizzle-orm";

type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

// "pending" (cart created, payment never completed) is deliberately not
// in this filter row — those aren't real orders to fulfill, just
// abandoned checkouts. The default "All" view still includes them (via
// the total count query below) so nothing's hidden, just not the first
// thing a "what do I need to pack today" glance lands on.
const STATUS_FILTERS: OrderStatus[] = [
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-slate-100 text-slate-500",
  paid: "bg-blue-100 text-blue-700",
  processing: "bg-amber-100 text-amber-700",
  shipped: "bg-cyan-100 text-cyan-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-purple-100 text-purple-700",
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const { status } = await searchParams;
  const activeStatus = (STATUS_FILTERS as readonly string[]).includes(status ?? "")
    ? (status as OrderStatus)
    : undefined;

  const allOrders = await db.query.orders.findMany({
    where: activeStatus ? eq(orders.status, activeStatus) : undefined,
    orderBy: [desc(orders.createdAt)],
    limit: 200,
    with: { items: true },
  });

  const [{ total }] = await db.select({ total: count() }).from(orders);

  function filterHref(nextStatus: OrderStatus | null) {
    return nextStatus ? `/admin/orders?status=${nextStatus}` : "/admin/orders";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Orders</h1>
        <p className="mt-2 text-gray-500">
          {allOrders.length} of {total} total orders
          {activeStatus ? ` matching "${activeStatus}"` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={filterHref(null)}
          className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${
            !activeStatus ? "bg-brand-700 text-white" : "hover:bg-gray-100"
          }`}
        >
          All
        </a>
        {STATUS_FILTERS.map((s) => (
          <a
            key={s}
            href={filterHref(s)}
            className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${
              activeStatus === s ? "bg-brand-700 text-white" : "hover:bg-gray-100"
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Order #</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-center">Items</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Placed</th>
            </tr>
          </thead>
          <tbody>
            {allOrders.map((order) => (
              <tr key={order.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">
                  <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="p-3 text-gray-600">
                  {order.guestName ?? "(no name)"}
                  <br />
                  <span className="text-xs text-gray-400">{order.guestPhone ?? order.guestEmail ?? ""}</span>
                </td>
                <td className="p-3 text-center text-gray-600">{order.items.length}</td>
                <td className="p-3 text-right font-medium">₹{order.total}</td>
                <td className="p-3 text-center">
                  <span className={`rounded px-3 py-1 text-xs capitalize ${STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="p-3 text-center text-gray-500">
                  {order.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </td>
              </tr>
            ))}
            {allOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No orders match this filter yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

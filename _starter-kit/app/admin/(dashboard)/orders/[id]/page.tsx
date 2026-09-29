import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import OrderStatusPanel from "../OrderStatusPanel";

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: { with: { variant: true } } },
  });

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-sm text-gray-500 hover:underline">
        ← Back to Orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{order.orderNumber}</h1>
          <p className="mt-1 text-gray-500">Placed {formatTimestamp(order.createdAt)}</p>
        </div>
        {order.paymentIntentId && (
          <p className="text-xs text-gray-400">
            Payment ref: <span className="font-mono">{order.paymentIntentId}</span>
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Customer</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <dt className="text-gray-500">Name</dt>
                <dd>{order.guestName ?? " - "}</dd>
              </div>
              <div className="flex justify-between border-b pb-2">
                <dt className="text-gray-500">Phone</dt>
                <dd>
                  {order.guestPhone ? (
                    <a href={`tel:${order.guestPhone}`} className="text-blue-600 hover:underline">
                      {order.guestPhone}
                    </a>
                  ) : (
                    " - "
                  )}
                </dd>
              </div>
              <div className="flex justify-between pb-2">
                <dt className="text-gray-500">Email</dt>
                <dd>
                  {order.guestEmail ? (
                    <a href={`mailto:${order.guestEmail}`} className="text-blue-600 hover:underline">
                      {order.guestEmail}
                    </a>
                  ) : (
                    " - "
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="border-t pt-4">
            <h2 className="text-lg font-semibold">Delivery address</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
              {order.guestAddressText ?? "No address given."}
            </p>
          </div>

          {(order.courierPartner || order.trackingNumber || order.shippingLabelUrl || order.invoiceUrl) && (
            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold">Shipping</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {order.courierPartner && (
                  <div className="flex justify-between border-b pb-2">
                    <dt className="text-gray-500">Courier</dt>
                    <dd>{order.courierPartner}</dd>
                  </div>
                )}
                {order.trackingNumber && (
                  <div className="flex justify-between border-b pb-2">
                    <dt className="text-gray-500">Tracking</dt>
                    <dd className="font-mono">{order.trackingNumber}</dd>
                  </div>
                )}
                {order.shippingLabelUrl && (
                  <div className="flex justify-between border-b pb-2">
                    <dt className="text-gray-500">Shipping label</dt>
                    <dd>
                      <a href={order.shippingLabelUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        View / print
                      </a>
                    </dd>
                  </div>
                )}
                {order.invoiceUrl && (
                  <div className="flex justify-between pb-2">
                    <dt className="text-gray-500">Invoice</dt>
                    <dd>
                      <a href={order.invoiceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                        View / print
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        <OrderStatusPanel
          orderId={order.id}
          status={order.status}
          courierPartner={order.courierPartner}
          trackingNumber={order.trackingNumber}
          shippingLabelUrl={order.shippingLabelUrl}
          invoiceUrl={order.invoiceUrl}
        />
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Items ({order.items.length})</h2>
        </div>
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100 text-sm">
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-left">SKU</th>
              <th className="p-3 text-center">Qty</th>
              <th className="p-3 text-right">Unit</th>
              <th className="p-3 text-right">Line total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const options = item.variantOptionsJson as Record<string, string> | null;
              return (
                <tr key={item.id} className="border-t text-sm">
                  <td className="p-3">
                    {item.productName}
                    {options && Object.values(options).some(Boolean) && (
                      <span className="ml-2 text-xs text-gray-400">
                        ({Object.values(options).filter(Boolean).join(" / ")})
                      </span>
                    )}
                    {item.customDesignUrl && (
                      <div className="mt-1">
                        <a
                          href={item.customDesignUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View custom design →
                        </a>
                        {item.customNotes && (
                          <p className="mt-1 text-xs text-gray-500">{item.customNotes}</p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs text-gray-500">
                    {item.variant?.sku ?? "(variant deleted)"}
                  </td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  <td className="p-3 text-right">₹{item.unitPrice}</td>
                  <td className="p-3 text-right font-medium">₹{item.lineTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="border-t p-4">
          <dl className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Subtotal</dt>
              <dd>₹{order.subtotal}</dd>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-green-700">
                <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                <dd>-₹{order.discountAmount}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Shipping</dt>
              <dd>{Number(order.shippingFee) > 0 ? `₹${order.shippingFee}` : "FREE"}</dd>
            </div>
            <div className="flex justify-between border-t pt-1 text-base font-bold">
              <dt>Total</dt>
              <dd>₹{order.total}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

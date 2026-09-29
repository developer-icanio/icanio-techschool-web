"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrderStatus, saveShipment, type OrderStatus } from "./actions";
import { COURIER_PARTNERS } from "@/lib/couriers";

// "pending" isn't offered here - it's the initial state before payment,
// never something to move an order back to from the admin panel.
const STATUS_OPTIONS: OrderStatus[] = [
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

interface Props {
  orderId: string;
  status: OrderStatus;
  courierPartner: string | null;
  trackingNumber: string | null;
  shippingLabelUrl: string | null;
  invoiceUrl: string | null;
}

export default function OrderStatusPanel({
  orderId,
  status,
  courierPartner,
  trackingNumber,
  shippingLabelUrl,
  invoiceUrl,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<OrderStatus>(status);
  const [courier, setCourier] = useState(courierPartner ?? "");
  const [tracking, setTracking] = useState(trackingNumber ?? "");

  function runAction(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Fulfillment</h2>
        <p className="mt-1 text-sm text-gray-500">Update status, record the courier, and attach the label &amp; invoice.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending || status === "processing"}
          onClick={() => runAction(() => updateOrderStatus(orderId, "processing"))}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
        >
          Mark Processing
        </button>
        <button
          type="button"
          disabled={isPending || status === "delivered"}
          onClick={() => runAction(() => updateOrderStatus(orderId, "delivered"))}
          className="rounded-lg border px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
        >
          Mark Delivered
        </button>
      </div>

      {/* Shipping: courier + tracking, saved together and moves the order to "shipped". */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shipping</p>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Courier partner</label>
          <input
            list="courier-partners"
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            placeholder="e.g. DTDC, Blue Dart, India Post"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <datalist id="courier-partners">
            {COURIER_PARTNERS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Tracking / AWB number</label>
          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Courier tracking number"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => runAction(() => saveShipment(orderId, courier, tracking))}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
        >
          Save &amp; Mark Shipped
        </button>
        {courierPartner && (
          <p className="text-xs text-gray-500">
            Currently: {courierPartner}
            {trackingNumber ? ` · ${trackingNumber}` : ""}
          </p>
        )}
      </div>

      {/* A4 documents: courier shipping label + packing slip / tax invoice. */}
      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Documents (A4)</p>
        <DocUpload
          orderId={orderId}
          docType="shipping-label"
          label="Shipping label"
          currentUrl={shippingLabelUrl}
          onDone={() => router.refresh()}
        />
        <DocUpload
          orderId={orderId}
          docType="invoice"
          label="Invoice"
          currentUrl={invoiceUrl}
          onDone={() => router.refresh()}
        />
      </div>

      <div className="flex items-end gap-3 border-t pt-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Status</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value as OrderStatus)}
            className="rounded-lg border px-3 py-2 text-sm capitalize"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => runAction(() => updateOrderStatus(orderId, selected))}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm text-white hover:bg-brand-800 disabled:opacity-50"
        >
          Update Status
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <button
          type="button"
          disabled={isPending || status === "cancelled"}
          onClick={() => runAction(() => updateOrderStatus(orderId, "cancelled"))}
          className="rounded-lg border px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Cancel Order
        </button>
        <button
          type="button"
          disabled={isPending || status === "refunded"}
          onClick={() => runAction(() => updateOrderStatus(orderId, "refunded"))}
          className="rounded-lg border px-3 py-1.5 text-sm text-purple-700 hover:bg-purple-50 disabled:opacity-50"
        >
          Mark Refunded
        </button>
      </div>
    </div>
  );
}

function DocUpload({
  orderId,
  docType,
  label,
  currentUrl,
  onDone,
}: {
  orderId: string;
  docType: "shipping-label" | "invoice";
  label: string;
  currentUrl: string | null;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("orderId", orderId);
      body.set("docType", docType);
      const res = await fetch("/api/admin/orders/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
      } else {
        onDone();
      }
    } catch {
      setError("Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-28 text-sm text-gray-600">{label}</span>
      {currentUrl ? (
        <a
          href={currentUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          View / print
        </a>
      ) : (
        <span className="text-sm text-gray-400">Not attached</span>
      )}
      <label className="cursor-pointer rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-100">
        {uploading ? "Uploading…" : currentUrl ? "Replace" : "Upload PDF"}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordSale, type SaleChannel } from "../actions";

export default function RecordSaleForm() {
  const router = useRouter();
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("");
  const [channel, setChannel] = useState<SaleChannel>("website_order");
  const [orderNumber, setOrderNumber] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const qty = Number(quantity);
    if (!sku.trim()) return setError("Enter the variant SKU being sold.");
    if (!qty || qty <= 0) return setError("Enter a quantity greater than 0.");
    if (channel === "website_order" && !orderNumber.trim()) {
      return setError("Enter the website order number to link.");
    }

    startTransition(async () => {
      const result = await recordSale({
        sku: sku.trim(),
        quantity: qty,
        channel,
        orderNumber: channel === "website_order" ? orderNumber.trim() : undefined,
        note: note.trim() || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSku("");
      setQuantity("");
      setOrderNumber("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold">Record a Sale</h2>
      <p className="mb-4 text-sm text-gray-500">
        Deducts stock the same way a confirmed website order does - for order-based (DTF) products
        this reduces both the blank tee and the DTF film components, so it stays in sync across
        every design that shares the same blank-tee color/size.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Variant SKU</label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="e.g. LL-TS-CP117-White-05-06Y"
            className="w-64 rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Quantity</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-24 rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Channel</label>
          <select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value as SaleChannel);
              setNote("");
            }}
            className="w-40 rounded-lg border px-3 py-2 text-sm"
          >
            <option value="website_order">Website Order</option>
            <option value="myntra">Myntra</option>
            <option value="flipkart">Flipkart</option>
          </select>
        </div>

        {channel === "website_order" ? (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">Order Number</label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="ORD-2026-00001"
              className="w-44 rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500">
              {channel === "myntra" ? "Myntra" : "Flipkart"} order ref (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Marketplace order ID"
              className="w-48 rounded-lg border px-3 py-2 text-sm"
            />
          </div>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {isPending ? "Recording..." : "Record Sale"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

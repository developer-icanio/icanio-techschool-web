"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordComponentStockChange } from "../../actions";

const TYPE_OPTIONS: { value: "purchase_in" | "manufacturing_in" | "adjustment_in" | "adjustment_out" | "set"; label: string }[] = [
  { value: "purchase_in", label: "Purchase Entry (stock in)" },
  { value: "manufacturing_in", label: "Manufacturing Entry (stock in)" },
  { value: "adjustment_in", label: "Adjustment (stock in)" },
  { value: "adjustment_out", label: "Adjustment (stock out)" },
  { value: "set", label: "Set stock = (cycle count)" },
];

export default function StockEntryForm({
  componentId,
  warehouseId,
  warehouseName,
  currentStock,
}: {
  componentId: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]["value"]>("purchase_in");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const isSetMode = type === "set";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (quantity === "") return;
    const entered = Number(quantity);
    if (Number.isNaN(entered) || entered < 0) return;

    if (isSetMode) {
      // "Set stock" takes the number typed as the new total, not a delta
      // — work out how far that is from the current count and record it
      // as the equivalent adjustment, so the movement ledger still logs
      // a real in/out entry rather than a silent overwrite. Same pattern
      // as the finished-goods stock cell (FinishedStockCell.tsx).
      const delta = entered - currentStock;
      if (delta === 0) {
        setQuantity("");
        setNote("");
        return;
      }
      const resolvedType = delta > 0 ? "adjustment_in" : "adjustment_out";
      startTransition(async () => {
        await recordComponentStockChange({
          componentId,
          warehouseId,
          quantity: Math.abs(delta),
          type: resolvedType,
          note: note || `Set stock to ${entered} (was ${currentStock})`,
        });
        setQuantity("");
        setNote("");
        router.refresh();
      });
      return;
    }

    if (entered <= 0) return;
    startTransition(async () => {
      await recordComponentStockChange({ componentId, warehouseId, quantity: entered, type, note: note || undefined });
      setQuantity("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-500">{warehouseName}</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-500">
          {isSetMode ? "New total" : "Quantity"}
        </label>
        <input
          type="number"
          min={0}
          required
          placeholder={isSetMode ? String(currentStock) : undefined}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-24 rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-500">Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-56 rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Apply"}
      </button>
    </form>
  );
}

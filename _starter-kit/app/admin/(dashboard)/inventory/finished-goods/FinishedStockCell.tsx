"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordFinishedGoodsStockChange } from "../actions";

export default function FinishedStockCell({ variantId, stock }: { variantId: string; stock: number }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [type, setType] = useState<"purchase_in" | "manufacturing_in" | "adjustment_in" | "adjustment_out" | "set">(
    "manufacturing_in"
  );
  const [isPending, startTransition] = useTransition();
  const isSetMode = type === "set";

  function submit() {
    if (quantity === "") return;
    const entered = Number(quantity);
    if (Number.isNaN(entered) || entered < 0) return;

    if (isSetMode) {
      // "Set stock" takes the number typed as the new total, not a delta —
      // work out how far that is from the current count and record it as
      // the equivalent adjustment, so the ledger still logs a real
      // in/out movement rather than a magic overwrite.
      const delta = entered - stock;
      if (delta === 0) {
        setQuantity("");
        setIsEditing(false);
        return;
      }
      const resolvedType = delta > 0 ? "adjustment_in" : "adjustment_out";
      startTransition(async () => {
        await recordFinishedGoodsStockChange({
          variantId,
          quantity: Math.abs(delta),
          type: resolvedType,
          note: `Set stock to ${entered} (was ${stock})`,
        });
        setQuantity("");
        setIsEditing(false);
        router.refresh();
      });
      return;
    }

    if (entered <= 0) return;
    startTransition(async () => {
      await recordFinishedGoodsStockChange({ variantId, quantity: entered, type });
      setQuantity("");
      setIsEditing(false);
      router.refresh();
    });
  }

  if (!isEditing) {
    return (
      <button type="button" onClick={() => setIsEditing(true)} className="font-medium hover:underline">
        {stock}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as typeof type)}
        className="rounded-lg border px-1.5 py-1 text-xs"
      >
        <option value="manufacturing_in">Manufacturing +</option>
        <option value="purchase_in">Purchase +</option>
        <option value="adjustment_in">Adjust +</option>
        <option value="adjustment_out">Adjust -</option>
        <option value="set">Set stock =</option>
      </select>
      <input
        autoFocus
        type="number"
        min={0}
        placeholder={isSetMode ? String(stock) : undefined}
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        disabled={isPending}
        className="w-16 rounded-lg border px-2 py-1 text-center text-xs"
      />
      <button
        type="button"
        disabled={isPending}
        onClick={submit}
        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
      >
        Save
      </button>
    </div>
  );
}

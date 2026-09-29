"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateComponentCostPrice } from "../../actions";

export default function CostPriceForm({
  componentId,
  initialCostPrice,
}: {
  componentId: string;
  initialCostPrice: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initialCostPrice ?? "");
  const [saved, setSaved] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateComponentCostPrice(componentId, value);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-500">Cost price ₹</label>
        <input
          type="number"
          min={0}
          step="0.01"
          placeholder="Not set"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          className="w-32 rounded-lg border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
      {saved && !isPending && <span className="text-sm text-green-700">Saved</span>}
    </form>
  );
}

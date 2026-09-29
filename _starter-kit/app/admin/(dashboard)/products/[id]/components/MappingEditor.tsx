"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addComponentMapping, removeComponentMapping } from "../../../inventory/actions";

interface Mapping {
  id: string;
  componentId: string;
  componentName: string;
  componentSku: string;
  quantityRequired: number;
}

interface ComponentOption {
  id: string;
  name: string;
  sku: string;
}

export default function MappingEditor({
  variantId,
  mappings,
  componentOptions,
}: {
  variantId: string;
  mappings: Mapping[];
  componentOptions: ComponentOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [componentId, setComponentId] = useState("");
  const [quantity, setQuantity] = useState("1");

  function add() {
    if (!componentId) return;
    startTransition(async () => {
      await addComponentMapping(variantId, componentId, Number(quantity) || 1);
      setComponentId("");
      setQuantity("1");
      router.refresh();
    });
  }

  function remove(mappingId: string) {
    startTransition(async () => {
      await removeComponentMapping(mappingId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {mappings.map((m) => (
        <div key={m.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
          <span>
            {m.quantityRequired}x {m.componentName}
            <span className="ml-2 font-mono text-xs text-gray-400">{m.componentSku}</span>
          </span>
          <button
            type="button"
            disabled={isPending}
            onClick={() => remove(m.id)}
            className="text-xs text-red-600 hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <select
          value={componentId}
          onChange={(e) => setComponentId(e.target.value)}
          className="flex-1 rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">Select a component…</option>
          {componentOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.sku})
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-16 rounded-lg border px-2 py-2 text-sm"
        />
        <button
          type="button"
          disabled={isPending || !componentId}
          onClick={add}
          className="rounded-lg bg-brand-700 px-3 py-2 text-sm text-white hover:bg-brand-800 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

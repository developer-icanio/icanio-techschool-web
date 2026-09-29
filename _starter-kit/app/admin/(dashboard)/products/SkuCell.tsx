"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProductSku } from "./actions";

export default function SkuCell({ id, sku }: { id: string; sku: string | null }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(sku ?? "");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateProductSku(id, value);
      setIsEditing(false);
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <div className="flex items-center justify-center gap-1.5">
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setValue(sku ?? "");
              setIsEditing(false);
            }
          }}
          disabled={isPending}
          className="w-40 rounded-lg border px-2 py-1 text-center font-mono text-xs"
          placeholder="No SKU"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={save}
          className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="font-mono text-xs text-gray-700 hover:underline"
    >
      {sku || <span className="text-gray-400">Add SKU</span>}
    </button>
  );
}

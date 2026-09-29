"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateVariantCompareAtPrice } from "./actions";

export default function CompareAtPriceCell({
  variantId,
  price,
  compareAtPrice,
}: {
  variantId: string;
  price: string;
  compareAtPrice: string | null;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(compareAtPrice ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await updateVariantCompareAtPrice(variantId, value);
        setIsEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  const parsedCompareAt = compareAtPrice ? Number(compareAtPrice) : null;
  const parsedPrice = Number(price);
  const percentOff =
    parsedCompareAt && parsedCompareAt > parsedPrice
      ? Math.round((1 - parsedPrice / parsedCompareAt) * 100)
      : null;

  if (isEditing) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-xs text-gray-400">₹</span>
          <input
            autoFocus
            type="number"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setValue(compareAtPrice ?? "");
                setError(null);
                setIsEditing(false);
              }
            }}
            disabled={isPending}
            placeholder="No offer"
            className="w-24 rounded-lg border px-2 py-1 text-center text-xs"
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
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="text-xs text-gray-700 hover:underline"
    >
      {compareAtPrice ? (
        <span className="flex items-center justify-center gap-1.5">
          <span className="text-gray-400 line-through">₹{parsedCompareAt?.toFixed(0)}</span>
          {percentOff !== null && (
            <span className="rounded-full bg-accent-100 px-1.5 py-0.5 font-semibold text-accent-600">
              -{percentOff}%
            </span>
          )}
        </span>
      ) : (
        <span className="text-gray-400">Add offer price</span>
      )}
    </button>
  );
}

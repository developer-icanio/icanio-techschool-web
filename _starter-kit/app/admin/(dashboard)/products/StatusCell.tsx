"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleProductActive } from "./actions";

export default function StatusCell({
  productId,
  isActive,
  missingPhoto,
}: {
  productId: string;
  isActive: boolean;
  missingPhoto: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await toggleProductActive(productId, !isActive);
      router.refresh();
    });
  }

  const needsAttention = isActive && missingPhoto;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      title={
        isActive
          ? needsAttention
            ? "Live, but has no photos - click to hide from the shop until it does"
            : "Click to hide from the shop"
          : "Click to make live on the shop"
      }
      className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
        !isActive
          ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
          : needsAttention
            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
            : "bg-green-100 text-green-700 hover:bg-green-200"
      }`}
    >
      {isPending ? "…" : !isActive ? "Hidden" : needsAttention ? "⚠ Live - no photo" : "Live"}
    </button>
  );
}

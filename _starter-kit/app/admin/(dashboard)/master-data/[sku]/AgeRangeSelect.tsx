"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAgeRange } from "../actions";
import { AGE_RANGE_OPTIONS, type AgeRange } from "@/lib/ageRanges";

export default function AgeRangeSelect({ sku, value }: { sku: string; value: AgeRange | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value === "" ? null : (e.target.value as AgeRange);
    startTransition(async () => {
      await setAgeRange(sku, next);
      router.refresh();
    });
  }

  return (
    <select
      value={value ?? ""}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
    >
      <option value="">Unclassified</option>
      {AGE_RANGE_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

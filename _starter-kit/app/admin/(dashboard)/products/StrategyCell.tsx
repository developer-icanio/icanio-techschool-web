"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProductStrategy } from "../inventory/actions";

export default function StrategyCell({
  productId,
  strategy,
}: {
  productId: string;
  strategy: "order_based" | "finished_goods";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function change(next: "order_based" | "finished_goods") {
    startTransition(async () => {
      await updateProductStrategy(productId, next);
      router.refresh();
    });
  }

  return (
    <select
      value={strategy}
      disabled={isPending}
      onChange={(e) => change(e.target.value as "order_based" | "finished_goods")}
      className="rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
    >
      <option value="finished_goods">Finished Goods</option>
      <option value="order_based">Order-Based</option>
    </select>
  );
}

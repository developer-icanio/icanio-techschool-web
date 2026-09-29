"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleWarehouseActive } from "../actions";

interface Warehouse {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export default function WarehouseRow({ warehouse }: { warehouse: Warehouse }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await toggleWarehouseActive(warehouse.id, !warehouse.isActive);
      router.refresh();
    });
  }

  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="p-3 font-medium">{warehouse.name}</td>
      <td className="p-3 font-mono text-xs text-gray-600">{warehouse.code}</td>
      <td className="p-3 text-center">
        <span
          className={`rounded px-3 py-1 text-xs ${
            warehouse.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {warehouse.isActive ? "Active" : "Disabled"}
        </span>
      </td>
      <td className="p-3 text-center">
        <button
          type="button"
          disabled={isPending}
          onClick={toggle}
          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-100 disabled:opacity-50"
        >
          {warehouse.isActive ? "Disable" : "Enable"}
        </button>
      </td>
    </tr>
  );
}

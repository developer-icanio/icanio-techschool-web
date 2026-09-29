"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setRedirectActive, deleteRedirect } from "./actions";
import { formatDisplayDate } from "@/lib/formatDate";

interface Redirect {
  id: string;
  sourcePath: string;
  destinationPath: string;
  type: "permanent" | "temporary";
  isActive: boolean;
  hitCount: number;
  lastHitAt: Date | null;
}

export default function RedirectRow({ redirect }: { redirect: Redirect }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function runAction(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="p-3 font-mono text-xs text-gray-700">{redirect.sourcePath}</td>
      <td className="p-3 font-mono text-xs text-gray-600">{redirect.destinationPath}</td>
      <td className="p-3 text-center">
        <span className="rounded bg-slate-100 px-2 py-1 text-xs capitalize">{redirect.type}</span>
      </td>
      <td className="p-3 text-center font-medium">{redirect.hitCount}</td>
      <td className="p-3 text-center text-gray-500">
        {redirect.lastHitAt ? formatDisplayDate(redirect.lastHitAt.toISOString()) : " - "}
      </td>
      <td className="p-3 text-center">
        <span
          className={`rounded px-3 py-1 text-xs ${
            redirect.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {redirect.isActive ? "Active" : "Disabled"}
        </span>
      </td>
      <td className="p-3 text-center">
        <div className="flex justify-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => runAction(() => setRedirectActive(redirect.id, !redirect.isActive))}
            className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-100 disabled:opacity-50"
          >
            {redirect.isActive ? "Disable" : "Enable"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm(`Delete redirect ${redirect.sourcePath} → ${redirect.destinationPath}?`)) {
                runAction(() => deleteRedirect(redirect.id));
              }
            }}
            className="rounded-lg border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

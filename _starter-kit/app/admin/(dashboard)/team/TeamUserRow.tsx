"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAdminUserRole, revokeAdminAccess } from "./actions";

type AdminRole = "owner" | "seo" | "sales";

interface TeamUser {
  id: string;
  email: string;
  name: string | null;
  adminRole: AdminRole | null;
  isSelf: boolean;
  isAllowlisted: boolean;
}

const ROLE_OPTIONS: AdminRole[] = ["owner", "seo", "sales"];

export default function TeamUserRow({ user }: { user: TeamUser }) {
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
      <td className="p-3 font-medium">{user.name ?? " - "}</td>
      <td className="p-3 text-gray-600">
        {user.email}
        {user.isAllowlisted && (
          <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            ADMIN_EMAILS
          </span>
        )}
      </td>
      <td className="p-3 text-center">
        <select
          value={user.adminRole ?? "owner"}
          disabled={isPending || user.isAllowlisted}
          onChange={(e) => runAction(() => updateAdminUserRole(user.id, e.target.value as AdminRole))}
          className="rounded-lg border px-3 py-1.5 text-sm capitalize disabled:opacity-50"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r} className="capitalize">
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="p-3 text-center">
        {!user.isSelf && !user.isAllowlisted && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm(`Revoke admin access for ${user.email}?`)) {
                runAction(() => revokeAdminAccess(user.id));
              }
            }}
            className="rounded-lg border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Revoke
          </button>
        )}
      </td>
    </tr>
  );
}

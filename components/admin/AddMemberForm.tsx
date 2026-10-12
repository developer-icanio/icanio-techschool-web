"use client";

import { useActionState } from "react";
import { addMember } from "@/app/admin/actions";

export default function AddMemberForm({ canAddOwner }: { canAddOwner: boolean }) {
  const [state, action, pending] = useActionState(addMember, null);
  const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_1fr_140px_auto] sm:items-end">
      <label className="text-sm font-medium text-heading">Google account email<input name="email" type="email" required className={field} placeholder="name@icanio.com" /></label>
      <label className="text-sm font-medium text-heading">Name<input name="name" className={field} placeholder="Optional" /></label>
      <label className="text-sm font-medium text-heading">
        Role
        <select name="role" defaultValue="editor" className={field}>
          <option value="editor">editor</option>
          <option value="seo">seo</option>
          <option value="admin">admin</option>
          {canAddOwner && <option value="owner">owner</option>}
        </select>
      </label>
      <button disabled={pending} className="btn btn-primary !py-2 disabled:opacity-60">{pending ? "Adding..." : "Add"}</button>
      {state && <p role="status" className={`text-sm sm:col-span-4 ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>}
    </form>
  );
}

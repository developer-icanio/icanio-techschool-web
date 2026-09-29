import { db } from "@/db";
import { redirects } from "@/db/schema";
import { desc } from "drizzle-orm";
import { createRedirect } from "./actions";
import RedirectRow from "./RedirectRow";

export default async function RedirectsPage() {
  const allRedirects = await db.query.redirects.findMany({
    orderBy: [desc(redirects.hitCount)],
  });

  const totalHits = allRedirects.reduce((sum, r) => sum + r.hitCount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Redirects</h1>
        <p className="mt-2 text-gray-500">
          {allRedirects.length} redirect{allRedirects.length === 1 ? "" : "s"} configured,{" "}
          {totalHits} total hit{totalHits === 1 ? "" : "s"}. Checked on every request that would
          otherwise 404.
        </p>
      </div>

      <form
        action={createRedirect}
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">From (old path)</label>
          <input
            name="sourcePath"
            type="text"
            required
            placeholder="/old-page-slug"
            className="rounded-lg border px-3 py-2 font-mono text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">To (destination)</label>
          <input
            name="destinationPath"
            type="text"
            required
            placeholder="/new-page-slug"
            className="rounded-lg border px-3 py-2 font-mono text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Type</label>
          <select name="type" defaultValue="permanent" className="rounded-lg border px-3 py-2 text-sm capitalize">
            <option value="permanent">Permanent (308)</option>
            <option value="temporary">Temporary (307)</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          Create Redirect
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">From</th>
              <th className="p-3 text-left">To</th>
              <th className="p-3 text-center">Type</th>
              <th className="p-3 text-center">Hits</th>
              <th className="p-3 text-center">Last Hit</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {allRedirects.map((redirect) => (
              <RedirectRow key={redirect.id} redirect={redirect} />
            ))}
            {allRedirects.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  No redirects yet. Create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

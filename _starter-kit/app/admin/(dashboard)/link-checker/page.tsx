import Link from "next/link";
import { db } from "@/db";
import { linkCheckRuns } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatDisplayDate } from "@/lib/formatDate";
import { runNewLinkCheck } from "./actions";

const STATUS_COLORS: Record<string, string> = {
  running: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
};

export default async function LinkCheckerPage() {
  const runs = await db.query.linkCheckRuns.findMany({
    orderBy: [desc(linkCheckRuns.createdAt)],
    limit: 50,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Broken Link Checker</h1>
          <p className="mt-2 text-gray-500">
            Scans every published blog post for internal and external links. Internal links
            resolve instantly; external links are checked in daily batches, so a run can take a
            day or two to fully complete.
          </p>
        </div>
        <form action={runNewLinkCheck}>
          <button
            type="submit"
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Run New Check
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Started</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Progress</th>
              <th className="p-3 text-center">Broken</th>
              <th className="p-3 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-t hover:bg-gray-50">
                <td className="p-3 text-gray-600">{formatDisplayDate(run.createdAt.toISOString())}</td>
                <td className="p-3 text-center">
                  <span className={`rounded px-3 py-1 capitalize ${STATUS_COLORS[run.status]}`}>
                    {run.status}
                  </span>
                </td>
                <td className="p-3 text-center text-gray-600">
                  {run.checkedLinks} / {run.totalLinks} checked
                </td>
                <td className="p-3 text-center">
                  <span className={run.brokenCount > 0 ? "font-semibold text-red-600" : "text-gray-400"}>
                    {run.brokenCount}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <Link href={`/admin/link-checker/${run.id}`} className="text-slate-600 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  No checks run yet. Click &quot;Run New Check&quot; to scan the site.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

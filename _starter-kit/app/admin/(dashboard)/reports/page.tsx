import Link from "next/link";
import { db } from "@/db";
import { seoReportRuns } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatDisplayDate } from "@/lib/formatDate";
import { runNewSeoReport } from "./actions";

const STATUS_COLORS: Record<string, string> = {
  running: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
};

export default async function ReportsPage() {
  const runs = await db.query.seoReportRuns.findMany({
    orderBy: [desc(seoReportRuns.createdAt)],
    limit: 52,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">SEO Reports</h1>
          <p className="mt-2 text-gray-500">
            A snapshot of the SEO rule engine run across every blog post - runs automatically
            every Monday, or trigger one on demand below.
          </p>
        </div>
        <form action={runNewSeoReport}>
          <button
            type="submit"
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
          >
            Run New Report
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Posts Checked</th>
              <th className="p-3 text-center">Avg Score</th>
              <th className="p-3 text-center">Excellent</th>
              <th className="p-3 text-center">Good</th>
              <th className="p-3 text-center">Needs Improvement</th>
              <th className="p-3 text-center">Critical</th>
              <th className="p-3 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-t hover:bg-gray-50">
                <td className="p-3 text-gray-600">{formatDisplayDate(run.createdAt.toISOString())}</td>
                <td className="p-3 text-center">
                  <span className={`rounded px-3 py-1 capitalize ${STATUS_COLORS[run.status]}`}>{run.status}</span>
                </td>
                <td className="p-3 text-center text-gray-600">{run.totalItems}</td>
                <td className="p-3 text-center font-semibold">{run.avgScore}</td>
                <td className="p-3 text-center text-green-600">{run.excellentCount}</td>
                <td className="p-3 text-center text-blue-600">{run.goodCount}</td>
                <td className="p-3 text-center text-yellow-600">{run.needsImprovementCount}</td>
                <td className="p-3 text-center text-red-600">{run.criticalCount}</td>
                <td className="p-3 text-center">
                  <Link href={`/admin/reports/${run.id}`} className="text-slate-600 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-400">
                  No reports yet. Click &quot;Run New Report&quot; to generate the first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

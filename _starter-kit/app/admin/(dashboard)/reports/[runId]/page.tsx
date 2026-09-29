import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { seoReportRuns, seoReportItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatDisplayDate } from "@/lib/formatDate";

const STATUS_COLORS: Record<string, string> = {
  Excellent: "bg-green-100 text-green-700",
  Good: "bg-blue-100 text-blue-700",
  "Needs Improvement": "bg-yellow-100 text-yellow-700",
  Critical: "bg-red-100 text-red-700",
};

interface PageProps {
  params: Promise<{ runId: string }>;
}

export default async function SeoReportRunPage({ params }: PageProps) {
  const { runId } = await params;

  const run = await db.query.seoReportRuns.findFirst({ where: eq(seoReportRuns.id, runId) });
  if (!run) notFound();

  const items = await db.query.seoReportItems.findMany({
    where: eq(seoReportItems.runId, runId),
    orderBy: [desc(seoReportItems.overallScore)],
    columns: {
      id: true,
      slug: true,
      title: true,
      overallScore: true,
      status: true,
      passedRules: true,
      failedRules: true,
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/reports" className="text-sm text-slate-500 hover:underline">
          &larr; Back to all reports
        </Link>
        <h1 className="mt-2 text-4xl font-bold">SEO Report</h1>
        <p className="mt-2 text-gray-500">
          {formatDisplayDate(run.createdAt.toISOString())} &mdash; {run.totalItems} posts checked,
          average score {run.avgScore}.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-center">Score</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Passed</th>
              <th className="p-3 text-center">Failed</th>
              <th className="p-3 text-center"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{item.title}</td>
                <td className="p-3 text-center font-bold">{item.overallScore}</td>
                <td className="p-3 text-center">
                  <span className={`rounded px-3 py-1 text-xs ${STATUS_COLORS[item.status] ?? "bg-slate-100"}`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-3 text-center text-green-600">{item.passedRules}</td>
                <td className="p-3 text-center text-red-600">{item.failedRules}</td>
                <td className="p-3 text-center">
                  <Link href={`/admin/seo/${item.slug}`} className="text-slate-600 hover:underline">
                    View Live Audit
                  </Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No items in this report.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { linkCheckRuns, linkCheckResults } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatDisplayDate } from "@/lib/formatDate";

interface PageProps {
  params: Promise<{ runId: string }>;
}

export default async function LinkCheckRunPage({ params }: PageProps) {
  const { runId } = await params;

  const run = await db.query.linkCheckRuns.findFirst({ where: eq(linkCheckRuns.id, runId) });
  if (!run) notFound();

  const results = await db.query.linkCheckResults.findMany({
    where: eq(linkCheckResults.runId, runId),
  });

  const broken = results.filter((r) => r.ok === false);
  const needsReview = results.filter((r) => r.ok && r.errorMessage);
  const pending = results.filter((r) => r.ok === null);

  const brokenBySource = new Map<string, typeof broken>();
  for (const result of broken) {
    const key = `${result.sourceType}:${result.sourceSlug}`;
    brokenBySource.set(key, [...(brokenBySource.get(key) ?? []), result]);
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/link-checker" className="text-sm text-slate-500 hover:underline">
          &larr; Back to all runs
        </Link>
        <h1 className="mt-2 text-4xl font-bold">Link Check Run</h1>
        <p className="mt-2 text-gray-500">
          Started {formatDisplayDate(run.createdAt.toISOString())} &mdash; {run.checkedLinks} /{" "}
          {run.totalLinks} links checked, {run.brokenCount} broken, {pending.length} pending.
        </p>
      </div>

      {brokenBySource.size === 0 && pending.length === 0 && (
        <div className="rounded-xl border bg-white p-6 text-gray-500 shadow-sm">
          No broken links found.
        </div>
      )}

      {Array.from(brokenBySource.entries()).map(([key, items]) => (
        <div key={key} className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">
            {items[0].sourceTitle} <span className="font-normal text-gray-400">({items[0].sourceType})</span>
          </h2>
          <ul className="mt-3 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="break-all text-gray-700">{item.linkUrl}</span>
                <span className="ml-4 shrink-0 rounded bg-red-100 px-2 py-1 text-xs text-red-700">
                  {item.httpStatus ?? item.errorMessage ?? "unreachable"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {needsReview.length > 0 && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">Verify Manually ({needsReview.length})</h2>
          <p className="mt-1 text-sm text-gray-500">
            These sites blocked the automated check (e.g. 403) but may work fine for a real visitor.
          </p>
          <ul className="mt-3 space-y-2">
            {needsReview.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="break-all text-gray-700">{item.linkUrl}</span>
                <span className="ml-4 shrink-0 rounded bg-amber-100 px-2 py-1 text-xs text-amber-700">
                  {item.errorMessage}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pending.length > 0 && (
        <div className="rounded-xl border bg-white p-6 text-gray-500 shadow-sm">
          {pending.length} external link(s) still queued for the daily cron batch.
        </div>
      )}
    </div>
  );
}

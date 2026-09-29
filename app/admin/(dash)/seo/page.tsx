import type { Metadata } from "next";
import ScoreTable from "@/components/admin/ScoreTable";
import { Tile, Trend } from "@/components/admin/ui";
import { recentSnapshots, requireAdmin } from "@/lib/admin";
import { KIND_LABEL, scoreboard } from "@/lib/seo-report";
import { takeSnapshot } from "../../actions";

export const metadata: Metadata = { title: "SEO scoreboard" };

const fmt = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function SeoScoreboard() {
  await requireAdmin();
  const s = scoreboard();
  const snaps = await recentSnapshots();
  const last = snaps?.[0];
  const delta = last ? s.averageScore - last.averageScore : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">SEO scoreboard</h1>
          <p className="mt-1 text-body">Every page scored live against the 69-rule engine, the same checks as <code className="rounded bg-white px-1.5 py-0.5 text-sm">npm run audit:seo</code>.</p>
        </div>
        {snaps ? (
          <form action={takeSnapshot} className="flex gap-2">
            <input name="note" placeholder="Note (optional)" aria-label="Snapshot note" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            <button className="btn btn-primary !py-2">Save snapshot</button>
          </form>
        ) : (
          <p className="max-w-xs text-sm text-muted">Connect a database (DATABASE_URL) to save snapshots and track the trend.</p>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Average score" value={`${s.averageScore}/100`} hint={last ? `${delta >= 0 ? "+" : ""}${delta} since last snapshot` : undefined} />
        <Tile label="Pages at 100" value={`${s.perfect} of ${s.rows.length}`} hint={`${s.needsWork} below 90`} />
        <Tile label="Words published" value={s.totalWords.toLocaleString("en-IN")} hint={`${Math.round(s.totalWords / (s.rows.length || 1)).toLocaleString("en-IN")} per page on average`} />
        <Tile label="Last snapshot" value={last ? fmt(last.takenAt) : "None yet"} hint={last?.takenBy ? `by ${last.takenBy}${last.note ? `: ${last.note}` : ""}` : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">Average score over time</h2>
          <div className="mt-3">
            {snaps ? <Trend points={[...snaps].reverse().map((x) => ({ at: x.takenAt, score: x.averageScore }))} /> : <p className="text-sm text-muted">Needs a database.</p>}
          </div>
        </section>
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold">Most failed rules</h2>
          {s.topFailures.length ? (
            <ul className="mt-3 divide-y divide-line">
              {s.topFailures.slice(0, 6).map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span><span className="font-medium text-heading">{f.name}</span> <span className="text-xs text-muted">({f.id})</span></span>
                  <span className="shrink-0 text-muted">{f.pages.length} page{f.pages.length > 1 ? "s" : ""}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-emerald-700">Every rule passes on every page.</p>
          )}
        </section>
      </div>

      <ScoreTable rows={s.rows.map((r) => ({ ...r, kindLabel: KIND_LABEL[r.kind] }))} />
      <p className="text-xs text-muted">Category bars, left to right: Keyword, Title, Metadata, Content, Media, Links, Technical, Schema, EEAT, AI. The home page can never pass keyword-url because its URL is just /.</p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bar, ScorePill } from "@/components/admin/ui";
import { recentSnapshots, requireAdmin } from "@/lib/admin";
import { KIND_LABEL, pageReport, pathOfKey } from "@/lib/seo-report";

export async function generateMetadata({ params }: PageProps<"/admin/seo/[...key]">): Promise<Metadata> {
  const { key } = await params;
  return { title: `SEO: ${pathOfKey(key)}` };
}

const PRIORITY: Record<string, string> = { Critical: "text-red-700", High: "text-amber-700", Medium: "text-slate-600", Low: "text-slate-500" };

function Count({ n, min, max, label }: { n: number; min?: number; max: number; label: string }) {
  const ok = n <= max && (min === undefined || n >= min);
  return <span className={`text-xs tabular-nums ${ok ? "text-emerald-700" : "font-semibold text-red-700"}`}>{label}: {n} chars ({min ? `${min} to ` : "under "}{max})</span>;
}

export default async function SeoPage({ params }: PageProps<"/admin/seo/[...key]">) {
  await requireAdmin();
  const { key } = await params;
  const path = pathOfKey(key);
  const r = pageReport(path);
  if (!r) notFound();
  const { page: p, audit: a } = r;
  const history = (await recentSnapshots(12))
    ?.map((s) => ({ at: s.takenAt, score: s.rows.find((x) => x.path === path)?.score }))
    .filter((x): x is { at: Date; score: number } => x.score !== undefined);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/admin/seo" className="text-sm font-medium text-navy hover:underline">← All pages</Link>
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-line bg-white p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-navy">{KIND_LABEL[p.kind]}</p>
          <h1 className="mt-1 text-2xl font-bold">{p.label}</h1>
          <a href={p.path} target="_blank" className="text-sm text-navy hover:underline">{r.url} ↗</a>
          <p className="mt-2 text-sm text-muted">Updated {p.seo.updatedAt} · file content/pages{p.path === "/" ? "/home" : p.path}.json</p>
        </div>
        <div className="text-right">
          <p className="text-5xl font-semibold tabular-nums text-heading">{a.overallScore}</p>
          <p className="text-sm text-muted">{a.passedRules} of {a.rules.length} rules passed</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-6">
          <h2 className="text-lg font-semibold">Google preview</h2>
          <div className="mt-4 rounded-xl border border-line p-4">
            <p className="truncate text-xs text-slate-600">{r.url}</p>
            <p className="mt-1 text-lg leading-snug text-[#1a0dab]">{r.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{p.seo.metaDescription}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Count n={r.title.length} max={59} label="Title" />
            <Count n={p.seo.metaDescription.length} min={145} max={158} label="Description" />
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-6">
          <h2 className="text-lg font-semibold">Keywords and content</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div className="col-span-2"><dt className="text-muted">Focus keyword</dt><dd className="font-semibold text-heading">{p.seo.focusKeyword}</dd></div>
            <div className="col-span-2"><dt className="text-muted">Secondary keywords</dt><dd className="text-heading">{p.seo.secondaryKeywords.join(", ")}</dd></div>
            <div><dt className="text-muted">Words</dt><dd className="tabular-nums text-heading">{r.words.toLocaleString("en-IN")} (2,500+)</dd></div>
            <div><dt className="text-muted">Keyword density</dt><dd className="tabular-nums text-heading">{a.rules.find((x) => x.id === "keyword-density")?.value} (1% to 2.5%)</dd></div>
            <div><dt className="text-muted">Internal / external links</dt><dd className="tabular-nums text-heading">{r.internalLinks} / {r.externalLinks}</dd></div>
            <div><dt className="text-muted">Images</dt><dd className="tabular-nums text-heading">{r.images}</dd></div>
          </dl>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-semibold">Score by category</h2>
        <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {a.categoryScores.map((c) => (
            <li key={c.category}>
              <div className="flex justify-between text-sm"><span className="font-medium text-heading">{c.category}</span><span className="tabular-nums text-muted">{c.earned}/{c.total} pts</span></div>
              <div className="mt-1.5"><Bar pct={c.percentage} /></div>
            </li>
          ))}
        </ul>
      </section>

      {history && history.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-6">
          <h2 className="text-lg font-semibold">Score in recent snapshots</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {history.map((h, i) => <li key={i} className="flex items-center gap-2 rounded-lg bg-soft px-3 py-1.5 text-sm"><span className="text-muted">{h.at.toLocaleDateString("en-IN")}</span><ScorePill score={h.score} /></li>)}
          </ul>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-line bg-white">
        <h2 className="border-b border-line px-6 py-4 text-lg font-semibold">All 69 rules</h2>
        {a.categoryScores.map((c) => (
          <div key={c.category}>
            <h3 className="bg-soft/70 px-6 py-2 text-xs font-semibold uppercase tracking-wider text-muted">{c.category} · {c.percentage}%</h3>
            <ul className="divide-y divide-line">
              {c.rules.map((rule) => (
                <li key={rule.id} className="grid gap-1 px-6 py-3 text-sm sm:grid-cols-[24px_1.2fr_1fr_1fr_70px] sm:items-start sm:gap-4">
                  <span aria-label={rule.passed ? "Passed" : "Failed"} className={rule.passed ? "text-emerald-600" : "text-red-600"}>{rule.passed ? "✓" : "✕"}</span>
                  <span>
                    <span className="font-medium text-heading">{rule.name}</span> <span className={`text-xs ${PRIORITY[rule.priority]}`}>{rule.priority}</span>
                    {!rule.passed && <span className="mt-0.5 block text-xs text-red-700">{rule.recommendation}</span>}
                  </span>
                  <span className="text-body"><span className="text-xs text-muted sm:hidden">Value: </span>{rule.value}</span>
                  <span className="text-muted"><span className="text-xs sm:hidden">Expected: </span>{rule.expected}</span>
                  <span className="tabular-nums text-muted sm:text-right">{rule.earned}/{rule.total}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <details className="rounded-2xl border border-line bg-white">
        <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-heading">Show the text the engine scores ({r.headings.length} H2 sections)</summary>
        <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap border-t border-line px-6 py-4 text-xs leading-relaxed text-body">{r.markdown}</pre>
      </details>
    </div>
  );
}

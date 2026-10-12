"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { testPage } from "@/app/admin/speed-actions";
import type { SpeedIssue, SpeedMetrics } from "@/db/schema";

type Strategy = "mobile" | "desktop";
export interface SpeedResult {
  path: string;
  strategy: Strategy;
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  metrics: SpeedMetrics;
  issues: SpeedIssue[];
  fieldData: string | null;
  createdAt: string;
}
interface PageRow { path: string; label: string; kind: string }

const tone = (s: number | null | undefined) =>
  s === null || s === undefined ? "bg-slate-100 text-muted" : s >= 90 ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20" : s >= 50 ? "bg-amber-50 text-amber-800 ring-amber-600/20" : "bg-red-50 text-red-800 ring-red-600/20";

function Score({ s, label }: { s: number | null | undefined; label: string }) {
  return (
    <span title={label} className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold tabular-nums ring-1 ring-inset ${tone(s)}`}>
      {s ?? "–"}
    </span>
  );
}

function Scores({ r }: { r?: SpeedResult }) {
  return (
    <div className="flex gap-1">
      <Score s={r?.performance} label="Performance" />
      <Score s={r?.accessibility} label="Accessibility" />
      <Score s={r?.bestPractices} label="Best practices" />
      <Score s={r?.seo} label="SEO" />
    </div>
  );
}

const ago = (iso?: string) => {
  if (!iso) return "Not tested";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 1 ? "Just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : new Date(iso).toLocaleDateString("en-IN");
};

const FIELD: Record<string, string> = { FAST: "Real users: fast", AVERAGE: "Real users: average", SLOW: "Real users: slow" };

function Detail({ r, device }: { r?: SpeedResult; device: Strategy }) {
  if (!r) return <p className="text-sm text-muted">No {device} test yet.</p>;
  const m = r.metrics;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-navy">{device} · {ago(r.createdAt)}{r.fieldData ? ` · ${FIELD[r.fieldData] ?? r.fieldData}` : ""}</p>
      <dl className="mt-2 grid grid-cols-5 gap-2 text-center text-xs">
        {[["FCP", m.fcp], ["LCP", m.lcp], ["TBT", m.tbt], ["CLS", m.cls], ["Speed index", m.si]].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-soft px-2 py-2"><dt className="text-muted">{k}</dt><dd className="mt-0.5 font-semibold text-heading">{v ?? "–"}</dd></div>
        ))}
      </dl>
      {r.issues.length ? (
        <ul className="mt-3 space-y-1 text-sm">
          {r.issues.slice(0, 8).map((i) => (
            <li key={i.title} className="flex gap-2"><span className="w-24 shrink-0 text-xs text-muted">{i.category}</span><span className="text-heading">{i.title}{i.value ? <span className="text-muted"> · {i.value}</span> : null}</span></li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-emerald-700">No issues found.</p>
      )}
    </div>
  );
}

export default function SpeedTable({ pages, initial, canRun, base }: { pages: PageRow[]; initial: SpeedResult[]; canRun: boolean; base: string }) {
  const [results, setResults] = useState(() => new Map(initial.map((r) => [`${r.path}|${r.strategy}`, r])));
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const stop = useRef(false);

  const get = (path: string, s: Strategy) => results.get(`${path}|${s}`);

  async function run(path: string, s: Strategy) {
    const k = `${path}|${s}`;
    setRunning((x) => new Set(x).add(k));
    const r = await testPage(path, s);
    setRunning((x) => { const n = new Set(x); n.delete(k); return n; });
    if (r.ok) {
      setResults((x) => new Map(x).set(k, r.row as SpeedResult));
      setErrors((x) => { const n = new Map(x); n.delete(path); return n; });
    } else setErrors((x) => new Map(x).set(path, r.error));
  }

  const runPage = (path: string) => Promise.all([run(path, "mobile"), run(path, "desktop")]);

  async function runAll(list: PageRow[]) {
    stop.current = false;
    const jobs = list.flatMap((p) => (["mobile", "desktop"] as Strategy[]).map((s) => [p.path, s] as const));
    setBatch({ done: 0, total: jobs.length });
    let i = 0;
    // Three tests at a time keeps well inside Google's rate limits.
    const worker = async () => {
      while (i < jobs.length && !stop.current) {
        const [path, s] = jobs[i++];
        await run(path, s);
        setBatch((b) => (b ? { ...b, done: b.done + 1 } : b));
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setBatch(null);
  }

  const list = pages.filter((p) => !q || `${p.label} ${p.path}`.toLowerCase().includes(q.toLowerCase()));
  const avg = useMemo(() => {
    const m = [...results.values()].filter((r) => r.strategy === "mobile" && r.performance !== null);
    const d = [...results.values()].filter((r) => r.strategy === "desktop" && r.performance !== null);
    const mean = (xs: SpeedResult[]) => (xs.length ? Math.round(xs.reduce((s, r) => s + (r.performance ?? 0), 0) / xs.length) : null);
    return { mobile: mean(m), desktop: mean(d), tested: new Set([...results.values()].map((r) => r.path)).size };
  }, [results]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {[["Mobile performance (average)", avg.mobile], ["Desktop performance (average)", avg.desktop], ["Pages tested", `${avg.tested} of ${pages.length}`]].map(([l, v]) => (
          <div key={l as string} className="rounded-2xl border border-line bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{l}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-heading">{v ?? "–"}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages" aria-label="Search pages" className="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          {batch ? (
            <>
              <div className="flex min-w-48 flex-1 items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-navy transition-all" style={{ width: `${(batch.done / batch.total) * 100}%` }} /></div>
                <span className="text-sm tabular-nums text-muted">{batch.done}/{batch.total}</span>
              </div>
              <button type="button" onClick={() => (stop.current = true)} className="btn btn-outline !py-2">Stop</button>
            </>
          ) : (
            <button type="button" disabled={!canRun} onClick={() => runAll(list)} className="btn btn-primary !py-2 disabled:opacity-50">
              Test {q ? `${list.length} pages` : "all pages"}
            </button>
          )}
          <span className="text-xs text-muted">Scores, left to right: Performance, Accessibility, Best practices, SEO</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line bg-soft/60 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Page</th>
                <th scope="col" className="px-4 py-3 font-semibold">Mobile</th>
                <th scope="col" className="px-4 py-3 font-semibold">Desktop</th>
                <th scope="col" className="px-4 py-3 font-semibold">Last tested</th>
                <th scope="col" className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((p) => {
                const m = get(p.path, "mobile");
                const d = get(p.path, "desktop");
                const busy = running.has(`${p.path}|mobile`) || running.has(`${p.path}|desktop`);
                const err = errors.get(p.path);
                return (
                  <Fragment key={p.path}>
                    <tr className="hover:bg-soft/40">
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => setOpen(open === p.path ? null : p.path)} className="text-left">
                          <span className="block font-semibold text-heading hover:text-navy">{p.label}</span>
                          <span className="block text-xs text-muted">{p.path} · {p.kind}</span>
                        </button>
                        {err && <span className="mt-1 block text-xs text-red-700">{err}</span>}
                      </td>
                      <td className="px-4 py-3">{busy && running.has(`${p.path}|mobile`) ? <span className="text-xs text-muted">Testing...</span> : <Scores r={m} />}</td>
                      <td className="px-4 py-3">{busy && running.has(`${p.path}|desktop`) ? <span className="text-xs text-muted">Testing...</span> : <Scores r={d} />}</td>
                      <td className="px-4 py-3 text-xs text-muted">{ago(m?.createdAt ?? d?.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" disabled={!canRun || busy} onClick={() => runPage(p.path)} className="rounded-lg border border-navy px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy hover:text-white disabled:opacity-40">
                          {busy ? "Testing..." : "Test"}
                        </button>
                        <button type="button" onClick={() => setOpen(open === p.path ? null : p.path)} className="ml-2 text-xs font-semibold text-muted hover:text-heading">{open === p.path ? "Hide" : "Details"}</button>
                      </td>
                    </tr>
                    {open === p.path && (
                      <tr className="bg-soft/30">
                        <td colSpan={5} className="px-4 py-5">
                          <div className="grid gap-6 lg:grid-cols-2">
                            <Detail r={m} device="mobile" />
                            <Detail r={d} device="desktop" />
                          </div>
                          <p className="mt-4 text-xs">
                            <a target="_blank" className="font-medium text-navy hover:underline" href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(`${base}${p.path}`)}`}>Open the full report on pagespeed.web.dev ↗</a>
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

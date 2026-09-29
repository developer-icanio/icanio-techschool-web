"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, ScorePill } from "./ui";

export interface Row {
  path: string;
  key: string;
  label: string;
  kind: string;
  kindLabel: string;
  focusKeyword: string;
  score: number;
  passed: number;
  total: number;
  words: number;
  density: string;
  categories: { category: string; percentage: number }[];
  failed: { id: string; name: string; lost: number }[];
}

const SORTS = {
  score: (a: Row, b: Row) => a.score - b.score || a.path.localeCompare(b.path),
  words: (a: Row, b: Row) => a.words - b.words,
  path: (a: Row, b: Row) => a.path.localeCompare(b.path),
};

export default function ScoreTable({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState<keyof typeof SORTS>("score");
  const [onlyFailing, setOnlyFailing] = useState(false);
  const kinds = useMemo(() => [...new Map(rows.map((r) => [r.kind, r.kindLabel])).entries()], [rows]);

  const list = rows
    .filter((r) => kind === "all" || r.kind === kind)
    .filter((r) => !onlyFailing || r.failed.length)
    .filter((r) => !q || `${r.label} ${r.path} ${r.focusKeyword}`.toLowerCase().includes(q.toLowerCase()))
    .sort(SORTS[sort]);

  const field = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
  return (
    <div className="rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search page or keyword" aria-label="Search pages" className={`${field} min-w-56 flex-1`} />
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Page type" className={field}>
          <option value="all">All page types</option>
          {kinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)} aria-label="Sort" className={field}>
          <option value="score">Lowest score first</option>
          <option value="words">Fewest words first</option>
          <option value="path">By URL</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-body">
          <input type="checkbox" checked={onlyFailing} onChange={(e) => setOnlyFailing(e.target.checked)} /> Only pages with failed rules
        </label>
        <span className="ml-auto text-sm text-muted">{list.length} of {rows.length} pages</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-line bg-soft/60 text-xs uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Page</th>
              <th scope="col" className="px-4 py-3 font-semibold">Focus keyword</th>
              <th scope="col" className="px-4 py-3 font-semibold">Score</th>
              <th scope="col" className="px-4 py-3 font-semibold">Rules</th>
              <th scope="col" className="px-4 py-3 font-semibold">Words</th>
              <th scope="col" className="px-4 py-3 font-semibold">Density</th>
              <th scope="col" className="w-44 px-4 py-3 font-semibold">Categories</th>
              <th scope="col" className="px-4 py-3 font-semibold">Failed rules</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((r) => (
              <tr key={r.path} className="hover:bg-soft/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/seo/${r.key}`} className="font-semibold text-heading hover:text-navy hover:underline">{r.label}</Link>
                  <p className="text-xs text-muted">{r.path} · {r.kindLabel}</p>
                </td>
                <td className="px-4 py-3 text-body">{r.focusKeyword}</td>
                <td className="px-4 py-3"><ScorePill score={r.score} /></td>
                <td className="px-4 py-3 tabular-nums text-body">{r.passed}/{r.total}</td>
                <td className={`px-4 py-3 tabular-nums ${r.words < 2500 ? "font-semibold text-red-700" : "text-body"}`}>{r.words.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 tabular-nums text-body">{r.density}</td>
                <td className="px-4 py-3">
                  <div className="grid grid-cols-5 gap-1">
                    {r.categories.map((c) => <Bar key={c.category} pct={c.percentage} label={c.category} />)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {r.failed.length ? (
                    <ul className="flex flex-wrap gap-1">
                      {r.failed.map((f) => <li key={f.id} title={`${f.name}: -${f.lost} pts`} className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-800">{f.id}</li>)}
                    </ul>
                  ) : (
                    <span className="text-xs font-medium text-emerald-700">All passed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

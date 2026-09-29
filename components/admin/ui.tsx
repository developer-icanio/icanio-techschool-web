// Small presentational pieces shared by the admin pages (server-safe).

export const scoreTone = (s: number) =>
  s >= 90 ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20" : s >= 70 ? "bg-amber-50 text-amber-800 ring-amber-600/20" : "bg-red-50 text-red-800 ring-red-600/20";

export function ScorePill({ score }: { score: number }) {
  return <span className={`inline-flex min-w-11 justify-center rounded-full px-2 py-0.5 text-sm font-semibold tabular-nums ring-1 ring-inset ${scoreTone(score)}`}>{score}</span>;
}

export function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-heading">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Bar({ pct, label }: { pct: number; label?: string }) {
  const tone = pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500";
  return (
    <div title={label ? `${label}: ${pct}%` : `${pct}%`} className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Line chart of average score over time (oldest to newest). */
export function Trend({ points }: { points: { at: Date; score: number }[] }) {
  if (points.length < 2) return <p className="text-sm text-muted">Save at least two snapshots to see the trend.</p>;
  const w = 600, h = 140, pad = 24;
  const min = Math.min(...points.map((p) => p.score), 80);
  const x = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const y = (s: number) => h - pad - ((s - min) * (h - pad * 2)) / (100 - min || 1);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full" role="img" aria-label={`Average score trend, latest ${points.at(-1)!.score}`}>
      {[min, (min + 100) / 2, 100].map((v) => (
        <g key={v}>
          <line x1={pad} x2={w - pad} y1={y(v)} y2={y(v)} stroke="#e2e8f0" />
          <text x={2} y={y(v) + 4} fontSize="10" fill="#64748b">{Math.round(v)}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke="#004589" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.score)} r="3.5" fill="#fff" stroke="#004589" strokeWidth="2">
          <title>{`${p.at.toLocaleDateString("en-IN")}: ${p.score}`}</title>
        </circle>
      ))}
    </svg>
  );
}

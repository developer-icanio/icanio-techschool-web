import type { Metadata } from "next";
import Link from "next/link";
import { ScorePill } from "@/components/admin/ui";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { allPages } from "@/lib/content/pages";
import { KIND_LABEL, keyOf, scoreboard } from "@/lib/seo-report";

export const metadata: Metadata = { title: "Content" };

// Section types editors update every week (the content sheet).
const MEDIA = { testimonials: "Videos", stories: "Students", gallery: "Images", cards: "Grid", tools: "Grid", phases: "Grid", partners: "Grid", steps: "Events" } as const;

export default async function ContentIndex() {
  await requireAdmin();
  const db = await getDb();
  const edits = db ? await db.select({ path: schema.contentPages.path, updatedBy: schema.contentPages.updatedBy, updatedAt: schema.contentPages.updatedAt }).from(schema.contentPages) : [];
  const edited = new Map(edits.map((e) => [e.path, e]));
  const scores = new Map(scoreboard().rows.map((r) => [r.path, r.score]));
  const groups = Object.entries(KIND_LABEL).map(([kind, label]) => ({ label, pages: allPages().filter((p) => p.kind === kind) })).filter((g) => g.pages.length);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Content</h1>
        <p className="mt-1 max-w-3xl text-body">Pick a page to update its videos, student photos, image galleries and grids. Changes go live as soon as you save, and every save is re-checked against the 69 SEO rules.</p>
        {!db && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">No database is connected, so changes can&apos;t be saved yet. Set DATABASE_URL.</p>}
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/admin/library/videos", t: "Videos", d: "Student video testimonials used on every page" },
          { href: "/admin/library/students", t: "Students", d: "Internship completions: photo, track, college" },
          { href: "/admin/library/colleges", t: "Partner colleges", d: "MoU colleges with their logos" },
        ].map((x) => (
          <Link key={x.href} href={x.href} className="rounded-2xl border border-line bg-white p-5 hover:border-navy/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy">Library</p>
            <p className="mt-1 font-semibold text-heading">{x.t}</p>
            <p className="mt-1 text-sm text-muted">{x.d}</p>
          </Link>
        ))}
      </div>

      {groups.map((g) => (
        <section key={g.label} className="overflow-hidden rounded-2xl border border-line bg-white">
          <h2 className="border-b border-line bg-soft/60 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-muted">{g.label}</h2>
          <ul className="divide-y divide-line">
            {g.pages.map((p) => {
              const kinds = [...new Set(p.sections.map((b) => MEDIA[b.type as keyof typeof MEDIA]).filter(Boolean))];
              const e = edited.get(p.path);
              return (
                <li key={p.path}>
                  <Link href={`/admin/content/${keyOf(p.path)}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-soft/50">
                    <span className="min-w-56 flex-1">
                      <span className="block font-medium text-heading">{p.label}</span>
                      <span className="block text-xs text-muted">{p.path}</span>
                    </span>
                    <span className="flex flex-wrap gap-1">{kinds.map((k) => <span key={k} className="rounded bg-soft-2 px-1.5 py-0.5 text-xs font-medium text-navy">{k}</span>)}</span>
                    <span className="w-44 text-right text-xs text-muted">{e ? `Edited ${e.updatedAt.toLocaleDateString("en-IN")} by ${e.updatedBy?.split("@")[0]}` : "Original content"}</span>
                    <ScorePill score={scores.get(p.path) ?? 0} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

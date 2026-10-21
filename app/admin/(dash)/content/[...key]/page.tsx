import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageEditor from "@/components/admin/PageEditor";
import { ScorePill } from "@/components/admin/ui";
import { assetMap, canEdit, requireAdmin } from "@/lib/admin";
import { allPages, experts, getPage, reviews, stories, testimonials } from "@/lib/content/pages";
import { pageMeta } from "@/lib/content/store";
import { keyOf, pageReport, pathOfKey } from "@/lib/seo-report";

export async function generateMetadata({ params }: PageProps<"/admin/content/[...key]">): Promise<Metadata> {
  return { title: `Edit ${pathOfKey((await params).key)}` };
}

export default async function EditPage({ params }: PageProps<"/admin/content/[...key]">) {
  const me = await requireAdmin();
  const path = pathOfKey((await params).key);
  const page = getPage(path);
  if (!page) notFound();
  const meta = await pageMeta(path);
  const score = pageReport(path)!.audit.overallScore;
  const editable = canEdit(me.role);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href="/admin/content" className="text-sm font-medium text-navy hover:underline">← All pages</Link>
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-line bg-white p-5">
        <div>
          <h1 className="text-2xl font-bold">{page.label}</h1>
          <p className="mt-1 text-sm text-muted">
            <a href={page.path} target="_blank" className="text-navy hover:underline">{page.path} ↗</a>
            {meta.edited ? ` · last edited ${meta.edited.updatedAt.toLocaleString("en-IN")} by ${meta.edited.updatedBy}` : " · original content"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/admin/seo/${keyOf(path)}`} className="text-sm font-medium text-navy hover:underline">SEO report</Link>
          <ScorePill score={score} />
        </div>
      </header>
      {!editable ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Your role (seo) can view the scoreboard but not edit content. Ask an owner to change your role to editor.</p>
      ) : (
        <PageEditor
          page={page}
          assets={assetMap()}
          canReset={me.role === "owner" || me.role === "admin"}
          revisions={meta.revisions.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
          ctx={{
            path,
            pages: allPages().map((p) => ({ path: p.path, label: p.label })),
            videos: testimonials().map((t) => ({ id: t.id, title: t.name, subtitle: t.role, photo: t.photo })),
            students: stories().map((s) => ({ id: s.id, title: s.name, subtitle: `${s.track} · ${s.college}`, photo: s.photo })),
            reviews: reviews().map((r) => ({ id: r.id, title: r.name, subtitle: `${r.track} · ${r.college}`, photo: r.photo ?? "" })),
            experts: experts().map((e) => ({ id: e.id, title: e.name, subtitle: e.role, photo: e.photo ?? "" })),
          }}
        />
      )}
    </div>
  );
}

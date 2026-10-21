import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LibraryManager from "@/components/admin/LibraryManager";
import type { LibraryKind } from "@/db/schema";
import { assetMap, canEdit, requireAdmin } from "@/lib/admin";
import { libraryList } from "@/lib/content/store";

const KINDS: Record<string, { kind: LibraryKind; title: string; intro: string }> = {
  videos: { kind: "video", title: "Videos", intro: "Student video testimonials. A video here appears in every \"What students say\" section unless that section picks specific videos." },
  students: { kind: "student", title: "Students", intro: "Internship completions with photo, track and college. They appear in the \"Students who completed internships\" sections, newest first." },
  colleges: { kind: "college", title: "Partner colleges", intro: "MoU colleges with logo and city. They appear in every partner college grid." },
  reviews: { kind: "review", title: "Reviews", intro: "Written intern reviews with photo, college and track. Each \"What people say\" section picks which reviews it shows; new reviews go first." },
  team: { kind: "expert", title: "Team", intro: "Industry trainers and team members shown in the \"Meet the industry trainers\" slider. Drag to change the order." },
};

export async function generateMetadata({ params }: PageProps<"/admin/library/[kind]">): Promise<Metadata> {
  return { title: KINDS[(await params).kind]?.title ?? "Library" };
}

export default async function Library({ params }: PageProps<"/admin/library/[kind]">) {
  const me = await requireAdmin();
  const cfg = KINDS[(await params).kind];
  if (!cfg) notFound();
  const rows = await libraryList(cfg.kind);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/admin/content" className="text-sm font-medium text-navy hover:underline">← Content</Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-navy">Library</p>
        <h1 className="text-3xl font-bold">{cfg.title}</h1>
        <p className="mt-1 text-body">{cfg.intro}</p>
        <nav className="mt-3 flex gap-2 text-sm">
          {Object.entries(KINDS).map(([k, v]) => <Link key={k} href={`/admin/library/${k}`} className={`rounded-full px-3 py-1 ${v.kind === cfg.kind ? "bg-navy text-white" : "bg-white text-navy ring-1 ring-line"}`}>{v.title}</Link>)}
        </nav>
      </header>
      {rows ? (
        <LibraryManager kind={cfg.kind} rows={rows.map((r) => ({ id: r.id, data: r.data as Record<string, string>, published: r.published === 1 }))} assets={assetMap()} canEdit={canEdit(me.role)} />
      ) : (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">No database is connected. Set DATABASE_URL to manage the library.</p>
      )}
    </div>
  );
}

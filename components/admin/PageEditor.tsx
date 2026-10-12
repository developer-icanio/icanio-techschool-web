"use client";

import { useState, useTransition } from "react";
import { resetToOriginal, restoreVersion, saveFaqs, saveHero } from "@/app/admin/content-actions";
import type { PageContent } from "@/lib/content/types";
import { Area, AssetMap, ImageWithAlt, ListEditor, Text } from "./fields";
import SectionEditor, { ResultNote, type EditorContext, type SaveResult } from "./SectionEditor";

export interface Revision { id: string; note: string | null; updatedBy: string | null; createdAt: string }

function HeroEditor({ p, path }: { p: PageContent; path: string }) {
  const [h, setH] = useState(p.hero);
  const [dirty, setDirty] = useState(false);
  const [r, setR] = useState<SaveResult | null>(null);
  const [pending, start] = useTransition();
  const set = (x: Partial<PageContent["hero"]>) => {
    setH({ ...h, ...x });
    setDirty(true);
    setR(null);
  };
  return (
    <section className={`rounded-2xl border bg-white p-5 ${dirty ? "border-amber-400" : "border-line"}`}>
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-soft-2 px-2 py-0.5 text-xs font-semibold text-navy">Hero</span>
        <h2 className="font-semibold">Top of the page</h2>
      </div>
      <div className="mt-4 space-y-3">
        <Text label="Small line above the title" value={h.eyebrow} onChange={(eyebrow) => set({ eyebrow })} />
        <Text label="Page title (H1)" value={h.title} onChange={(title) => set({ title })} max={70} hint={`Keep the focus keyword "${p.seo.focusKeyword}" in the title.`} />
        <Area label="Subtitle" value={h.subtitle} onChange={(subtitle) => set({ subtitle })} hint={`Mention "${p.seo.focusKeyword}" here: Google reads the first lines first.`} />
        <ImageWithAlt label="Hero image" value={h.image} onChange={(image) => image && set({ image })} />
      </div>
      <button type="button" disabled={!dirty || pending} onClick={() => start(async () => { const x = await saveHero(path, h); setR(x); if (x.ok) setDirty(false); })} className="btn btn-primary mt-4 !py-2 disabled:opacity-50">
        {pending ? "Saving..." : "Save and publish"}
      </button>
      <ResultNote r={r} />
    </section>
  );
}

function FaqEditor({ p, path }: { p: PageContent; path: string }) {
  const [faqs, setFaqs] = useState(p.faqs);
  const [dirty, setDirty] = useState(false);
  const [r, setR] = useState<SaveResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className={`rounded-2xl border bg-white p-5 ${dirty ? "border-amber-400" : "border-line"}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-md bg-soft-2 px-2 py-0.5 text-xs font-semibold text-navy">FAQ</span>
        <h2 className="font-semibold">Frequently Asked Questions</h2>
      </div>
      <ListEditor
        items={faqs}
        onChange={(v) => { setFaqs(v); setDirty(true); setR(null); }}
        title={(f) => f.q}
        blank={() => ({ q: "", a: "" })}
        addLabel="Add question"
        render={(f, s) => (
          <>
            <Text label="Question" value={f.q} onChange={(q) => s({ ...f, q })} max={70} />
            <Area label="Answer (40 to 80 words)" value={f.a} onChange={(a) => s({ ...f, a })} rows={4} />
          </>
        )}
      />
      <button type="button" disabled={!dirty || pending} onClick={() => start(async () => { const x = await saveFaqs(path, faqs); setR(x); if (x.ok) setDirty(false); })} className="btn btn-primary mt-4 !py-2 disabled:opacity-50">
        {pending ? "Saving..." : "Save and publish"}
      </button>
      <ResultNote r={r} />
    </section>
  );
}

export default function PageEditor({ page, ctx, assets, revisions, canReset }: { page: PageContent; ctx: EditorContext; assets: Record<string, string>; revisions: Revision[]; canReset: boolean }) {
  const [msg, setMsg] = useState<SaveResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <AssetMap.Provider value={assets}>
      <div className="space-y-4">
        <HeroEditor p={page} path={ctx.path} />
        {page.sections.map((b, i) => <SectionEditor key={`${i}-${b.type}`} block={b} index={i} ctx={ctx} />)}
        <FaqEditor p={page} path={ctx.path} />

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-semibold">Previous versions</h2>
          <p className="mt-1 text-sm text-muted">Every save keeps the version before it. Restore one if a change went wrong.</p>
          {revisions.length ? (
            <ul className="mt-3 divide-y divide-line">
              {revisions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    <span className="text-heading">{v.note?.replace(/^Before: /, "Before ") ?? "Saved version"}</span>
                    <span className="block text-xs text-muted">{new Date(v.createdAt).toLocaleString("en-IN")} · {v.updatedBy}</span>
                  </span>
                  <button type="button" disabled={pending} onClick={() => confirm("Restore this version? The current page will be kept as a version too.") && start(async () => { setMsg(await restoreVersion(v.id)); location.reload(); })} className="text-sm font-semibold text-navy hover:underline">
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">No saved changes yet.</p>
          )}
          {canReset && revisions.length > 0 && (
            <button type="button" disabled={pending} onClick={() => confirm("Remove all dashboard edits on this page and go back to the original content?") && start(async () => { setMsg(await resetToOriginal(ctx.path)); location.reload(); })} className="mt-4 text-sm font-semibold text-red-700 hover:underline">
              Reset page to original content
            </button>
          )}
          <ResultNote r={msg} />
        </section>
      </div>
    </AssetMap.Provider>
  );
}

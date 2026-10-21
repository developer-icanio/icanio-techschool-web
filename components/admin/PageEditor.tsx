"use client";

import { useState, useTransition } from "react";
import { addSection, deleteSection, moveSection, resetToOriginal, restoreVersion, saveFaqs, saveHero } from "@/app/admin/content-actions";
import type { Block, PageContent } from "@/lib/content/types";
import { Area, AssetMap, ImageWithAlt, LinkPicker, Lines, ListEditor, Text } from "./fields";
import PageDetailsEditor from "./PageDetailsEditor";
import SectionEditor, { BLOCK_LABEL, ResultNote, type EditorContext, type SaveResult } from "./SectionEditor";

export interface Revision { id: string; note: string | null; updatedBy: string | null; createdAt: string }

function HeroEditor({ p, path, pages }: { p: PageContent; path: string; pages: { path: string; label: string }[] }) {
  const [h, setH] = useState({ ...p.hero, secondary: p.hero.secondary ?? { label: "", href: "" } });
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
        <label className="flex items-center gap-2 text-sm text-heading">
          <input type="checkbox" checked={Boolean(h.imageLeft)} onChange={(e) => set({ imageLeft: e.target.checked })} className="h-4 w-4" />
          Image on the left, text on the right (use when the person in the photo points right)
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Text label="Main button text" value={h.primary.label} onChange={(label) => set({ primary: { ...h.primary, label } })} />
          <LinkPicker label="Main button links to" value={h.primary.href} onChange={(href) => set({ primary: { ...h.primary, href } })} pages={pages} />
          <Text label="Second button text (optional)" value={h.secondary?.label} onChange={(label) => set({ secondary: { href: h.secondary?.href ?? "", label } })} />
          <LinkPicker label="Second button links to" value={h.secondary?.href} onChange={(href) => set({ secondary: { label: h.secondary?.label ?? "", href } })} pages={pages} />
        </div>
        <Lines label="Tick points under the buttons (one per line)" value={h.highlights} onChange={(highlights) => set({ highlights })} rows={4} />
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

/** Move up / down / remove, above each section. Structural changes reload the editor. */
function SectionTools({ path, index, count, heading }: { path: string; index: number; count: number; heading: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const run = (fn: () => Promise<SaveResult>) => start(async () => { const r = await fn(); if (r.ok) location.reload(); else setErr(r.message); });
  const btn = "rounded-md px-2 py-1 text-xs font-semibold text-muted hover:bg-white hover:text-heading disabled:opacity-30";
  return (
    <div className="-mb-3 flex items-center justify-end gap-1">
      {err && <span className="mr-2 text-xs text-red-700">{err}</span>}
      <button type="button" disabled={pending || index === 0} onClick={() => run(() => moveSection(path, index, index - 1))} className={btn}>↑ Move up</button>
      <button type="button" disabled={pending || index === count - 1} onClick={() => run(() => moveSection(path, index, index + 1))} className={btn}>↓ Move down</button>
      <button type="button" disabled={pending} onClick={() => confirm(`Remove the section "${heading}"? You can bring it back from Previous versions.`) && run(() => deleteSection(path, index))} className={`${btn} hover:!text-red-700`}>✕ Remove</button>
    </div>
  );
}

/** "Add a section here" between sections: pick a type, it is inserted with starter content to edit. */
function AddSection({ path, at }: { path: string; at: number }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="group flex w-full items-center gap-3 text-xs font-semibold text-muted hover:text-navy">
        <span className="h-px flex-1 bg-line group-hover:bg-navy/40" />＋ Add a section here<span className="h-px flex-1 bg-line group-hover:bg-navy/40" />
      </button>
    );
  return (
    <div className="rounded-xl border border-dashed border-navy/40 bg-soft/60 p-4">
      <p className="text-sm font-semibold text-heading">Add a section here</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(BLOCK_LABEL) as Block["type"][]).map((t) => (
          <button key={t} type="button" disabled={pending} onClick={() => start(async () => { const r = await addSection(path, at, t); if (r.ok) location.reload(); else setErr(r.message); })} className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-navy ring-1 ring-line hover:bg-navy hover:text-white disabled:opacity-50">
            {BLOCK_LABEL[t]}
          </button>
        ))}
        <button type="button" onClick={() => setOpen(false)} className="px-2 text-xs text-muted hover:text-heading">Cancel</button>
      </div>
      {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
    </div>
  );
}

export default function PageEditor({ page, ctx, assets, revisions, canReset }: { page: PageContent; ctx: EditorContext; assets: Record<string, string>; revisions: Revision[]; canReset: boolean }) {
  const [msg, setMsg] = useState<SaveResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <AssetMap.Provider value={assets}>
      <div className="space-y-4">
        <PageDetailsEditor p={page} path={ctx.path} pages={ctx.pages} />
        <HeroEditor p={page} path={ctx.path} pages={ctx.pages} />
        <AddSection path={ctx.path} at={0} />
        {page.sections.map((b, i) => (
          <div key={`${i}-${b.type}`} className="space-y-4">
            <SectionTools path={ctx.path} index={i} count={page.sections.length} heading={b.heading} />
            <SectionEditor block={b} index={i} ctx={ctx} />
            <AddSection path={ctx.path} at={i + 1} />
          </div>
        ))}
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

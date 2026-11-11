"use client";

import { useState, useTransition } from "react";
import { savePageDetails, type PageDetails } from "@/app/admin/content-actions";
import type { PageContent } from "@/lib/content/types";
import { Area, LinkPicker, Lines, ListEditor, Paragraphs, Text } from "./fields";
import { ResultNote, type SaveResult } from "./SectionEditor";

// Everything on a page outside the hero and the sections. Grouped in the
// order a visitor (and Google) meets them.
export default function PageDetailsEditor({ p, path, pages }: { p: PageContent; path: string; pages: { path: string; label: string }[] }) {
  const [d, setD] = useState<PageDetails>({
    label: p.label,
    seo: { metaTitle: p.seo.metaTitle, metaDescription: p.seo.metaDescription, focusKeyword: p.seo.focusKeyword, secondaryKeywords: p.seo.secondaryKeywords },
    facts: p.facts ?? [],
    answer: p.answer,
    takeaways: p.takeaways,
    conclusion: p.conclusion,
    references: p.references,
    cta: { ...p.cta, secondary: p.cta.secondary ?? { label: "", href: "" } },
  });
  const [dirty, setDirty] = useState(false);
  const [r, setR] = useState<SaveResult | null>(null);
  const [pending, start] = useTransition();
  const set = (x: Partial<PageDetails>) => {
    setD({ ...d, ...x });
    setDirty(true);
    setR(null);
  };
  const kw = d.seo.focusKeyword;
  const titleLen = d.seo.metaTitle.length + " | Icanio".length;
  const descLen = d.seo.metaDescription.length;
  const group = "rounded-xl border border-line p-4 open:bg-soft/40";
  const summary = "cursor-pointer select-none text-sm font-semibold text-heading";

  return (
    <section className={`rounded-2xl border bg-white p-5 ${dirty ? "border-amber-400" : "border-line"}`}>
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-soft-2 px-2 py-0.5 text-xs font-semibold text-navy">Page</span>
        <h2 className="font-semibold">Page details and SEO</h2>
      </div>
      <p className="mt-1 text-sm text-muted">Google listing, the quick answer box, key facts, the end of the page and its call to action.</p>

      <div className="mt-4 space-y-3">
        <details className={group} open>
          <summary className={summary}>Google search listing</summary>
          <div className="mt-3 space-y-3">
            <Text label="Focus keyword" value={kw} onChange={(focusKeyword) => set({ seo: { ...d.seo, focusKeyword } })} hint="The one phrase this page should rank for. Use it in the title, the description and the first paragraph." />
            <Text label="SEO title" value={d.seo.metaTitle} onChange={(metaTitle) => set({ seo: { ...d.seo, metaTitle } })} hint={`${titleLen} of 60 characters with " | Icanio" added. ${titleLen > 60 ? "Too long: Google will cut it." : ""}`} />
            <Area label="SEO description" value={d.seo.metaDescription} onChange={(metaDescription) => set({ seo: { ...d.seo, metaDescription } })} rows={3} hint={`${descLen} characters. Aim for 145 to 158 and include "${kw}".`} />
            <Lines label="Related keywords (one per line)" value={d.seo.secondaryKeywords} onChange={(secondaryKeywords) => set({ seo: { ...d.seo, secondaryKeywords } })} rows={3} />
            <Text label="Short page name (breadcrumbs and menus)" value={d.label} onChange={(label) => set({ label })} />
            <div className="rounded-lg border border-line bg-white p-3">
              <p className="text-xs text-muted">Preview in Google</p>
              <p className="mt-1 truncate text-[17px] text-[#1a0dab]">{d.seo.metaTitle} | Icanio</p>
              <p className="text-xs text-[#006621]">www.icaniotechschool.com{path === "/" ? "" : path}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{d.seo.metaDescription}</p>
            </div>
          </div>
        </details>

        <details className={group}>
          <summary className={summary}>Quick answer box (top of the page)</summary>
          <div className="mt-3 space-y-3">
            <Text label="Question" value={d.answer.question} onChange={(question) => set({ answer: { ...d.answer, question } })} max={70} />
            <Area label="Answer (40 to 70 words)" value={d.answer.answer} onChange={(answer) => set({ answer: { ...d.answer, answer } })} rows={4} hint="AI search tools quote this box. Answer the question in the first sentence." />
          </div>
        </details>

        <details className={group}>
          <summary className={summary}>Key facts strip (under the hero)</summary>
          <div className="mt-3">
            <ListEditor
              items={d.facts ?? []}
              onChange={(facts) => set({ facts })}
              title={(f) => `${f.label}: ${f.value}`}
              blank={() => ({ label: "", value: "" })}
              addLabel="Add fact"
              render={(f, s) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Text label="Label" value={f.label} onChange={(label) => s({ ...f, label })} placeholder="e.g. Duration" />
                  <Text label="Value" value={f.value} onChange={(value) => s({ ...f, value })} placeholder="e.g. 15 days to 6 months" />
                </div>
              )}
            />
          </div>
        </details>

        <details className={group}>
          <summary className={summary}>Key takeaways and conclusion</summary>
          <div className="mt-3 space-y-3">
            <Lines label="Key takeaways (one per line)" value={d.takeaways} onChange={(takeaways) => set({ takeaways })} rows={5} />
            <Paragraphs label="Conclusion" value={d.conclusion} onChange={(conclusion) => set({ conclusion })} />
          </div>
        </details>

        <details className={group}>
          <summary className={summary}>References and sources</summary>
          <div className="mt-3">
            <ListEditor
              items={d.references}
              onChange={(references) => set({ references })}
              title={(l) => l.label}
              blank={() => ({ label: "", href: "https://" })}
              addLabel="Add source"
              render={(l, s) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Text label="Source name" value={l.label} onChange={(label) => s({ ...l, label })} placeholder="e.g. MDN Web Docs: HTML" />
                  <Text label="Web address" value={l.href} onChange={(href) => s({ ...l, href })} placeholder="https://" />
                </div>
              )}
            />
          </div>
        </details>

        <details className={group}>
          <summary className={summary}>Call-to-action band (end of the page)</summary>
          <div className="mt-3 space-y-3">
            <Text label="Title" value={d.cta.title} onChange={(title) => set({ cta: { ...d.cta, title } })} max={70} />
            <Area label="Text" value={d.cta.body} onChange={(body) => set({ cta: { ...d.cta, body } })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Text label="Main button text" value={d.cta.primary.label} onChange={(label) => set({ cta: { ...d.cta, primary: { ...d.cta.primary, label } } })} />
              <LinkPicker label="Main button links to" value={d.cta.primary.href} onChange={(href) => set({ cta: { ...d.cta, primary: { ...d.cta.primary, href } } })} pages={pages} />
              <Text label="Second button text (optional)" value={d.cta.secondary?.label} onChange={(label) => set({ cta: { ...d.cta, secondary: { href: d.cta.secondary?.href ?? "", label } } })} />
              <LinkPicker label="Second button links to" value={d.cta.secondary?.href} onChange={(href) => set({ cta: { ...d.cta, secondary: { label: d.cta.secondary?.label ?? "", href } } })} pages={pages} />
            </div>
          </div>
        </details>
      </div>

      <button type="button" disabled={!dirty || pending} onClick={() => start(async () => { const x = await savePageDetails(path, d); setR(x); if (x.ok) setDirty(false); })} className="btn btn-primary mt-4 !py-2 disabled:opacity-50">
        {pending ? "Saving..." : "Save and publish"}
      </button>
      <ResultNote r={r} />
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { saveSection } from "@/app/admin/content-actions";
import type { Block } from "@/lib/content/types";
import { Area, ImageWithAlt, LinkPicker, Lines, ListEditor, Paragraphs, Text, Upload, useAsset } from "./fields";

export interface LibraryOption { id: string; title: string; subtitle: string; photo: string }
export interface EditorContext {
  path: string;
  pages: { path: string; label: string }[];
  videos: LibraryOption[];
  students: LibraryOption[];
  reviews: LibraryOption[];
  experts: LibraryOption[];
}

// What each block is called in the dashboard, matching the content sheet.
export const BLOCK_LABEL: Record<Block["type"], string> = {
  testimonials: "Videos",
  stories: "Students (photos and words)",
  gallery: "Images",
  cards: "Grid",
  tools: "Grid: tools",
  phases: "Grid: curriculum",
  partners: "Grid: partner colleges",
  steps: "Steps / events",
  checklist: "Checklist",
  stats: "Numbers",
  links: "Related links",
  table: "Table",
  prose: "Text and image",
  form: "Lead form",
  batches: "Upcoming batches",
  reviews: "Written reviews",
  experts: "Team / experts",
};

export type SaveResult = Awaited<ReturnType<typeof saveSection>>;

export function ResultNote({ r }: { r: SaveResult | null }) {
  if (!r) return null;
  const drop = r.before !== undefined && r.score !== undefined && r.score < r.before;
  return (
    <div role="status" className={`mt-3 rounded-lg px-3 py-2 text-sm ${!r.ok ? "bg-red-50 text-red-800" : drop ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>
      <p className="font-medium">{r.message}</p>
      {r.ok && r.fixes && r.fixes.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
          {r.fixes.slice(0, 6).map((f) => <li key={f}>{f}</li>)}
        </ul>
      )}
    </div>
  );
}

/** Tick and order items from a library (videos or students). */
function Picker({ options, value, onChange, note }: { options: LibraryOption[]; value: string[]; onChange: (v: string[]) => void; note: string }) {
  const asset = useAsset();
  const chosen = value.filter((id) => options.some((o) => o.id === id));
  const toggle = (id: string) => onChange(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);
  const move = (id: string, d: number) => {
    const i = chosen.indexOf(id);
    const j = i + d;
    if (j < 0 || j >= chosen.length) return;
    const next = [...chosen];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      <p className="text-xs text-muted">{note}</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((o) => {
          const pos = chosen.indexOf(o.id);
          return (
            <li key={o.id} className={`flex items-center gap-3 rounded-xl border p-2 ${pos >= 0 ? "border-navy bg-soft" : "border-line bg-white"}`}>
              <input type="checkbox" checked={pos >= 0} onChange={() => toggle(o.id)} aria-label={`Show ${o.title}`} className="h-4 w-4" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset(o.photo)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-heading">{o.title}</p>
                <p className="truncate text-xs text-muted">{o.subtitle}</p>
              </div>
              {pos >= 0 && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  #{pos + 1}
                  <button type="button" aria-label="Show earlier" onClick={() => move(o.id, -1)} className="px-1 hover:text-heading">↑</button>
                  <button type="button" aria-label="Show later" onClick={() => move(o.id, 1)} className="px-1 hover:text-heading">↓</button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Body({ b, set, ctx }: { b: Block; set: (b: Block) => void; ctx: EditorContext }) {
  switch (b.type) {
    case "testimonials":
      return (
        <div className="space-y-3">
          <Picker options={ctx.videos} value={b.ids ?? []} onChange={(ids) => set({ ...b, ids })} note="Tick the videos to show here, in order. Leave all unticked to show every published video. Add or replace videos in Library: Videos." />
        </div>
      );
    case "stories":
      return (
        <div className="space-y-3">
          <Picker options={ctx.students} value={b.ids ?? []} onChange={(ids) => set({ ...b, ids })} note="Tick students to show here, in order. With none ticked, the newest completions are shown (matching the track below first). Add students in Library: Students." />
          <div className="grid gap-3 sm:grid-cols-2">
            <Text label="Prefer this track when none are ticked" value={b.track} onChange={(track) => set({ ...b, track })} placeholder="e.g. DevOps" />
            <Text label="How many to show" value={b.limit ? String(b.limit) : ""} onChange={(v) => set({ ...b, limit: Number(v) || undefined })} placeholder="6" />
          </div>
        </div>
      );
    case "partners":
      return (
        <div className="space-y-3">
          <p className="text-sm text-body">This grid shows the colleges in Library: Partner colleges, in that order. Add a new MoU college there and it appears here and on every partner list.</p>
          <Text label="How many to show (empty = all)" value={b.limit ? String(b.limit) : ""} onChange={(v) => set({ ...b, limit: Number(v) || undefined })} />
        </div>
      );
    case "gallery":
      return (
        <ListEditor
          items={b.items}
          onChange={(items) => set({ ...b, items })}
          title={(g) => g.caption || g.alt}
          blank={() => ({ src: "", alt: "", caption: "" })}
          addLabel="Add photo"
          render={(g, s) => (
            <>
              <ImageWithAlt label="Photo" value={g} onChange={(v) => v && s({ ...g, ...v })} />
              <Area label="Caption (name the college and the event)" value={g.caption} onChange={(caption) => s({ ...g, caption })} rows={2} />
            </>
          )}
        />
      );
    case "cards":
      return (
        <ListEditor
          items={b.items}
          onChange={(items) => set({ ...b, items })}
          title={(c) => c.title}
          blank={() => ({ title: "", body: "" }) as (typeof b.items)[number]}
          addLabel="Add card"
          render={(c, s) => (
            <>
              <Text label="Title" value={c.title} onChange={(title) => s({ ...c, title })} max={70} />
              <Area label="Text" value={c.body} onChange={(body) => s({ ...c, body })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <LinkPicker label="Links to" value={c.href} onChange={(href) => s({ ...c, href: href || undefined })} pages={ctx.pages} />
                <Text label="Small label (optional)" value={c.meta} onChange={(meta) => s({ ...c, meta: meta || undefined })} placeholder="e.g. Engineering" />
              </div>
              <Upload label="Icon (optional)" value={c.icon} accept="image/*" preview="icon" onChange={(u) => s({ ...c, icon: u.src })} />
              <ImageWithAlt label="Photo (optional)" value={c.image} onChange={(image) => s({ ...c, image })} />
            </>
          )}
        />
      );
    case "batches":
      return (
        <div className="space-y-3">
          <p className="text-sm text-body">The start date updates itself: each card shows the next batch day (India time). Change the day here if batches move.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="font-medium text-heading">Batch day</span>
              <select value={b.weekday} onChange={(e) => set({ ...b, weekday: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-line px-3 py-2">
                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </label>
            <Text label="Timing" value={b.time} onChange={(time) => set({ ...b, time })} placeholder="9am to 6pm" />
            <Text label="Modes (comma separated)" value={b.modes.join(", ")} onChange={(v) => set({ ...b, modes: v.split(",").map((x) => x.trim()).filter(Boolean) })} placeholder="Offline, Online, Part time" />
          </div>
          <ListEditor
            items={b.items}
            onChange={(items) => set({ ...b, items })}
            title={(x) => x.title}
            blank={() => ({ title: "", href: "/internships" }) as (typeof b.items)[number]}
            addLabel="Add batch"
            render={(x, s) => (
              <div className="grid gap-3 sm:grid-cols-3">
                <Text label="Track" value={x.title} onChange={(title) => s({ ...x, title })} />
                <LinkPicker label="Apply button links to" value={x.href} onChange={(href) => s({ ...x, href: href || "/internships" })} pages={ctx.pages} />
                <Text label="Weeks later than the next batch (0 = next)" value={String(x.weekOffset ?? 0)} onChange={(v) => s({ ...x, weekOffset: Number(v) || undefined })} />
              </div>
            )}
          />
        </div>
      );
    case "reviews":
      return <Picker options={ctx.reviews} value={b.ids ?? []} onChange={(ids) => set({ ...b, ids })} note="Tick the reviews to show here, in order. Leave all unticked to show every published review. Add or edit reviews in Library: Reviews." />;
    case "experts":
      return <Picker options={ctx.experts} value={b.ids ?? []} onChange={(ids) => set({ ...b, ids })} note="Tick people to show here, in order. Leave all unticked to show everyone in Library: Team, in that order." />;
    case "tools":
      return (
        <ListEditor
          items={b.items}
          onChange={(items) => set({ ...b, items })}
          title={(t) => `${t.name}${t.role ? `: ${t.role}` : ""}`}
          blank={() => ({ name: "", role: "" }) as (typeof b.items)[number]}
          addLabel="Add tool"
          render={(t, s) => (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Text label="Tool name" value={t.name} onChange={(name) => s({ ...t, name })} />
                <Text label="What it is used for" value={t.role} onChange={(role) => s({ ...t, role })} />
              </div>
              <Upload label="Logo" value={t.logo} accept="image/*" preview="icon" onChange={(u) => s({ ...t, logo: u.src })} />
            </>
          )}
        />
      );
    case "phases":
      return (
        <ListEditor
          items={b.items}
          onChange={(items) => set({ ...b, items })}
          title={(p) => `${p.label}: ${p.title}`}
          blank={() => ({ label: `Phase ${b.items.length + 1}`, title: "", points: [] })}
          addLabel="Add phase"
          render={(p, s) => (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Text label="Label" value={p.label} onChange={(label) => s({ ...p, label })} />
                <Text label="Title" value={p.title} onChange={(title) => s({ ...p, title })} max={60} />
              </div>
              <Lines label="Topics covered" value={p.points} onChange={(points) => s({ ...p, points })} rows={6} />
            </>
          )}
        />
      );
    case "steps":
      return (
        <ListEditor
          items={b.items}
          onChange={(items) => set({ ...b, items })}
          title={(x) => `${x.label ? `${x.label}: ` : ""}${x.title}`}
          blank={() => ({ title: "", body: "" }) as (typeof b.items)[number]}
          addLabel="Add step or event"
          render={(x, s) => (
            <>
              <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                <Text label="Label or date (optional)" value={x.label} onChange={(label) => s({ ...x, label: label || undefined })} placeholder="e.g. 16 Sep 2026" />
                <Text label="Title" value={x.title} onChange={(title) => s({ ...x, title })} max={70} />
              </div>
              <Area label="Text" value={x.body} onChange={(body) => s({ ...x, body })} />
            </>
          )}
        />
      );
    case "stats":
      return (
        <ListEditor
          items={b.items}
          onChange={(items) => set({ ...b, items })}
          title={(x) => `${x.value} ${x.label}`}
          blank={() => ({ value: "", label: "" })}
          addLabel="Add number"
          render={(x, s) => (
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <Text label="Number" value={x.value} onChange={(value) => s({ ...x, value })} placeholder="2,000+" />
              <Text label="Label" value={x.label} onChange={(label) => s({ ...x, label })} placeholder="Students trained" />
            </div>
          )}
        />
      );
    case "links":
      return (
        <ListEditor
          items={b.items}
          onChange={(items) => set({ ...b, items })}
          title={(l) => l.title}
          blank={() => ({ title: "", href: "", body: "" })}
          addLabel="Add link"
          render={(l, s) => (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Text label="Title" value={l.title} onChange={(title) => s({ ...l, title })} />
                <LinkPicker label="Page" value={l.href} onChange={(href) => s({ ...l, href })} pages={ctx.pages} />
              </div>
              <Text label="One-line description" value={l.body} onChange={(body) => s({ ...l, body })} />
            </>
          )}
        />
      );
    case "checklist":
      return (
        <div className="space-y-3">
          <Lines label="Items" value={b.items} onChange={(items) => set({ ...b, items })} rows={7} />
          <ImageWithAlt label="Image (optional)" value={b.image} onChange={(image) => set({ ...b, image })} />
        </div>
      );
    case "table":
      return (
        <div className="space-y-3">
          <Text label="Column headings (separate with |)" value={b.columns.join(" | ")} onChange={(v) => set({ ...b, columns: v.split("|").map((x) => x.trim()) })} />
          <Lines label="Rows (one row per line, cells separated with |)" value={b.rows.map((r) => r.join(" | "))} onChange={(rows) => set({ ...b, rows: rows.map((r) => r.split("|").map((x) => x.trim())) })} rows={7} hint="Keep the whole table short: about 5 rows and under 120 words." />
          <Text label="Note under the table (optional)" value={b.note} onChange={(note) => set({ ...b, note: note || undefined })} />
        </div>
      );
    case "prose":
      return (
        <div className="space-y-3">
          <Paragraphs label="Paragraphs" value={b.paragraphs} onChange={(paragraphs) => set({ ...b, paragraphs })} />
          <Lines label="Bullet points (optional)" value={b.bullets} onChange={(bullets) => set({ ...b, bullets: bullets.length ? bullets : undefined })} />
          <ImageWithAlt label="Image (optional)" value={b.image} onChange={(image) => set({ ...b, image })} />
        </div>
      );
    case "form":
      return <Lines label="Points beside the form" value={b.points} onChange={(points) => set({ ...b, points })} rows={3} />;
  }
}

export default function SectionEditor({ block, index, ctx }: { block: Block; index: number; ctx: EditorContext }) {
  const [b, setB] = useState(block);
  const [base, setBase] = useState(block); // last saved version
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [pending, start] = useTransition();
  const [version, setVersion] = useState(0); // remounts the fields on "Discard"
  const set = (x: Block) => {
    setB(x);
    setDirty(true);
    setResult(null);
  };

  return (
    <section className={`rounded-2xl border bg-white ${dirty ? "border-amber-400" : "border-line"}`}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-4 text-left">
        <span className="rounded-md bg-soft-2 px-2 py-0.5 text-xs font-semibold text-navy">{BLOCK_LABEL[b.type]}</span>
        <span className="min-w-0 flex-1 truncate font-semibold text-heading">{b.heading}</span>
        {dirty && <span className="text-xs font-semibold text-amber-700">Unsaved</span>}
        <span aria-hidden className={`text-navy transition ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-line px-5 py-5">
          <Text key={`h${version}`} label="Section heading" value={b.heading} onChange={(heading) => set({ ...b, heading })} max={70} />
          {b.type !== "stats" && <Area label="Intro line (optional)" value={b.intro} onChange={(intro) => set({ ...b, intro: intro || undefined })} rows={2} />}
          <Body key={version} b={b} set={set} ctx={ctx} />
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <button
              type="button"
              disabled={!dirty || pending}
              onClick={() =>
                start(async () => {
                  const r = await saveSection(ctx.path, index, b);
                  setResult(r);
                  if (r.ok) {
                    setDirty(false);
                    setBase(b);
                  }
                })
              }
              className="btn btn-primary !py-2 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save and publish"}
            </button>
            {dirty && (
              <button type="button" onClick={() => { setB(base); setDirty(false); setVersion(version + 1); }} className="text-sm font-medium text-muted hover:text-heading">
                Discard changes
              </button>
            )}
          </div>
          <ResultNote r={result} />
        </div>
      )}
    </section>
  );
}

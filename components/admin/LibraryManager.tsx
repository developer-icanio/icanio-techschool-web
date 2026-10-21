"use client";

import { useState, useTransition } from "react";
import { deleteLibraryItem, reorderLibrary, saveLibraryItem } from "@/app/admin/content-actions";
import type { LibraryKind } from "@/db/schema";
import { Area, AssetMap, Text, Upload, useAsset } from "./fields";

export interface LibraryRow { id: string; data: Record<string, string>; published: boolean }

type Field = { key: string; label: string; type: "text" | "area" | "image" | "video"; placeholder?: string; hint?: string };

const FIELDS: Record<LibraryKind, Field[]> = {
  video: [
    { key: "name", label: "Student name", type: "text" },
    { key: "role", label: "Role", type: "text", placeholder: "e.g. UI/UX Intern" },
    { key: "quote", label: "Quote (one or two sentences)", type: "area" },
    { key: "photo", label: "Photo (also the video cover)", type: "image" },
    { key: "video", label: "Video (MP4)", type: "video", hint: "MP4 from a phone works. Keep it under 2 minutes." },
  ],
  student: [
    { key: "name", label: "Student name", type: "text" },
    { key: "track", label: "Internship track", type: "text", placeholder: "e.g. DevOps" },
    { key: "duration", label: "Duration", type: "text", placeholder: "e.g. one-month" },
    { key: "degree", label: "Degree", type: "text", placeholder: "e.g. B.E. CSE" },
    { key: "college", label: "College and city", type: "text", placeholder: "e.g. Karpagam College of Engineering, Coimbatore" },
    { key: "photo", label: "Photo", type: "image" },
  ],
  college: [
    { key: "name", label: "College name", type: "text" },
    { key: "city", label: "City", type: "text" },
    { key: "logo", label: "Logo", type: "image" },
  ],
  review: [
    { key: "name", label: "Student name", type: "text" },
    { key: "college", label: "College", type: "text", placeholder: "e.g. Ramco Institute of Technology" },
    { key: "track", label: "Track", type: "text", placeholder: "e.g. Frontend Intern" },
    { key: "quote", label: "Review (what they said)", type: "area", hint: "Two to four sentences in their own words. Long reviews show a Read more link." },
    { key: "photo", label: "Photo (square)", type: "image" },
  ],
  expert: [
    { key: "name", label: "Name", type: "text" },
    { key: "role", label: "Role", type: "text", placeholder: "e.g. SDE II - Engineering" },
    { key: "bio", label: "Short bio (shows on hover)", type: "area", placeholder: "An SDE II with 4+ years of experience in ..." },
    { key: "photo", label: "Photo card (portrait, white background)", type: "image" },
  ],
};

const TITLE: Record<LibraryKind, (d: Record<string, string>) => [string, string]> = {
  video: (d) => [d.name, d.role],
  student: (d) => [d.name, `${d.track} · ${d.college}`],
  college: (d) => [d.name, d.city],
  review: (d) => [d.name, `${d.track} · ${d.college}`],
  expert: (d) => [d.name, d.role],
};

function Item({ kind, row, onSaved, onDeleted, drag }: { kind: LibraryKind; row: LibraryRow; onSaved: (r: LibraryRow) => void; onDeleted: () => void; drag: Record<string, unknown> }) {
  const [open, setOpen] = useState(!row.id);
  const [d, setD] = useState(row.data);
  const [pub, setPub] = useState(row.published);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const asset = useAsset();
  const [title, sub] = TITLE[kind](d);
  const thumb = kind === "college" ? d.logo : d.photo;

  return (
    <li {...drag} className={`rounded-xl border bg-white ${pub ? "border-line" : "border-dashed border-slate-300 opacity-75"}`}>
      <div className="flex items-center gap-3 px-3 py-2">
        <span aria-hidden title="Drag to reorder" className="cursor-grab select-none text-lg text-slate-400">⠿</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {thumb ? <img src={asset(thumb)} alt="" className={`h-11 w-11 shrink-0 bg-soft ${kind === "college" ? "rounded-lg object-contain" : "rounded-full object-cover"}`} /> : <span className="h-11 w-11 shrink-0 rounded-full bg-soft" />}
        <button type="button" onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-semibold text-heading">{title || "New item"}</span>
          <span className="block truncate text-xs text-muted">{sub}</span>
        </button>
        {!pub && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-muted">Hidden</span>}
        <button type="button" onClick={() => setOpen(!open)} className="text-sm font-semibold text-navy">{open ? "Close" : "Edit"}</button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-line p-4">
          {FIELDS[kind].map((f) =>
            f.type === "text" ? <Text key={f.key} label={f.label} value={d[f.key]} placeholder={f.placeholder} onChange={(v) => setD({ ...d, [f.key]: v })} />
            : f.type === "area" ? <Area key={f.key} label={f.label} value={d[f.key]} onChange={(v) => setD({ ...d, [f.key]: v })} />
            : <Upload key={f.key} label={f.label} value={d[f.key]} preview={f.type === "video" ? "video" : kind === "college" ? "icon" : "image"} accept={f.type === "video" ? "video/mp4,video/webm,video/quicktime" : "image/*"} onChange={(u) => setD({ ...d, [f.key]: u.src })} />,
          )}
          <label className="flex items-center gap-2 text-sm text-heading">
            <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} /> Show on the website
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await saveLibraryItem(kind, row.id || null, d, pub);
                  setMsg({ ok: r.ok, text: r.message });
                  if (r.ok) onSaved({ id: r.id!, data: d, published: pub });
                })
              }
              className="btn btn-primary !py-2 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save and publish"}
            </button>
            {row.id && (
              <button type="button" disabled={pending} onClick={() => confirm(`Delete "${title}" from every page?`) && start(async () => { await deleteLibraryItem(kind, row.id); onDeleted(); })} className="text-sm font-semibold text-red-700 hover:underline">
                Delete
              </button>
            )}
            {!row.id && <button type="button" onClick={onDeleted} className="text-sm text-muted">Cancel</button>}
          </div>
          {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
        </div>
      )}
    </li>
  );
}

export default function LibraryManager({ kind, rows, assets, canEdit }: { kind: LibraryKind; rows: LibraryRow[]; assets: Record<string, string>; canEdit: boolean }) {
  const [list, setList] = useState(rows);
  const [dragging, setDragging] = useState<number | null>(null);
  const [orderDirty, setOrderDirty] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const blank = (): LibraryRow => ({ id: "", data: Object.fromEntries(FIELDS[kind].map((f) => [f.key, ""])), published: true });

  if (!canEdit) return <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">Your role can&apos;t edit the library.</p>;

  return (
    <AssetMap.Provider value={assets}>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setList([blank(), ...list])} className="btn btn-primary !py-2">+ Add new</button>
        {orderDirty && (
          <button type="button" disabled={pending} onClick={() => start(async () => { const r = await reorderLibrary(kind, list.filter((x) => x.id).map((x) => x.id)); setNote(r.message); setOrderDirty(false); })} className="btn btn-outline !py-2">
            {pending ? "Saving..." : "Save new order"}
          </button>
        )}
        <span className="text-sm text-muted">{list.filter((x) => x.published && x.id).length} shown on the site · drag to change the order (first is shown first)</span>
        {note && <span className="text-sm text-emerald-700">{note}</span>}
      </div>
      <ol className="mt-4 space-y-2">
        {list.map((row, i) => (
          <Item
            key={row.id || `new-${i}`}
            kind={kind}
            row={row}
            onSaved={(r) => setList(list.map((x, j) => (j === i ? r : x)))}
            onDeleted={() => setList(list.filter((_, j) => j !== i))}
            drag={{
              draggable: true,
              onDragStart: () => setDragging(i),
              onDragOver: (e: React.DragEvent) => e.preventDefault(),
              onDrop: () => {
                if (dragging === null || dragging === i) return;
                const next = [...list];
                const [x] = next.splice(dragging, 1);
                next.splice(i, 0, x);
                setList(next);
                setDragging(null);
                setOrderDirty(true);
                setNote(null);
              },
            }}
          />
        ))}
      </ol>
    </AssetMap.Provider>
  );
}

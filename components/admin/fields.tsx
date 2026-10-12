"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { uploadFile } from "@/lib/upload-client";

// Form building blocks for the content editor. Plain inputs, an uploader
// with preview, and a drag-and-drop list that every grid editor uses.

/** WordPress filename -> /images/*.webp, so existing images preview in the editor. */
export const AssetMap = createContext<Record<string, string>>({});
export const useAsset = () => {
  const map = useContext(AssetMap);
  return (v?: string) => (!v ? undefined : v.startsWith("/") || v.startsWith("http") ? v : map[v] ?? map[v.replace(/-\d+x\d+(\.[a-z]+)$/i, "$1")]);
};

export const input = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-heading outline-none focus:border-navy focus:ring-2 focus:ring-navy/15";

export function Text({ label, value, onChange, hint, max, placeholder }: { label: string; value?: string; onChange: (v: string) => void; hint?: string; max?: number; placeholder?: string }) {
  const n = (value ?? "").length;
  return (
    <label className="block text-sm font-medium text-heading">
      <span className="flex justify-between gap-2">
        {label}
        {max && <span className={`text-xs tabular-nums ${n >= max ? "font-semibold text-red-700" : "text-muted"}`}>{n}/{max}</span>}
      </span>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={input} />
      {hint && <span className="mt-1 block text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function Area({ label, value, onChange, rows = 3, hint }: { label: string; value?: string; onChange: (v: string) => void; rows?: number; hint?: string }) {
  return (
    <label className="block text-sm font-medium text-heading">
      {label}
      <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={rows} className={input} />
      {hint && <span className="mt-1 block text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

/** One item per line. */
export function Lines({ label, value, onChange, rows = 4, hint }: { label: string; value?: string[]; onChange: (v: string[]) => void; rows?: number; hint?: string }) {
  const [text, setText] = useState((value ?? []).join("\n"));
  return (
    <Area
      label={label}
      rows={rows}
      hint={hint ?? "One per line."}
      value={text}
      onChange={(t) => {
        setText(t);
        onChange(t.split("\n").map((x) => x.trim()).filter(Boolean));
      }}
    />
  );
}

/** Paragraphs separated by a blank line. */
export function Paragraphs({ label, value, onChange }: { label: string; value?: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState((value ?? []).join("\n\n"));
  return (
    <Area
      label={label}
      rows={8}
      hint="Leave a blank line between paragraphs. Keep each paragraph under 120 words."
      value={text}
      onChange={(t) => {
        setText(t);
        onChange(t.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean));
      }}
    />
  );
}

export function Upload({ label, value, accept, onChange, preview = "image" }: { label: string; value?: string; accept: string; onChange: (v: { src: string; w?: number; h?: number }) => void; preview?: "image" | "video" | "icon" }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const src = useAsset()(value);

  async function pick(f?: File | null) {
    if (!f) return;
    setBusy(true);
    setErr(null);
    try {
      onChange(await uploadFile(f));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-sm font-medium text-heading">
      {label}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files[0]);
        }}
        className="mt-1 flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-soft/50 p-2"
      >
        <div className={`grid shrink-0 place-items-center overflow-hidden rounded-md bg-white ring-1 ring-line ${preview === "icon" ? "h-12 w-12" : "h-16 w-24"}`}>
          {src ? (
            preview === "video" ? (
              <video src={src} className="h-full w-full object-cover" muted />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" className="h-full w-full object-contain" />
            )
          ) : value ? (
            <span className="px-1 text-center text-[10px] text-muted">{value.slice(0, 18)}</span>
          ) : (
            <span className="text-xs text-muted">None</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="rounded-md border border-navy px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy hover:text-white disabled:opacity-50">
            {busy ? "Uploading..." : value ? "Replace" : "Upload"}
          </button>
          <span className="ml-2 text-xs font-normal text-muted">or drop a file here</span>
          {err && <p className="mt-1 text-xs font-normal text-red-700">{err}</p>}
        </div>
        <input ref={ref} type="file" accept={accept} hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>
    </div>
  );
}

/** Image upload plus its alt text (required for SEO). */
export function ImageWithAlt({ label, value, onChange }: { label: string; value?: { src: string; alt: string; w?: number; h?: number }; onChange: (v: { src: string; alt: string; w?: number; h?: number } | undefined) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr] sm:items-end">
      <Upload label={label} value={value?.src} accept="image/*" onChange={(u) => onChange({ alt: value?.alt ?? "", ...u })} />
      <Text label="Describe the image (alt text)" value={value?.alt} onChange={(alt) => value && onChange({ ...value, alt })} hint="Say what the photo shows. Screen readers and Google read this." />
    </div>
  );
}

export function LinkPicker({ label, value, onChange, pages }: { label: string; value?: string; onChange: (v: string) => void; pages: { path: string; label: string }[] }) {
  const known = pages.some((p) => p.path === value);
  return (
    <label className="block text-sm font-medium text-heading">
      {label}
      <select value={known ? value : value ? "__custom" : ""} onChange={(e) => onChange(e.target.value === "__custom" ? value ?? "" : e.target.value)} className={input}>
        <option value="">No link</option>
        {pages.map((p) => <option key={p.path} value={p.path}>{p.label} ({p.path})</option>)}
        {value && !known && <option value="__custom">{value}</option>}
      </select>
    </label>
  );
}

/** Drag-and-drop list with move, duplicate and delete. */
export function ListEditor<T>({ items, onChange, render, blank, title, addLabel = "Add item" }: { items: T[]; onChange: (v: T[]) => void; render: (item: T, set: (v: T) => void, i: number) => ReactNode; blank: () => T; title: (item: T, i: number) => string; addLabel?: string }) {
  const [drag, setDrag] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
    setOpen(to);
  };
  const btn = "grid h-7 w-7 place-items-center rounded text-muted hover:bg-soft hover:text-heading disabled:opacity-30";
  return (
    <div>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (drag !== null) move(drag, i);
              setDrag(null);
            }}
            className={`rounded-xl border bg-white ${drag === i ? "border-navy opacity-60" : "border-line"}`}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <span aria-hidden title="Drag to reorder" className="cursor-grab select-none text-lg leading-none text-slate-400">⠿</span>
              <span className="w-6 text-xs tabular-nums text-muted">{i + 1}</span>
              <button type="button" onClick={() => setOpen(open === i ? null : i)} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-heading hover:text-navy">
                {title(item, i) || <span className="text-muted">Untitled</span>}
              </button>
              <button type="button" aria-label="Move up" onClick={() => move(i, i - 1)} disabled={i === 0} className={btn}>↑</button>
              <button type="button" aria-label="Move down" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} className={btn}>↓</button>
              <button type="button" aria-label="Duplicate" onClick={() => onChange([...items.slice(0, i + 1), structuredClone(item), ...items.slice(i + 1)])} className={btn}>⧉</button>
              <button type="button" aria-label="Delete" onClick={() => confirm("Remove this item?") && onChange(items.filter((_, j) => j !== i))} className={`${btn} hover:!text-red-700`}>✕</button>
            </div>
            {open === i && <div className="space-y-3 border-t border-line p-4">{render(item, (v) => onChange(items.map((x, j) => (j === i ? v : x))), i)}</div>}
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => {
          onChange([...items, blank()]);
          setOpen(items.length);
        }}
        className="mt-3 rounded-lg border border-dashed border-navy/50 px-4 py-2 text-sm font-semibold text-navy hover:bg-soft"
      >
        + {addLabel}
      </button>
    </div>
  );
}

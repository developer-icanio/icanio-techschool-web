"use client";

import { useEffect, useRef, type RefObject } from "react";

// Checks a form before it is sent and lists every problem in one popup,
// e.g. "Full name is blank", instead of the browser's one-at-a-time tooltip.
// Fields opt in with `required`; the wording comes from data-label.

export type Problem = { name: string; message: string };

export function checkForm(form: HTMLFormElement): Problem[] {
  const out: Problem[] = [];
  for (const el of Array.from(form.elements) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[]) {
    if (!el.name || el.type === "hidden" || el.tabIndex === -1) continue;
    const label = el.dataset.label ?? el.name;
    const v = el.value.trim();
    let message = "";
    if (el.required && !v) message = el.tagName === "SELECT" ? `${label}: please choose an option` : `${label} is blank`;
    else if (v && el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) message = `${label} doesn't look right (example: name@gmail.com)`;
    else if (v && el.type === "tel" && v.replace(/\D/g, "").length < 10) message = `${label} needs a 10-digit number`;
    el.setAttribute("aria-invalid", message ? "true" : "false");
    if (message) out.push({ name: el.name, message });
  }
  return out;
}

/** Popup listing what to fix. Closing it moves the cursor to the first field. */
export function MissingDialog({ problems, form, onClose }: { problems: Problem[]; form: RefObject<HTMLFormElement | null>; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (problems.length && d && !d.open) d.showModal();
  }, [problems]);
  const close = () => {
    ref.current?.close();
    onClose();
    const first = problems[0] && form.current?.elements.namedItem(problems[0].name);
    if (first instanceof HTMLElement) {
      first.focus();
      first.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };
  if (!problems.length) return null;
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === ref.current && close()}
      aria-labelledby="missing-title"
      className="m-auto w-[min(92vw,440px)] rounded-2xl p-0 text-heading shadow-2xl backdrop:bg-slate-950/50"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600">
            <svg viewBox="0 0 20 20" width="20" height="20"><circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M10 5.8v5M10 13.9v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </span>
          <div>
            <h2 id="missing-title" className="text-lg font-semibold">Please fill in the required details</h2>
            <p className="mt-1 text-sm text-body">{problems.length === 1 ? "One thing needs your attention before we can send this:" : `${problems.length} things need your attention before we can send this:`}</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {problems.map((p) => (
            <li key={p.name} className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              <span aria-hidden>•</span>
              {p.message}
            </li>
          ))}
        </ul>
        <button type="button" onClick={close} autoFocus className="btn btn-primary mt-5 w-full justify-center !py-2.5">
          OK, I&apos;ll fill them in
        </button>
      </div>
    </dialog>
  );
}

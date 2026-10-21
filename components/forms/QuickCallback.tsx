"use client";

import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { COLLEGE_INTERESTS, TRACKS } from "@/lib/lead";

// Footer lead capture: three fields and one tap. Our team calls back.
export default function QuickCallback() {
  const page = usePathname();
  const [audience, setAudience] = useState("Student");
  const [state, setState] = useState<{ s: "idle" | "sending" | "done" | "error"; msg?: string }>({ s: "idle" });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ s: "sending" });
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      const r = await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, kind: "callback", audience, page }) });
      const j = await r.json();
      setState(j.ok ? { s: "done" } : { s: "error", msg: j.error });
    } catch {
      setState({ s: "error", msg: "Network error. Please call or WhatsApp us instead." });
    }
  }

  if (state.s === "done")
    return (
      <div role="status" className="rounded-2xl bg-white/10 p-6 text-white">
        <p className="text-xl font-semibold">Thank you. We will call you back.</p>
        <p className="mt-2 text-white/80">Our team calls within one working day, Monday to Saturday.</p>
      </div>
    );

  const field = "mt-1.5 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-[15px] text-heading outline-none transition focus:border-navy focus:ring-2 focus:ring-cyan/40";
  const label = "block text-sm font-medium text-heading";
  const options = audience === "College" ? COLLEGE_INTERESTS : TRACKS;
  return (
    <form onSubmit={submit} className="rounded-2xl bg-white p-6 text-heading shadow-xl shadow-slate-900/20 sm:p-8">
      <p className="text-lg font-semibold">Request a free callback</p>
      <fieldset className="mt-5">
        <legend className={label}>I am</legend>
        <div className="mt-1.5 grid grid-cols-2 overflow-hidden rounded-lg border border-line">
          {["Student", "College"].map((a) => (
            <label key={a} className={`cursor-pointer px-4 py-2.5 text-center text-sm font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-cyan ${audience === a ? "bg-navy text-white" : "text-heading hover:bg-soft"}`}>
              <input type="radio" name="audience-choice" value={a} checked={audience === a} onChange={() => setAudience(a)} className="sr-only" />
              {a === "Student" ? "A student" : "A college"}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Your name
          <input name="name" required autoComplete="name" placeholder="Full name" className={field} />
        </label>
        <label className={label}>
          Phone number
          <input name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="10-digit mobile number" className={field} />
        </label>
      </div>
      <label className={`${label} mt-4`}>
        {audience === "College" ? "Program of interest" : "Internship of interest"}
        <select name="track" defaultValue="" className={field} key={audience}>
          <option value="">Select one (optional)</option>
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <button type="submit" disabled={state.s === "sending"} className="btn btn-primary mt-6 w-full justify-center !py-3 disabled:opacity-60">
        {state.s === "sending" ? "Sending..." : "Get a free callback"}
      </button>
      {state.s === "error" && <p role="alert" className="mt-3 text-sm text-red-700">{state.msg}</p>}
      <p className="mt-3 text-xs text-muted">We call within one working day, Monday to Saturday. No spam.</p>
    </form>
  );
}

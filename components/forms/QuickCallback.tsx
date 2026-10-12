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

  const field = "w-full rounded border border-white/25 bg-white px-3.5 py-3 text-[15px] text-heading outline-none focus:ring-2 focus:ring-cyan";
  const options = audience === "College" ? COLLEGE_INTERESTS : TRACKS;
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[auto_1fr_1fr_1.2fr_auto]">
      <fieldset className="flex overflow-hidden rounded border border-white/30 sm:col-span-2 xl:col-span-1">
        <legend className="sr-only">I am</legend>
        {["Student", "College"].map((a) => (
          <label key={a} className={`flex-1 cursor-pointer px-4 py-3 text-center text-sm font-semibold transition ${audience === a ? "bg-white text-navy" : "text-white hover:bg-white/10"}`}>
            <input type="radio" name="audience-choice" value={a} checked={audience === a} onChange={() => setAudience(a)} className="sr-only" />
            {a === "Student" ? "I'm a student" : "I'm a college"}
          </label>
        ))}
      </fieldset>
      <input name="name" required autoComplete="name" placeholder="Your name" aria-label="Your name" className={field} />
      <input name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="Phone number" aria-label="Phone number" className={field} />
      <select name="track" aria-label="Interested in" defaultValue="" className={field} key={audience}>
        <option value="">{audience === "College" ? "Program of interest" : "Internship of interest"}</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <button type="submit" disabled={state.s === "sending"} className="btn btn-white !py-3 disabled:opacity-60 sm:col-span-2 xl:col-span-1">
        {state.s === "sending" ? "Sending..." : "Get a free callback"}
      </button>
      {state.s === "error" && <p role="alert" className="text-sm text-amber-200 sm:col-span-2 xl:col-span-5">{state.msg}</p>}
    </form>
  );
}

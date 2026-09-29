"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { COLLEGE_INTERESTS, DURATIONS, MODES, TRACKS, YEARS } from "@/lib/lead";
import { COLLEGE_PROGRAMS, ENGINEERING_TRACKS, NON_ENGINEERING_TRACKS } from "@/lib/nav";

const field = "mt-1.5 w-full rounded border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-heading outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/15";
const label = "block text-sm font-medium text-heading";

function Input({ name, text, type = "text", required, autoComplete, ...rest }: { name: string; text: string; type?: string; required?: boolean; autoComplete?: string; inputMode?: "tel" | "email" | "numeric" }) {
  return (
    <label className={label}>
      {text}{required && <span className="text-red-600"> *</span>}
      <input name={name} type={type} required={required} autoComplete={autoComplete} className={field} {...rest} />
    </label>
  );
}

function Select({ name, text, options, required, value }: { name: string; text: string; options: string[]; required?: boolean; value?: string }) {
  return (
    <label className={label}>
      {text}{required && <span className="text-red-600"> *</span>}
      <select name={name} required={required} defaultValue={value ?? ""} className={field}>
        <option value="" disabled>Select an option</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

/** Pre-selects the track or program from the page the visitor is on (or ?track=). */
function useGuess(kind: "student" | "college") {
  const path = usePathname();
  const q = useSearchParams().get(kind === "student" ? "track" : "program");
  if (q) return q;
  const list = kind === "student" ? [...ENGINEERING_TRACKS, ...NON_ENGINEERING_TRACKS] : COLLEGE_PROGRAMS;
  return list.find((l) => l.href === path)?.label;
}

function Form({ kind }: { kind: "student" | "college" }) {
  const guess = useGuess(kind);
  const path = usePathname();
  const [state, setState] = useState<{ status: "idle" | "sending" | "done" | "error"; msg?: string }>({ status: "idle" });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ status: "sending" });
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      const r = await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, kind, page: path }) });
      const j = await r.json();
      setState(j.ok ? { status: "done" } : { status: "error", msg: j.error });
    } catch {
      setState({ status: "error", msg: "Network error. Please try again or call us." });
    }
  }

  if (state.status === "done")
    return (
      <div role="status" className="grid place-items-center rounded-2xl bg-white p-10 text-center">
        <div>
          <p className="text-2xl font-bold text-heading">Thank you. We have your details.</p>
          <p className="mt-3 text-body">{kind === "student" ? "Our internship team will call you within one working day to confirm your track, batch and start date." : "Our college partnerships team will contact you within one working day to plan the next step."}</p>
        </div>
      </div>
    );

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm sm:grid-cols-2 sm:p-8">
      <h2 className="text-xl font-semibold sm:col-span-2">{kind === "student" ? "Apply for an internship" : "Enquire for your college"}</h2>
      <Input name="name" text="Full name" required autoComplete="name" />
      <Input name="phone" text="Phone" type="tel" required autoComplete="tel" inputMode="tel" />
      <div className="sm:col-span-2"><Input name="email" text="Email address" type="email" required autoComplete="email" inputMode="email" /></div>
      {kind === "student" ? (
        <>
          <Select name="track" text="Area of interest" options={TRACKS} required value={guess && TRACKS.includes(guess) ? guess : undefined} />
          <Select name="duration" text="Internship duration" options={DURATIONS} required />
          <Select name="mode" text="Preferred mode" options={MODES} />
          <Select name="year" text="Current stage" options={YEARS} />
          <div className="sm:col-span-2"><Input name="college" text="College name" autoComplete="organization" /></div>
        </>
      ) : (
        <>
          <Input name="designation" text="Designation" autoComplete="organization-title" />
          <Input name="college" text="College name" required autoComplete="organization" />
          <Input name="city" text="City" autoComplete="address-level2" />
          <Select name="interest" text="Interested in" options={COLLEGE_INTERESTS} required value={guess && COLLEGE_INTERESTS.includes(guess) ? guess : undefined} />
          <div className="sm:col-span-2"><Input name="students" text="Approximate number of students" inputMode="numeric" /></div>
        </>
      )}
      <label className={`${label} sm:col-span-2`}>
        Message
        <textarea name="message" rows={3} className={field} placeholder={kind === "student" ? "Tell us your goal, preferred start date or questions" : "Departments, preferred dates or questions"} />
      </label>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {state.status === "error" && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{state.msg}</p>}
      <button type="submit" disabled={state.status === "sending"} className="btn btn-primary w-full disabled:opacity-60 sm:col-span-2">
        {state.status === "sending" ? "Sending..." : kind === "student" ? "Submit application" : "Send enquiry"}
      </button>
      <p className="text-xs text-muted sm:col-span-2">We reply within one working day. Your details are used only to respond to this request.</p>
    </form>
  );
}

export default function LeadForm({ kind }: { kind: "student" | "college" }) {
  return (
    <Suspense fallback={<div className="min-h-[520px] rounded-2xl bg-white" />}>
      <Form kind={kind} />
    </Suspense>
  );
}

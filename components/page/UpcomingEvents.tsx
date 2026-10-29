"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

export interface EventItem { date: string; title: string; body: string; time?: string; href?: string }

/** Today in India time as YYYY-MM-DD (events run in IST). */
const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

// The page HTML is built ahead of time, so the server's idea of "today" can
// be days old. The browser re-checks against its own clock after loading.
const subscribe = () => () => {};

export default function UpcomingEvents({ items, builtOn, empty, dark }: { items: EventItem[]; builtOn: string; empty?: string; dark?: boolean }) {
  const today = useSyncExternalStore(subscribe, todayIST, () => builtOn);
  const upcoming = items.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));

  if (!upcoming.length)
    return (
      <div className={`mx-auto max-w-2xl rounded-2xl border border-dashed p-8 text-center ${dark ? "border-white/30 text-white/85" : "border-line bg-white text-body"}`}>
        <p className={`text-lg font-semibold ${dark ? "text-white" : "text-heading"}`}>No upcoming events right now</p>
        <p className="mt-2 text-[15px]">{empty ?? "New workshops, guest lectures and campus visits are announced here. Want one at your college? Talk to our team."}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/contact" className="btn btn-primary !py-2">Bring an event to your college</Link>
          <Link href="/campus-events" className="btn btn-outline !py-2">See past events</Link>
        </div>
      </div>
    );

  return (
    <ol className={`grid gap-6 ${upcoming.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : upcoming.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
      {upcoming.map((e) => (
        <li key={`${e.date}-${e.title}`} className={`rounded-2xl border p-5 ${dark ? "border-white/15 bg-white/5" : "border-line bg-white"}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${dark ? "text-cyan" : "text-navy"}`}>
            <time dateTime={e.date}>{fmt(e.date)}</time>
            {e.time ? ` · ${e.time}` : ""}
          </p>
          <h3 className="mt-2 text-lg font-semibold">{e.href ? <Link href={e.href} className="hover:underline">{e.title}</Link> : e.title}</h3>
          {e.body && <p className={`mt-2 text-[15px] leading-relaxed ${dark ? "text-white/80" : "text-body"}`}>{e.body}</p>}
        </li>
      ))}
    </ol>
  );
}

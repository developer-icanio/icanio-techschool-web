"use client";

// The next batch start date: the next `weekday` in India time (today counts),
// plus `weekOffset` weeks. Worked out in the browser so the page never shows
// a past date, even when the HTML was built days earlier.
function nextDate(weekday: number, weekOffset = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const d = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
  d.setUTCDate(d.getUTCDate() + ((weekday - d.getUTCDay() + 7) % 7) + weekOffset * 7);
  return d.toLocaleDateString("en-IN", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
}

export default function BatchDate({ weekday, weekOffset }: { weekday: number; weekOffset?: number }) {
  return <time suppressHydrationWarning>{nextDate(weekday, weekOffset)}</time>;
}

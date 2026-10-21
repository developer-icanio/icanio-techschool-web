import { NextResponse } from "next/server";
import { ensureContent } from "@/lib/content/store";
import { sanitize, validate } from "@/lib/lead";
import { htmlTable, sendMail } from "@/lib/mail";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { SITE } from "@/lib/site";

// Internship applications go to the internship inbox, college enquiries to
// the tech school inbox. Without Resend configured it logs and succeeds.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  // Only our own pages may post here, and only as JSON.
  if (!isSameOrigin(req)) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 403 });
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 415 });
  if (Number(req.headers.get("content-length") ?? 0) > 20_000) return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413 });

  // A real person sends a handful of forms; bots send hundreds.
  const ip = clientIp(req.headers);
  const burst = await rateLimit("lead:10m", ip, 5, 10 * 60_000);
  const daily = burst.ok ? await rateLimit("lead:day", ip, 20, 24 * 60 * 60_000) : burst;
  if (!burst.ok || !daily.ok) {
    return NextResponse.json(
      { ok: false, error: `Too many requests. Please try again later or email ${SITE.email}.` },
      { status: 429, headers: { "retry-after": String(daily.ok ? burst.retryAfter : daily.retryAfter) } },
    );
  }

  let p;
  try {
    const text = await req.text();
    if (text.length > 20_000) return NextResponse.json({ ok: false, error: "Request too large." }, { status: 413 });
    p = sanitize(JSON.parse(text));
  } catch {
    p = null;
  }
  if (!p) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  if (p.website) return NextResponse.json({ ok: true });
  const error = validate(p);
  if (error) return NextResponse.json({ ok: false, error }, { status: 422 });

  // Inbox addresses come from /admin/settings.
  await ensureContent();
  const student = p.kind === "student" || (p.kind === "callback" && p.audience === "Student");
  const to = process.env.LEAD_TO_OVERRIDE || (student ? SITE.internshipEmail : SITE.email);
  const rows: [string, string | undefined][] = p.kind === "callback"
    ? [["Name", p.name], ["Phone", p.phone], ["I am", p.audience], ["Interested in", p.track], ["Page", p.page]]
    : p.kind === "student"
    ? [["Name", p.name], ["Email", p.email], ["Phone", p.phone], ["College", p.college], ["Year", p.year], ["Area of interest", p.track], ["Duration", p.duration], ["Mode", p.mode], ["Page", p.page], ["Message", p.message]]
    : [["Name", p.name], ["Designation", p.designation], ["College", p.college], ["City", p.city], ["Email", p.email], ["Phone", p.phone], ["Interested in", p.interest], ["Students", p.students], ["Page", p.page], ["Message", p.message]];
  try {
    const delivered = await sendMail({
      to,
      replyTo: p.email && EMAIL.test(p.email) ? p.email : undefined,
      subject:
        p.kind === "callback" ? `Callback request: ${p.name}, ${p.phone} (${p.track || p.audience || "general"})`
        : p.kind === "student" ? `Internship application: ${p.name} (${p.track})`
        : `College enquiry: ${p.college} (${p.interest || "general"})`,
      html: htmlTable(p.kind === "callback" ? "New callback request (call within one working day)" : p.kind === "student" ? "New internship application" : "New college enquiry", rows),
      log: Object.fromEntries(rows.filter(([, v]) => v)),
    });
    return NextResponse.json({ ok: true, delivered });
  } catch (e) {
    console.error("[lead]", (e as Error).message);
    return NextResponse.json({ ok: false, error: `We couldn't send your details. Please email ${to} directly.` }, { status: 502 });
  }
}

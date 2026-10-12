import { NextResponse } from "next/server";
import { validate, type LeadPayload } from "@/lib/lead";
import { htmlTable, sendMail } from "@/lib/mail";
import { SITE } from "@/lib/site";

// Internship applications go to the internship inbox, college enquiries to
// the tech school inbox. Without Resend configured it logs and succeeds.
export async function POST(req: Request) {
  let p: LeadPayload;
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (p.website) return NextResponse.json({ ok: true });
  const error = validate(p);
  if (error) return NextResponse.json({ ok: false, error }, { status: 422 });

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
      replyTo: p.email,
      subject:
        p.kind === "callback" ? `Callback request: ${p.name}, ${p.phone} (${p.track ?? p.audience ?? "general"})`
        : p.kind === "student" ? `Internship application: ${p.name} (${p.track})`
        : `College enquiry: ${p.college} (${p.interest ?? "general"})`,
      html: htmlTable(p.kind === "callback" ? "New callback request (call within one working day)" : p.kind === "student" ? "New internship application" : "New college enquiry", rows),
      log: Object.fromEntries(rows.filter(([, v]) => v)),
    });
    return NextResponse.json({ ok: true, delivered });
  } catch (e) {
    console.error("[lead]", e);
    return NextResponse.json({ ok: false, error: `We couldn't send your details. Please email ${to} directly.` }, { status: 502 });
  }
}

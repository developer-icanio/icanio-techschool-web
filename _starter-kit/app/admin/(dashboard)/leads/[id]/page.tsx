import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";
import LeadCrmPanel from "../LeadCrmPanel";

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatTimestamp(date: Date | null): string {
  if (!date) return " - ";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AdminLeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, id) });

  if (!lead) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/leads" className="text-sm text-gray-500 hover:underline">
        ← Back to Leads
      </Link>

      <div>
        <h1 className="text-3xl font-bold">{lead.name}</h1>
        <p className="mt-1 text-gray-500">
          {lead.company ?? "No company given"} ·{" "}
          {lead.type === "quote_request" ? "Manufacturing quote request" : "General inquiry"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold">Contact details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2">
                <dt className="text-gray-500">Email</dt>
                <dd>
                  <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">
                    {lead.email}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between border-b pb-2">
                <dt className="text-gray-500">Phone</dt>
                <dd>{lead.phone ?? " - "}</dd>
              </div>
              <div className="flex justify-between border-b pb-2">
                <dt className="text-gray-500">Source</dt>
                <dd>{lead.source ?? " - "}</dd>
              </div>
              <div className="flex justify-between border-b pb-2">
                <dt className="text-gray-500">Received</dt>
                <dd>{formatTimestamp(lead.createdAt)}</dd>
              </div>
              <div className="flex justify-between border-b pb-2">
                <dt className="text-gray-500">Quote sent</dt>
                <dd>{formatTimestamp(lead.quoteSentAt)}</dd>
              </div>
              <div className="flex justify-between pb-2">
                <dt className="text-gray-500">Call scheduled</dt>
                <dd>{formatTimestamp(lead.callScheduledAt)}</dd>
              </div>
            </dl>
          </div>

          {lead.message && (
            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold">Message</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{lead.message}</p>
            </div>
          )}
        </div>

        <LeadCrmPanel
          lead={{
            id: lead.id,
            name: lead.name,
            email: lead.email,
            company: lead.company,
            status: lead.status,
            notes: lead.notes,
          }}
        />
      </div>
    </div>
  );
}

import Link from "next/link";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { desc, eq, and, type SQL } from "drizzle-orm";
import { formatDisplayDate } from "@/lib/formatDate";

const TYPE_TABS: { label: string; value: string | null }[] = [
  { label: "All", value: null },
  { label: "General", value: "general" },
  { label: "Quote Request", value: "quote_request" },
];

const TYPE_LABELS: Record<string, string> = {
  general: "General",
  quote_request: "Quote Request",
};

const STATUS_FILTERS = [
  "new",
  "contacted",
  "quote_sent",
  "call_scheduled",
  "won",
  "lost",
] as const;

const STATUS_COLORS: Record<string, string> = {
  new: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  quote_sent: "bg-amber-100 text-amber-700",
  call_scheduled: "bg-cyan-100 text-cyan-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

interface PageProps {
  searchParams: Promise<{ type?: string; status?: string }>;
}

export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const { type, status } = await searchParams;

  const conditions: SQL[] = [];
  if (type === "general" || type === "quote_request") conditions.push(eq(leads.type, type));
  if (status && (STATUS_FILTERS as readonly string[]).includes(status)) {
    conditions.push(eq(leads.status, status as (typeof STATUS_FILTERS)[number]));
  }

  const allLeads = await db.query.leads.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(leads.createdAt)],
    limit: 200,
  });

  function filterHref(next: { type?: string | null; status?: string | null }) {
    const params = new URLSearchParams();
    const nextType = next.type !== undefined ? next.type : type;
    const nextStatus = next.status !== undefined ? next.status : status;
    if (nextType) params.set("type", nextType);
    if (nextStatus) params.set("status", nextStatus);
    const qs = params.toString();
    return qs ? `/admin/leads?${qs}` : "/admin/leads";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Leads</h1>
        <p className="mt-2 text-gray-500">{allLeads.length} leads matching current filters</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TYPE_TABS.map((tab) => (
          <a
            key={tab.label}
            href={filterHref({ type: tab.value })}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              (tab.value ?? undefined) === type || (!tab.value && !type)
                ? "bg-brand-700 text-white"
                : "hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </a>
        ))}
        <span className="mx-2 text-gray-300">|</span>
        <a
          href={filterHref({ status: null })}
          className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${
            !status ? "bg-brand-700 text-white" : "hover:bg-gray-100"
          }`}
        >
          Any status
        </a>
        {STATUS_FILTERS.map((s) => (
          <a
            key={s}
            href={filterHref({ status: s })}
            className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${
              status === s ? "bg-brand-700 text-white" : "hover:bg-gray-100"
            }`}
          >
            {s.replace("_", " ")}
          </a>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Company</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-center">Type</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Received</th>
            </tr>
          </thead>
          <tbody>
            {allLeads.map((lead) => (
              <tr key={lead.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">
                  <Link href={`/admin/leads/${lead.id}`} className="hover:underline">
                    {lead.name}
                  </Link>
                </td>
                <td className="p-3 text-gray-600">{lead.company ?? " - "}</td>
                <td className="p-3 text-gray-600">{lead.email}</td>
                <td className="p-3 text-center">
                  <span className="rounded bg-slate-100 px-3 py-1 text-xs">
                    {TYPE_LABELS[lead.type] ?? "General"}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span
                    className={`rounded px-3 py-1 capitalize ${STATUS_COLORS[lead.status] ?? "bg-slate-100"}`}
                  >
                    {lead.status.replace("_", " ")}
                  </span>
                </td>
                <td className="p-3 text-center text-gray-500">
                  {formatDisplayDate(lead.createdAt.toISOString())}
                </td>
              </tr>
            ))}
            {allLeads.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No leads match these filters yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

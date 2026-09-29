import Link from "next/link";
import { db } from "@/db";
import { subscribers, emailBroadcasts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatDisplayDate } from "@/lib/formatDate";

export default async function AdminEmailPage() {
  const allSubscribers = await db.select().from(subscribers).orderBy(desc(subscribers.subscribedAt));
  const activeCount = allSubscribers.filter((s) => s.status === "active").length;
  const recentBroadcasts = await db
    .select()
    .from(emailBroadcasts)
    .orderBy(desc(emailBroadcasts.sentAt))
    .limit(10);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Email Marketing</h1>
          <p className="mt-2 text-gray-500">
            {activeCount} active subscribers · {allSubscribers.length - activeCount} unsubscribed
          </p>
        </div>
        <Link
          href="/admin/email/compose"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          Compose & Send
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent Sends</h2>
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left">Subject</th>
                <th className="p-3 text-center">Recipients</th>
                <th className="p-3 text-center">Sent</th>
              </tr>
            </thead>
            <tbody>
              {recentBroadcasts.map((b) => (
                <tr key={b.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{b.subject}</td>
                  <td className="p-3 text-center text-gray-600">{b.recipientCount}</td>
                  <td className="p-3 text-center text-gray-500">{formatDisplayDate(b.sentAt.toISOString())}</td>
                </tr>
              ))}
              {recentBroadcasts.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">
                    No emails sent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Subscribers</h2>
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Source</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {allSubscribers.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{s.email}</td>
                  <td className="p-3 text-gray-600">{s.source ?? " - "}</td>
                  <td className="p-3 text-center">
                    {s.status === "active" ? (
                      <span className="rounded bg-green-100 px-3 py-1 text-green-700">ACTIVE</span>
                    ) : (
                      <span className="rounded bg-gray-100 px-3 py-1 text-gray-500">UNSUBSCRIBED</span>
                    )}
                  </td>
                  <td className="p-3 text-center text-gray-500">
                    {formatDisplayDate(s.subscribedAt.toISOString())}
                  </td>
                </tr>
              ))}
              {allSubscribers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    No subscribers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

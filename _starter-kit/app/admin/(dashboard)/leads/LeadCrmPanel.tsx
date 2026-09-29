"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLeadStatus, updateLeadNotes, markQuoteSent, scheduleCall, type LeadStatus } from "./actions";

const STATUS_OPTIONS: LeadStatus[] = [
  "new",
  "contacted",
  "quote_sent",
  "call_scheduled",
  "won",
  "lost",
];

function toGCalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0];
}

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: LeadStatus;
  notes: string | null;
}

export default function LeadCrmPanel({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [callTime, setCallTime] = useState("");

  function runAction(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  function handleShareQuote() {
    const subject = encodeURIComponent(
      `Your LAMBLILY manufacturing quote${lead.company ? ` - ${lead.company}` : ""}`
    );
    const body = encodeURIComponent(
      `Hi ${lead.name},\n\nThanks for your interest in LAMBLILY. Please find our proposed plan and quote attached.\n\nLet us know if you have any questions.\n\nBest,\nLAMBLILY Team`
    );
    window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`, "_blank");
    runAction(() => markQuoteSent(lead.id));
  }

  function handleScheduleCall() {
    if (!callTime) return;
    const start = new Date(callTime);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `LAMBLILY call - ${lead.company || lead.name}`,
      dates: `${toGCalDate(start)}/${toGCalDate(end)}`,
      details: `Call with ${lead.name} (${lead.email}).`,
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, "_blank");
    runAction(() => scheduleCall(lead.id, start.toISOString()));
  }

  return (
    <div className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Follow-up</h2>
        <p className="mt-1 text-sm text-gray-500">Update status, share a quote, or schedule a call.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => runAction(() => updateLeadStatus(lead.id, "contacted"))}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
        >
          Mark Contacted
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => runAction(() => updateLeadStatus(lead.id, "won"))}
          className="rounded-lg border px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50"
        >
          Mark Won
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => runAction(() => updateLeadStatus(lead.id, "lost"))}
          className="rounded-lg border px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Mark Lost
        </button>
      </div>

      <div className="flex items-end gap-3 border-t pt-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
            className="rounded-lg border px-3 py-2 text-sm capitalize"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => runAction(() => updateLeadStatus(lead.id, status))}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm text-white hover:bg-brand-800 disabled:opacity-50"
        >
          Update Status
        </button>
      </div>

      <div className="border-t pt-4">
        <button
          type="button"
          disabled={isPending}
          onClick={handleShareQuote}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
        >
          Share Quote (opens email draft)
        </button>
      </div>

      <div className="flex items-end gap-3 border-t pt-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">Call date &amp; time</label>
          <input
            type="datetime-local"
            value={callTime}
            onChange={(e) => setCallTime(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={isPending || !callTime}
          onClick={handleScheduleCall}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
        >
          Schedule Call (opens Google Calendar)
        </button>
      </div>

      <div className="border-t pt-4">
        <label className="mb-1 block text-xs font-semibold text-gray-500">Internal notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Follow-up context, call outcomes, next steps..."
        />
        <button
          type="button"
          disabled={isPending}
          onClick={() => runAction(() => updateLeadNotes(lead.id, notes))}
          className="mt-2 rounded-lg border px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
        >
          Save Notes
        </button>
      </div>
    </div>
  );
}

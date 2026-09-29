"use client";

import { useState } from "react";
import Link from "next/link";

export default function ComposeEmailPage() {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("Send this email to every active subscriber? This can't be undone.")) return;

    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, bodyHtml }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setResult({ sent: data.sent, failed: data.failed });
      setSubject("");
      setBodyHtml("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/email" className="text-sm text-slate-500 hover:underline">
          &larr; Back to Email Marketing
        </Link>
        <h1 className="mt-2 text-4xl font-bold">Compose & Send</h1>
        <p className="mt-2 text-gray-500">
          Sends immediately to every active subscriber. An unsubscribe link is appended
          automatically.
        </p>
      </div>

      <form onSubmit={handleSend} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">Subject</label>
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="New arrivals just dropped"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Body (HTML - paste formatted content, or plain text with &lt;p&gt; tags)
          </label>
          <textarea
            required
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            rows={14}
            className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-sm"
            placeholder="<p>Hi there,</p><p>Here's what's new...</p>"
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send to All Subscribers"}
        </button>
      </form>

      {result && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Sent to {result.sent} subscribers{result.failed > 0 ? ` (${result.failed} failed)` : ""}.
        </p>
      )}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}

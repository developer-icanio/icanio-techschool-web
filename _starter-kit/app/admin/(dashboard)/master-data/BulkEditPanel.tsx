"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // same Vercel serverless body cap as the import route

interface ImportResult {
  totalRows: number;
  updated: number;
  errorCount: number;
  errors: string[];
  truncated: boolean;
}

// Bulk edit workflow: download every row as an .xlsx (Item Name, Age
// Range, pricing, weight, package dimensions — the fields most useful to
// fill in offline across many designs at once), edit it, upload it back.
// A blank cell on upload leaves that field unchanged — never clears it.
export default function BulkEditPanel() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/master-data/bulk-edit/export");
      if (!res.ok) {
        let message = "Failed to generate the spreadsheet.";
        try {
          const data = await res.json();
          message = data.error ?? message;
        } catch {
          // response wasn't JSON — keep the generic message
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? "lamblily-master-data.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate the spreadsheet.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)}MB - please use one under 4MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/master-data/bulk-edit/import", { method: "POST", body: formData });
      let data: ImportResult & { error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error(`Upload failed (server returned status ${res.status}, not JSON).`);
      }
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">Bulk edit</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Download every product as a spreadsheet, fill in the blanks, upload it back. Blank cells are left
            unchanged.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {downloading ? "Preparing…" : "Download spreadsheet"}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload completed spreadsheet"}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
          <p className="font-medium text-gray-900">
            {result.updated} of {result.totalRows} rows updated
            {result.errorCount > 0 ? `, ${result.errorCount} row${result.errorCount === 1 ? "" : "s"} skipped` : ""}.
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-red-700">
              {result.errors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
              {result.truncated && <li className="text-gray-500">…and more (showing first 50).</li>}
            </ul>
          )}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleFileSelect} className="hidden" />
    </div>
  );
}

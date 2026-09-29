"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MasterProductListItem } from "@/lib/masterData";
import { AGE_RANGE_OPTIONS } from "@/lib/ageRanges";

const CHANNELS = [
  { value: "amazon", label: "Amazon (SHIRT)" },
  { value: "myntra", label: "Myntra (T-Shirts)" },
];

const UNCLASSIFIED = "__unclassified__";

// A "Live" design a shopper can actually land on and buy — flags the two
// things that make a listing look broken (or not sellable at all)
// despite being switched on: no price to show, or no photo for the grid/
// PDP gallery. Hidden designs aren't checked; nobody can see them yet, so
// an incomplete Hidden row isn't urgent the way a Live one is.
function getListingIssues(p: MasterProductListItem): string[] {
  if (!p.isActive) return [];
  const issues: string[] = [];
  if (!p.sellingPrice) issues.push("no price set");
  if (!p.thumbnailUrl) issues.push("no photo");
  return issues;
}

export default function MasterDataTable({ products }: { products: MasterProductListItem[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState(CHANNELS[0].value);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ageRangeFilter, setAgeRangeFilter] = useState<string>("");
  const [genderFilter, setGenderFilter] = useState<string>("");
  const [attentionOnly, setAttentionOnly] = useState(false);

  const genderOptions = useMemo(
    () => [...new Set(products.map((p) => p.gender))].sort(),
    [products]
  );

  const attentionCount = useMemo(
    () => products.filter((p) => getListingIssues(p).length > 0).length,
    [products]
  );

  const filtered = useMemo(() => {
    let result = products;
    if (ageRangeFilter === UNCLASSIFIED) result = result.filter((p) => !p.ageRange);
    else if (ageRangeFilter) result = result.filter((p) => p.ageRange === ageRangeFilter);
    if (genderFilter) result = result.filter((p) => p.gender === genderFilter);
    if (attentionOnly) result = result.filter((p) => getListingIssues(p).length > 0);
    return result;
  }, [products, ageRangeFilter, genderFilter, attentionOnly]);

  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.sku));

  function toggle(sku: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map((p) => p.sku)));
  }

  const selectedCount = selected.size;

  async function handleGenerate() {
    if (selectedCount === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const formData = new FormData();
      selected.forEach((sku) => formData.append("sku", sku));
      formData.append("channel", channel);

      const res = await fetch("/api/admin/master-data/export", { method: "POST", body: formData });
      if (!res.ok) {
        let message = "Failed to generate the export.";
        try {
          const data = await res.json();
          message = data.error ?? message;
        } catch {
          // response wasn't JSON either — keep the generic message
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? `${channel}-export.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate the export.");
    } finally {
      setGenerating(false);
    }
  }

  const channelLabel = useMemo(
    () => CHANNELS.find((c) => c.value === channel)?.label ?? channel,
    [channel]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4 shadow-sm">
        <span className="text-sm font-medium text-gray-700">
          {selectedCount > 0 ? `${selectedCount} selected` : "Select products to export"}
        </span>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={selectedCount === 0 || generating}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? "Generating…" : `Generate ${channelLabel} Excel`}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-gray-700" htmlFor="age-range-filter">
          Age range
        </label>
        <select
          id="age-range-filter"
          value={ageRangeFilter}
          onChange={(e) => setAgeRangeFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All</option>
          {AGE_RANGE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value={UNCLASSIFIED}>Unclassified</option>
        </select>

        <label className="text-sm font-medium text-gray-700" htmlFor="gender-filter">
          Gender
        </label>
        <select
          id="gender-filter"
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All</option>
          {genderOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={attentionOnly}
            onChange={(e) => setAttentionOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Needs attention only
          {attentionCount > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
              {attentionCount}
            </span>
          )}
        </label>

        <span className="text-sm text-gray-500">
          {filtered.length} of {products.length} products
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                  className="h-4 w-4 rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3">Photo</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Design name</th>
              <th className="px-4 py-3">Age range</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Colors</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((p) => (
              <tr key={p.sku} className={selected.has(p.sku) ? "bg-blue-50/50" : undefined}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.sku)}
                    onChange={() => toggle(p.sku)}
                    aria-label={`Select ${p.itemName ?? p.sku}`}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="h-12 w-12 overflow-hidden rounded-lg border bg-gray-100">
                    {p.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- small admin-list thumbnail, next/image adds nothing here
                      <img src={p.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{p.itemName ?? p.sku}</p>
                  <p className="font-mono text-xs text-gray-500">{p.sku}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{p.designName ?? <span className="text-gray-400">–</span>}</td>
                <td className="px-4 py-3 text-gray-700">{p.ageRange ?? <span className="text-gray-400">–</span>}</td>
                <td className="px-4 py-3 text-gray-700">{p.gender}</td>
                <td className="px-4 py-3 text-gray-700">{p.sellingPrice ? `₹${p.sellingPrice}` : "–"}</td>
                <td className="px-4 py-3 text-gray-700">
                  {p.activeColorCount} / {p.colorCount}
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const issues = getListingIssues(p);
                    if (!p.isActive) {
                      return (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                          Hidden
                        </span>
                      );
                    }
                    if (issues.length > 0) {
                      return (
                        <span
                          title={`Live, but ${issues.join(" and ")} - shoppers can reach this page.`}
                          className="inline-flex cursor-help items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"
                        >
                          ⚠ Live - {issues.join(", ")}
                        </span>
                      );
                    }
                    return (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                        Live
                      </span>
                    );
                  })()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/master-data/${encodeURIComponent(p.sku)}`}
                    className="rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-10 text-center text-gray-500">No products match your search.</p>}
      </div>
    </div>
  );
}

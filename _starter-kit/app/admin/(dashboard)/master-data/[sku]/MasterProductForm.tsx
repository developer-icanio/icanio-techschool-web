"use client";

import { useState, useTransition } from "react";
import { updateMasterProduct, type MasterProductInput } from "../actions";

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border px-4 py-2.5"
      />
    </div>
  );
}

export default function MasterProductForm({
  sku,
  initial,
}: {
  sku: string;
  initial: MasterProductInput;
}) {
  const [form, setForm] = useState<MasterProductInput>(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function set<K extends keyof MasterProductInput>(key: K, value: MasterProductInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await updateMasterProduct(sku, form);
      setSaved(true);
    });
  }

  // Live preview only — not saved anywhere, just tells whoever's editing
  // whether the numbers they just typed actually make sense together
  // before they hit Save. Full landed-cost profit, not just product
  // margin: sellingPrice minus purchase price AND the per-unit
  // fulfillment costs (packing, labelling/invoice, shipping). Ecommerce
  // operator charges (Amazon referral/closing fees) are folded in only
  // once a real rate exists — treating a blank as 0% would overstate
  // profit, so the line item is shown separately as "not yet set"
  // instead of silently assumed away.
  const sellingPrice = Number(form.sellingPrice);
  const costFields = [
    { label: "Purchase price", value: form.purchasePrice },
    { label: "Packing cost", value: form.packingCost },
    { label: "Labelling & invoice", value: form.labellingInvoiceCost },
    { label: "Shipping cost", value: form.shippingCost },
  ];
  const allCostsSet = form.sellingPrice !== "" && costFields.every((f) => f.value !== "");
  const profitText = (() => {
    if (!allCostsSet) return null;
    const total = costFields.reduce((sum, f) => sum + Number(f.value), 0);
    if (!Number.isFinite(sellingPrice) || !Number.isFinite(total)) return null;
    const operatorCharge = form.ecommerceOperatorCharges === "" ? null : Number(form.ecommerceOperatorCharges);
    const profit = sellingPrice - total - (operatorCharge ?? 0);
    const profitPct = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;
    const base =
      profit >= 0
        ? `Profit: ₹${profit.toFixed(2)} (${profitPct.toFixed(0)}%)`
        : `⚠ Selling below full cost by ₹${Math.abs(profit).toFixed(2)}`;
    return operatorCharge === null ? `${base} - excludes ecommerce operator charges (not yet set)` : base;
  })();

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">Identity</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Item name" value={form.itemName} onChange={(v) => set("itemName", v)} />
          </div>
          <Field label="Item highlight" value={form.itemHighlight} onChange={(v) => set("itemHighlight", v)} />
          <Field label="Brand" value={form.brand} onChange={(v) => set("brand", v)} />
          <Field label="Manufacturer" value={form.manufacturer} onChange={(v) => set("manufacturer", v)} />
          <Field label="Style" value={form.style} onChange={(v) => set("style", v)} />
          <Field label="Department" value={form.department} onChange={(v) => set("department", v)} />
          <Field label="Target gender" value={form.targetGender} onChange={(v) => set("targetGender", v)} />
          <Field
            label="Age range description"
            value={form.ageRangeDescription}
            onChange={(v) => set("ageRangeDescription", v)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">Description &amp; keywords</h2>
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Product description</label>
            <textarea
              rows={10}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full rounded-lg border px-4 py-2.5"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Write naturally with the product&apos;s target keywords included.
            </p>
            <p
              className={`mt-1 text-xs font-medium ${
                form.description.length >= 1100 && form.description.length <= 1400
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {form.description.length} / 1100-1400 characters
              {form.description.length < 1100 &&
                ` (${1100 - form.description.length} more needed)`}
              {form.description.length > 1400 &&
                ` (${form.description.length - 1400} over the limit)`}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Bullet points</label>
            <div className="space-y-2">
              {form.bulletPoints.map((point, i) => (
                <input
                  key={i}
                  value={point}
                  onChange={(e) =>
                    set(
                      "bulletPoints",
                      form.bulletPoints.map((p, j) => (j === i ? e.target.value : p))
                    )
                  }
                  placeholder={`Bullet point ${i + 1}`}
                  className="w-full rounded-lg border px-4 py-2.5"
                />
              ))}
            </div>
          </div>
          <Field
            label="Generic keywords"
            value={form.genericKeywords}
            onChange={(v) => set("genericKeywords", v)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">Fabric &amp; fit</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Material" value={form.material} onChange={(v) => set("material", v)} />
          <Field label="Pattern" value={form.pattern} onChange={(v) => set("pattern", v)} />
          <Field label="Collar style" value={form.collarStyle} onChange={(v) => set("collarStyle", v)} />
          <Field label="Neck style" value={form.neckStyle} onChange={(v) => set("neckStyle", v)} />
          <Field label="Sleeve type" value={form.sleeveType} onChange={(v) => set("sleeveType", v)} />
          <Field
            label="Sleeve length description"
            value={form.sleeveLengthDescription}
            onChange={(v) => set("sleeveLengthDescription", v)}
          />
          <Field label="Fit type" value={form.fitType} onChange={(v) => set("fitType", v)} />
          <Field label="Country of origin" value={form.countryOfOrigin} onChange={(v) => set("countryOfOrigin", v)} />
          <div className="sm:col-span-2">
            <Field label="Care instructions" value={form.careInstructions} onChange={(v) => set("careInstructions", v)} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">Pricing &amp; weight</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="MRP (₹)" value={form.mrp} onChange={(v) => set("mrp", v)} />
          <Field label="Selling price (₹)" value={form.sellingPrice} onChange={(v) => set("sellingPrice", v)} />
          <div>
            <Field
              label="Purchase price (₹)"
              value={form.purchasePrice}
              onChange={(v) => set("purchasePrice", v)}
            />
            <p className="mt-1 text-xs text-gray-500">
              What it costs LAMBLILY to make/acquire one unit - never shown to customers. Used for
              margin and working-capital tracking, not the storefront price.
            </p>
          </div>
          <Field label="Item weight" value={form.itemWeightValue} onChange={(v) => set("itemWeightValue", v)} />
          <Field label="Weight unit" value={form.itemWeightUnit} onChange={(v) => set("itemWeightUnit", v)} />
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">Fulfillment costs &amp; profit</h2>
        <p className="mb-4 text-xs text-gray-500">
          Per-unit costs beyond the purchase price above - together they make up full landed cost, so
          Profit below is real profit, not just product margin.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Packing cost (₹)"
            value={form.packingCost}
            onChange={(v) => set("packingCost", v)}
          />
          <Field
            label="Labelling & invoice (₹)"
            value={form.labellingInvoiceCost}
            onChange={(v) => set("labellingInvoiceCost", v)}
          />
          <Field
            label="Shipping cost (₹)"
            value={form.shippingCost}
            onChange={(v) => set("shippingCost", v)}
          />
          <div>
            <Field
              label="Ecommerce operator charges (₹)"
              value={form.ecommerceOperatorCharges}
              onChange={(v) => set("ecommerceOperatorCharges", v)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Amazon/marketplace referral + closing fees. Leave blank until a real rate is confirmed -
              Profit below excludes it rather than assuming 0%.
            </p>
          </div>
          {profitText && (
            <p className="self-end pb-2.5 text-sm font-medium text-gray-700 sm:col-span-2">{profitText}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 border-t pt-6">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {saved && !isPending && <span className="text-sm text-green-700">Saved</span>}
      </div>
    </form>
  );
}

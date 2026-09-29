import Link from "next/link";
import { notFound } from "next/navigation";
import { getMasterProductDetail } from "@/lib/masterData";
import { toggleParentActive, toggleColorVariant, toggleSizeVariant, setPrimaryColor } from "../actions";
import MasterProductForm from "./MasterProductForm";
import MasterProductPhotos from "./MasterProductPhotos";
import AgeRangeSelect from "./AgeRangeSelect";
import type { MasterProductInput } from "../actions";

export default async function MasterProductDetailPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  const detail = await getMasterProductDetail(decodeURIComponent(sku));
  if (!detail) notFound();

  const { parent, colorVariants, images } = detail;

  const initial: MasterProductInput = {
    itemName: parent.itemName ?? "",
    itemHighlight: parent.itemHighlight ?? "",
    brand: parent.brand ?? "",
    manufacturer: parent.manufacturer ?? "",
    style: parent.style ?? "",
    department: parent.department ?? "",
    targetGender: parent.targetGender ?? "",
    ageRangeDescription: parent.ageRangeDescription ?? "",
    description: parent.description ?? "",
    bulletPoints: Array.from(
      { length: 5 },
      (_, i) => (Array.isArray(parent.bulletPoints) ? (parent.bulletPoints as string[])[i] : undefined) ?? ""
    ),
    genericKeywords: parent.genericKeywords ?? "",
    material: parent.material ?? "",
    pattern: parent.pattern ?? "",
    collarStyle: parent.collarStyle ?? "",
    neckStyle: parent.neckStyle ?? "",
    sleeveType: parent.sleeveType ?? "",
    sleeveLengthDescription: parent.sleeveLengthDescription ?? "",
    fitType: parent.fitType ?? "",
    careInstructions: parent.careInstructions ?? "",
    countryOfOrigin: parent.countryOfOrigin ?? "",
    mrp: parent.mrp ?? "",
    sellingPrice: parent.sellingPrice ?? "",
    purchasePrice: parent.purchasePrice ?? "",
    packingCost: parent.packingCost ?? "",
    labellingInvoiceCost: parent.labellingInvoiceCost ?? "",
    shippingCost: parent.shippingCost ?? "",
    ecommerceOperatorCharges: parent.ecommerceOperatorCharges ?? "",
    itemWeightValue: parent.itemWeightValue ?? "",
    itemWeightUnit: parent.itemWeightUnit ?? "",
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/master-data" className="text-sm text-blue-600 hover:underline">
            ← All products
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{parent.itemName ?? parent.sku}</h1>
          <p className="mt-1 font-mono text-xs text-gray-500">{parent.sku}</p>
        </div>
        <div className="flex items-center gap-3">
          <AgeRangeSelect sku={parent.sku} value={parent.ageRange} />
          <form
            action={async () => {
              "use server";
              await toggleParentActive(parent.sku, !parent.isActive);
            }}
          >
            <button
              type="submit"
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                parent.isActive
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {parent.isActive ? "Live" : "Hidden"}
            </button>
          </form>
        </div>
      </div>

      <MasterProductPhotos
        sku={parent.sku}
        colors={colorVariants.map((g) => g.color)}
        primaryColor={parent.primaryColor}
        images={images}
      />

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-semibold text-gray-900">Color variants</h2>
        <p className="mb-4 text-sm text-gray-500">
          Turning a color off hides every size under it - the sizes themselves stay recorded, just not
          orderable.
        </p>
        <div className="divide-y">
          {colorVariants.map((group) => {
            const activeSizes = group.sizes.filter((s) => s.isActive).length;
            return (
              <div key={group.color} className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{group.color}</p>
                      {group.isPrimary && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {activeSizes} / {group.sizes.length} sizes active
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!group.isPrimary && (
                      <form
                        action={async () => {
                          "use server";
                          await setPrimaryColor(parent.sku, group.color);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-full border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Set as primary
                        </button>
                      </form>
                    )}
                    <form
                      action={async () => {
                        "use server";
                        await toggleColorVariant(parent.sku, group.color, !group.isActive);
                      }}
                    >
                      <button
                        type="submit"
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                          group.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {group.isActive ? "Enabled" : "Disabled"}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {group.sizes.map((size) => (
                    <form
                      key={size.sku}
                      action={async () => {
                        "use server";
                        await toggleSizeVariant(parent.sku, size.sku, !size.isActive);
                      }}
                    >
                      <button
                        type="submit"
                        title={size.isActive ? "Click to disable this size" : "Click to enable this size"}
                        className={`rounded-md px-2 py-1 text-xs font-medium ${
                          size.isActive
                            ? "bg-green-50 text-green-700 hover:bg-green-100"
                            : "bg-gray-100 text-gray-400 line-through hover:bg-gray-200"
                        }`}
                      >
                        {size.sizeLabel}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            );
          })}
          {colorVariants.length === 0 && (
            <p className="py-3 text-sm text-gray-500">This design has no color/size variants recorded.</p>
          )}
        </div>
      </div>

      <MasterProductForm sku={parent.sku} initial={initial} />
    </div>
  );
}

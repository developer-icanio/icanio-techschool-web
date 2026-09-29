"use server";

import { db } from "@/db";
import { productMasterData, productMasterImages } from "@/db/schema";
import { and, eq, or, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { PhotoType } from "@/lib/masterData";
import type { AgeRange } from "@/lib/ageRanges";

export interface MasterProductInput {
  itemName: string;
  itemHighlight: string;
  brand: string;
  manufacturer: string;
  style: string;
  department: string;
  targetGender: string;
  ageRangeDescription: string;
  description: string;
  bulletPoints: string[]; // exactly 5 boxes in the form, matching Amazon's 5 real bullet-point slots
  genericKeywords: string;
  material: string;
  pattern: string;
  collarStyle: string;
  neckStyle: string;
  sleeveType: string;
  sleeveLengthDescription: string;
  fitType: string;
  careInstructions: string;
  countryOfOrigin: string;
  mrp: string;
  sellingPrice: string;
  purchasePrice: string;
  packingCost: string;
  labellingInvoiceCost: string;
  shippingCost: string;
  ecommerceOperatorCharges: string;
  itemWeightValue: string;
  itemWeightUnit: string;
}

function blankToNull(v: string): string | null {
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

function numOrNull(v: string): string | null {
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? String(n) : null;
}

function revalidateMasterData(sku: string) {
  revalidatePath("/admin/master-data");
  revalidatePath(`/admin/master-data/${encodeURIComponent(sku)}`);
}

export async function updateMasterProduct(sku: string, input: MasterProductInput) {
  const bulletPoints = input.bulletPoints.map((v) => v.trim()).filter(Boolean);

  await db
    .update(productMasterData)
    .set({
      itemName: blankToNull(input.itemName),
      itemHighlight: blankToNull(input.itemHighlight),
      brand: blankToNull(input.brand),
      manufacturer: blankToNull(input.manufacturer),
      style: blankToNull(input.style),
      department: blankToNull(input.department),
      targetGender: blankToNull(input.targetGender),
      ageRangeDescription: blankToNull(input.ageRangeDescription),
      description: blankToNull(input.description),
      bulletPoints: bulletPoints.length > 0 ? bulletPoints : null,
      genericKeywords: blankToNull(input.genericKeywords),
      material: blankToNull(input.material),
      pattern: blankToNull(input.pattern),
      collarStyle: blankToNull(input.collarStyle),
      neckStyle: blankToNull(input.neckStyle),
      sleeveType: blankToNull(input.sleeveType),
      sleeveLengthDescription: blankToNull(input.sleeveLengthDescription),
      fitType: blankToNull(input.fitType),
      careInstructions: blankToNull(input.careInstructions),
      countryOfOrigin: blankToNull(input.countryOfOrigin),
      mrp: numOrNull(input.mrp),
      sellingPrice: numOrNull(input.sellingPrice),
      purchasePrice: numOrNull(input.purchasePrice),
      packingCost: numOrNull(input.packingCost),
      labellingInvoiceCost: numOrNull(input.labellingInvoiceCost),
      shippingCost: numOrNull(input.shippingCost),
      ecommerceOperatorCharges: numOrNull(input.ecommerceOperatorCharges),
      itemWeightValue: numOrNull(input.itemWeightValue),
      itemWeightUnit: blankToNull(input.itemWeightUnit),
    })
    .where(eq(productMasterData.sku, sku));

  revalidateMasterData(sku);
}

export async function toggleParentActive(sku: string, isActive: boolean) {
  await db.update(productMasterData).set({ isActive }).where(eq(productMasterData.sku, sku));
  revalidateMasterData(sku);
}

// Enables/disables every size under one color of one design at once —
// the "enable/disable a color variant" control. Sizes keep their own
// isActive underneath (untouched by re-imports), this just bulk-flips
// them together since the admin thinks in terms of "the Red one", not
// each individual size.
export async function toggleColorVariant(parentSku: string, color: string, isActive: boolean) {
  await db
    .update(productMasterData)
    .set({ isActive })
    .where(and(eq(productMasterData.parentSku, parentSku), eq(productMasterData.color, color)));
  revalidateMasterData(parentSku);
}

// Enables/disables a single color+size SKU — finer-grained than
// toggleColorVariant above, for when only one size of a color is out
// (e.g. Red is fine except 15-16Y). `parentSku` is only needed to
// revalidate the right detail page, not to scope the update.
export async function toggleSizeVariant(parentSku: string, sku: string, isActive: boolean) {
  await db.update(productMasterData).set({ isActive }).where(eq(productMasterData.sku, sku));
  revalidateMasterData(parentSku);
}

// Which color's photos represent this design by default (admin list
// thumbnail, etc). Must be one of the design's own colors — the color
// picker in the UI only ever offers colors that already exist.
export async function setPrimaryColor(sku: string, color: string) {
  await db.update(productMasterData).set({ primaryColor: color }).where(eq(productMasterData.sku, sku));
  revalidateMasterData(sku);
}

// Sets the design's admin-facing age/audience bucket — a coarse label
// shown and filterable on /admin/master-data, distinct from the
// fine-grained per-size isActive flags. Applied to the parent and every
// child so it stays consistent regardless of which row is read from.
export async function setAgeRange(sku: string, ageRange: AgeRange | null) {
  await db
    .update(productMasterData)
    .set({ ageRange })
    .where(or(eq(productMasterData.sku, sku), eq(productMasterData.parentSku, sku)));
  revalidateMasterData(sku);
}

// Real photography for one design comes in 7 colors x 2 ratios
// (website = vertical, amazon = 1:1 square), each with its own gallery
// of up to 7 shots — so the cap is per (sku, color, photoType) group,
// not per SKU as a whole.
const MAX_IMAGES_PER_GROUP = 7;

export async function addMasterProductImage(
  sku: string,
  url: string,
  color: string | null,
  photoType: PhotoType
) {
  const existing = await db.query.productMasterImages.findMany({
    where: and(
      eq(productMasterImages.sku, sku),
      color ? eq(productMasterImages.color, color) : undefined,
      eq(productMasterImages.photoType, photoType)
    ),
    orderBy: asc(productMasterImages.position),
  });
  if (existing.length >= MAX_IMAGES_PER_GROUP) {
    throw new Error(`Maximum ${MAX_IMAGES_PER_GROUP} photos per color per type - delete one first.`);
  }
  const nextPosition = existing.length > 0 ? existing[existing.length - 1].position + 1 : 0;
  await db.insert(productMasterImages).values({ sku, url, color, photoType, position: nextPosition });
  revalidateMasterData(sku);
}

export async function deleteMasterProductImage(id: string, sku: string) {
  await db.delete(productMasterImages).where(eq(productMasterImages.id, id));
  revalidateMasterData(sku);
}

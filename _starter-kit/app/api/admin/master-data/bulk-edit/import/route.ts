import { auth } from "@/auth";
import { db } from "@/db";
import { productMasterData } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import { AGE_RANGE_OPTIONS, type AgeRange } from "@/lib/ageRanges";
import { revalidatePath } from "next/cache";

const AGE_RANGE_SET = new Set<string>(AGE_RANGE_OPTIONS);
const MAX_FILE_SIZE = 4 * 1024 * 1024; // same Vercel serverless body cap as other admin uploads
const MAX_ERRORS_RETURNED = 50; // keep the response small on a catastrophically malformed file

interface SheetRow {
  SKU?: string;
  "Item Name"?: string;
  "Age Range"?: string;
  MRP?: string | number;
  "Selling Price"?: string | number;
  "Purchase Price"?: string | number;
  "Item Weight Value"?: string | number;
  "Item Weight Unit"?: string;
  "Package Length"?: string | number;
  "Package Width"?: string | number;
  "Package Height"?: string | number;
  "Package Dimension Unit"?: string;
}

// Blank cell -> "leave unchanged" for a bulk import (unlike the single
// product edit form, where a blank field explicitly clears the column) —
// with hundreds of rows in one file, an accidentally-blank cell must
// never wipe out real existing data.
function cellString(v: string | number | undefined): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

// Excel numeric cells arrive as `number` already; text-formatted numeric
// cells arrive as `string`. Either way, reject non-finite/non-positive
// results rather than silently writing a bad value.
function parsePositiveNumber(v: string | number | undefined): { value: number | undefined; error?: string } {
  const s = cellString(v);
  if (s === undefined) return { value: undefined };
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return { value: undefined, error: `"${s}" is not a positive number` };
  return { value: n };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return Response.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB - please use one under 4MB.` }, { status: 400 });
  }

  let rows: SheetRow[];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames.includes("Master Data") ? "Master Data" : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: undefined });
  } catch {
    return Response.json({ error: "Couldn't read that file - please upload a valid .xlsx exported from this page." }, { status: 400 });
  }

  const existing = await db.query.productMasterData.findMany({
    columns: { sku: true },
  });
  const knownSkus = new Set(existing.map((r) => r.sku));

  const errors: string[] = [];
  const validUpdates: { sku: string; set: Partial<typeof productMasterData.$inferInsert> }[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2; // header is row 1
    const sku = cellString(row.SKU);
    if (!sku) return; // silently skip fully blank rows (trailing empty rows are common in Excel)
    if (!knownSkus.has(sku)) {
      errors.push(`Row ${rowNum} (${sku}): SKU not found - skipped.`);
      return;
    }

    const set: Partial<typeof productMasterData.$inferInsert> = {};
    let rowHasError = false;

    const itemName = cellString(row["Item Name"]);
    if (itemName !== undefined) set.itemName = itemName;

    const ageRange = cellString(row["Age Range"]);
    if (ageRange !== undefined) {
      if (!AGE_RANGE_SET.has(ageRange)) {
        errors.push(`Row ${rowNum} (${sku}): Age Range "${ageRange}" isn't one of the allowed values - row skipped.`);
        rowHasError = true;
      } else {
        set.ageRange = ageRange as AgeRange;
      }
    }

    const mrp = parsePositiveNumber(row.MRP);
    if (mrp.error) {
      errors.push(`Row ${rowNum} (${sku}): MRP ${mrp.error} - row skipped.`);
      rowHasError = true;
    } else if (mrp.value !== undefined) set.mrp = String(mrp.value);

    const sellingPrice = parsePositiveNumber(row["Selling Price"]);
    if (sellingPrice.error) {
      errors.push(`Row ${rowNum} (${sku}): Selling Price ${sellingPrice.error} - row skipped.`);
      rowHasError = true;
    } else if (sellingPrice.value !== undefined) set.sellingPrice = String(sellingPrice.value);

    const purchasePrice = parsePositiveNumber(row["Purchase Price"]);
    if (purchasePrice.error) {
      errors.push(`Row ${rowNum} (${sku}): Purchase Price ${purchasePrice.error} - row skipped.`);
      rowHasError = true;
    } else if (purchasePrice.value !== undefined) set.purchasePrice = String(purchasePrice.value);

    const weight = parsePositiveNumber(row["Item Weight Value"]);
    if (weight.error) {
      errors.push(`Row ${rowNum} (${sku}): Item Weight Value ${weight.error} - row skipped.`);
      rowHasError = true;
    } else if (weight.value !== undefined) set.itemWeightValue = String(weight.value);

    const weightUnit = cellString(row["Item Weight Unit"]);
    if (weightUnit !== undefined) set.itemWeightUnit = weightUnit;

    const length = parsePositiveNumber(row["Package Length"]);
    const width = parsePositiveNumber(row["Package Width"]);
    const height = parsePositiveNumber(row["Package Height"]);
    const dimUnit = cellString(row["Package Dimension Unit"]);
    const dimErrors = [length, width, height].filter((d) => d.error);
    if (dimErrors.length > 0) {
      errors.push(`Row ${rowNum} (${sku}): package dimension ${dimErrors.map((d) => d.error).join(", ")} - row skipped.`);
      rowHasError = true;
    } else {
      const anyDim = [length.value, width.value, height.value].some((v) => v !== undefined);
      const allDim = [length.value, width.value, height.value].every((v) => v !== undefined);
      if (anyDim && !allDim) {
        errors.push(`Row ${rowNum} (${sku}): Package Length/Width/Height must all three be filled together - row skipped.`);
        rowHasError = true;
      } else if (allDim) {
        set.packageDimensions = {
          length: length.value,
          width: width.value,
          height: height.value,
          unit: dimUnit ?? "cm",
        };
      }
    }

    if (rowHasError) return; // whole row rejected, not applied partially
    if (Object.keys(set).length === 0) return; // nothing to change on this row
    validUpdates.push({ sku, set });
  });

  if (validUpdates.length > 0) {
    await db.transaction(async (tx) => {
      for (const { sku, set } of validUpdates) {
        await tx.update(productMasterData).set(set).where(eq(productMasterData.sku, sku));
      }
    });
    revalidatePath("/admin/master-data");
  }

  return Response.json({
    totalRows: rows.length,
    updated: validUpdates.length,
    errorCount: errors.length,
    errors: errors.slice(0, MAX_ERRORS_RETURNED),
    truncated: errors.length > MAX_ERRORS_RETURNED,
  });
}

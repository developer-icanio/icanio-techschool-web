import { auth } from "@/auth";
import { db } from "@/db";
import * as XLSX from "xlsx";
import { AGE_RANGE_OPTIONS } from "@/lib/ageRanges";

// Design number embedded in every Parent/Child SKU — same helper as
// lib/masterData.ts's cpNumber, duplicated here rather than imported
// since that file pulls in the whole db module graph and this route
// already has db directly.
function cpNumber(sku: string): number {
  const match = sku.match(/CP(\d+)$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

const EDITABLE_HEADERS = [
  "SKU",
  "Level",
  "Design",
  "Color",
  "Size",
  "Item Name",
  "Age Range",
  "MRP",
  "Selling Price",
  "Purchase Price",
  "Item Weight Value",
  "Item Weight Unit",
  "Package Length",
  "Package Width",
  "Package Height",
  "Package Dimension Unit",
] as const;

// GET, not POST — this always exports every row (no selection UI), so a
// plain link/fetch with no body is enough; matches how a browser-native
// download would work. proxy.ts only gates /admin/:path*, not
// /api/admin/*, so this route needs its own auth check — same pattern as
// the other admin upload/export routes.
export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return Response.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  }

  const rows = await db.query.productMasterData.findMany();
  rows.sort((a, b) => {
    const cp = cpNumber(a.sku) - cpNumber(b.sku);
    if (cp !== 0) return cp;
    if (a.parentageLevel !== b.parentageLevel) return a.parentageLevel === "Parent" ? -1 : 1;
    const color = (a.color ?? "").localeCompare(b.color ?? "");
    if (color !== 0) return color;
    return (a.sizeLabel ?? "").localeCompare(b.sizeLabel ?? "");
  });

  const aoa: (string | number)[][] = [[...EDITABLE_HEADERS]];
  for (const r of rows) {
    const dims = (r.packageDimensions ?? {}) as {
      length?: number | string;
      width?: number | string;
      height?: number | string;
      unit?: string;
    };
    aoa.push([
      r.sku,
      r.parentageLevel ?? "",
      r.parentSku ?? r.sku,
      r.color ?? "",
      r.sizeLabel ?? "",
      r.itemName ?? "",
      r.ageRange ?? "",
      r.mrp ?? "",
      r.sellingPrice ?? "",
      r.purchasePrice ?? "",
      r.itemWeightValue ?? "",
      r.itemWeightUnit ?? "",
      dims.length ?? "",
      dims.width ?? "",
      dims.height ?? "",
      dims.unit ?? "",
    ]);
  }

  const dataSheet = XLSX.utils.aoa_to_sheet(aoa);
  dataSheet["!cols"] = [
    { wch: 34 }, { wch: 8 }, { wch: 22 }, { wch: 10 }, { wch: 8 },
    { wch: 45 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
  ];

  const instructions = XLSX.utils.aoa_to_sheet([
    ["How to use this spreadsheet"],
    [""],
    ["1. Edit only these columns: Item Name, Age Range, MRP, Selling Price, Purchase Price,"],
    ["   Item Weight Value, Item Weight Unit, Package Length, Package Width, Package Height,"],
    ["   Package Dimension Unit."],
    ["2. Do NOT edit the SKU column - it's how each row is matched back to the database."],
    ["   Level, Design, Color and Size are reference-only; they're ignored on upload."],
    ["3. Leave a cell blank to leave that field unchanged. A blank cell never clears existing data."],
    ["4. Age Range must be exactly one of these values (case-sensitive):"],
    ...AGE_RANGE_OPTIONS.map((o) => [`   - ${o}`]),
    ["5. MRP, Selling Price, Purchase Price, Item Weight Value, and the three Package dimensions"],
    ["   must be plain positive numbers (no currency symbols, no units in the cell)."],
    ["   Purchase Price is what LAMBLILY pays to make/acquire one unit - never shown to"],
    ["   customers, used only for margin and working-capital tracking."],
    ["6. Package Length/Width/Height must all three be filled together, or all left blank."],
    ["7. Save as .xlsx and upload it back on the Master Data page's Bulk Edit panel."],
  ]);
  instructions["!cols"] = [{ wch: 90 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Master Data");
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;

  const filename = `lamblily-master-data-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

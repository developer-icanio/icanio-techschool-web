import { auth } from "@/auth";
import * as XLSX from "xlsx";
import { EXPORT_CHANNELS } from "@/lib/exports";

// proxy.ts only gates /admin/:path*, not /api/admin/*, so this route
// needs its own auth check — same pattern as the other admin upload
// routes. Posted to directly by a plain <form> on /admin/master-data (no
// client JS) so the browser's native file-download handling takes over
// on a successful response.
export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return Response.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  }

  const formData = await request.formData();
  const skus = formData.getAll("sku").map(String).filter(Boolean);
  const channel = formData.get("channel");

  if (skus.length === 0) {
    return Response.json({ error: "Select at least one product first." }, { status: 400 });
  }
  if (typeof channel !== "string" || !(channel in EXPORT_CHANNELS)) {
    return Response.json({ error: "Unknown export channel." }, { status: 400 });
  }

  const config = EXPORT_CHANNELS[channel];

  let aoa: (string | number)[][];
  try {
    aoa = await config.buildAoa(skus);
  } catch {
    return Response.json({ error: "Failed to build the export. Please try again." }, { status: 500 });
  }

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, config.sheetName);
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;

  const filename = `${channel}-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

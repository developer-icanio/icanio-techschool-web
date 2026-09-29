import { auth } from "@/auth";
import { getUrlExportItems } from "@/lib/siteContent";

// proxy.ts only gates /admin/:path*, not /api/admin/*, so this route
// needs its own auth check rather than relying on the middleware.
function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const items = await getUrlExportItems();
  const header = ["type", "title", "url", "status"];
  const rows = items.map((item) => [item.type, item.title, item.url, item.status]);

  const csv = [header, ...rows]
    .map((row) => row.map((field) => escapeCsvField(field)).join(","))
    .join("\n");

  const timestamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lamblily-urls-${timestamp}.csv"`,
    },
  });
}

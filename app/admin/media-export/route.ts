import { NextResponse } from "next/server";
import { auth, noLogin } from "@/auth";
import { ensureContent } from "@/lib/content/store";
import { mediaCsv, mediaRows } from "@/lib/media";

// CSV of every image (dashboard: Media, Download CSV). Signed-in team only.
export async function GET(req: Request) {
  if (!noLogin && !(await auth())?.user?.role) return new NextResponse(null, { status: 401 });
  await ensureContent();
  const page = new URL(req.url).searchParams.get("page");
  const rows = mediaRows().filter((r) => !page || r.pagePath === page);
  return new NextResponse("﻿" + mediaCsv(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="icanio-tech-school-images${page ? `-${page.replace(/\W+/g, "-")}` : ""}.csv"`, "cache-control": "no-store" },
  });
}

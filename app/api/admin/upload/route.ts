import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { auth, noLogin } from "@/auth";
import { rateLimit } from "@/lib/rate-limit";

// Dashboard uploads.
// - With BLOB_READ_WRITE_TOKEN (Vercel Blob): the browser uploads straight to
//   Blob storage; this route only issues the short-lived upload token. That
//   avoids Vercel's 4.5 MB request limit, which matters for videos.
// - Without it, in local dev: files are written to public/uploads.

// No SVG: an SVG file can carry JavaScript that runs when the file is opened.
const IMAGE = ["image/webp", "image/jpeg", "image/png", "image/gif", "image/avif"];
const VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const MAX = 200 * 1024 * 1024;

const blob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const local = () => !blob() && process.env.NODE_ENV !== "production";

/** The signed-in editor's email, or null. The read-only "seo" role can't upload. */
async function editor() {
  if (noLogin) return "local-dev";
  const user = (await auth())?.user;
  return user?.role && user.role !== "seo" ? (user.email ?? null) : null;
}

export async function GET() {
  if (!(await editor())) return new NextResponse(null, { status: 401 });
  return NextResponse.json({ mode: blob() ? "blob" : local() ? "local" : "none" });
}

export async function POST(req: Request) {
  const who = await editor();
  if (!who) return NextResponse.json({ error: "Not signed in, or your role can't upload files." }, { status: 401 });
  if (!(await rateLimit("upload:hour", who, 120, 60 * 60_000)).ok) return NextResponse.json({ error: "Too many uploads in the last hour. Try again later." }, { status: 429 });

  if (blob()) {
    const body = (await req.json()) as HandleUploadBody;
    try {
      const result = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async () => ({ allowedContentTypes: [...IMAGE, ...VIDEO], maximumSizeInBytes: MAX, addRandomSuffix: true }),
        onUploadCompleted: async () => {},
      });
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }

  if (!local()) return NextResponse.json({ error: "File storage is not set up. Add Vercel Blob to the project (BLOB_READ_WRITE_TOKEN)." }, { status: 503 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file." }, { status: 400 });
  if (![...IMAGE, ...VIDEO].includes(file.type)) return NextResponse.json({ error: `Unsupported file type ${file.type}.` }, { status: 415 });
  if (file.size > MAX) return NextResponse.json({ error: "File is larger than 200 MB." }, { status: 413 });
  const month = new Date().toISOString().slice(0, 7);
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/\.{2,}/g, ".").replace(/^[-.]+/, "").slice(-80);
  const name = `${crypto.randomUUID().slice(0, 8)}-${safe}`;
  const dir = path.join(process.cwd(), "public", "uploads", month);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${month}/${name}` });
}

import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { auth, noLogin } from "@/auth";
import { getPage } from "@/lib/content/pages";
import { r2Configured, r2UploadUrl } from "@/lib/r2";
import { rateLimit } from "@/lib/rate-limit";

// Dashboard uploads.
// - With the R2_* settings (Cloudflare R2): this route checks the file type
//   and size and signs a 10-minute upload link; the browser PUTs the file
//   straight to R2. That avoids Vercel's 4.5 MB request limit (videos).
// - Without them, in local dev: files are written to public/uploads.

// No SVG: an SVG file can carry JavaScript that runs when the file is opened.
const IMAGE = ["image/webp", "image/jpeg", "image/png", "image/gif", "image/avif"];
const VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
const MAX = 200 * 1024 * 1024;

const local = () => !r2Configured() && process.env.NODE_ENV !== "production";
const EXT: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/avif": "avif", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

const LIBRARY_FOLDERS: Record<string, string> = { videos: "student-videos", students: "students", colleges: "college-logos", reviews: "reviews", team: "trainers" };
const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * Folder and SEO file name for an upload, like the rest of the site:
 * <page-folder>/<page-keyword>-<file-name>.<ext>, or a library folder.
 */
function placeFor(where: unknown, fileName: unknown, ext: string) {
  const w = typeof where === "string" ? where : "";
  let folder = "uploads";
  let kw = "";
  if (w.startsWith("library:")) folder = LIBRARY_FOLDERS[w.slice(8)] ?? "uploads";
  else if (w.startsWith("/")) {
    const p = getPage(w);
    if (p) {
      folder = p.path === "/" ? "home" : p.path.split("/").pop()!;
      kw = slugify(p.seo.focusKeyword);
    }
  }
  let base = slugify(String(fileName ?? "").replace(/\.[a-z0-9]+$/i, "")).slice(0, 60) || "image";
  if (kw && !base.includes(kw)) base = `${kw}-${base}`.slice(0, 80);
  return { folder, name: `${base}-${crypto.randomUUID().slice(0, 6)}.${ext}` };
}

/** The signed-in editor's email, or null. The read-only "seo" role can't upload. */
async function editor() {
  if (noLogin) return "local-dev";
  const user = (await auth())?.user;
  return user?.role && user.role !== "seo" ? (user.email ?? null) : null;
}

export async function GET() {
  if (!(await editor())) return new NextResponse(null, { status: 401 });
  return NextResponse.json({ mode: r2Configured() ? "r2" : local() ? "local" : "none" });
}

export async function POST(req: Request) {
  const who = await editor();
  if (!who) return NextResponse.json({ error: "Not signed in, or your role can't upload files." }, { status: 401 });
  if (!(await rateLimit("upload:hour", who, 120, 60 * 60_000)).ok) return NextResponse.json({ error: "Too many uploads in the last hour. Try again later." }, { status: 429 });

  if (r2Configured()) {
    // Asks for an upload link: { name, type, size }. The link only accepts
    // that content type, under a random key the uploader can't choose.
    const body = (await req.json().catch(() => null)) as { name?: unknown; type?: unknown; size?: unknown; page?: unknown } | null;
    const type = typeof body?.type === "string" ? body.type : "";
    const size = typeof body?.size === "number" ? body.size : NaN;
    if (!EXT[type]) return NextResponse.json({ error: `Unsupported file type ${type || "(unknown)"}.` }, { status: 415 });
    if (!(size > 0) || size > MAX) return NextResponse.json({ error: "File is empty or larger than 200 MB." }, { status: 413 });
    const { folder, name } = placeFor((body as { page?: unknown } | null)?.page, body?.name, EXT[type]);
    const key = `techschool/${folder}/${name}`;
    return NextResponse.json(r2UploadUrl(key, type));
  }

  if (!local()) return NextResponse.json({ error: "File storage is not set up. Add the Cloudflare R2 settings (R2_*) to the project." }, { status: 503 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file." }, { status: 400 });
  if (![...IMAGE, ...VIDEO].includes(file.type)) return NextResponse.json({ error: `Unsupported file type ${file.type}.` }, { status: 415 });
  if (file.size > MAX) return NextResponse.json({ error: "File is larger than 200 MB." }, { status: 413 });
  const { folder, name } = placeFor(form.get("page"), file.name, EXT[file.type] ?? "bin");
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${folder}/${name}` });
}

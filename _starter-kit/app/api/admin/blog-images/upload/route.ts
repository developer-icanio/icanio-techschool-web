import { auth } from "@/auth";
import { db } from "@/db";
import { blogImages, blogImageTypeEnum } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { storeBlogImage, UnreadableImageError } from "@/lib/blogImageStore";

// sharp (inside storeBlogImage) needs the Node.js runtime, and image work
// plus an R2 round trip can outlast the default function timeout.
export const runtime = "nodejs";
export const maxDuration = 60;

// proxy.ts only gates /admin/:path*, not /api/admin/*, so this route needs
// its own auth check rather than relying on the middleware.
const VALID_TYPES = blogImageTypeEnum.enumValues;

export async function POST(request: Request) {
  try {
    return await handleUpload(request);
  } catch (err) {
    // Catch-all so an unexpected failure returns JSON, not a raw HTML 500
    // that makes the client's res.json() throw "not JSON".
    if (err instanceof UnreadableImageError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    console.error("blog-images/upload failed:", err);
    return Response.json(
      { error: `Upload failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

async function handleUpload(request: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return Response.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const slug = formData.get("slug");
  const imageType = formData.get("imageType");

  if (!(file instanceof File) || typeof slug !== "string" || typeof imageType !== "string") {
    return Response.json({ error: "Missing file, slug, or imageType." }, { status: 400 });
  }
  if (!VALID_TYPES.includes(imageType as (typeof VALID_TYPES)[number])) {
    return Response.json(
      { error: `imageType must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const stored = await storeBlogImage(slug, imageType as (typeof VALID_TYPES)[number], inputBuffer);
  return Response.json(stored);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const imageType = searchParams.get("imageType");
  if (!slug || !imageType) {
    return new Response("Missing slug or imageType", { status: 400 });
  }

  await db
    .delete(blogImages)
    .where(and(eq(blogImages.blogSlug, slug), eq(blogImages.imageType, imageType as (typeof VALID_TYPES)[number])));

  return new Response(null, { status: 204 });
}

import { auth } from "@/auth";
import { randomUUID } from "crypto";
import { uploadToR2 } from "@/lib/r2";

// sharp needs the Node.js runtime, and image work + an R2 round trip can
// outlast the default function timeout on a big photo.
export const runtime = "nodejs";
export const maxDuration = 60;

// proxy.ts only gates /admin/:path*, not /api/admin/*, so this route needs
// its own auth check rather than relying on the middleware — same pattern
// as app/api/admin/blog-images/upload/route.ts.
export async function POST(request: Request) {
  try {
    return await handleUpload(request);
  } catch (err) {
    // Catch-all so an unexpected failure (sharp native-binary load,
    // request.formData() choking, ...) returns JSON, not a raw HTML 500
    // that makes the client's res.json() throw "not JSON".
    console.error("hero-banner/upload failed:", err);
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
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  // Dynamic import: sharp is a native addon that throws at *import* time
  // on a missing platform binary. At module scope that's an uncatchable
  // route-load crash (raw HTML 500); here the POST catch-all turns it
  // into a readable JSON error. (CJS `export =` module - the function is
  // on .default under interop, or is the module object itself.)
  const sharpMod = await import("sharp");
  const sharp = ((sharpMod as { default?: typeof import("sharp") }).default ??
    (sharpMod as unknown as typeof import("sharp")));

  // sharp() throws on anything it can't decode - a HEIC photo off an
  // iPhone, a corrupted file, or an unsupported format like AVIF/SVG.
  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer).webp({ quality: 85 }).toBuffer();
  } catch {
    return Response.json(
      { error: "Couldn't read that image. Try a JPG, PNG, or WEBP file (not HEIC/HEIF)." },
      { status: 400 }
    );
  }

  try {
    const objectKey = `hero-banner/${randomUUID()}.webp`;
    const url = await uploadToR2(objectKey, outputBuffer, "image/webp");
    return Response.json({ url });
  } catch {
    return Response.json(
      { error: "Upload to storage failed. Please try again." },
      { status: 502 }
    );
  }
}

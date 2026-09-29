import { auth } from "@/auth";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { uploadToR2 } from "@/lib/r2";
import { db } from "@/db";
import { productMasterImages, productPhotoTypeEnum } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// Real photography for one design comes in 7 colors x 2 ratios (website
// = vertical, amazon = 1:1 square), each with its own gallery of up to
// 7 shots — so the cap is per (sku, color, photoType) group, not per SKU.
const MAX_IMAGES_PER_GROUP = 7;
const VALID_PHOTO_TYPES = productPhotoTypeEnum.enumValues;

// proxy.ts only gates /admin/:path*, not /api/admin/*, so this route needs
// its own auth check — same pattern as hero-banner/blog-images upload.
export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return Response.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const sku = formData.get("sku");
  const color = formData.get("color");
  const photoType = formData.get("photoType");
  if (!(file instanceof File) || typeof sku !== "string" || !sku) {
    return Response.json({ error: "Missing file or sku." }, { status: 400 });
  }
  if (typeof photoType !== "string" || !VALID_PHOTO_TYPES.includes(photoType as (typeof VALID_PHOTO_TYPES)[number])) {
    return Response.json({ error: `photoType must be one of: ${VALID_PHOTO_TYPES.join(", ")}` }, { status: 400 });
  }
  const colorValue = typeof color === "string" && color ? color : null;

  const existing = await db.query.productMasterImages.findMany({
    where: and(
      eq(productMasterImages.sku, sku),
      colorValue ? eq(productMasterImages.color, colorValue) : undefined,
      eq(productMasterImages.photoType, photoType as (typeof VALID_PHOTO_TYPES)[number])
    ),
  });
  if (existing.length >= MAX_IMAGES_PER_GROUP) {
    return Response.json(
      { error: `Maximum ${MAX_IMAGES_PER_GROUP} photos per color per type - delete one first.` },
      { status: 400 }
    );
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  // sharp() throws on anything it can't decode — most commonly a HEIC
  // photo straight off an iPhone, a corrupted file, or an unsupported
  // format like AVIF/SVG. Same guard as hero-banner/blog-images upload.
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
    const objectKey = `master-data/${sku}/${photoType}/${colorValue ?? "general"}/${randomUUID()}.webp`;
    const url = await uploadToR2(objectKey, outputBuffer, "image/webp");
    const nextPosition = existing.length > 0 ? Math.max(...existing.map((i) => i.position)) + 1 : 0;
    const [row] = await db
      .insert(productMasterImages)
      .values({ sku, url, color: colorValue, photoType: photoType as (typeof VALID_PHOTO_TYPES)[number], position: nextPosition })
      .returning();
    return Response.json(row);
  } catch {
    return Response.json({ error: "Upload to storage failed. Please try again." }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return Response.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "Missing id." }, { status: 400 });
  }

  await db.delete(productMasterImages).where(eq(productMasterImages.id, id));
  return new Response(null, { status: 204 });
}

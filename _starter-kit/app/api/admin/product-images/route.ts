import { auth } from "@/auth";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { productImages } from "@/db/schema";
import { uploadToR2 } from "@/lib/r2";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// proxy.ts only gates /admin/:path*, not /api/admin/*, so this route needs
// its own auth check rather than relying on the middleware.

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const productId = formData.get("productId");
  const color = formData.get("color"); // empty string means "generic, no color"

  if (!(file instanceof File) || typeof productId !== "string") {
    return new Response("Missing file or productId", { status: 400 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const webp = sharp(inputBuffer).webp({ quality: 85 });
  const outputBuffer = await webp.toBuffer();

  const objectKey = `products/${productId}/${randomUUID()}.webp`;
  const url = await uploadToR2(objectKey, outputBuffer, "image/webp");

  const [row] = await db
    .insert(productImages)
    .values({
      productId,
      url,
      color: typeof color === "string" && color.trim() ? color.trim() : null,
      position: 0,
    })
    .returning();

  revalidatePath("/shop", "layout");
  return Response.json(row);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  await db.delete(productImages).where(eq(productImages.id, id));
  revalidatePath("/shop", "layout");
  return new Response(null, { status: 204 });
}

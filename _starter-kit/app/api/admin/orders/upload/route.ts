import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uploadToR2 } from "@/lib/r2";

// Maps the request's docType to the orders-table column (the Drizzle
// property name, camelCase) it should be written to.
const DOC_FIELD = {
  "shipping-label": "shippingLabelUrl",
  invoice: "invoiceUrl",
} as const;

type DocType = keyof typeof DOC_FIELD;

// proxy.ts only gates /admin/:path*, not /api/admin/*, so this route needs
// its own auth check rather than relying on the middleware.
//
// Stores a courier shipping label or a packing-slip/tax invoice (A4)
// against an order — the file is uploaded byte-for-byte to R2 (no
// re-encoding, so a PDF stays a PDF and prints exactly as the courier
// generated it) and the resulting URL is written to the order's
// shippingLabelUrl / invoiceUrl column.
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 15 * 1024 * 1024; // 15MB - A4 label/invoice PDFs are small, this is headroom

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return Response.json({ error: "Your session has expired. Please sign in again." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const orderId = formData.get("orderId");
  const docType = formData.get("docType");

  if (!(file instanceof File) || typeof orderId !== "string" || typeof docType !== "string") {
    return Response.json({ error: "Missing file, orderId, or docType." }, { status: 400 });
  }
  if (!(docType in DOC_FIELD)) {
    return Response.json({ error: "docType must be 'shipping-label' or 'invoice'." }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return Response.json({ error: "Please upload a PDF, JPG, PNG, or WEBP file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "File must be under 15MB." }, { status: 400 });
  }

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const objectKey = `orders/${orderId}/${docType}-${randomUUID()}.${extension}`;
  const url = await uploadToR2(objectKey, buffer, file.type);

  await db
    .update(orders)
    .set({ [DOC_FIELD[docType as DocType]]: url, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  return Response.json({ url });
}

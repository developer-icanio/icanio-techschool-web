"use client";

import { upload } from "@vercel/blob/client";

// Browser side of dashboard uploads. Photos are resized (max 1600px) and
// converted to WebP before upload, so they stay fast and pass the SEO
// "modern images" rule. Videos upload as they are.

export interface Uploaded { src: string; w?: number; h?: number }

let mode: Promise<"blob" | "local" | "none"> | undefined;
const getMode = () => (mode ??= fetch("/api/admin/upload").then((r) => r.json()).then((j) => j.mode));

async function toWebp(file: File, max = 1600): Promise<{ file: File; w: number; h: number }> {
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    const bmp = await createImageBitmap(file).catch(() => null);
    return { file, w: bmp?.width ?? 0, h: bmp?.height ?? 0 };
  }
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Could not convert image."))), "image/webp", 0.82));
  const name = file.name.replace(/\.[a-z0-9]+$/i, "") + ".webp";
  return { file: new File([blob], name, { type: "image/webp" }), w, h };
}

export async function uploadFile(input: File): Promise<Uploaded> {
  const isImage = input.type.startsWith("image/");
  const { file, w, h } = isImage ? await toWebp(input) : { file: input, w: undefined, h: undefined };
  const m = await getMode();
  if (m === "none") throw new Error("File storage is not set up yet. Ask your developer to add Vercel Blob.");
  if (m === "blob") {
    const res = await upload(`techschool/${file.name}`, file, { access: "public", handleUploadUrl: "/api/admin/upload" });
    return { src: res.url, w, h };
  }
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "Upload failed.");
  return { src: j.url, w, h };
}

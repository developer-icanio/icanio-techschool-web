import "server-only";
import { enc, presign } from "./sigv4";

// Cloudflare R2 (S3-compatible) for dashboard uploads. The server only signs
// a short-lived upload link (AWS Signature V4, query-string form); the
// browser PUTs the file straight to R2, so large videos never pass through
// Vercel's 4.5 MB request limit. Files are served from the bucket's public
// URL (R2_PUBLIC_URL: an r2.dev address or a custom domain).

export const r2Configured = () =>
  Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && process.env.R2_PUBLIC_URL);

/** A 10-minute upload link for one object, locked to its content type. */
export function r2UploadUrl(key: string, contentType: string) {
  const account = process.env.R2_ACCOUNT_ID!;
  const bucket = process.env.R2_BUCKET!;
  const path = `/${enc(bucket)}/${key.split("/").map(enc).join("/")}`;
  const uploadUrl = presign({
    method: "PUT",
    host: `${account}.r2.cloudflarestorage.com`,
    path,
    region: "auto",
    service: "s3",
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    expires: 600,
    headers: { "content-type": contentType },
  });
  const publicUrl = `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key.split("/").map(enc).join("/")}`;
  return { uploadUrl, publicUrl };
}

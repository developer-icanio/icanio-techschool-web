import "server-only";
import { createHash, createHmac } from "node:crypto";

// Cloudflare R2 (S3-compatible) for dashboard uploads. The server only signs
// a short-lived upload link (AWS Signature V4, query-string form); the
// browser PUTs the file straight to R2, so large videos never pass through
// Vercel's 4.5 MB request limit. Files are served from the bucket's public
// URL (R2_PUBLIC_URL: an r2.dev address or a custom domain).

export const r2Configured = () =>
  Boolean(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && process.env.R2_PUBLIC_URL);

const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data).digest();
const sha256 = (data: string) => createHash("sha256").update(data).digest("hex");

/** SigV4 presigned URL (query auth). Exported for the test vector in scripts. */
export function presign(o: {
  method: string;
  host: string;
  path: string; // already URI-encoded
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
  expires: number;
  headers?: Record<string, string>; // signed, besides host
  now?: Date;
}) {
  const amzDate = (o.now ?? new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${o.region}/${o.service}/aws4_request`;
  const headers: Record<string, string> = { host: o.host, ...Object.fromEntries(Object.entries(o.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v.trim()])) };
  const signed = Object.keys(headers).sort();
  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${o.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(o.expires),
    "X-Amz-SignedHeaders": signed.join(";"),
  };
  const qs = Object.keys(query).sort().map((k) => `${enc(k)}=${enc(query[k])}`).join("&");
  const canonical = [o.method, o.path, qs, signed.map((k) => `${k}:${headers[k]}\n`).join(""), signed.join(";"), "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n");
  const key = hmac(hmac(hmac(hmac(`AWS4${o.secretAccessKey}`, day), o.region), o.service), "aws4_request");
  const signature = createHmac("sha256", key).update(toSign).digest("hex");
  return `https://${o.host}${o.path}?${qs}&X-Amz-Signature=${signature}`;
}

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

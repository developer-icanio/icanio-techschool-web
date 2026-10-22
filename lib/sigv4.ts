import { createHash, createHmac } from "node:crypto";

// AWS Signature V4 presigned URLs (query-string form), shared by the site
// (lib/r2.ts) and scripts/sync-images-to-r2.mjs. Checked against the AWS
// documentation test vector.

export const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data).digest();
const sha256 = (data: string) => createHash("sha256").update(data).digest("hex");

/** SigV4 presigned URL (query auth). */
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


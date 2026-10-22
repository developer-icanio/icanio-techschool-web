// Copies public/images/** and public/videos/** to Cloudflare R2 under the
// same paths (images/<page-folder>/<file>.webp), so the site can serve them
// from R2_PUBLIC_URL. Files already in R2 with the same size are skipped,
// so it is safe to run again after adding images:
//   node --env-file=.env.local scripts/sync-images-to-r2.mjs
//   node --env-file=.env.local scripts/sync-images-to-r2.mjs --check   # only verify
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";

register("./ts-hooks.mjs", pathToFileURL("./scripts/"));
const { presign, enc } = await import("../lib/sigv4.ts");

const need = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_URL"];
for (const k of need) if (!process.env[k]) throw new Error(`${k} is not set (run with --env-file=.env.local)`);
const CHECK = process.argv.includes("--check");
const host = `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const pub = process.env.R2_PUBLIC_URL.replace(/\/$/, "");
const TYPES = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".avif": "image/avif", ".gif": "image/gif", ".mp4": "video/mp4", ".webm": "video/webm" };
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = ["public/images", "public/videos"].filter((d) => fs.existsSync(d)).flatMap(walk).filter((f) => TYPES[path.extname(f).toLowerCase()]);

const urlFor = (key, method, headers) =>
  presign({ method, host, path: `/${enc(process.env.R2_BUCKET)}/${key.split("/").map(enc).join("/")}`, region: "auto", service: "s3", accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY, expires: 900, headers });

async function one(file) {
  const key = path.relative("public", file).split(path.sep).join("/");
  const size = fs.statSync(file).size;
  const head = await fetch(urlFor(key, "HEAD"), { method: "HEAD" });
  if (head.ok && Number(head.headers.get("content-length")) === size) return "same";
  if (CHECK) return head.ok ? "different" : "missing";
  const type = TYPES[path.extname(file).toLowerCase()];
  const put = await fetch(urlFor(key, "PUT", { "content-type": type, "cache-control": "public, max-age=31536000, immutable" }), {
    method: "PUT",
    headers: { "content-type": type, "cache-control": "public, max-age=31536000, immutable" },
    body: fs.readFileSync(file),
  });
  if (!put.ok) throw new Error(`${key}: R2 said ${put.status} ${(await put.text()).slice(0, 200)}`);
  // Verify through the public address the site will use.
  const got = await fetch(`${pub}/${key.split("/").map(enc).join("/")}`, { method: "HEAD" });
  if (!got.ok || Number(got.headers.get("content-length")) !== size) throw new Error(`${key}: uploaded but the public URL returned ${got.status}`);
  return "uploaded";
}

const tally = { same: 0, uploaded: 0, missing: 0, different: 0 };
const failed = [];
for (let i = 0; i < files.length; i += 8) {
  const res = await Promise.allSettled(files.slice(i, i + 8).map(one));
  res.forEach((r, j) => (r.status === "fulfilled" ? tally[r.value]++ : failed.push(`${files[i + j]}: ${r.reason.message}`)));
  process.stdout.write(`\r${Math.min(i + 8, files.length)}/${files.length}`);
}
console.log(`\n${files.length} files: ${tally.uploaded} uploaded, ${tally.same} already in R2${CHECK ? `, ${tally.missing} missing, ${tally.different} different` : ""}, ${failed.length} failed`);
if (failed.length) {
  console.log(failed.slice(0, 10).join("\n"));
  process.exit(1);
}

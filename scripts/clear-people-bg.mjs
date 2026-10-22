// Team photo cards (people:*.png from the old site, 1600px with a white
// Afterwards run `node scripts/organize-images.mjs` to file the result into its page folder.
// studio background and a dark fade at the bottom): removes the white
// background with a flood fill from the top and side edges, so the trainers
// slider can show them on the brand blue. White inside the person (a shirt
// collar) is kept because it is not connected to the edge.
// Writes public/images/people/<name>-clear-<hash>.webp and points the
// "people:<file>" image key at it.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = "_reference/uploads/people";
// A pure-white shirt that runs into the white background can't be separated
// by colour: these keep their original photo (needs a proper cut-out).
const SKIP = new Set(["Mariappan-scaled.png"]);
const map = JSON.parse(fs.readFileSync("lib/images.json", "utf8"));
let n = 0;
for (const f of fs.readdirSync(SRC)) {
  const meta = await sharp(path.join(SRC, f)).metadata();
  if (!(meta.width >= 1200 && meta.hasAlpha)) continue; // expert cards only
  if (SKIP.has(f)) {
    const k = `people:${f}`;
    if (map[k]?.src?.includes("-clear-")) {
      if (fs.existsSync("public" + map[k].src)) fs.rmSync("public" + map[k].src);
      const slug = f.toLowerCase().replace(/\.[a-z]+$/, "").replace(/-scaled$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      map[k] = { src: `/images/people/${slug}.webp`, w: 720, h: 764 };
    }
    continue;
  }
  const { data, info } = await sharp(path.join(SRC, f)).resize({ width: 720 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  // Above the shoulders the background is near-white; lower down only
  // almost pure white counts, since shirts there are white with shading.
  const shoulder = Math.round(H * 0.5);
  const white = (p) => {
    const i = p * 4, lo = Math.min(data[i], data[i + 1], data[i + 2]), hi = Math.max(data[i], data[i + 1], data[i + 2]);
    if (p < shoulder * W) return lo > 228 && hi - lo < 18;
    // Beside the shoulders the backdrop is lightly shaded; shirts there sit
    // away from the photo edge, so a slightly looser rule is safe.
    if (p < Math.round(H * 0.7) * W) return lo > 238 && hi - lo < 12;
    return lo > 249;
  };
  const seen = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x);
  const stopY = H;
  for (let y = 0; y < stopY; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    if (!white(p)) continue;
    data[p * 4 + 3] = 0;
    const x = p % W;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (p >= W) stack.push(p - W);
    if (p + W < stopY * W) stack.push(p + W);
  }
  // Defringe: light pixels on the cut edge (white blended into hair) are
  // removed over a few passes, then the last ring is softened.
  for (let pass = 0; pass < 5; pass++) {
    const clear = [];
    for (let p = 0; p < W * H; p++) {
      if (!data[p * 4 + 3] || p >= shoulder * W * 1.6) continue;
      const x = p % W;
      const nb = [p - 1, p + 1, p - W, p + W].filter((q) => q >= 0 && q < W * H && Math.abs((q % W) - x) <= 1);
      if (nb.some((q) => data[q * 4 + 3] === 0) && Math.min(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]) > 160) clear.push(p);
    }
    for (const p of clear) data[p * 4 + 3] = 0;
  }
  for (let p = 0; p < W * H; p++) {
    if (!data[p * 4 + 3]) continue;
    const x = p % W;
    const nb = [p - 1, p + 1, p - W, p + W].filter((q) => q >= 0 && q < W * H && Math.abs((q % W) - x) <= 1);
    if (nb.some((q) => data[q * 4 + 3] === 0)) data[p * 4 + 3] = 170;
  }
  const buf = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 82, alphaQuality: 90 }).toBuffer();
  const base = f.toLowerCase().replace(/\.[a-z]+$/, "").replace(/-scaled$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const name = `/images/people/${base}-clear-${createHash("sha1").update(buf).digest("hex").slice(0, 8)}.webp`;
  const key = `people:${f}`;
  if (map[key]?.src?.includes("-clear-") && fs.existsSync("public" + map[key].src)) fs.rmSync("public" + map[key].src);
  fs.writeFileSync("public" + name, buf);
  map[key] = { src: name, w: W, h: H };
  n++;
}
fs.writeFileSync("lib/images.json", JSON.stringify(map, null, 1));
console.log(n, "team photos cleared");

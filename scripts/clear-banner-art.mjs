// Hero banners: the artwork sits on its own canvas (white or pale grey on
// Afterwards run `node scripts/organize-images.mjs` to file the result into its page folder.
// light banners, a dark navy/teal/purple gradient on the track banners).
// This removes that canvas with a flood fill from the edges, so colours
// inside the subject (a white shirt, a navy jacket) are kept, and trims to
// the subject, so the hero can place it straight on the brand-blue background. Writes <name>-art-clear.webp
// and records it as `artClear` in lib/images.json.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

const SRC = "_reference/team-images";
const map = JSON.parse(fs.readFileSync("lib/images.json", "utf8"));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

for (const file of walk(SRC)) {
  const key = "ts:" + path.relative(SRC, file).split(path.sep).map((p) => p.trim()).join("/");
  const entry = map[key];
  if (!entry?.art) continue;
  const light = entry.tone === "light";
  const meta = await sharp(file).metadata();
  const from = Math.round(meta.width * 0.42);
  const { data, info } = await sharp(file).extract({ left: from, top: 0, width: meta.width - from, height: meta.height }).resize({ width: 1600, withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const at = (x, y) => (y * W + x) * 4;
  // Canvas colour: median of the border pixels.
  const border = [];
  for (let x = 0; x < W; x += 4) border.push(at(x, 0), at(x, H - 1));
  for (let y = 0; y < H; y += 4) border.push(at(0, y), at(W - 1, y));
  const med = [0, 1, 2].map((c) => border.map((i) => data[i + c]).sort((a, b) => a - b)[border.length >> 1]);
  // Light canvas: pale pixels near the border colour. Dark canvas: a smooth
  // gradient, so a pixel joins when it is close to the neighbour it was
  // reached from (illustration edges are sharp) and not far off the border colour.
  const near = (i, j, t) => Math.abs(data[i] - data[j]) <= t && Math.abs(data[i + 1] - data[j + 1]) <= t && Math.abs(data[i + 2] - data[j + 2]) <= t;
  const isCanvas = (i, from) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = Math.hypot(r - med[0], g - med[1], b - med[2]);
    if (light) return d < 34 && Math.min(r, g, b) > 200 && Math.max(r, g, b) - Math.min(r, g, b) < 24;
    return d < 95 && (from < 0 || near(i, from, 2));
  };
  const seen = new Uint8Array(W * H);
  // Stack of [pixel, pixel it was reached from] (only alpha changes, so
  // colours compare against the original pixels).
  const orig = Buffer.from(data);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, -1, (H - 1) * W + x, -1);
  for (let y = 0; y < H; y++) stack.push(y * W, -1, y * W + W - 1, -1);
  while (stack.length) {
    const from = stack.pop(), p = stack.pop();
    if (seen[p] === 1) continue;
    if (!isCanvas(p * 4, from < 0 ? -1 : from * 4)) { seen[p] = 2; continue; }
    seen[p] = 1;
    data[p * 4 + 3] = 0;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) stack.push(p - 1, p);
    if (x < W - 1) stack.push(p + 1, p);
    if (y > 0) stack.push(p - W, p);
    if (y < H - 1) stack.push(p + W, p);
  }
  // Enclosed canvas (e.g. the holes inside a loop): large smooth patches
  // close to the canvas colour are canvas too. Drawn shapes (clothes, hair)
  // are much smaller, so they stay.
  if (!light) {
    const lab = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) {
      const i = p * 4;
      if (lab[p] || !data[i + 3] || Math.hypot(data[i] - med[0], data[i + 1] - med[1], data[i + 2] - med[2]) > 60) continue;
      const comp = [p]; lab[p] = 1;
      for (let k = 0; k < comp.length; k++) {
        const q = comp[k], x = q % W;
        for (const r of [q - 1, q + 1, q - W, q + W]) {
          if (r < 0 || r >= W * H || Math.abs((r % W) - x) > 1 || lab[r] || !data[r * 4 + 3]) continue;
          if (!near(r * 4, q * 4, 2) || Math.hypot(data[r * 4] - med[0], data[r * 4 + 1] - med[1], data[r * 4 + 2] - med[2]) > 60) continue;
          lab[r] = 1; comp.push(r);
        }
      }
      if (comp.length > W * H * 0.012) for (const q of comp) { data[q * 4 + 3] = 0; seen[q] = 1; }
    }
  }
  // Specks: small islands left over from background decoration (dots, faint
  // skylines, edge strips) are removed, so the trim fits the subject.
  {
    const lab = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) {
      if (!data[p * 4 + 3] || lab[p]) continue;
      const comp = [p]; lab[p] = 1;
      for (let k = 0; k < comp.length; k++) {
        const q = comp[k], x = q % W;
        for (const r of [q - 1, q + 1, q - W, q + W]) if (r >= 0 && r < W * H && Math.abs((r % W) - x) <= 1 && data[r * 4 + 3] && !lab[r]) { lab[r] = 1; comp.push(r); }
      }
      // Also drop thin lines and strips that touch the canvas edge (cut-off
      // background decoration); the subject itself is far larger.
      const edge = comp.some((q) => { const x = q % W, y = (q / W) | 0; return x === 0 || y === 0 || x === W - 1 || y === H - 1; });
      if (comp.length < W * H * 0.0015 || (edge && comp.length < W * H * 0.03)) for (const q of comp) data[q * 4 + 3] = 0;
    }
  }
  // Defringe: edge pixels that are still mostly canvas colour (the blend left
  // by anti-aliasing) would draw a dark or white outline on the blue, so the
  // outermost rings close to the canvas colour are cleared.
  for (let pass = 0; pass < (light ? 2 : 1); pass++) {
    const clear = [];
    for (let p = 0; p < W * H; p++) {
      if (!data[p * 4 + 3]) continue;
      const x = p % W;
      const out = [p - 1, p + 1, p - W, p + W].some((q) => q < 0 || q >= W * H || Math.abs((q % W) - x) > 1 || !data[q * 4 + 3]);
      if (out && Math.hypot(data[p * 4] - med[0], data[p * 4 + 1] - med[1], data[p * 4 + 2] - med[2]) < (light ? 40 : 34)) clear.push(p);
    }
    for (const p of clear) data[p * 4 + 3] = 0;
  }
  // Soften the cut edge by one pixel.
  for (let p = 0; p < W * H; p++) if (seen[p] === 2 && data[p * 4 + 3] === 255) {
    const x = p % W;
    const n = [p - 1, p + 1, p - W, p + W].filter((q) => q >= 0 && q < W * H && Math.abs((q % W) - x) <= 1 && data[q * 4 + 3] === 0).length;
    if (n) data[p * 4 + 3] = 170;
  }
  // Old cut-outs of this banner are replaced; the new file name carries a
  // content hash so browsers and the image optimiser never serve a stale copy.
  const base = entry.art.src.replace(/-art\.webp$/, "-art-clear");
  if (entry.artClear?.src && fs.existsSync(path.join("public", entry.artClear.src))) fs.rmSync(path.join("public", entry.artClear.src));
  const save = async (img) => {
    const buf = await img.webp({ quality: 82, alphaQuality: 90 }).toBuffer({ resolveWithObject: true });
    const name = `${base}-${createHash("sha1").update(buf.data).digest("hex").slice(0, 8)}.webp`;
    fs.writeFileSync(path.join("public", name), buf.data);
    return { name, width: buf.info.width, height: buf.info.height };
  };
  // A rectangular photo on a white canvas: keep the whole photo as a clean
  // rectangle with rounded corners instead of nibbling its pale edges.
  let x0 = W, y0 = H, x1 = 0, y1 = 0, solid = 0;
  for (let p = 0; p < W * H; p++) if (data[p * 4 + 3]) { const x = p % W, y = (p / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; solid++; }
  const box = (x1 - x0 + 1) * (y1 - y0 + 1);
  if (light && solid / box > 0.8) {
    // Shrink to the rows and columns that are fully photo (skips nibbled edges).
    const full = (x, y) => orig[(y * W + x) * 4 + 3] && !isCanvas((y * W + x) * 4, -1);
    const colOk = (x) => { let n = 0; for (let y = y0; y <= y1; y++) if (full(x, y)) n++; return n > (y1 - y0) * 0.6; };
    const rowOk = (y) => { let n = 0; for (let x = x0; x <= x1; x++) if (full(x, y)) n++; return n > (x1 - x0) * 0.6; };
    while (x0 < x1 && !colOk(x0)) x0++;
    while (x1 > x0 && !colOk(x1)) x1--;
    while (y0 < y1 && !rowOk(y0)) y0++;
    while (y1 > y0 && !rowOk(y1)) y1--;
    const w = x1 - x0 + 1, h = y1 - y0 + 1, r = Math.round(Math.min(w, h) * 0.04);
    const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`);
    const photo = await save(sharp(await sharp(orig, { raw: { width: W, height: H, channels: 4 } }).extract({ left: x0, top: y0, width: w, height: h }).png().toBuffer()).composite([{ input: mask, blend: "dest-in" }]));
    entry.artClear = { src: photo.name, w: photo.width, h: photo.height };
    console.log(key, "->", photo.name, `${photo.width}x${photo.height} (photo)`);
    continue;
  }
  const out = await save(sharp(await sharp(data, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer()));
  entry.artClear = { src: out.name, w: out.width, h: out.height };
  console.log(key, "->", out.name, `${out.width}x${out.height}`);
}
fs.writeFileSync("lib/images.json", JSON.stringify(map, null, 1));

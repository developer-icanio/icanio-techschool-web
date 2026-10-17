// Imports the design team's images (_reference/team-images/<Folder>/<File>.png)
// into public/images/ts/*.webp and registers them in lib/images.json under
// "ts:<Folder>/<File>.png". Hero banners (very wide) also get a "tone"
// (dark/light) measured from their left side, where the heading sits.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = process.argv[2] ?? "_reference/team-images";
const OUT = "public/images/ts";
fs.mkdirSync(OUT, { recursive: true });
const map = JSON.parse(fs.readFileSync("lib/images.json", "utf8"));
const slug = (s) => s.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/**
 * Cut-outs (transparent PNGs of a person) whose arm or body runs off the
 * left or right edge of the canvas. Those pixels don't exist, so the page
 * fades that side out softly instead of ending on a hard line.
 */
export async function cutSides(file) {
  const meta = await sharp(file).metadata();
  if (!meta.hasAlpha) return [];
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const opaque = (x, y) => data[(y * W + x) * C + 3] > 128;
  let top = 0;
  for (let x = 0; x < W; x++) if (opaque(x, 0)) top++;
  if (top > W * 0.02) return []; // a normal rectangular photo
  const count = (x) => { let n = 0; for (let y = 0; y < H; y++) if (opaque(x, y)) n++; return n; };
  return [count(0) > 6 && "left", count(W - 1) > 6 && "right"].filter(Boolean);
}

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

let n = 0;
if (import.meta.url === `file://${path.resolve(process.argv[1] ?? "")}`) for (const file of walk(SRC)) {
  if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
  const rel = path.relative(SRC, file).split(path.sep).map((p) => p.trim()).join("/");
  const meta = await sharp(file).metadata();
  const banner = meta.width / meta.height >= 2.2;
  const name = `${slug(rel.replace(/\//g, "-"))}.webp`;
  const info = await sharp(file).resize({ width: banner ? 2400 : 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(OUT, name));
  const entry = { src: `/images/ts/${name}`, w: info.width, h: info.height };
  const cut = await cutSides(file);
  if (cut.length) entry.cut = cut;
  if (banner) {
    const left = await sharp(file).extract({ left: 0, top: 0, width: Math.round(meta.width * 0.4), height: meta.height }).stats();
    const [r, g, b] = left.channels.map((c) => c.mean);
    entry.tone = 0.2126 * r + 0.7152 * g + 0.0722 * b < 140 ? "dark" : "light";
    // Colour of the banner's left edge, used behind the heading so the two blend.
    const edge = await sharp(file).extract({ left: 0, top: 0, width: Math.max(8, Math.round(meta.width * 0.04)), height: meta.height }).stats();
    entry.bg = "#" + edge.channels.slice(0, 3).map((c) => Math.round(c.mean).toString(16).padStart(2, "0")).join("");
    // The artwork half on its own, so the hero can place it beside the text
    // without zooming the whole banner (which pushed art under the heading).
    const from = Math.round(meta.width * 0.42);
    const artName = name.replace(/\.webp$/, "-art.webp");
    const art = await sharp(file).extract({ left: from, top: 0, width: meta.width - from, height: meta.height }).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(OUT, artName));
    entry.art = { src: `/images/ts/${artName}`, w: art.width, h: art.height };
  }
  map[`ts:${rel}`] = entry;
  n++;
}
if (n) {
  fs.writeFileSync("lib/images.json", JSON.stringify(map, null, 1));
  console.log(n, "team images imported");
}

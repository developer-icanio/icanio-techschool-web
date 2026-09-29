// Converts the WordPress uploads (downloaded into _reference/uploads) into
// public/images/*.webp and writes lib/images.json: { originalBasename: { src, w, h } }.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = process.argv[2] ?? "_reference/uploads";
const OUT = "public/images";
const map = {};

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const slug = (s) => s.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

for (const file of walk(SRC)) {
  const base = path.basename(file);
  const ext = path.extname(base).toLowerCase();
  if (ext === ".mp4") {
    fs.copyFileSync(file, path.join("public/videos", base.toLowerCase()));
    map[base] = { src: `/videos/${base.toLowerCase()}` };
    continue;
  }
  if (ext === ".svg") {
    const name = `${slug(base)}.svg`;
    fs.copyFileSync(file, path.join(OUT, name));
    map[base] = { src: `/images/${name}` };
    continue;
  }
  let name = `${slug(base)}.webp`;
  if (Object.values(map).some((m) => m.src === `/images/${name}`)) name = `${slug(base)}-${slug(path.basename(path.dirname(file)))}.webp`;
  try {
    const img = sharp(file, { failOn: "none" }).rotate().resize({ width: 1600, withoutEnlargement: true });
    const info = await img.webp({ quality: 78 }).toFile(path.join(OUT, name));
    map[base] = { src: `/images/${name}`, w: info.width, h: info.height };
  } catch (e) {
    console.warn("skip", file, e.message);
  }
}
fs.writeFileSync("lib/images.json", JSON.stringify(map, null, 1));
console.log(Object.keys(map).length, "assets");

// Organises every image the site uses into SEO-friendly folders and names:
//   public/images/<page-folder>/<keyword>-<what-is-in-the-picture>.webp
// - An image used on one page goes in that page's folder (home, about,
//   frontend-development-internship, ...) and its name starts with the
//   page's focus keyword.
// - Images shared by several pages go in a named shared folder: students,
//   college-logos, student-videos, reviews, trainers, icons, shared.
// Page content refers to images by key (lib/images.json), so only the files
// move and the registry is rewritten; no page needs editing. Safe to run
// again (after importing new images): files already in place are kept.
//   node scripts/organize-images.mjs          # do it
//   node scripts/organize-images.mjs --dry    # only print the plan
import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const PUB = "public";
const map = JSON.parse(fs.readFileSync("lib/images.json", "utf8"));
const slug = (s) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const STOP = new Set("a an the and or of to in on for with by at from is are be as it its this that your you our we us at icanio tech school technologies".split(" "));
const keyOf = (v) => (map[v] ? v : map[v?.split?.("/").pop()] ? v.split("/").pop() : null);
const words = (s, max) => slug(s).split("-").filter((w) => w && !STOP.has(w)).slice(0, max);

// 1. Who uses each image, with the best description we have ------------------
const use = new Map(); // key -> { pages:Set, kw, alt, group }
const add = (k, page, kw, alt, group) => {
  const key = keyOf(k);
  if (!key) return;
  const u = use.get(key) ?? { pages: new Set(), kw, alt, group };
  u.pages.add(page);
  if (!u.alt && alt) u.alt = alt;
  if (group && !u.group) u.group = group;
  use.set(key, u);
};
function walk(o, page, kw) {
  if (Array.isArray(o)) return o.forEach((x) => walk(x, page, kw));
  if (!o || typeof o !== "object") return;
  if (typeof o.src === "string") add(o.src, page, kw, o.alt ?? o.caption);
  if (typeof o.portrait === "string") add(o.portrait, page, kw, o.alt);
  if (typeof o.icon === "string") add(o.icon, page, kw, `${o.title ?? ""} icon`, "icons");
  if (typeof o.logo === "string" && o.role !== undefined) add(o.logo, page, kw, `${o.name} logo`, "icons");
  for (const v of Object.values(o)) if (v && typeof v === "object") walk(v, page, kw);
}
const folderOf = (p) => (p.path === "/" ? "home" : p.path.split("/").pop());
for (const f of fs.readdirSync("content/pages", { recursive: true }).filter((f) => f.endsWith(".json"))) {
  const p = JSON.parse(fs.readFileSync(path.join("content/pages", f), "utf8"));
  walk({ hero: p.hero, sections: p.sections }, folderOf(p), p.seo.focusKeyword);
}
// Shared libraries (also what the dashboard libraries were seeded from).
const shared = (n) => JSON.parse(fs.readFileSync(`content/shared/${n}.json`, "utf8"));
for (const s of shared("stories")) add(s.photo, "students", "", `${s.name} ${s.track} intern`, "students");
for (const c of shared("partners")) add(c.logo, "college-logos", "", `${c.name} logo`, "college-logos");
for (const t of shared("testimonials")) {
  add(t.photo, "student-videos", "", `${t.name} ${t.role} video testimonial`, "student-videos");
  add(t.video, "student-videos", "", `${t.name} ${t.role} video testimonial`, "student-videos");
}
for (const r of shared("reviews")) if (r.photo) add(r.photo, "reviews", "", `${r.name} ${r.track} review`, "reviews");
for (const e of shared("experts")) if (e.photo) add(e.photo, "trainers", "", `${e.name} ${e.role}`, "trainers");

// 2. Plan a destination for every file ----------------------------------------
const taken = new Set();
const plan = [];
for (const [key, u] of use) {
  const entry = map[key];
  if (!entry?.src?.startsWith("/images/")) continue;
  const pages = [...u.pages];
  const folder = u.group ?? (pages.length === 1 ? pages[0] : "shared");
  // Name: the page keyword first (single-page images), then what the picture shows.
  const kw = pages.length === 1 && !u.group ? words(u.kw, 6) : [];
  const desc = words(u.alt || key.replace(/^[a-z]+:/, "").replace(/\.[a-z0-9]+$/i, ""), 7).filter((w) => !kw.includes(w));
  let base = [...kw, ...desc].slice(0, 9).join("-") || "image";
  const ext = path.extname(entry.src) || ".webp";
  let name = `${folder}/${base}`;
  for (let i = 2; taken.has(name); i++) name = `${folder}/${base}-${i}`;
  taken.add(name);
  plan.push({ key, from: entry.src, to: `/images/${name}${ext}`, variants: ["art", "artClear"].filter((v) => entry[v]?.src) });
}

// 3. Move the files and rewrite the registry ---------------------------------
const moved = new Map(); // old src -> new src (one file can serve several keys)
let n = 0;
const move = (from, to) => {
  if (from === to) return to;
  if (moved.has(from)) return moved.get(from);
  const a = path.join(PUB, from), b = path.join(PUB, to);
  if (!fs.existsSync(a)) { console.warn("missing file, skipped:", from); return from; }
  if (!DRY) {
    fs.mkdirSync(path.dirname(b), { recursive: true });
    fs.renameSync(a, b);
  }
  moved.set(from, to);
  n++;
  return to;
};
for (const p of plan) {
  const entry = map[p.key];
  entry.src = move(p.from, p.to);
  for (const v of p.variants) entry[v].src = move(entry[v].src, p.to.replace(/\.[a-z0-9]+$/, `-${v === "art" ? "art" : "art-clear"}.webp`));
  // Keys whose file moved for another key follow it.
}
for (const e of Object.values(map)) if (moved.has(e.src)) e.src = moved.get(e.src);
// Registered images no page uses (the old WordPress media library, kept so
// editors can still pick them): out of the root, into library/.
const KEEP = new Set(["/images/group-16117.webp", "/images/hero-banner.webp"]); // logo, hero texture
for (const e of Object.values(map)) {
  const loose = e.src?.split("/").length === 3 || e.src?.startsWith("/images/ts/") || e.src?.startsWith("/images/people/");
  if (!e.src?.startsWith("/images/") || !loose || KEEP.has(e.src)) continue;
  e.src = move(e.src, `/images/library/${path.basename(e.src)}`);
  for (const v of ["art", "artClear"]) if (e[v]?.src && !e[v].src.startsWith("/images/library/")) e[v].src = move(e[v].src, `/images/library/${path.basename(e[v].src)}`);
}
if (DRY) {
  for (const p of plan.slice(0, 40)) console.log(p.from, "->", p.to);
  console.log(`${plan.length} images planned (dry run, nothing moved)`);
} else {
  fs.writeFileSync("lib/images.json", JSON.stringify(map, null, 1));
  console.log(`${n} files moved into page folders; lib/images.json updated`);
}

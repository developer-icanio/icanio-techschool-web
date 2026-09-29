import fs from "node:fs";
import path from "node:path";
import type { Block, PageContent } from "./types";

// Pages live as JSON under content/pages (any folder depth). Read with fs so
// edits show up without a rebuild in dev and so scripts/seo-audit.mjs can
// load them under plain Node.

const ROOT = path.join(process.cwd(), "content");

const BLOCK_TYPES = new Set<Block["type"]>([
  "prose", "cards", "steps", "phases", "tools", "table", "checklist", "stats",
  "partners", "testimonials", "stories", "gallery", "links", "form",
]);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".json") ? [path.join(dir, e.name)] : [],
  );
}

function check(p: PageContent, file: string) {
  const where = path.relative(ROOT, file);
  const need = (ok: unknown, what: string) => {
    if (!ok) throw new Error(`${where}: ${what}`);
  };
  need(p.path?.startsWith("/"), "path must start with /");
  need(p.seo?.metaTitle && p.seo.metaDescription && p.seo.focusKeyword, "seo.metaTitle, metaDescription and focusKeyword are required");
  need(p.hero?.title && p.hero.image?.src, "hero.title and hero.image are required");
  need(p.answer?.question && p.answer.answer, "answer is required");
  need(Array.isArray(p.sections), "sections must be an array");
  p.sections.forEach((s, i) => need(BLOCK_TYPES.has(s.type), `sections[${i}] has unknown type "${s.type}"`));
  need(Array.isArray(p.faqs) && Array.isArray(p.takeaways) && Array.isArray(p.conclusion) && Array.isArray(p.references), "faqs, takeaways, conclusion and references are required");
}

let cache: PageContent[] | undefined;

export function allPages(): PageContent[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  cache = walk(path.join(ROOT, "pages"))
    .flatMap((file) => {
      try {
        const p = JSON.parse(fs.readFileSync(file, "utf8")) as PageContent;
        check(p, file);
        return [p];
      } catch (e) {
        // A broken file fails the production build; in dev it is skipped so
        // one page being edited doesn't take the whole site down.
        if (process.env.NODE_ENV === "production") throw e;
        console.warn(`[content] skipping ${path.relative(ROOT, file)}: ${(e as Error).message}`);
        return [];
      }
    })
    .sort((a, b) => a.path.localeCompare(b.path));
  return cache;
}

export const getPage = (p: string) => allPages().find((x) => x.path === (p.replace(/\/$/, "") || "/"));

export function pagesUnder(parent: string) {
  return allPages().filter((p) => p.parent === parent);
}

export function breadcrumbsOf(p: PageContent): { name: string; href: string }[] {
  const trail: { name: string; href: string }[] = [];
  let cur: PageContent | undefined = p;
  while (cur) {
    trail.unshift({ name: cur.label, href: cur.path });
    cur = cur.parent ? getPage(cur.parent) : undefined;
  }
  if (p.path !== "/") trail.unshift({ name: "Home", href: "/" });
  return trail;
}

// Shared data -----------------------------------------------------------

export interface Partner { name: string; city: string; logo: string }
export interface Story { name: string; duration: string; track: string; degree: string; college: string; photo: string; text: string }
export interface Testimonial { name: string; role: string; photo: string; video: string; quote: string }

const shared = <T,>(name: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, "shared", `${name}.json`), "utf8")) as T;

export const partners = () => shared<Partner[]>("partners");
export const stories = () => shared<Story[]>("stories");
export const testimonials = () => shared<Testimonial[]>("testimonials");

export function storiesFor(track?: string, limit?: number) {
  const all = stories();
  const t = track?.toLowerCase();
  const hit = t ? all.filter((s) => s.track.toLowerCase().includes(t) || t.includes(s.track.toLowerCase())) : [];
  // Fall back to the most recent completions so the block is never empty.
  const list = hit.length ? [...hit, ...all.filter((s) => !hit.includes(s))] : all;
  return list.slice(0, limit ?? 6);
}

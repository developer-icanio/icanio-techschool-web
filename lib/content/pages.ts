import fs from "node:fs";
import path from "node:path";
import type { Block, PageContent } from "./types";

// Pages live as JSON under content/pages (any folder depth). Read with fs so
// edits show up without a rebuild in dev and so scripts/seo-audit.mjs can
// load them under plain Node.

const ROOT = path.join(process.cwd(), "content");

const BLOCK_TYPES = new Set<Block["type"]>([
  "prose", "cards", "steps", "phases", "tools", "table", "checklist", "stats",
  "partners", "testimonials", "stories", "gallery", "links", "form", "batches", "reviews", "experts", "events",
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

// Live edits from the admin dashboard, loaded by ensureContent() (lib/content/store.ts).
// When set, they replace the matching file (by path) and the shared JSON libraries.
export const live: {
  pages?: Map<string, PageContent>;
  library?: { video: Testimonial[]; student: Story[]; college: Partner[]; review: Review[]; expert: Expert[] };
} = {};

export function allPages(): PageContent[] {
  const files = filePages();
  if (!live.pages?.size) return files;
  return files.map((p) => upgrade(live.pages!.get(p.path) ?? p));
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * Pages saved in the dashboard before the "events" section existed kept
 * their event list as a steps section (id "events") with the date written in
 * the text ("Session: 15 Sep 2026, 10:00 am to 12:30 pm."). This turns it
 * into a dated events section, so past events hide on their own. A page
 * saved again in the dashboard stores the new form and skips this.
 */
function upgrade(p: PageContent): PageContent {
  const i = p.sections.findIndex((s) => s.type === "steps" && s.id === "events");
  if (i < 0) return p;
  const old = p.sections[i] as Extract<Block, { type: "steps" }>;
  const items = old.items.flatMap((s) => {
    const m = s.body.match(/Session:\s*(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})(?:,\s*([^.]+))?/);
    const mon = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1;
    if (!m || mon < 0) return [];
    const date = `${m[3]}-${String(mon + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return [{ date, title: s.title, body: s.body.replace(/\s*Session:.*$/, "").trim(), time: m[4]?.trim() }];
  });
  const sections = [...p.sections];
  sections[i] = { type: "events", id: "events", tone: old.tone, eyebrow: "Upcoming events", heading: old.heading.replace(/our recent events/i, "Upcoming events"), intro: old.intro?.replace(/\s*These were our most recent[^.]*\./i, "").trim() || undefined, items };
  return { ...p, sections };
}

/** The JSON files only, without dashboard edits. */
export function filePages(): PageContent[] {
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

export interface Partner { id: string; name: string; city: string; logo: string }
export interface Story { id: string; name: string; duration: string; track: string; degree: string; college: string; photo: string; text: string }
export interface Testimonial { id: string; name: string; role: string; photo: string; video: string; quote: string }
export interface Review { id: string; name: string; college: string; track: string; photo?: string; quote: string }
export interface Expert { id: string; name: string; role: string; bio: string; photo?: string }

export const slugId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** content/shared/*.json, the seed for the dashboard libraries. Ids are derived from names. */
export function sharedFile<T extends { id: string }>(name: string, prefix: string): T[] {
  const rows = JSON.parse(fs.readFileSync(path.join(ROOT, "shared", `${name}.json`), "utf8")) as Omit<T, "id">[];
  return rows.map((r) => ({ id: `${prefix}-${slugId((r as unknown as { name: string }).name)}`, ...r }) as T);
}

export const partners = () => live.library?.college ?? sharedFile<Partner>("partners", "college");
export const stories = () => live.library?.student ?? sharedFile<Story>("stories", "student");
/** Picked videos in their chosen order; all of them when none are picked (or none of the picks still exist). */
export const testimonials = (ids?: string[]) => {
  const all = live.library?.video ?? sharedFile<Testimonial>("testimonials", "video");
  const picked = (ids ?? []).map((id) => all.find((t) => t.id === id)).filter(Boolean) as Testimonial[];
  return picked.length ? picked : all;
};

/** Picked items in their chosen order; all of them when none are picked (or none of the picks still exist). */
function pick<T extends { id: string }>(all: T[], ids?: string[]) {
  const picked = (ids ?? []).map((id) => all.find((t) => t.id === id)).filter(Boolean) as T[];
  return picked.length ? picked : all;
}
export const reviews = (ids?: string[]) => pick(live.library?.review ?? sharedFile<Review>("reviews", "review"), ids);
export const experts = (ids?: string[]) => pick(live.library?.expert ?? sharedFile<Expert>("experts", "expert"), ids);

export function storiesFor(track?: string, limit?: number, ids?: string[]) {
  const all = stories();
  const picked = (ids ?? []).map((id) => all.find((s) => s.id === id)).filter(Boolean) as Story[];
  if (picked.length) return picked.slice(0, limit ?? 99);
  const t = track?.toLowerCase();
  const hit = t ? all.filter((s) => s.track.toLowerCase().includes(t) || t.includes(s.track.toLowerCase())) : [];
  // Fall back to the most recent completions so the block is never empty.
  const list = hit.length ? [...hit, ...all.filter((s) => !hit.includes(s))] : all;
  return list.slice(0, limit ?? 6);
}

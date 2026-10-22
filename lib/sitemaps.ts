import "server-only";
import { allPages, testimonials } from "@/lib/content/pages";
import { imagesOf } from "@/lib/content/seo-document";
import { ensureContent } from "@/lib/content/store";
import type { PageContent } from "@/lib/content/types";
import { asset } from "@/lib/images";
import { SITE } from "@/lib/site";

// Split sitemaps. /sitemap.xml is an index pointing at one sitemap per
// section, plus a video sitemap for the testimonial videos.

export interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: "weekly" | "monthly" | "yearly";
  priority: number;
  images: string[];
}

export interface SitemapGroup {
  name: string;
  title: string;
  match: (p: PageContent) => boolean;
  extra?: { path: string; lastmod: string; priority: number }[];
}

export const GROUPS: SitemapGroup[] = [
  {
    name: "main",
    title: "Home, about, results and contact",
    match: (p) => p.kind === "home" || p.kind === "page",
    extra: [
      { path: "/sitemap", lastmod: "2026-09-29", priority: 0.3 },
      { path: "/privacy-policy", lastmod: "2026-09-29", priority: 0.2 },
    ],
  },
  { name: "internships", title: "Internships", match: (p) => p.kind === "internship" || p.path === "/internships" },
  { name: "programs", title: "Student and college programs", match: (p) => p.kind === "program" || p.kind === "college" || p.path === "/college-programs" },
  { name: "career-guides", title: "Career guides", match: (p) => p.kind === "guide" || p.path === "/career-guides" },
];

export const VIDEO_SITEMAP = "videos";
export const sitemapNames = () => [...GROUPS.map((g) => g.name), VIDEO_SITEMAP];
export const sitemapUrl = (name: string) => `${SITE.url}/sitemaps/${name}.xml`;

const abs = (p: string) => (p.startsWith("http") ? p : `${SITE.url}${p === "/" ? "" : p}`);
const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

function urlOf(p: PageContent): SitemapUrl {
  return {
    loc: abs(p.path),
    lastmod: p.seo.updatedAt,
    changefreq: p.kind === "home" || p.kind === "hub" ? "weekly" : "monthly",
    priority: p.kind === "home" ? 1 : p.kind === "hub" ? 0.9 : p.kind === "internship" || p.kind === "college" ? 0.8 : 0.6,
    // Every image on the page (Google reads up to 1,000 per URL).
    images: [...new Set(imagesOf(p).map((i) => abs(i.src)))],
  };
}

export async function groupUrls(name: string): Promise<SitemapUrl[] | null> {
  const g = GROUPS.find((x) => x.name === name);
  if (!g) return null;
  await ensureContent();
  const pages = allPages().filter((p) => g.match(p)).map(urlOf);
  const extra = (g.extra ?? []).map((e) => ({ loc: abs(e.path), lastmod: e.lastmod, changefreq: "yearly" as const, priority: e.priority, images: [] }));
  return [...pages, ...extra];
}

/** One entry per page that shows video testimonials, listing each video. */
export async function videoEntries() {
  await ensureContent();
  return allPages()
    .map((p) => {
      const blocks = p.sections.filter((b) => b.type === "testimonials");
      if (!blocks.length) return null;
      const vids = [...new Map(blocks.flatMap((b) => testimonials(b.type === "testimonials" ? b.ids : undefined)).map((t) => [t.id, t])).values()];
      return { loc: abs(p.path), lastmod: p.seo.updatedAt, videos: vids };
    })
    .filter(Boolean) as { loc: string; lastmod: string; videos: ReturnType<typeof testimonials> }[];
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n';

export function urlsetXml(urls: SitemapUrl[]) {
  const body = urls
    .map(
      (u) =>
        `<url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority>${u.images
          .map((i) => `<image:image><image:loc>${esc(i)}</image:loc></image:image>`)
          .join("")}</url>`,
    )
    .join("\n");
  return `${XML_HEAD}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`;
}

export function videoXml(entries: Awaited<ReturnType<typeof videoEntries>>) {
  const body = entries
    .map(
      (e) =>
        `<url><loc>${esc(e.loc)}</loc><lastmod>${e.lastmod}</lastmod>${e.videos
          .map(
            (v) =>
              `<video:video><video:thumbnail_loc>${esc(abs(asset(v.photo).src))}</video:thumbnail_loc><video:title>${esc(`${v.name}, ${v.role} at ${SITE.name}`)}</video:title><video:description>${esc(v.quote)}</video:description><video:content_loc>${esc(abs(asset(v.video).src))}</video:content_loc><video:family_friendly>yes</video:family_friendly></video:video>`,
          )
          .join("")}</url>`,
    )
    .join("\n");
  return `${XML_HEAD}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${body}\n</urlset>\n`;
}

export async function indexXml() {
  await ensureContent();
  const pages = allPages();
  const latest = (match: (p: PageContent) => boolean) => pages.filter(match).map((p) => p.seo.updatedAt).sort().at(-1) ?? "2026-09-29";
  const items = [
    ...GROUPS.map((g) => ({ loc: sitemapUrl(g.name), lastmod: latest(g.match) })),
    { loc: sitemapUrl(VIDEO_SITEMAP), lastmod: latest((p) => p.sections.some((b) => b.type === "testimonials")) },
  ];
  return `${XML_HEAD}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.map((i) => `<sitemap><loc>${esc(i.loc)}</loc><lastmod>${i.lastmod}</lastmod></sitemap>`).join("\n")}\n</sitemapindex>\n`;
}

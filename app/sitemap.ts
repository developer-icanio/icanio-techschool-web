import type { MetadataRoute } from "next";
import { allPages } from "@/lib/content/pages";
import { imagesOf } from "@/lib/content/seo-document";
import { SITE } from "@/lib/site";

// Every public page: the 38 content pages plus the standalone ones.
const EXTRA: { path: string; updated: string; priority: number }[] = [
  { path: "/sitemap", updated: "2026-09-29", priority: 0.3 },
  { path: "/privacy-policy", updated: "2026-09-29", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = allPages().map((p) => ({
    url: `${SITE.url}${p.path === "/" ? "" : p.path}`,
    lastModified: p.seo.updatedAt,
    changeFrequency: p.kind === "home" || p.kind === "hub" ? "weekly" : "monthly",
    priority: p.kind === "home" ? 1 : p.kind === "hub" ? 0.9 : p.kind === "internship" || p.kind === "college" ? 0.8 : 0.6,
    images: imagesOf(p).slice(0, 5).map((i) => `${SITE.url}${i.src}`),
  }));
  const extra: MetadataRoute.Sitemap = EXTRA.map((e) => ({ url: `${SITE.url}${e.path}`, lastModified: e.updated, changeFrequency: "yearly", priority: e.priority }));
  return [...pages, ...extra];
}

import "server-only";
import fs from "node:fs";
import path from "node:path";
import { allPages } from "@/lib/content/pages";
import { imagesOf } from "@/lib/content/seo-document";
import { SITE } from "@/lib/site";

// Every image the public site shows, page by page, for the dashboard's Media
// page and its CSV export.

export interface MediaRow {
  page: string;
  pagePath: string;
  keyword: string;
  folder: string;
  file: string;
  url: string;
  alt: string;
  altHasKeyword: boolean;
  w?: number;
  h?: number;
  kb?: number;
}

const sizes = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/images.json"), "utf8")) as Record<string, { src: string; w?: number; h?: number }>;
const bySrc = new Map(Object.values(sizes).map((v) => [v.src, v]));

export function mediaRows(): MediaRow[] {
  return allPages().flatMap((p) => {
    const kw = p.seo.focusKeyword.toLowerCase();
    const seen = new Set<string>();
    return imagesOf(p)
      .filter((i) => !seen.has(i.src) && seen.add(i.src))
      .map((i) => {
        const local = i.src.startsWith("/");
        const parts = local ? i.src.split("/") : new URL(i.src).pathname.split("/");
        let kb: number | undefined;
        try {
          if (local) kb = Math.round(fs.statSync(path.join(process.cwd(), "public", i.src)).size / 1024);
        } catch {}
        const meta = bySrc.get(i.src);
        return {
          page: p.label,
          pagePath: p.path,
          keyword: kw,
          folder: parts.slice(local ? 2 : 1, -1).join("/") || (local ? "(root)" : new URL(i.src).host),
          file: parts.at(-1) ?? "",
          url: local ? `${SITE.url}${i.src}` : i.src,
          alt: i.alt,
          altHasKeyword: i.alt.toLowerCase().includes(kw),
          w: meta?.w,
          h: meta?.h,
          kb,
        };
      });
  });
}

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
export const mediaCsv = (rows: MediaRow[]) =>
  [["Page", "Page URL", "Focus keyword", "Folder", "File name", "Image URL", "Alt text", "Alt has keyword", "Width", "Height", "Size (KB)"].map(cell).join(","),
   ...rows.map((r) => [r.page, `${SITE.url}${r.pagePath === "/" ? "" : r.pagePath}`, r.keyword, r.folder, r.file, r.url, r.alt, r.altHasKeyword ? "yes" : "no", r.w, r.h, r.kb].map(cell).join(","))].join("\n");

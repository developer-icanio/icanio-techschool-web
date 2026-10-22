import fs from "node:fs";
import path from "node:path";

// Original WordPress filenames -> optimised /images/*.webp (built by scripts/build-images.mjs).
type Asset = {
  src: string;
  w?: number;
  h?: number;
  tone?: "dark" | "light";
  bg?: string;
  art?: { src: string; w: number; h: number };
  /** The artwork with its own canvas removed (scripts/clear-banner-art.mjs), for the brand-blue hero. */
  artClear?: { src: string; w: number; h: number };
  /** Cut-out photo whose subject runs off this edge of the file (faded on the page). */
  cut?: ("left" | "right")[];
};
let map: Record<string, Asset> | undefined;

function assets() {
  // Cached in production; re-read in development so newly imported images show up.
  if (!map || process.env.NODE_ENV !== "production") map = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/images.json"), "utf8")) as Record<string, Asset>;
  return map;
}

const strip = (s: string) => s.replace(/-\d+x\d+(\.[a-z]+)$/i, "$1");

/**
 * Site images and videos are served from Cloudflare R2 (copied there by
 * scripts/sync-images-to-r2.mjs) when R2_PUBLIC_URL is set. The files in
 * public/ stay as the source and as a fallback: IMAGES_FROM_R2=0 switches
 * the site back to them. Changing R2_PUBLIC_URL (for example to a custom
 * domain) moves every image at once.
 */
export function cdn(src: string): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!base || process.env.IMAGES_FROM_R2 === "0") return src;
  return src.startsWith("/images/") || src.startsWith("/videos/") ? base + src : src;
}

const onCdn = (a: Asset): Asset => ({
  ...a,
  src: cdn(a.src),
  ...(a.art ? { art: { ...a.art, src: cdn(a.art.src) } } : {}),
  ...(a.artClear ? { artClear: { ...a.artClear, src: cdn(a.artClear.src) } } : {}),
});

/** Resolves a WordPress filename or a /images path. Unknown names throw so typos surface at build time. */
export function asset(name: string): Asset {
  // Paths and full URLs (dashboard uploads) are used as they are.
  if (name.startsWith("/") || /^https?:\/\//.test(name)) return { src: cdn(name) };
  const a = assets()[name] ?? assets()[strip(name)];
  if (!a) throw new Error(`Unknown image "${name}" (not in lib/images.json)`);
  return onCdn(a);
}

export const src = (name: string) => asset(name).src;

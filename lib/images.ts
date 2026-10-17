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

/** Resolves a WordPress filename or a /images path. Unknown names throw so typos surface at build time. */
export function asset(name: string): Asset {
  // Paths and full URLs (dashboard uploads) are used as they are.
  if (name.startsWith("/") || /^https?:\/\//.test(name)) return { src: name };
  const a = assets()[name] ?? assets()[strip(name)];
  if (!a) throw new Error(`Unknown image "${name}" (not in lib/images.json)`);
  return a;
}

export const src = (name: string) => asset(name).src;

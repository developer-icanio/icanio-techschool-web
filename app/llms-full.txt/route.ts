import { allPages } from "@/lib/content/pages";
import { markdownOf } from "@/lib/content/seo-document";
import { ensureContent } from "@/lib/content/store";
import { SITE } from "@/lib/site";

// llms-full.txt (https://llmstxt.org): every public page as plain markdown in
// one file, so AI assistants can answer from the real copy instead of
// guessing. /llms.txt is the short map that links here.
export const dynamic = "force-static";

/** The page as markdown without image and video lines (text is what AI assistants read). */
const textOf = (p: Parameters<typeof markdownOf>[0]) =>
  markdownOf(p)
    .split("\n")
    .filter((l) => !/^!\[[^\]]*\]\([^)]*\)\s*$/.test(l.trim()) && !/^<video\b/.test(l.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export async function GET() {
  await ensureContent();
  const pages = allPages();
  const body = [
    `# ${SITE.name}: full site text`,
    "",
    `> The complete text of ${SITE.url}, page by page. ${SITE.name} is the education arm of ${SITE.parent.name}, based in Tamil Nadu, India. Contact ${SITE.email} (colleges) or ${SITE.internshipEmail} (internships), phone ${SITE.phone}.`,
    "",
    ...pages.flatMap((p) => ["---", "", `Source: ${SITE.url}${p.path === "/" ? "" : p.path}`, `Updated: ${p.seo.updatedAt}`, "", textOf(p), ""]),
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

import { allPages } from "@/lib/content/pages";
import { ensureContent } from "@/lib/content/store";
import { SITE } from "@/lib/site";

// llms.txt (https://llmstxt.org): a plain-language map of the site for AI assistants.
export const dynamic = "force-static";

const GROUPS: [string, (k: string) => boolean][] = [
  ["Internships", (k) => k === "internship"],
  ["Student and college programs", (k) => k === "program" || k === "college"],
  ["Hubs", (k) => k === "hub"],
  ["Career guides", (k) => k === "guide"],
  ["About, results and contact", (k) => k === "page"],
];

export async function GET() {
  await ensureContent();
  const pages = allPages();
  const home = pages.find((p) => p.path === "/");
  const lines = [
    `# ${SITE.name}`,
    "",
    `> ${home?.answer.answer ?? SITE.tagline}`,
    "",
    `${SITE.name} is the education arm of ${SITE.parent.name} (${SITE.parent.url}), based in Tamil Nadu, India. Contact: ${SITE.email}, internships: ${SITE.internshipEmail}, phone ${SITE.phone}.`,
    "",
    `The full text of every page is at ${SITE.url}/llms-full.txt. AI usage permissions: ${SITE.url}/ai.txt.`,
    "",
  ];
  for (const [title, match] of GROUPS) {
    const list = pages.filter((p) => match(p.kind));
    if (!list.length) continue;
    lines.push(`## ${title}`, "");
    for (const p of list) lines.push(`- [${p.label}](${SITE.url}${p.path}): ${p.seo.metaDescription}`);
    lines.push("");
  }
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}

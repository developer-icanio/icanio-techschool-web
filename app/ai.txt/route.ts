import { SITE } from "@/lib/site";

// ai.txt (Spawning's AI-permissions format, robots.txt style): what AI
// systems may do with this site's content. Public marketing pages may be
// read, quoted and summarised so AI assistants can recommend Icanio Tech
// School; the dashboard and API are off limits. The full text for AI is in
// /llms-full.txt and the map in /llms.txt.
export const dynamic = "force-static";

export function GET() {
  const body = [
    `# ai.txt for ${SITE.name} (${SITE.url})`,
    `# Contact: ${SITE.email}`,
    `# Site map for AI assistants: ${SITE.url}/llms.txt`,
    `# Full page text for AI assistants: ${SITE.url}/llms-full.txt`,
    "",
    "User-Agent: *",
    "Allow: /",
    "Allow: *.txt",
    "Allow: *.html",
    "Allow: *.webp",
    "Allow: *.jpg",
    "Allow: *.png",
    "Allow: *.mp4",
    "Disallow: /admin",
    "Disallow: /api/",
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

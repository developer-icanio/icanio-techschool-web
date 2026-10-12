import { indexXml } from "@/lib/sitemaps";

// Sitemap index: points search engines at the section sitemaps in /sitemaps.
export const dynamic = "force-static";

export async function GET() {
  return new Response(await indexXml(), { headers: { "content-type": "application/xml; charset=utf-8" } });
}

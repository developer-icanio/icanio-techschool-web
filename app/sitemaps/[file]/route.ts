import { groupUrls, sitemapNames, urlsetXml, VIDEO_SITEMAP, videoEntries, videoXml } from "@/lib/sitemaps";

// /sitemaps/main.xml, /sitemaps/internships.xml, ... and /sitemaps/videos.xml
export const dynamicParams = false;

export function generateStaticParams() {
  return sitemapNames().map((n) => ({ file: `${n}.xml` }));
}

export async function GET(_: Request, { params }: RouteContext<"/sitemaps/[file]">) {
  const name = (await params).file.replace(/\.xml$/, "");
  const xml = name === VIDEO_SITEMAP ? videoXml(await videoEntries()) : await groupUrls(name).then((u) => (u ? urlsetXml(u) : null));
  if (!xml) return new Response("Not found", { status: 404 });
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}

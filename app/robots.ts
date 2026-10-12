import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { sitemapNames, sitemapUrl } from "@/lib/sitemaps";

// Search engines and AI answer engines (AEO/GEO) are welcome everywhere but the API.
const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "CCBot", "Meta-ExternalAgent", "Amazonbot", "DuckAssistBot", "cohere-ai"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/admin"] },
      { userAgent: AI_BOTS, allow: "/", disallow: ["/api/", "/admin"] },
    ],
    // The index first, then each section sitemap (some crawlers skip indexes).
    sitemap: [`${SITE.url}/sitemap.xml`, ...sitemapNames().map(sitemapUrl)],
    host: SITE.url,
  };
}

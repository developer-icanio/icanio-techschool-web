import type { MetadataRoute } from "next";
import { getRequestBaseUrl } from "@/lib/requestUrl";

// Paths with no public SEO value: auth, account, transactional flows, and
// the admin/API surface. Kept out of crawl budget entirely.
const DISALLOWED = [
  "/admin",
  "/api",
  "/account",
  "/cart",
  "/checkout",
  "/login",
  "/register",
  "/unsubscribe",

  // /shop's filter/sort/search UI (components/shop/ShopFilters.tsx,
  // ShopSort.tsx, SearchBar.tsx) reads and writes these as query params
  // on /shop itself — category, size, and color are multi-select, so
  // every combination is a separately-crawlable URL that all resolve to
  // the exact same generateMetadata() canonical ("/shop", set
  // unconditionally regardless of query string — see app/shop/page.tsx).
  // The canonical tag alone doesn't stop a crawler from spending budget
  // fetching every combination first; this stops the fetch. The old
  // WordPress/WooCommerce site had the identical problem with its own
  // filter query params (?filter_color=, ?filter_size=, ?min_price=,
  // etc. — visible in its old robots.txt, which needed ~1,830 URL-pattern
  // blocks for exactly this) — same shape of problem on the new stack,
  // under this site's actual current param names instead of WooCommerce's.
  "/shop?*category=",
  "/shop?*size=",
  "/shop?*color=",
  "/shop?*minPrice=",
  "/shop?*maxPrice=",
  "/shop?*rating=",
  "/shop?*sort=",
  // Internal site search results (SearchBar.tsx posts to /shop?q=...) —
  // same canonical-collapses-to-/shop reasoning as the filters above, and
  // the same call the old site's robots.txt already made for its own
  // WordPress search (`Disallow: /?s=`).
  "/shop?*q=",

  // WordPress/WooCommerce RSS feeds (/product/<slug>/feed, etc.) are all
  // redirected to their real page now (see redirects/wpMigrationRedirects.ts)
  // — this is belt-and-braces so nothing that generates a similarly-shaped
  // /feed URL in the future gets crawled or indexed.
  "/*/feed",
  "/feed",
];

// AI/LLM crawlers explicitly allowed (in addition to the default "*" allow
// below) so this is a deliberate, documented choice rather than an
// accident of an unqualified "Allow: /" — matches the AEO/GEO work done on
// blog content and the /llms.txt file, which exist specifically to be
// read by these agents.
const AI_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "CCBot",
  "cohere-ai",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getRequestBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED,
      },
      {
        userAgent: AI_USER_AGENTS,
        allow: "/",
        disallow: DISALLOWED,
      },
    ],

    sitemap: [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/blog/sitemap.xml`,
      `${baseUrl}/shop/sitemap.xml`,
    ],
  };
}

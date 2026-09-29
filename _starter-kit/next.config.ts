import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { withContentCollections } from "@content-collections/next";
import { wpMigrationRedirects } from "./redirects/wpMigrationRedirects";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  pageExtensions: [
    "ts",
    "tsx",
    "js",
    "jsx",
    "md",
    "mdx",
  ],

  // Security response headers (flagged as missing by Lighthouse's Trust &
  // Safety audit). CSP is deliberately not set here yet - it needs a
  // per-source allowlist audited against Razorpay, R2, fonts and the
  // inline styles Next emits, and a wrong one breaks checkout silently.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // allow-popups (not bare same-origin): Razorpay Checkout opens a
          // payment popup and talks back via window.opener - bare
          // same-origin would sever that and break payment.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
  // This site is now B2C/retail-storefront-only. The manufacturing, OEM,
  // industries, and export-market content that used to live here has moved
  // to export.lamblily.com (a separate B2B site cloned from this one) —
  // redirect the old local paths there instead of 404ing or duplicating
  // that content on two domains. Path-preserving since export.lamblily.com
  // mirrors the same /services/:slug, /industries/:slug, /international/:country
  // route structure.
  async redirects() {
    // Old lamblily.com had standalone /manufacturing/factory, /quality and
    // /traceability sub-pages; export.lamblily.com only has one consolidated
    // /manufacturing page (confirmed live - the sub-paths 404 there), so
    // these three need a specific override to the working page instead of
    // falling through to the path-preserving b2bRedirects wildcard below
    // (which would send them to those same dead sub-paths). Must be listed
    // before b2bRedirects so the specific rule wins.
    const manufacturingSubpageRedirects = [
      "/manufacturing/factory",
      "/manufacturing/quality",
      "/manufacturing/traceability",
    ].map((source) => ({
      source,
      destination: "https://export.lamblily.com/manufacturing",
      permanent: true as const,
    }));

    const b2bPaths = ["/manufacturing", "/services", "/industries", "/international"];
    const b2bRedirects = b2bPaths.flatMap((path) => [
      {
        source: path,
        destination: `https://export.lamblily.com${path}`,
        permanent: true,
      },
      {
        source: `${path}/:slug*`,
        destination: `https://export.lamblily.com${path}/:slug*`,
        permanent: true,
      },
    ]);

    // /export/usa predates the /international/[country] system above (it
    // was a standalone US SEO landing page added before that system
    // existed) and duplicates content/international/usa.mdx, which is
    // already covered by the /international redirect. Never linked from
    // anywhere on the site, but still publicly reachable by direct URL —
    // send it to the equivalent, current page instead of leaving it live.
    const exportUsaRedirect = {
      source: "/export/usa",
      destination: "https://export.lamblily.com/international/usa",
      permanent: true,
    };

    // 6 empty, orphaned legacy category rows (0 products each, confirmed
    // live) share the exact same leaf display name as a real category with
    // real products, at a different slug — rendering identical title/H1 on
    // two URLs, one of them a genuinely empty page. A copy fix doesn't
    // apply here (there's no real content on the empty one to
    // differentiate); redirecting to the real category resolves the
    // duplicate-content and thin-content problem at once, same pattern as
    // the B2B redirects above.
    const legacyCategoryRedirects = [
      ["/shop/category/10-16-years", "/shop/category/kids-clothes-10-16-years"],
      ["/shop/category/kids-clothes", "/shop/category/kids-clothes-collection"],
      ["/shop/category/boys-clothes", "/shop/category/kids-clothes-collection-boys-clothes-collection"],
      ["/shop/category/girls-clothes", "/shop/category/kids-clothes-collection-girls-clothes-online"],
      ["/shop/category/men", "/shop/category/mens-clothing-online"],
      ["/shop/category/best-sellers", "/shop/category/best-selling-kids-clothes"],
    ].map(([source, destination]) => ({ source, destination, permanent: true }));

    // Real, currently-404ing URLs from lamblily.com's own GSC coverage
    // report (198 URLs total; 159 confirmed still 404 against the live
    // site, cross-checked against a WordPress content export and this
    // site's own blog/page routes — the other ~2,900 GSC "errors" across
    // other reports are WooCommerce filter-combination URLs the site's
    // robots.txt already blocks, not real pages, and needed nothing here).
    //
    // Two blog posts whose old slug doesn't match the new one (every
    // other confirmed-404 blog URL's slug already matches a real post
    // under content/blog/ — e.g. /blog/frock-for-girls resolves on its
    // own with no redirect needed, so only the real mismatches are listed):
    const oldWpBlogRedirects = [
      ["/blog/materials-cotton-vs-organic-cotton-for-kids", "/blog/fabrics-to-avoid-for-baby-skin"],
      ["/blog/summer-best-summer-outfits-for-active-toddlers", "/blog/summer-outfits-for-active-toddlers"],
    ].map(([source, destination]) => ({ source, destination, permanent: true }));

    // Static pages that moved: the old site restructured its IA multiple
    // times (about-us/ -> about-lamblily/ -> ...), leaving each previous
    // prefix's URLs dead rather than redirected. Mapped to this site's
    // current equivalent page.
    const oldWpPageRedirects = [
      ["/about-us/custom-t-shirt-design-upload", "/custom-tshirt"],
      ["/about-us/sustainable-clothing", "/sustainability"],
      // Confirmed 404 via a site audit (Ubersuggest) — the old /about-us/
      // prefix's contact page, distinct from the already-redirected
      // /about-lamblily/contact-lamblily below (the site's IA moved
      // through both prefixes at different times).
      ["/about-us/contact-us", "/contact"],
      ["/about-lamblily/sustainable-clothing", "/sustainability"],
      ["/about-lamblily/why-choose-lamblily", "/about"],
      ["/about-us/why-choose-lamblily", "/about"],
      ["/about-lamblily/contact-lamblily", "/contact"],
      ["/about-lamblily/privacy-policy", "/privacy-policy"],
      ["/about-lamblily/terms-conditions", "/terms"],
      // Refund and Returns Policy was real, live, published content on
      // the old site (confirmed via its WordPress export) — ported to
      // app/refund-and-returns-policy/page.tsx rather than left as a
      // content gap, since the real policy text already existed.
      ["/about-lamblily/refund-and-returns-policy", "/refund-and-returns-policy"],
      ["/trust/refund-and-returns-policy", "/refund-and-returns-policy"],
      // Unlike Refund and Returns, no shipping-policy content ever
      // existed on the old site (checked the WordPress export directly —
      // not under any slug) — written fresh for
      // app/shipping-policy/page.tsx from facts already real and stated
      // elsewhere on this site (DeliveryTimeline's dispatch/delivery
      // times, the real FREE_SHIPPING_THRESHOLD, the same international
      // FOB/CIF/DDP framing already used in the Refund policy), not
      // invented. Redirecting the dead old URL there since it's the
      // closest thing to a destination that now exists.
      ["/about-lamblily/shipping-policy", "/shipping-policy"],
    ].map(([source, destination]) => ({ source, destination, permanent: true }));

    // Old dead /product/ URLs Leo asked to have checked against the
    // current catalog — only one of the eight actually has a live,
    // photographed match: the design's real current storefront name
    // ("Pandoo") is unrelated-looking on its own, but its product page
    // is unmistakably the same "Pandoo" character used elsewhere on the
    // site (the blog post "Pandoo the Balance Master" among others).
    // The other seven were checked the same way and are NOT redirected
    // here — see the comment below for why each one is different from
    // this one, not just left out.
    const oldWpProductRedirects = [
      ["/product/tshirts-for-kids-pandoo-hero", "/shop/pandoo-tshirts-for-kids-7-12y-cute-fun-tee"],
    ].map(([source, destination]) => ({ source, destination, permanent: true }));

    // The other 7 of the 8 old /product/ URLs Leo asked about — checked
    // thoroughly, not skipped:
    //   /product/clothing-set-adventure, /product/clothing-set-adventure-awaits-...
    //     — real designs ("Adventure" / "Adventure Awaits"), real pricing
    //     (₹399), marked active — but zero photos anywhere (checked both
    //     the marketplace-listing table and every storefront image),
    //     so they're part of the known CP01-CP60 photo gap, not live on
    //     the storefront under any name yet. Once photographed, these
    //     get real redirects then.
    //   /product/clothing-set-lost-in-space-..., /product/t-shirt-for-kids-arena-fighter-...,
    //   /product/tshirts-for-kids-arena-fighter, /product/t-shirt-for-kids-light-bringer-...,
    //   /product/tshirts-for-kids-sharp-shooter — the original design
    //     names ("Lost In Space", "Arena Fighter", "Light Bringer",
    //     "Sharp Shooter") still exist in the marketplace-listing table,
    //     but with zero photos there either, and nothing on the
    //     storefront matches them by name or by real photo filename.
    //     A same-numbered SKU exists on the storefront for some of
    //     these, but its actual photo is a visibly different design
    //     (e.g. the SKU that names "Arena Fighter" in the listing table
    //     points to a storefront product whose real photo file is named
    //     for a completely different CP number) — that SKU match is
    //     coincidental, not the same product, so redirecting to it would
    //     send a shopper to the wrong design. These look genuinely
    //     unlaunched rather than renamed.

    // export.lamblily.com's B2B catalog and lead-gen pages, found by
    // browsing the live site rather than guessed at — it doesn't mirror
    // the old site's /wholesale or /b2b paths, but has real equivalents:
    // a 230-style manufacturable catalog (/catalog, with per-category and
    // per-style pages) and no customer-account system at all (no
    // /login, /account, /portal, /dashboard — checked directly, all 404),
    // just quote-request/WhatsApp/contact lead capture.
    const oldWpB2bRedirects = [
      ["/b2b/export-garments-catalogue", "https://export.lamblily.com/catalog"],
      // The old page was specifically about baby bodysuits — the catalog
      // has an exact matching style, not just the general category.
      [
        "/wholesale/export-garments-catalogue/baby-bodysuits-0-24-months",
        "https://export.lamblily.com/catalog/lamb-by-001-baby-onesie-bodysuit",
      ],
      // No login/account system exists to redirect to (checked directly —
      // export.lamblily.com/login, /account, /portal, /dashboard all
      // 404), so the honest destination for someone who bookmarked a
      // wholesale-buyer login URL is the same place every other B2B
      // conversation on that site starts.
      ["/b2b-login", "https://export.lamblily.com/contact"],
      ["/b2b/b2b-login", "https://export.lamblily.com/contact"],
    ].map(([source, destination]) => ({ source, destination, permanent: true }));

    // Deliberately NOT redirected here — each needs a call only Leo can
    // make, not a guess:
    //   /blog/source-t-shirts-from-india-usa-market — no matching post on
    //     either site; likely export/wholesale-buyer content that belongs
    //     on export.lamblily.com, but no page there confirmed yet.
    //   /about-us/our-partners — the old page's real content (checked via
    //     the WordPress export) was a single stray link to a directory
    //     site, not real LAMBLILY content — not worth porting.
    //   /international/canada — already covered: falls under the
    //     /international/:slug* rule above once this domain is live, no
    //     separate rule needed.
    //   /elementor-32684 — an orphaned page-builder draft, never real
    //     content; left to 404 rather than redirected anywhere.

    return [
      ...manufacturingSubpageRedirects,
      ...b2bRedirects,
      exportUsaRedirect,
      ...legacyCategoryRedirects,
      ...oldWpBlogRedirects,
      ...oldWpPageRedirects,
      ...oldWpProductRedirects,
      ...oldWpB2bRedirects,
      // Full post-migration 404 sweep (247 blog, 166 product, 22 category,
      // 45 static). Listed last so every specific rule above wins first;
      // the /product/:slug catch-all inside it is the very last entry.
      ...wpMigrationRedirects,
    ];
  },
  images: {
    // Vercel's Image Optimization (the /_next/image proxy) has its own
    // usage-based quota separate from bandwidth/build minutes — once
    // exceeded, every optimized image request 402s
    // (OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED) until the account adds
    // billing or the quota resets, breaking every product photo on the
    // site at once. Disabling optimization site-wide serves images as-is
    // from their real src instead of proxying through that paid service.
    // This isn't a lossy workaround here: every product photo already
    // comes pre-compressed as .webp from R2 (see remotePatterns below),
    // which is exactly the case Next's own docs list as not benefiting
    // from further optimization in the first place.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lamblily.com",
      },
      {
        protocol: "https",
        hostname: "www.lamblily.com",
      },
      {
        protocol: "https",
        hostname: "pub-ac4fa79998384159957ee46f79e4299c.r2.dev",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
};

export default withContentCollections(withMDX(nextConfig));
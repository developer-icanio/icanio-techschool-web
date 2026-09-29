import Link from "next/link";
import { getAllPageSeoOverrides } from "@/lib/pageSeo";

interface SitePage {
  name: string;
  path: string;
  status: "live" | "broken";
  note: string;
  // Whether this route exports static `metadata` that a page_seo DB row
  // can override (see lib/pageSeo.ts) — transactional/account pages don't
  // export metadata at all (also excluded from robots.txt), so there's
  // nothing for an SEO override to apply to.
  hasSeo: boolean;
  // The hardcoded fallback title/description from that page's own
  // generateMetadata() — duplicated here (same "hand-maintained" approach
  // as the rest of this list) so the SEO Dashboard can score a page's
  // *effective* metadata (override if set, else this default) without
  // needing to import 14 separate route modules at runtime.
  defaultTitle?: string;
  defaultDescription?: string;
}

// There's no page-builder or CMS-managed page content yet, so this lists
// the actual static routes that exist in app/ right now. Update this list
// by hand when a route is added or removed until a real page model exists.
//
// Manufacturing/Services/Industries/International are deliberately left
// out — this site is B2C-only now, and those paths permanently redirect
// to export.lamblily.com (see next.config.ts) instead of serving local
// content, so they're not really "pages" on this domain any more.
export const sitePages: SitePage[] = [
  { name: "Home", path: "/", status: "live", note: "app/page.tsx", hasSeo: true, defaultTitle: "LAMBLILY | Premium Kidswear for Every Kid", defaultDescription: "Shop soft, breathable 100% cotton kidswear from LAMBLILY. Bestsellers, new arrivals, and everyday essentials for ages 0-16, with fast Tamil Nadu delivery and easy returns." },
  { name: "About", path: "/about", status: "live", note: "app/about/page.tsx", hasSeo: true, defaultTitle: "About LAMBLILY - Our Story & Mission", defaultDescription: "LAMBLILY is a Chennai, India kidswear brand under LAMBLILY Private Limited, founded on the belief that children deserve clothing as comfortable as it is beautiful." },
  { name: "Founders", path: "/about/founders", status: "live", note: "app/about/founders/page.tsx", hasSeo: true, defaultTitle: "Our Founders - Juliet Preena & Leo Daniel Raja", defaultDescription: "Meet LAMBLILY's founders, Juliet Preena and Leo Daniel Raja, who entered garment manufacturing in January 2019 and built LAMBLILY Private Limited into a Chennai kidswear export brand." },
  { name: "Team", path: "/about/team", status: "live", note: "app/about/team/page.tsx", hasSeo: true, defaultTitle: "Our Team - Meet the People Behind LAMBLILY", defaultDescription: "Meet the people behind LAMBLILY: founders Juliet Preena and Leo Daniel Raja, and the design, cutting, stitching, and quality teams at our Vandalur, Chennai facility." },
  { name: "Sustainability", path: "/sustainability", status: "live", note: "app/sustainability/page.tsx", hasSeo: true, defaultTitle: "Sustainable Fashion", defaultDescription: "LAMBLILY Private Limited's approach to sustainable fashion, built around people, planet, and product, and the launch of Seedleaf, our sustainable fashion brand." },
  { name: "Careers", path: "/careers", status: "live", note: "app/careers/page.tsx", hasSeo: true, defaultTitle: "Careers at LAMBLILY", defaultDescription: "Current openings at LAMBLILY's kidswear manufacturing facility in Dindigul, Tamil Nadu, across cutting, stitching, quality control, printing, and packing." },
  { name: "Events", path: "/events", status: "live", note: "app/events/page.tsx", hasSeo: true, defaultTitle: "Events & Seasonal Collections", defaultDescription: "LAMBLILY's annual calendar of festival celebrations and seasonal kidswear collections at our Vandalur, Chennai facility, from Pongal to Diwali to Christmas." },
  { name: "Blog", path: "/blog", status: "live", note: "app/blog/page.tsx", hasSeo: true, defaultTitle: "LAMBLILY Blog - Fabric Guides & Parenting Tips", defaultDescription: "Fabric guides, style tips, and parenting advice from the LAMBLILY team." },
  { name: "Shop", path: "/shop", status: "live", note: "app/shop/page.tsx", hasSeo: true, defaultTitle: "Shop Kids Clothing - 100% Cotton Essentials", defaultDescription: "Browse LAMBLILY's full collection of premium kidswear: t-shirts, co-ord sets, baby wear, and more." },
  { name: "Contact", path: "/contact", status: "live", note: "app/contact/page.tsx", hasSeo: true, defaultTitle: "Contact LAMBLILY - Order & Product Support", defaultDescription: "Get in touch with LAMBLILY for order questions, product inquiries, or general support. We usually respond within one business day." },
  { name: "Cart", path: "/cart", status: "live", note: "app/cart/page.tsx", hasSeo: false },
  { name: "Checkout", path: "/checkout", status: "live", note: "app/checkout/page.tsx", hasSeo: false },
  { name: "Login", path: "/login", status: "live", note: "app/login/page.tsx", hasSeo: false },
  { name: "Register", path: "/register", status: "live", note: "app/register/page.tsx", hasSeo: false },
  { name: "Account", path: "/account", status: "live", note: "app/account/page.tsx", hasSeo: false },
  { name: "Privacy Policy", path: "/privacy-policy", status: "live", note: "app/privacy-policy/page.tsx", hasSeo: true, defaultTitle: "Privacy Policy - How We Protect Your Data", defaultDescription: "How LAMBLILY PRIVATE LIMITED collects, uses, and protects personal information across our website, shop, and international export inquiries, including GDPR and CCPA rights." },
  { name: "Terms & Conditions", path: "/terms", status: "live", note: "app/terms/page.tsx", hasSeo: true, defaultTitle: "Terms & Conditions - LAMBLILY Order Policies", defaultDescription: "Terms and conditions for retail orders and wholesale/export manufacturing inquiries with LAMBLILY PRIVATE LIMITED, including international buyer terms." },
  { name: "Refund and Returns Policy", path: "/refund-and-returns-policy", status: "live", note: "app/refund-and-returns-policy/page.tsx", hasSeo: true, defaultTitle: "Refund and Returns Policy", defaultDescription: "LAMBLILY's return, refund, and exchange policy for domestic and international/export orders - eligibility, timelines, and how to start a request." },
  { name: "Shipping Policy", path: "/shipping-policy", status: "live", note: "app/shipping-policy/page.tsx", hasSeo: true, defaultTitle: "Shipping Policy", defaultDescription: "How LAMBLILY dispatches and delivers orders - processing time, delivery timelines for Tamil Nadu and the rest of India, shipping charges, and international/export shipping." },
  { name: "Unsubscribe", path: "/unsubscribe", status: "live", note: "app/unsubscribe/page.tsx", hasSeo: true, defaultTitle: "Unsubscribe from LAMBLILY Emails" },
  { name: "Sitemap", path: "/sitemap", status: "live", note: "app/sitemap/page.tsx", hasSeo: true, defaultTitle: "Sitemap - All Pages, Products & Blog Posts", defaultDescription: "Browse every page on the LAMBLILY website, including product categories, individual products, and blog articles." },
];

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminPagesPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const overrides = await getAllPageSeoOverrides();

  const pages = query
    ? sitePages.filter(
        (page) =>
          page.name.toLowerCase().includes(query) || page.path.toLowerCase().includes(query)
      )
    : sitePages;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Pages</h1>
          <p className="mt-2 text-gray-500">
            {sitePages.length} static site pages. There is no page-builder yet, this is a
            hand-maintained list of what actually exists in the codebase.
          </p>
        </div>

        <form className="flex gap-3">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search name or path…"
            className="w-72 rounded-lg border px-4 py-2"
          />
          <button type="submit" className="rounded-lg border px-4 py-2 hover:bg-gray-100">
            Search
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        Wholesale, OEM, and export content (Manufacturing, Services, Industries,
        International) now lives entirely on{" "}
        <a href="https://export.lamblily.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
          export.lamblily.com
        </a>{" "}
        - those local paths just 301-redirect there now, so they&apos;re not listed as
        pages of this site any more.
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Page</th>
              <th className="p-3 text-left">Path</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">SEO</th>
              <th className="p-3 text-left">Note</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {pages.map((page) => (
              <tr key={page.path} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{page.name}</td>

                <td className="p-3 text-gray-600">{page.path}</td>

                <td className="p-3 text-center">
                  {page.status === "live" ? (
                    <span className="rounded bg-green-100 px-3 py-1 text-green-700">
                      LIVE
                    </span>
                  ) : (
                    <span className="rounded bg-red-100 px-3 py-1 text-red-700">
                      404
                    </span>
                  )}
                </td>

                <td className="p-3 text-center">
                  {!page.hasSeo ? (
                    <span className="text-xs text-gray-400">&mdash;</span>
                  ) : overrides.has(page.path) ? (
                    <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">Override set</span>
                  ) : (
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">Default</span>
                  )}
                </td>

                <td className="p-3 text-sm text-gray-600">{page.note}</td>

                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                    {page.hasSeo && (
                      <>
                        <Link
                          href={`/admin/seo/static-page?path=${encodeURIComponent(page.path)}`}
                          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                        >
                          SEO
                        </Link>
                        <Link
                          href={`/admin/pages/prompts?path=${encodeURIComponent(page.path)}`}
                          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                        >
                          Prompts
                        </Link>
                      </>
                    )}
                    <Link
                      href={page.path}
                      target="_blank"
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      View
                    </Link>
                  </div>
                </td>
              </tr>
            ))}

            {pages.length === 0 && (
              <tr>
                <td colSpan={6} className="p-10 text-center text-gray-500">
                  No pages match &quot;{query}&quot;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

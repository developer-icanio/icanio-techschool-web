import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getAllBlogPosts } from "@/lib/blog";
import { getAllProducts } from "@/lib/products";
import { getGroupedRoutes } from "@/lib/routes";
import { getPageSeoOverride, applyPageSeoOverride } from "@/lib/pageSeo";
import type { Metadata } from "next";

// This page calls getAllProducts() directly (see below), a heavy query
// joining every active product with its images and variants. Uncached,
// every visit or crawl would re-run that query — matches the same class
// of bug fixed in lib/products.ts's getAllCategoriesWithCounts().
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const base: Metadata = {
    title: "Sitemap - All Pages, Products & Blog Posts",
    description:
      "Browse every page on the LAMBLILY website, including product categories, individual products, and blog articles.",
    alternates: { canonical: "/sitemap" },
  };
  return applyPageSeoOverride(base, await getPageSeoOverride("/sitemap"));
}

export default async function SitemapPage() {
  const posts = getAllBlogPosts();
  const products = await getAllProducts();
  const groupedRoutes = getGroupedRoutes();

  return (
    <>
      <Navbar />

      <main className="mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold text-slate-900">Sitemap</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          A complete overview of every page on the LAMBLILY website, grouped
          by section, to help you find what you&apos;re looking for quickly. This
          list updates automatically as pages, products, and blog posts are
          added or removed.
        </p>

        <div className="mt-12 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(groupedRoutes).map(([groupName, routes]) => (
            <div key={groupName}>
              <h2 className="mb-4 text-lg font-semibold text-slate-900">
                {groupName}
              </h2>
              <ul className="space-y-3">
                {routes.map((route) => (
                  <li key={route.href}>
                    <Link
                      href={route.href}
                      className="text-slate-600 transition hover:text-brand-600"
                    >
                      {route.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* This site is B2C/retail-storefront-only — wholesale, OEM, and
            export buyers are a single outbound link away instead of a
            whole section of local pages. */}
        <div className="mt-16 border-t border-slate-200 pt-12">
          <h2 className="mb-6 text-lg font-semibold text-slate-900">
            Wholesale &amp; Export
          </h2>
          <a
            href="https://export.lamblily.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 transition hover:text-brand-600"
          >
            export.lamblily.com ↗
          </a>
        </div>

        {/* Products — generated from the database via getAllProducts(), so
            new products/removed products appear here automatically on the
            next build without any manual editing. */}
        {products.length > 0 && (
          <div className="mt-16 border-t border-slate-200 pt-12">
            <h2 className="mb-6 text-lg font-semibold text-slate-900">
              Products ({products.length})
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/shop/${product.slug}`}
                    className="text-slate-600 transition hover:text-brand-600"
                  >
                    {product.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Blog posts */}
        {posts.length > 0 && (
          <div className="mt-16 border-t border-slate-200 pt-12">
            <h2 className="mb-6 text-lg font-semibold text-slate-900">
              Blog Articles ({posts.length})
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-slate-600 transition hover:text-brand-600"
                  >
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

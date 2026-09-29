import Link from "next/link";

import { getAllBlogPosts } from "@/lib/blog";
import { analyzeBlog } from "@/lib/seo/analyzer";
import { getSeoStatus } from "@/lib/seo/score";
import { getProductsSeoOverview } from "@/lib/products";
import { getPagesSeoRows, scoreProduct, scorePage } from "@/lib/seoReports";
import { sitePages } from "../pages/page";

type Tab = "blogs" | "products" | "pages";

interface PageProps {
  searchParams: Promise<{ tab?: string; q?: string; status?: string }>;
}

export default async function SEOPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab: Tab = params.tab === "products" || params.tab === "pages" ? params.tab : "blogs";
  const query = (params.q ?? "").trim().toLowerCase();
  const status = params.status ?? "all";

  const blogs = getAllBlogPosts();
  const blogReports = blogs.map((blog) => {
    const report = analyzeBlog(blog);
    return {
      ...blog,
      seoScore: report.overallScore,
      seoStatus: getSeoStatus(report.overallScore),
      issueCount: report.failedRules,
    };
  });

  const products = await getProductsSeoOverview();
  const productReports = products.map((p) => {
    const { score, status: seoStatus } = scoreProduct(p);
    const missing: string[] = [];
    if (!p.metaTitle) missing.push("meta title");
    if (!p.metaDescription) missing.push("meta description");
    return { ...p, seoScore: score, seoStatus, missing };
  });

  const pageRows = await getPagesSeoRows();
  const pageReports = pageRows.map((p) => {
    const { score, status: seoStatus } = scorePage(p);
    return { ...p, seoScore: score, seoStatus };
  });

  // One shared band-counter for whichever content type is active, so the
  // Excellent/Good/Needs Improvement/Critical row always reflects the
  // selected tab instead of only ever showing blog numbers.
  const activeReports =
    tab === "blogs" ? blogReports : tab === "products" ? productReports : pageReports;
  const excellent = activeReports.filter((r) => r.seoStatus === "Excellent").length;
  const good = activeReports.filter((r) => r.seoStatus === "Good").length;
  const needsImprovement = activeReports.filter((r) => r.seoStatus === "Needs Improvement").length;
  const critical = activeReports.filter((r) => r.seoStatus === "Critical").length;

  const blogExcellent = blogReports.filter((b) => b.seoStatus === "Excellent").length;
  const blogCritical = blogReports.filter((b) => b.seoStatus === "Critical").length;
  const productsComplete = productReports.filter((p) => p.missing.length === 0).length;

  function tabHref(nextTab: Tab) {
    const p = new URLSearchParams();
    p.set("tab", nextTab);
    return `/admin/seo?${p.toString()}`;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">SEO Dashboard</h1>
        <p className="text-gray-500">
          SEO audit across every indexable content type on the site - blog posts, products,
          and static pages.
        </p>
      </div>

      {/* Summary — always shows all three content types regardless of the
          active tab, so "what about pages/products" is answered at a
          glance without switching tabs. */}
      <div className="grid grid-cols-3 gap-5">
        <Card title="Blogs" value={blogReports.length} subtitle={`${blogExcellent} excellent · ${blogCritical} critical`} />
        <Card
          title="Products"
          value={productReports.length}
          subtitle={`${productsComplete} with meta title & description`}
        />
        <Card title="Pages" value={pageReports.length} subtitle={`of ${sitePages.length} static site routes`} />
      </div>

      {/* Status bands for whichever tab is active — was blogs-only before. */}
      <div className="grid grid-cols-4 gap-5">
        <StatusCard label="Excellent" value={excellent} total={activeReports.length} color="green" />
        <StatusCard label="Good" value={good} total={activeReports.length} color="blue" />
        <StatusCard label="Needs Improvement" value={needsImprovement} total={activeReports.length} color="yellow" />
        <StatusCard label="Critical" value={critical} total={activeReports.length} color="red" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <TabLink href={tabHref("blogs")} active={tab === "blogs"}>
          Blogs ({blogReports.length})
        </TabLink>
        <TabLink href={tabHref("products")} active={tab === "products"}>
          Products ({productReports.length})
        </TabLink>
        <TabLink href={tabHref("pages")} active={tab === "pages"}>
          Pages ({pageReports.length})
        </TabLink>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="tab" value={tab} />
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder={tab === "blogs" ? "Search title, category, or slug…" : tab === "products" ? "Search name or category…" : "Search page name or path…"}
          className="w-72 rounded-lg border px-4 py-2"
        />
        <select name="status" defaultValue={status} className="rounded-lg border px-4 py-2">
          <option value="all">All statuses</option>
          <option value="Excellent">Excellent</option>
          <option value="Good">Good</option>
          <option value="Needs Improvement">Needs Improvement</option>
          <option value="Critical">Critical</option>
        </select>
        <button type="submit" className="rounded-lg border px-4 py-2 hover:bg-gray-100">
          Filter
        </button>
        {(query || status !== "all") && (
          <Link href={tabHref(tab)} className="text-sm text-gray-500 hover:underline">
            Clear filters
          </Link>
        )}
      </form>

      {tab === "blogs" && (
        <BlogsTable
          reports={blogReports.filter((b) => {
            const matchesQuery =
              !query ||
              b.title.toLowerCase().includes(query) ||
              b.category.toLowerCase().includes(query) ||
              b.slug.toLowerCase().includes(query);
            const matchesStatus = status === "all" || b.seoStatus === status;
            return matchesQuery && matchesStatus;
          })}
        />
      )}

      {tab === "products" && (
        <ProductsTable
          reports={productReports.filter((p) => {
            const matchesQuery =
              !query ||
              p.name.toLowerCase().includes(query) ||
              (p.categoryName ?? "").toLowerCase().includes(query);
            const matchesStatus = status === "all" || p.seoStatus === status;
            return matchesQuery && matchesStatus;
          })}
        />
      )}

      {tab === "pages" && (
        <PagesTable
          reports={pageReports.filter((p) => {
            const matchesQuery =
              !query || p.name.toLowerCase().includes(query) || p.path.toLowerCase().includes(query);
            const matchesStatus = status === "all" || p.seoStatus === status;
            return matchesQuery && matchesStatus;
          })}
        />
      )}
    </div>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-900"
      }`}
    >
      {children}
    </Link>
  );
}

function BlogsTable({
  reports,
}: {
  reports: Array<{
    slug: string;
    title: string;
    category: string;
    wordCount: number;
    readingTime: string;
    seoScore: number;
    seoStatus: string;
    issueCount: number;
  }>;
}) {
  return (
    <div className="overflow-auto rounded-xl border bg-white">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left">Title</th>
            <th className="p-3 text-left">Category</th>
            <th className="p-3 text-center">Word Count</th>
            <th className="p-3 text-center">Reading</th>
            <th className="p-3 text-center">Score</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3 text-center">Issues</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((blog) => (
            <tr key={blog.slug} className="border-t hover:bg-gray-50">
              <td className="p-3">
                <Link href={`/admin/seo/${blog.slug}`} className="font-medium text-blue-600 hover:underline">
                  {blog.title}
                </Link>
              </td>
              <td className="p-3">{blog.category}</td>
              <td className="p-3 text-center">{blog.wordCount}</td>
              <td className="p-3 text-center">{blog.readingTime}</td>
              <td className="p-3 text-center font-bold">{blog.seoScore}</td>
              <td className="p-3 text-center">{blog.seoStatus}</td>
              <td className="p-3 text-center">{blog.issueCount}</td>
            </tr>
          ))}
          {reports.length === 0 && (
            <tr>
              <td colSpan={7} className="p-10 text-center text-gray-500">
                No blog posts match this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProductsTable({
  reports,
}: {
  reports: Array<{
    id: string;
    name: string;
    slug: string;
    categoryName: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    isActive: boolean;
    seoScore: number;
    seoStatus: string;
    missing: string[];
  }>;
}) {
  return (
    <div className="overflow-auto rounded-xl border bg-white">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left">Product</th>
            <th className="p-3 text-left">Category</th>
            <th className="p-3 text-center">Score</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3 text-center">Missing</th>
            <th className="p-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((p) => (
            <tr key={p.id} className="border-t hover:bg-gray-50">
              <td className="p-3">
                <Link href={`/admin/seo/product/${p.id}`} className="font-medium text-blue-600 hover:underline">
                  {p.name}
                </Link>
              </td>
              <td className="p-3 text-gray-600">{p.categoryName ?? "–"}</td>
              <td className="p-3 text-center font-bold">{p.seoScore}</td>
              <td className="p-3 text-center">{p.seoStatus}</td>
              <td className="p-3 text-center text-sm text-gray-600">
                {p.missing.length === 0 ? "–" : p.missing.join(", ")}
              </td>
              <td className="p-3 text-center">
                <div className="flex justify-center gap-2">
                  <Link
                    href={`/admin/products/${p.id}/seo`}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/shop/${p.slug}`}
                    target="_blank"
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                  >
                    View
                  </Link>
                </div>
              </td>
            </tr>
          ))}
          {reports.length === 0 && (
            <tr>
              <td colSpan={6} className="p-10 text-center text-gray-500">
                No products match this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PagesTable({
  reports,
}: {
  reports: Array<{
    path: string;
    name: string;
    title: string;
    description: string;
    hasOverride: boolean;
    seoScore: number;
    seoStatus: string;
  }>;
}) {
  return (
    <div className="overflow-auto rounded-xl border bg-white">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left">Page</th>
            <th className="p-3 text-left">Path</th>
            <th className="p-3 text-center">Score</th>
            <th className="p-3 text-center">Status</th>
            <th className="p-3 text-center">SEO</th>
            <th className="p-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((page) => (
            <tr key={page.path} className="border-t hover:bg-gray-50">
              <td className="p-3">
                <Link
                  href={`/admin/seo/static-page?path=${encodeURIComponent(page.path)}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {page.name}
                </Link>
              </td>
              <td className="p-3 text-gray-600">{page.path}</td>
              <td className="p-3 text-center font-bold">{page.seoScore}</td>
              <td className="p-3 text-center">{page.seoStatus}</td>
              <td className="p-3 text-center">
                {page.hasOverride ? (
                  <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">Override set</span>
                ) : (
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">Default</span>
                )}
              </td>
              <td className="p-3 text-center">
                <div className="flex justify-center gap-2">
                  <Link
                    href={`/admin/pages/edit?path=${encodeURIComponent(page.path)}`}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/admin/pages/prompts?path=${encodeURIComponent(page.path)}`}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                  >
                    Prompts
                  </Link>
                  <Link href={page.path} target="_blank" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100">
                    View
                  </Link>
                </div>
              </td>
            </tr>
          ))}
          {reports.length === 0 && (
            <tr>
              <td colSpan={6} className="p-10 text-center text-gray-500">
                No pages match this filter.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Card({ title, value, subtitle }: { title: string; value: number; subtitle: string }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="mt-2 text-4xl font-bold">{value}</h2>
      <p className="mt-3 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  green: "text-green-600",
  blue: "text-blue-600",
  yellow: "text-yellow-600",
  red: "text-red-600",
};

function StatusCard({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${STATUS_COLORS[color]}`}>{value}</div>
      <div className="mt-1 text-xs text-gray-400">of {total}</div>
    </div>
  );
}

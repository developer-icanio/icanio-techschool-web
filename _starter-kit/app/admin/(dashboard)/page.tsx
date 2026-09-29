import Link from "next/link";

import { getAllBlogPosts } from "@/lib/blog";
import { getAllProducts, getAllCategoriesWithCounts } from "@/lib/products";
import {
  getSeoAggregateStats,
  getProductsSeoAggregateStats,
  getCategoriesSeoAggregateStats,
  type SeoAggregateStats,
} from "@/lib/seoReports";
import { sitePages } from "./pages/page";
import type { SEOCategory } from "@/lib/seo/types";

const CATEGORY_ORDER: SEOCategory[] = [
  "Keyword",
  "Title",
  "Metadata",
  "Content",
  "Media",
  "Links",
  "Technical",
  "Schema",
  "EEAT",
  "AI",
];

const CATEGORY_LABELS: Partial<Record<SEOCategory, string>> = {
  EEAT: "E-E-A-T (Experience, Expertise, Authority, Trust)",
  AI: "AI / Answer Engine Optimization",
};

type ContentTab = "blogs" | "products" | "categories" | "pages";

const TABS: { id: ContentTab; label: string; itemNoun: string }[] = [
  { id: "blogs", label: "Blogs", itemNoun: "blog posts" },
  { id: "products", label: "Products", itemNoun: "products" },
  { id: "categories", label: "Categories", itemNoun: "categories" },
  { id: "pages", label: "Pages", itemNoun: "pages" },
];

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminDashboard({ searchParams }: PageProps) {
  const { tab: tabParam } = await searchParams;
  const tab: ContentTab = TABS.some((t) => t.id === tabParam) ? (tabParam as ContentTab) : "blogs";

  const [blogs, products, categories, seo, productsSeo, categoriesSeo] = await Promise.all([
    Promise.resolve(getAllBlogPosts()),
    getAllProducts(),
    getAllCategoriesWithCounts(),
    Promise.resolve(getSeoAggregateStats()),
    getProductsSeoAggregateStats(),
    getCategoriesSeoAggregateStats(),
  ]);
  const published = blogs.filter((b) => !b.draft).length;
  const categoriesWithProducts = categories.filter((c) => c.productCount > 0).length;

  const activeStats: SeoAggregateStats | null =
    tab === "blogs" ? seo : tab === "products" ? productsSeo : tab === "categories" ? categoriesSeo : null;
  const activeTab = TABS.find((t) => t.id === tab)!;

  const rulesByCategory = activeStats
    ? CATEGORY_ORDER.map((category) => ({
        category,
        label: CATEGORY_LABELS[category] ?? category,
        rules: activeStats.rules.filter((r) => r.category === category),
      })).filter((group) => group.rules.length > 0)
    : [];

  function tabHref(id: ContentTab) {
    return id === "blogs" ? "/admin" : `/admin?tab=${id}`;
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="mt-2 text-gray-500">LAMBLILY content at a glance</p>
      </div>

      <div className="grid grid-cols-4 gap-5">
        <Card title="Blogs" value={blogs.length} subtitle={`${published} published`} />
        <Card title="Products" value={products.length} subtitle="Active in catalog" />
        <Card
          title="Categories"
          value={categories.length}
          subtitle={`${categoriesWithProducts} with products`}
        />
        <Card title="Pages" value={sitePages.length} subtitle="Static site routes" />
      </div>

      {/* Content-type selector — switches the SEO Health + rules breakdown
          below between Blogs, Products, Categories, and Pages, so this
          isn't only ever showing blog posts. */}
      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={tabHref(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
              t.id === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "pages" ? (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">Pages</h2>
          <p className="mt-2 text-gray-500">
            {sitePages.length} static routes, all currently live. Pages don&apos;t carry the same
            per-item SEO metadata blogs/products/categories do (no stored meta title/description per
            route yet), so there&apos;s no rule breakdown to show here - see the full list, with
            search, on the Pages screen.
          </p>
          <Link
            href="/admin/pages"
            className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
          >
            Open Pages
          </Link>
        </div>
      ) : (
        <>
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-bold">SEO Health</h2>
              <p className="text-sm text-gray-500">
                {activeStats!.totalItems} {activeTab.itemNoun} checked live, right now &mdash; average
                score {activeStats!.avgScore}/100
              </p>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-5">
              <StatusCard label="Excellent" value={activeStats!.scoreBands.excellent} total={activeStats!.totalItems} color="green" />
              <StatusCard label="Good" value={activeStats!.scoreBands.good} total={activeStats!.totalItems} color="blue" />
              <StatusCard
                label="Needs Improvement"
                value={activeStats!.scoreBands.needsImprovement}
                total={activeStats!.totalItems}
                color="yellow"
              />
              <StatusCard label="Critical" value={activeStats!.scoreBands.critical} total={activeStats!.totalItems} color="red" />
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl font-bold">All {activeStats!.rules.length} SEO Rules</h2>
              <p className="text-sm text-gray-500">
                Every rule, met vs. not met, across all {activeStats!.totalItems} {activeTab.itemNoun}
              </p>
            </div>

            {rulesByCategory.map((group) => (
              <div key={group.category}>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {group.label} ({group.rules.length})
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {group.rules.map((rule) => (
                    <RuleCard key={rule.id} name={rule.name} passed={rule.passed} failed={rule.failed} total={rule.total} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-2xl font-bold">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link href="/admin/seo" className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700">
            Open SEO Dashboard
          </Link>
          <Link href="/admin/blogs" className="rounded-lg border px-5 py-3 hover:bg-gray-100">
            Blog Manager
          </Link>
          <Link href="/admin/leads" className="rounded-lg border px-5 py-3 hover:bg-gray-100">
            Leads
          </Link>
          <Link href="/admin/products" className="rounded-lg border px-5 py-3 hover:bg-gray-100">
            Products
          </Link>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, subtitle }: { title: string; value: number; subtitle: string }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="mt-2 text-5xl font-bold">{value}</h2>
      <p className="mt-3 text-gray-500">{subtitle}</p>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  green: "text-green-600",
  blue: "text-blue-600",
  yellow: "text-yellow-600",
  red: "text-red-600",
};

function StatusCard({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${STATUS_COLORS[color]}`}>{value}</div>
      <div className="mt-1 text-xs text-gray-400">of {total}</div>
    </div>
  );
}

function RuleCard({ name, passed, failed, total }: { name: string; passed: number; failed: number; total: number }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-gray-600">{name}</div>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-lg font-bold text-green-600">{passed}</span>
        <span className="text-xs text-gray-400">met</span>
        <span className="text-lg font-bold text-red-600">{failed}</span>
        <span className="text-xs text-gray-400">not met</span>
      </div>
      <div className="mt-1 text-xs text-gray-400">{total} total</div>
    </div>
  );
}

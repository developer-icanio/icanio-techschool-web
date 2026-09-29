import Link from "next/link";
import { db } from "@/db";
import { getSeoStatus } from "@/lib/seo/score";

// The 5 fields that make up a category's SEO completeness — same rule set
// used in the Dashboard's Categories tab (lib/seoReports.ts), computed
// per-row here so this list can show a score without a separate request.
function categorySeoScore(category: {
  seoTitle: string | null;
  metaDescription: string | null;
  shortDescription: string | null;
  keyword: string | null;
  productCount: number;
}): number {
  const checks = [
    !!category.seoTitle,
    !!category.metaDescription,
    !!category.shortDescription,
    !!category.keyword,
    category.productCount > 0,
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

export default async function AdminCategoriesPage() {
  const [categories, countRows] = await Promise.all([
    db.query.categories.findMany(),
    db.query.products.findMany({ columns: { categoryId: true, isActive: true } }),
  ]);

  const counts = new Map<string, number>();
  for (const p of countRows) {
    if (!p.isActive || !p.categoryId) continue;
    counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
  }

  const rows = categories.map((c) => {
    const productCount = counts.get(c.id) ?? 0;
    const score = categorySeoScore({
      seoTitle: c.seoTitle,
      metaDescription: c.metaDescription,
      shortDescription: c.shortDescription,
      keyword: c.keyword,
      productCount,
    });
    return { ...c, productCount, score, status: getSeoStatus(score) };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Categories</h1>
        <p className="mt-2 text-gray-500">
          {rows.length} product categories
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Group</th>
              <th className="p-3 text-center">Products</th>
              <th className="p-3 text-center">SEO Score</th>
              <th className="p-3 text-center">Image</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((category) => (
              <tr key={category.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{category.name}</td>

                <td className="p-3 text-gray-600">
                  {category.group ?? "N/A"}
                </td>

                <td className="p-3 text-center text-gray-600">
                  {category.productCount}
                </td>

                <td className="p-3 text-center">
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      category.status === "Excellent"
                        ? "bg-green-100 text-green-700"
                        : category.status === "Good"
                          ? "bg-blue-100 text-blue-700"
                          : category.status === "Needs Improvement"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                    }`}
                  >
                    {category.score}
                  </span>
                </td>

                <td className="p-3 text-center">
                  {category.imageUrl ? (
                    <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">Set</span>
                  ) : (
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">Missing</span>
                  )}
                </td>

                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                    <Link
                      href={`/admin/categories/${category.id}/seo`}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      SEO
                    </Link>
                    <Link
                      href={`/admin/categories/${category.id}/image`}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      Image
                    </Link>
                    <Link
                      href={`/shop/category/${category.slug}`}
                      target="_blank"
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      View
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="p-10 text-center text-gray-500">
            No categories found.
          </p>
        )}
      </div>
    </div>
  );
}

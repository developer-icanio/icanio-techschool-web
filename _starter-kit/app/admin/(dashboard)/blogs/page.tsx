import Link from "next/link";

import Pagination from "@/components/Pagination";
import { getAllBlogPosts } from "@/lib/blog";
import { formatDisplayDate } from "@/lib/formatDate";
import { db } from "@/db";
import { blogImages } from "@/db/schema";

const POSTS_PER_PAGE = 50;

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string; status?: string; category?: string }>;
}

export default async function AdminBlogsPage({ searchParams }: PageProps) {
  const { page, q, status, category } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10) || 1);

  const allPosts = getAllBlogPosts();
  const categories = Array.from(new Set(allPosts.map((p) => p.category))).sort();

  const imageRows = await db.select({ blogSlug: blogImages.blogSlug }).from(blogImages);
  const imageCounts = new Map<string, number>();
  for (const row of imageRows) {
    imageCounts.set(row.blogSlug, (imageCounts.get(row.blogSlug) ?? 0) + 1);
  }

  const query = (q ?? "").trim().toLowerCase();
  const statusFilter = status ?? "all";
  const categoryFilter = category ?? "all";

  const filteredPosts = allPosts.filter((post) => {
    const matchesQuery =
      !query ||
      post.title.toLowerCase().includes(query) ||
      post.category.toLowerCase().includes(query) ||
      post.slug.toLowerCase().includes(query);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && !post.draft) ||
      (statusFilter === "draft" && post.draft);
    const matchesCategory = categoryFilter === "all" || post.category === categoryFilter;
    return matchesQuery && matchesStatus && matchesCategory;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPosts.length / POSTS_PER_PAGE)
  );
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * POSTS_PER_PAGE;
  const posts = filteredPosts.slice(start, start + POSTS_PER_PAGE);

  function pageHref(pageNum: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    params.set("page", String(pageNum));
    return `/admin/blogs?${params.toString()}`;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Blogs</h1>
          <p className="mt-2 text-gray-500">
            {filteredPosts.length} of {allPosts.length} posts
          </p>
        </div>

        <form className="flex flex-wrap gap-3">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search title, category, or slug…"
            className="w-72 rounded-lg border px-4 py-2"
          />
          <select name="status" defaultValue={statusFilter} className="rounded-lg border px-4 py-2">
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select name="category" defaultValue={categoryFilter} className="rounded-lg border px-4 py-2">
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border px-4 py-2 hover:bg-gray-100"
          >
            Filter
          </button>
          {(query || statusFilter !== "all" || categoryFilter !== "all") && (
            <Link href="/admin/blogs" className="flex items-center text-sm text-gray-500 hover:underline">
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-center">Images</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Published</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {posts.map((post) => (
              <tr key={post.slug} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{post.title}</td>

                <td className="p-3 text-gray-600">{post.category}</td>

                <td className="p-3 text-center">
                  {(() => {
                    const count = imageCounts.get(post.slug) ?? 0;
                    return (
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          count === 3
                            ? "bg-green-100 text-green-700"
                            : count > 0
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {count}/3
                      </span>
                    );
                  })()}
                </td>

                <td className="p-3 text-center">
                  {post.draft ? (
                    <span className="rounded bg-yellow-100 px-3 py-1 text-yellow-700">
                      DRAFT
                    </span>
                  ) : (
                    <span className="rounded bg-green-100 px-3 py-1 text-green-700">
                      PUBLISHED
                    </span>
                  )}
                </td>

                <td className="p-3 text-center text-gray-600">
                  {formatDisplayDate(post.publishedAt)}
                </td>

                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                    <Link
                      href={`/admin/seo/${post.slug}`}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      SEO
                    </Link>
                    <Link
                      href={`/admin/blogs/${post.slug}/edit`}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/blogs/${post.slug}/image-prompts`}
                      className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-100"
                    >
                      Prompts
                    </Link>
                    <Link
                      href={`/blog/${post.slug}`}
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

        {posts.length === 0 && (
          <p className="p-10 text-center text-gray-500">
            No posts match this filter.
          </p>
        )}
      </div>

      <Pagination currentPage={safePage} totalPages={totalPages} buildHref={pageHref} />
    </div>
  );
}

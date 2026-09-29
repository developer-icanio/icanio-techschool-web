import Link from "next/link";
import { notFound } from "next/navigation";

import { getBlogBySlug } from "@/lib/blog";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export default async function EditBlogPage({
  params,
}: Props) {
  const { slug } = await params;

  const blog = getBlogBySlug(slug);

  if (!blog) {
    notFound();
  }

  return (
    <div className="space-y-8">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-4xl font-bold">
            Edit Blog
          </h1>

          <p className="mt-2 text-gray-500">
            {blog.title}
          </p>

        </div>

        <Link
          href="/admin/blogs"
          className="rounded-lg border px-5 py-3 hover:bg-gray-100"
        >
          ← Back
        </Link>

      </div>

      <div className="rounded-xl border bg-white p-8">

        <div className="grid grid-cols-2 gap-6">

          <div>
            <label className="mb-2 block font-medium">
              Title
            </label>

            <input
              defaultValue={blog.title}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Slug
            </label>

            <input
              defaultValue={blog.slug}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Category
            </label>

            <input
              defaultValue={blog.category}
              className="w-full rounded-lg border p-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Author
            </label>

            <input
              defaultValue={blog.author}
              className="w-full rounded-lg border p-3"
            />
          </div>

        </div>

        <div className="mt-8">

          <label className="mb-2 block font-medium">
            Description
          </label>

          <textarea
            defaultValue={blog.description}
            rows={5}
            className="w-full rounded-lg border p-3"
          />

        </div>

        <div className="mt-8">

          <label className="mb-2 block font-medium">
            Content
          </label>

          <textarea
            defaultValue={blog.content}
            rows={20}
            className="w-full rounded-lg border p-3 font-mono text-sm"
          />

        </div>

        <div className="mt-8 flex gap-4">

          <button
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Save Changes
          </button>

          <button
            className="rounded-lg border px-6 py-3 hover:bg-gray-100"
          >
            Preview
          </button>

        </div>

      </div>

    </div>
  );
}
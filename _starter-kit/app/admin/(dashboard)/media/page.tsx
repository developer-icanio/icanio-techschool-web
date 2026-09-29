import Image from "next/image";

import { getAllBlogPosts } from "@/lib/blog";

// There is no dedicated media library yet, this pulls every distinct
// coverImage actually referenced across published blog posts so you can
// see what's really in use rather than a mostly-empty local folder.
export default function AdminMediaPage() {
  const posts = getAllBlogPosts();

  const imageUsage = new Map<string, { count: number; title: string }>();
  for (const post of posts) {
    if (!post.coverImage) continue;
    const existing = imageUsage.get(post.coverImage);
    if (existing) {
      existing.count += 1;
    } else {
      imageUsage.set(post.coverImage, { count: 1, title: post.title });
    }
  }

  const images = Array.from(imageUsage.entries()).map(([url, info]) => ({
    url,
    ...info,
  }));

  const missingCount = posts.length - images.reduce((sum, i) => sum + i.count, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Media</h1>
        <p className="mt-2 text-gray-500">
          {images.length} cover images in use across {posts.length} posts.{" "}
          {missingCount} posts have no cover image set.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image) => (
          <div
            key={image.url}
            className="overflow-hidden rounded-xl border bg-white shadow-sm"
          >
            <div className="relative aspect-video bg-gray-100">
              <Image
                src={image.url}
                alt={image.title}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover"
              />
            </div>

            <div className="p-3">
              <p className="truncate text-sm font-medium" title={image.title}>
                {image.title}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Used on {image.count} post{image.count === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <p className="rounded-xl border bg-white p-10 text-center text-gray-500">
          No cover images found.
        </p>
      )}
    </div>
  );
}

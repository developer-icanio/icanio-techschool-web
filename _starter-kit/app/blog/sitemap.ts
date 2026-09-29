import type { MetadataRoute } from "next";
import { getAllBlogPosts } from "@/lib/blog";
import { getRequestBaseUrl } from "@/lib/requestUrl";

// Split out from the root sitemap so blog growth never touches the core
// pages file. getAllBlogPosts() already excludes drafts.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getRequestBaseUrl();
  const posts = getAllBlogPosts();

  return posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt || post.publishedAt,
    changeFrequency: "monthly",
    priority: 0.6,
  }));
}

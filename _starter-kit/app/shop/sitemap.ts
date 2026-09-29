import type { MetadataRoute } from "next";
import { getAllProductSlugs, getAllCategorySlugs } from "@/lib/products";
import { getRequestBaseUrl } from "@/lib/requestUrl";

// Split out from the root sitemap so catalog growth never touches the core
// pages file. Covers both /shop/[slug] products and /shop/category/[slug].
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [baseUrl, productSlugs, categorySlugs] = await Promise.all([
    getRequestBaseUrl(),
    getAllProductSlugs(),
    getAllCategorySlugs(),
  ]);

  const products: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${baseUrl}/shop/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const categories: MetadataRoute.Sitemap = categorySlugs.map((slug) => ({
    url: `${baseUrl}/shop/category/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...categories, ...products];
}

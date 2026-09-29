import { getAllBlogPosts } from "@/lib/blog";
import { getAllCategoriesWithCounts, categoryLeafName } from "@/lib/products";

const SITE_URL = "https://lamblily.com";

// A markdown index for LLMs and AI answer engines, per the llms.txt
// convention (llmstxt.org). Generated at request time from the same data
// sources as the sitemaps, so it can never drift out of sync with what's
// actually published. Curated for the static/company sections (the
// product category taxonomy has ~95 mostly single-item SEO groups that
// would add noise, not signal, here) but exhaustive for blog posts, since
// that's the content this file exists to make cheaply indexable.
//
// This site is B2C/retail-storefront-only — the manufacturing, OEM,
// industries, and export-market content that used to live here now lives
// entirely on export.lamblily.com, a separate B2B site, so it's a single
// link here rather than a duplicated set of sections.
function decodeEntities(text: string): string {
  return text.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

export const revalidate = 86400;

export async function GET() {
  const posts = getAllBlogPosts();
  const allCategories = await getAllCategoriesWithCounts();
  // Only categories with real products assigned — the taxonomy has ~95
  // rows total but products are only actually assigned to a handful of
  // them (see lib/products.ts comment above), so this stays real and
  // useful instead of listing dozens of empty categories.
  const categoriesWithProducts = allCategories
    .filter((c) => c.productCount > 0)
    .sort((a, b) => b.productCount - a.productCount);

  const byCategory = new Map<string, typeof posts>();
  for (const post of posts) {
    const category = decodeEntities(post.category);
    const list = byCategory.get(category) ?? [];
    list.push(post);
    byCategory.set(category, list);
  }

  const categorySections = [...byCategory.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([category, categoryPosts]) => {
      const links = categoryPosts
        .map((post) => `- [${post.title}](${SITE_URL}/blog/${post.slug})`)
        .join("\n");
      return `### ${category}\n\n${links}`;
    })
    .join("\n\n");

  const body = `# LAMBLILY

> LAMBLILY is a direct-to-consumer kidswear brand selling 100% cotton children's clothing (ages 0-16) online, shipping across India with fast Tamil Nadu delivery, easy returns, and secure checkout.

## Shop

100% cotton kidswear for ages 0-16: t-shirts, shorts, and dress sets for boys and girls.

- [Full Product Catalog](${SITE_URL}/shop)
${categoriesWithProducts
  .map((c) => `- [${categoryLeafName(c.name)}](${SITE_URL}/shop/category/${c.slug}): ${c.productCount} product${c.productCount === 1 ? "" : "s"}`)
  .join("\n")}

## Company

- [About LAMBLILY](${SITE_URL}/about)
- [Sustainability](${SITE_URL}/sustainability): LAMBLILY's approach to people, planet, and product, and the Seedleaf sustainable fashion brand.
- [Blog Index](${SITE_URL}/blog)
- [Contact](${SITE_URL}/contact)

## Wholesale & Export

- [export.lamblily.com](https://export.lamblily.com): LAMBLILY's separate B2B site for OEM manufacturing, private label, and export buyers - not part of this consumer storefront.

## Blog: Guides & Resources

${categorySections}

## Optional

- [XML Sitemap: Core Pages](${SITE_URL}/sitemap.xml)
- [XML Sitemap: Blog](${SITE_URL}/blog/sitemap.xml)
- [XML Sitemap: Shop](${SITE_URL}/shop/sitemap.xml)
- [Human-Readable Sitemap](${SITE_URL}/sitemap)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}

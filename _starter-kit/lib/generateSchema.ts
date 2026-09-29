import { BlogPost } from "@/types/blog";
import type { ProductWithDetails } from "@/lib/products";

export const SITE_URL = "https://lamblily.com";
export const SITE_NAME = "LAMBLILY";
const LOGO_URL = `${SITE_URL}/images/logo/lamblily-logo.png`;

function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
}

// Declares the site's canonical entity/name/URL — helps establish brand
// recognition for both classic SEO and GEO (an AI engine resolving "what
// site is this" benefits from an explicit, unambiguous statement as much
// as a human would). Deliberately has no potentialAction/SearchAction:
// the shop has filters but no free-text search endpoint yet, and
// declaring a SearchAction for a feature that doesn't exist is a Search
// Console violation, not an optimization — add it once real search ships.
export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    legalName: "LAMBLILY PRIVATE LIMITED",
    url: SITE_URL,
    logo: LOGO_URL,
    address: {
      "@type": "PostalAddress",
      streetAddress: "16 Vallalar Street, Saraswathy Nagar, Vandalur",
      addressLocality: "Chennai",
      addressRegion: "Tamil Nadu",
      postalCode: "600048",
      addressCountry: "IN",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: "contact@lamblily.com",
        contactType: "sales",
      },
      {
        "@type": "ContactPoint",
        email: "lamblilyprivatelimited@gmail.com",
        contactType: "sales",
      },
    ],
  };
}

export function buildArticleSchema(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: post.coverImage ? [absoluteUrl(post.coverImage)] : undefined,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt || post.publishedAt || undefined,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": post.canonicalUrl || absoluteUrl(`/blog/${post.slug}`),
    },
  };
}

export function buildBreadcrumbSchema(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: absoluteUrl("/blog"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: absoluteUrl(`/blog/${post.slug}`),
      },
    ],
  };
}

// Generic breadcrumb builder for any page with a visible breadcrumb trail
// (buildBreadcrumbSchema above is blog-specific — hardcoded to the fixed
// Home > Blog > Post shape). Category and product pages render a real
// breadcrumb nav already; this just gives it matching structured data so
// Google can show the breadcrumb rich snippet in search results.
export interface BreadcrumbItem {
  name: string;
  path: string; // relative, e.g. "/shop" or "/shop/category/boys"
}

export function buildBreadcrumbListSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      ...items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: item.name,
        item: absoluteUrl(item.path),
      })),
    ],
  };
}

export interface FAQItem {
  question: string;
  answer: string;
}

export function extractFAQs(content: string): FAQItem[] {
  const faqHeadingMatch = content.match(
    /^##\s+Frequently Asked Questions\s*$/im
  );
  if (!faqHeadingMatch || faqHeadingMatch.index === undefined) return [];

  const afterHeading = content.slice(
    faqHeadingMatch.index + faqHeadingMatch[0].length
  );
  const nextHeadingMatch = afterHeading.match(/^##\s+/m);
  const faqSection =
    nextHeadingMatch && nextHeadingMatch.index !== undefined
      ? afterHeading.slice(0, nextHeadingMatch.index)
      : afterHeading;

  const blocks = faqSection
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const faqs: FAQItem[] = [];
  for (let i = 0; i < blocks.length - 1; i++) {
    const questionMatch = blocks[i].match(/^\*\*(.+)\*\*$/);
    if (questionMatch) {
      faqs.push({
        question: stripMarkdown(questionMatch[1]),
        answer: stripMarkdown(blocks[i + 1]),
      });
      i++;
    }
  }
  return faqs;
}

// Product pages had no structured data at all — this is what lets Google
// show price/availability/rating rich snippets in search results instead
// of a plain blue link. One Offer per active variant (so buyers searching
// for a specific size/color see a matching price), or an AggregateOffer
// when prices vary, matching schema.org's guidance for variant pricing.
export function buildProductSchema(
  product: ProductWithDetails,
  rating?: { average: number; count: number }
) {
  const activeVariants = product.variants.filter((v) => v.stock >= 0);
  const prices = activeVariants.map((v) => parseFloat(v.price));
  const inStock = activeVariants.some((v) => v.stock > 0);
  const availability = inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

  const offers =
    prices.length === 0
      ? undefined
      : new Set(prices).size === 1
        ? {
            "@type": "Offer",
            priceCurrency: "INR",
            price: prices[0].toFixed(2),
            availability,
            url: absoluteUrl(`/shop/${product.slug}`),
          }
        : {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice: Math.min(...prices).toFixed(2),
            highPrice: Math.max(...prices).toFixed(2),
            offerCount: activeVariants.length,
            availability,
          };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    // Prefer the short, clean metaDescription over the raw body copy —
    // product descriptions here run to several paragraphs including
    // "Key Features"/spec-block sections, which is fine for the page but
    // too long and unstructured for a schema description field.
    description: product.metaDescription || product.description || undefined,
    sku: product.sku ?? undefined,
    image: product.images.length > 0 ? product.images.map((img) => absoluteUrl(img.url)) : undefined,
    category: product.categoryName ?? undefined,
    // A freshness signal for AI answer engines/GEO — when this listing's
    // data (price, stock, description, etc.) last actually changed.
    dateModified: product.updatedAt ? product.updatedAt.toISOString() : undefined,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers,
    ...(rating && rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.average.toFixed(1),
            reviewCount: rating.count,
          },
        }
      : {}),
  };
}

// SpeakableSpecification — tells voice assistants (chiefly Google
// Assistant) which on-page elements are suited to being read aloud.
// Narrow benefit today (Google Assistant's own reach has shrunk, and no
// other major assistant has adopted it), but it's a real, low-cost
// addition, not a fabricated one: it targets the FAQ answer text, which
// is exactly the concise, self-contained content type this property is
// meant for. Only the first FAQ answer is actually present in the
// server-rendered HTML (the accordion only mounts the open one), so the
// selector will only ever resolve to that one paragraph — an honest
// reflection of what's really speakable on the page, not an overclaim.
export function buildSpeakableSchema(path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: absoluteUrl(path),
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".speakable-answer"],
    },
  };
}

export function buildFAQSchema(faqs: FAQItem[]) {
  if (faqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

// The document shape lib/seo scores. Blog posts map onto it directly;
// other page types (service pillars etc.) build one from their content so
// the same 69 rules apply site-wide.
export interface BlogPost {
  title: string; // page H1
  slug: string;
  content: string; // markdown of the rendered page copy
  focusKeyword?: string;
  secondaryKeywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  robots?: string;
  openGraphImage?: string;
  twitterCard?: string;
  coverImage?: string;
  video?: string;
  gallery?: string[];
  /** Article schema, or the page's primary entity (e.g. Service) on non-blog pages. */
  articleSchema?: object;
  faqSchema?: object;
  breadcrumbSchema?: object;
  organizationSchema?: object;
  productSchema?: object;
  author: string;
  publishedAt: string;
  updatedAt?: string;
}

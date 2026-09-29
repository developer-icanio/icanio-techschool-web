import type { BlogPost } from "@/types/blog";
import type { RuleResult } from "./types";

export function analyzeSchema(
  blog: BlogPost
): RuleResult[] {

  const rules: RuleResult[] = [];

  // ==========================================
  // Article Schema
  // ==========================================

  rules.push({
    id: "article-schema",
    category: "Schema",
    name: "Article Schema",
    description:
      "Every blog should include Article schema.",
    priority: "Critical",
    earned:
      blog.articleSchema ? 5 : 0,
    total: 5,
    passed:
      Boolean(blog.articleSchema),
    value:
      blog.articleSchema
        ? "Present"
        : "Missing",
    expected:
      "Article Schema",
    recommendation:
      "Add Article JSON-LD schema.",
  });

  // ==========================================
  // FAQ Schema
  // ==========================================

  rules.push({
    id: "faq-schema",
    category: "Schema",
    name: "FAQ Schema",
    description:
      "FAQ schema helps rich search results.",
    priority: "High",
    earned:
      blog.faqSchema ? 4 : 0,
    total: 4,
    passed:
      Boolean(blog.faqSchema),
    value:
      blog.faqSchema
        ? "Present"
        : "Missing",
    expected:
      "FAQ Schema",
    recommendation:
      "Generate FAQ schema.",
  });

  // ==========================================
  // Breadcrumb Schema
  // ==========================================

  rules.push({
    id: "breadcrumb-schema",
    category: "Schema",
    name: "Breadcrumb Schema",
    description:
      "Breadcrumb schema improves navigation.",
    priority: "Medium",
    earned:
      blog.breadcrumbSchema ? 3 : 0,
    total: 3,
    passed:
      Boolean(blog.breadcrumbSchema),
    value:
      blog.breadcrumbSchema
        ? "Present"
        : "Missing",
    expected:
      "Breadcrumb Schema",
    recommendation:
      "Add Breadcrumb schema.",
  });

  // ==========================================
  // Organization Schema
  // ==========================================

  rules.push({
    id: "organization-schema",
    category: "Schema",
    name: "Organization Schema",
    description:
      "Organization schema identifies your brand.",
    priority: "Medium",
    earned:
      blog.organizationSchema ? 3 : 0,
    total: 3,
    passed:
      Boolean(blog.organizationSchema),
    value:
      blog.organizationSchema
        ? "Present"
        : "Missing",
    expected:
      "Organization Schema",
    recommendation:
      "Add Organization schema.",
  });

  // ==========================================
  // Product Schema
  // ==========================================

  rules.push({
    id: "product-schema",
    category: "Schema",
    name: "Product Schema",
    description:
      "Use Product schema when applicable.",
    priority: "Low",
    earned:
      blog.productSchema ? 2 : 0,
    total: 2,
    passed:
      Boolean(blog.productSchema),
    value:
      blog.productSchema
        ? "Present"
        : "Missing",
    expected:
      "Product Schema",
    recommendation:
      "Add Product schema where relevant.",
  });

  // ==========================================
  // Combined Schema Coverage
  // ==========================================

  const schemaCount = [
    blog.articleSchema,
    blog.faqSchema,
    blog.breadcrumbSchema,
    blog.organizationSchema,
    blog.productSchema,
  ].filter(Boolean).length;

  rules.push({
    id: "schema-coverage",
    category: "Schema",
    name: "Schema Coverage",
    description:
      "Overall structured data coverage.",
    priority: "Medium",
    earned:
      schemaCount >= 4
        ? 3
        : schemaCount >= 2
        ? 2
        : schemaCount >= 1
        ? 1
        : 0,
    total: 3,
    passed:
      schemaCount >= 4,
    value:
      `${schemaCount}/5`,
    expected:
      "4+ schema types",
    recommendation:
      "Increase structured data coverage.",
  });

  return rules;

}
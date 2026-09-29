import "server-only";
import { allPages, getPage } from "@/lib/content/pages";
import { seoDocumentOf } from "@/lib/content/seo-document";
import type { PageContent } from "@/lib/content/types";
import { analyzeBlog } from "@/lib/seo/analyzer";
import { SITE } from "@/lib/site";

// Runs the 69-rule engine (lib/seo) over the live content for the admin
// scoreboard. Same inputs as `npm run audit:seo`, so scores always match.

export const KIND_LABEL: Record<PageContent["kind"], string> = {
  home: "Home",
  hub: "Hub",
  internship: "Internship",
  program: "Student program",
  college: "College program",
  page: "About and results",
  guide: "Career guide",
};

/** URL-safe key for a page path ("/" becomes "home"). */
export const keyOf = (path: string) => (path === "/" ? "home" : path.slice(1));
export const pathOfKey = (segments: string[]) => (segments.join("/") === "home" ? "/" : `/${segments.join("/")}`);

function run(p: PageContent) {
  const doc = seoDocumentOf(p);
  const a = analyzeBlog(doc);
  const words = doc.content.split(/\s+/).filter(Boolean).length;
  return { p, doc, a, words };
}

export function scoreboard() {
  const rows = allPages().map((page) => {
    const { p, doc, a, words } = run(page);
    return {
      path: p.path,
      key: keyOf(p.path),
      label: p.label,
      kind: p.kind,
      focusKeyword: p.seo.focusKeyword,
      metaTitle: `${p.seo.metaTitle}${SITE.titleSuffix}`,
      score: a.overallScore,
      passed: a.passedRules,
      total: a.rules.length,
      words,
      density: a.rules.find((r) => r.id === "keyword-density")?.value ?? "",
      updatedAt: p.seo.updatedAt,
      categories: a.categoryScores.map((c) => ({ category: c.category, percentage: c.percentage })),
      failed: a.rules.filter((r) => !r.passed).map((r) => ({ id: r.id, name: r.name, lost: r.total - r.earned, priority: r.priority })),
      links: (doc.content.match(/\]\(\//g) ?? []).length,
    };
  });

  // Which rules fail most often across the site.
  const ruleFails = new Map<string, { name: string; pages: string[]; lost: number }>();
  for (const r of rows)
    for (const f of r.failed) {
      const x = ruleFails.get(f.id) ?? { name: f.name, pages: [], lost: 0 };
      x.pages.push(r.path);
      x.lost += f.lost;
      ruleFails.set(f.id, x);
    }

  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0;
  return {
    rows,
    averageScore: avg,
    perfect: rows.filter((r) => r.score === 100).length,
    needsWork: rows.filter((r) => r.score < 90).length,
    totalWords: rows.reduce((s, r) => s + r.words, 0),
    topFailures: [...ruleFails.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.pages.length - a.pages.length),
  };
}

export function pageReport(path: string) {
  const page = getPage(path);
  if (!page) return null;
  const { p, doc, a, words } = run(page);
  const h2 = (doc.content.match(/^## .+$/gm) ?? []).map((h) => h.slice(3));
  return {
    page: p,
    audit: a,
    words,
    headings: h2,
    title: `${p.seo.metaTitle}${SITE.titleSuffix}`,
    url: `${SITE.url}${p.path === "/" ? "" : p.path}`,
    internalLinks: (doc.content.match(/\]\(\//g) ?? []).length,
    externalLinks: (doc.content.match(/\]\(https?:\/\//g) ?? []).length,
    images: (doc.content.match(/!\[[^\]]*]\([^)]*\)/g) ?? []).length,
    markdown: doc.content,
  };
}

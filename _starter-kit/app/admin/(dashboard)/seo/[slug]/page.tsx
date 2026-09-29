import { notFound } from "next/navigation";
import Link from "next/link";

import { getBlogBySlug } from "@/lib/blog";
import { analyzeBlog } from "@/lib/seo/analyzer";
import { getSeoStatus } from "@/lib/seo/score";

import SEOScoreCard from "@/components/admin/seo/SEOScoreCard";
import SEORuleTable from "@/components/admin/seo/SEORuleTable";
import SEOIssuesTable from "@/components/admin/seo/SEOIssuesTable";
import SEOPriorityFixes from "@/components/admin/seo/SEOPriorityFixes";
import SEOContentAnalysis from "@/components/admin/seo/SEOContentAnalysis";
import SEOMetadata from "@/components/admin/seo/SEOMetadata";
import SEOSchema from "@/components/admin/seo/SEOSchema";
import SEOAIRecommendations from "@/components/admin/seo/SEOAIRecommendations";
import BlogInformation from "@/components/admin/seo/BlogInformation";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function BlogSEOPage({
  params,
}: PageProps) {
  const { slug } = await params;

  const blog = getBlogBySlug(slug);

  if (!blog) {
    notFound();
  }

  const report = analyzeBlog(blog);

  const status = getSeoStatus(report.overallScore);

  const issues = report.rules
    .filter((rule) => !rule.passed)
    .map((rule) => ({
      type:
        rule.priority === "Critical" ||
        rule.priority === "High"
          ? ("error" as const)
          : ("warning" as const),
      field: rule.name,
      message: `${rule.description} Current: ${rule.value}. Expected: ${rule.expected}.`,
      recommendation: rule.recommendation,
    }));

  const ruleCount = (id: string) =>
    Number(
      report.rules.find((rule) => rule.id === id)
        ?.value ?? 0
    );

  const aiRecommendations = issues.map((issue) => ({
    title: issue.field,
    description: issue.recommendation,
    priority:
      issue.type === "error"
        ? ("High" as const)
        : ("Medium" as const),
  }));

  return (
    <div className="space-y-8">

      {/* ============================
          PAGE HEADER
      ============================ */}

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-4xl font-bold">
            SEO Audit Report
          </h1>

          <p className="mt-2 text-gray-500">
            {blog.title}
          </p>

        </div>

        <Link
          href="/admin/seo"
          className="rounded-lg border px-5 py-3 hover:bg-gray-100"
        >
          ← Back to Dashboard
        </Link>

      </div>

      {/* ============================
          SCORE CARD
      ============================ */}

      <SEOScoreCard
        score={report.overallScore}
        status={status}
        passed={report.passedRules}
        failed={report.failedRules}
        totalRules={report.rules.length}
      />

      {/* ============================
          SUMMARY
      ============================ */}

      <div className="grid grid-cols-4 gap-5">

        <SummaryCard
          title="SEO Score"
          value={`${report.overallScore}`}
          subtitle="/100"
          color="text-blue-600"
        />

        <SummaryCard
          title="Points Earned"
          value={`${report.earnedPoints}`}
          subtitle={`of ${report.totalPoints}`}
          color="text-green-600"
        />

        <SummaryCard
          title="Passed Rules"
          value={`${report.passedRules}`}
          subtitle={`${report.rules.length} Total`}
          color="text-emerald-600"
        />

        <SummaryCard
          title="Failed Rules"
          value={`${report.failedRules}`}
          subtitle="Needs Attention"
          color="text-red-600"
        />

      </div>      
      {/* ============================
          SCORE BREAKDOWN
      ============================ */}

      <SEORuleTable
        rules={report.rules.map((rule) => ({
          name: rule.name,
          earned: rule.earned,
          total: rule.total,
          passed: rule.passed,
          value: rule.value,
        }))}
      />

      {/* ============================
          ISSUES & PRIORITY
      ============================ */}

      <div className="grid gap-8 lg:grid-cols-2">

        <SEOIssuesTable
          issues={issues}
        />

        <SEOPriorityFixes
          issues={issues}
        />

      </div>

      {/* ============================
          SCORE CALCULATION
      ============================ */}

      <div className="rounded-xl border bg-white shadow-sm">

        <div className="border-b px-6 py-5">

          <h2 className="text-2xl font-bold">
            Score Calculation
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Understand exactly how this SEO score was calculated.
          </p>

        </div>

        <div className="overflow-x-auto">

          <table className="min-w-full">

            <thead>

              <tr className="bg-gray-100">

                <th className="p-4 text-left">
                  Rule
                </th>

                <th className="p-4 text-center">
                  Available
                </th>

                <th className="p-4 text-center">
                  Earned
                </th>

                <th className="p-4 text-center">
                  Status
                </th>

              </tr>

            </thead>

            <tbody>

              {report.rules.map((rule) => (

                <tr
                  key={rule.id}
                  className="border-t hover:bg-gray-50"
                >

                  <td className="p-4">

                    <div className="font-medium">
                      {rule.name}
                    </div>

                    <div className="text-sm text-gray-500">
                      {rule.category}
                    </div>

                  </td>

                  <td className="p-4 text-center">

                    {rule.total}

                  </td>

                  <td className="p-4 text-center font-bold">

                    {rule.earned}

                  </td>

                  <td className="p-4 text-center">

                    {rule.passed ? (

                      <span className="rounded bg-green-100 px-3 py-1 text-green-700">

                        PASS

                      </span>

                    ) : (

                      <span className="rounded bg-red-100 px-3 py-1 text-red-700">

                        FAIL

                      </span>

                    )}

                  </td>

                </tr>

              ))}

            </tbody>

            <tfoot>

              <tr className="border-t bg-gray-100 font-bold">

                <td className="p-4">

                  Total

                </td>

                <td className="p-4 text-center">

                  {report.totalPoints}

                </td>

                <td className="p-4 text-center">

                  {report.earnedPoints}

                </td>

                <td className="p-4 text-center">

                  {report.overallScore}%

                </td>

              </tr>

            </tfoot>

          </table>

        </div>

      </div>
            {/* ==========================================
          BLOG INFORMATION
      ========================================== */}

<BlogInformation
        title={blog.title}
        slug={blog.slug}
        category={blog.category}
        author={blog.author}
        publishedAt={blog.publishedAt}
        updatedAt={blog.updatedAt}
        readingTime={blog.readingTime}
        wordCount={blog.wordCount}
        coverImage={blog.coverImage}
        featured={blog.featured}
        draft={blog.draft}
      />

      {/* ==========================================
          CONTENT ANALYSIS
      ========================================== */}

      <SEOContentAnalysis
        wordCount={blog.wordCount}
        readingTime={blog.readingTime}

        headings={ruleCount("headings")}

        paragraphs={
          blog.content
            .split("\n\n")
            .filter(
              (p) =>
                p.trim().length > 0
            ).length
        }

        images={ruleCount("image-count")}

        internalLinks={ruleCount("internal-links")}

        externalLinks={ruleCount("external-links")}

        tables={
          (
            blog.content.match(
              /\|.*\|/g
            ) || []
          ).length
        }

        lists={ruleCount("ai-lists")}
      />

      {/* ==========================================
          SEO METADATA
      ========================================== */}

      <SEOMetadata
        metaTitle={blog.metaTitle}
        metaDescription={
          blog.metaDescription
        }
        focusKeyword={
          blog.focusKeyword
        }
        canonicalUrl={
          blog.canonicalUrl
        }
        robots={blog.robots}
        openGraph={
          blog.coverImage || ""
        }
        twitterCard={
          blog.coverImage || ""
        }
      />      {/* ==========================================
        SCHEMA
    ========================================== */}

    <SEOSchema
      articleSchema={Boolean(blog.articleSchema)}
      faqSchema={Boolean(blog.faqSchema)}
      breadcrumbSchema={Boolean(blog.breadcrumbSchema)}
      organizationSchema={Boolean(blog.organizationSchema)}
      productSchema={Boolean(blog.productSchema)}
    />

    {/* ==========================================
        AI RECOMMENDATIONS
    ========================================== */}

    <SEOAIRecommendations
      recommendations={aiRecommendations}
    />

  </div>
);
}

/* ==========================================
 SUMMARY CARD
========================================== */

function SummaryCard({
title,
value,
subtitle,
color,
}: {
title: string;
value: string;
subtitle: string;
color: string;
}) {
return (
  <div className="rounded-xl border bg-white p-5 shadow-sm">

    <p className="text-sm text-gray-500">
      {title}
    </p>

    <h2
      className={`mt-3 text-5xl font-bold ${color}`}
    >
      {value}
    </h2>

    <p className="mt-2 text-sm text-gray-500">
      {subtitle}
    </p>

  </div>
);
}
import { notFound } from "next/navigation";
import Link from "next/link";
import { sitePages } from "../page";

interface PageProps {
  searchParams: Promise<{ path?: string }>;
}

export default async function PagePromptsPage({ searchParams }: PageProps) {
  const { path } = await searchParams;
  const sitePage = sitePages.find((p) => p.path === path);
  if (!sitePage) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/pages" className="text-sm text-slate-500 hover:underline">
          &larr; Back to Pages
        </Link>
        <h1 className="mt-2 text-4xl font-bold">{sitePage.name}</h1>
        <p className="mt-2 text-gray-500">
          Suggested prompts for &quot;{sitePage.name}&quot; ({sitePage.path}). Paste into an LLM or
          image generator, then use the result to fill in{" "}
          <Link href={`/admin/pages/edit?path=${encodeURIComponent(sitePage.path)}`} className="text-blue-600 hover:underline">
            this page&apos;s SEO fields
          </Link>{" "}
          or edit the page&apos;s source directly for anything beyond title/description.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900">Meta Title &amp; Description</h2>
        <p className="mt-2 text-sm text-gray-600">
          Write a meta title (under 60 characters) and meta description (under 160 characters) for
          the &quot;{sitePage.name}&quot; page of LAMBLILY, a direct-to-consumer kidswear brand.
          Make the title specific to what this page is about rather than generic, and the
          description should give someone a clear reason to click through from search results,
          without keyword stuffing.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900">Open Graph / Social Share Image</h2>
        <p className="mt-2 text-sm text-gray-600">
          A clean, on-brand social share image for LAMBLILY&apos;s &quot;{sitePage.name}&quot; page
          - soft pastel background, the LAMBLILY brand colours (teal #57D5ED and pink #FF75AD),
          no dense body text, 1200x630px, editorial e-commerce style. Kids&apos; clothing brand,
          not a photo of an actual child&apos;s face.
        </p>
      </div>
    </div>
  );
}

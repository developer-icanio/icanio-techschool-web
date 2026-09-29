import { notFound } from "next/navigation";
import Link from "next/link";
import { getPageSeoOverride } from "@/lib/pageSeo";
import { sitePages } from "../page";
import PageSeoForm from "./PageSeoForm";

interface PageProps {
  searchParams: Promise<{ path?: string }>;
}

// Uses a ?path= query param rather than a dynamic route segment — these
// site paths contain slashes ("/about/founders"), which a plain [slug]
// segment can't hold, and a catch-all would collide with /admin/pages
// itself. Simpler to just carry the path as a param.
export default async function PageSeoEditPage({ searchParams }: PageProps) {
  const { path } = await searchParams;
  const sitePage = sitePages.find((p) => p.path === path);
  if (!sitePage) notFound();

  const override = await getPageSeoOverride(sitePage.path);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/pages" className="text-sm text-slate-500 hover:underline">
          &larr; Back to Pages
        </Link>
        <h1 className="mt-2 text-4xl font-bold">{sitePage.name}</h1>
        <p className="mt-2 text-gray-500">
          {sitePage.path} &mdash; {sitePage.note}. Overrides the hardcoded meta title/description
          in that file&apos;s <code className="rounded bg-gray-100 px-1.5 py-0.5">metadata</code>{" "}
          export; leave a field blank to fall back to the page&apos;s own default.
        </p>
      </div>

      <div className="max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
        <PageSeoForm
          path={sitePage.path}
          metaTitle={override?.metaTitle ?? ""}
          metaDescription={override?.metaDescription ?? ""}
        />
      </div>

      <Link
        href={`/admin/pages/prompts?path=${encodeURIComponent(sitePage.path)}`}
        className="inline-block text-sm text-blue-600 hover:underline"
      >
        See suggested prompts for this page &rarr;
      </Link>
    </div>
  );
}

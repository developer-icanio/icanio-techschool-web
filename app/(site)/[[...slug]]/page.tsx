import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageView from "@/components/page/PageView";
import { filePages, getPage } from "@/lib/content/pages";
import { ensureContent } from "@/lib/content/store";
import { imagesOf } from "@/lib/content/seo-document";
import { SITE } from "@/lib/site";

// Every content page (content/pages/**/*.json) renders through this route.

export const dynamicParams = false;

export function generateStaticParams() {
  return filePages().map((p) => ({ slug: p.path === "/" ? [] : p.path.slice(1).split("/") }));
}

const pathOf = (slug?: string[]) => (slug?.length ? `/${slug.join("/")}` : "/");

export async function generateMetadata({ params }: PageProps<"/[[...slug]]">): Promise<Metadata> {
  const { slug } = await params;
  await ensureContent();
  const p = getPage(pathOf(slug));
  if (!p) return {};
  const og = imagesOf(p)[0];
  return {
    title: p.path === "/" ? { absolute: `${p.seo.metaTitle}${SITE.titleSuffix}` } : p.seo.metaTitle,
    description: p.seo.metaDescription,
    keywords: [p.seo.focusKeyword, ...p.seo.secondaryKeywords],
    alternates: { canonical: p.path },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    authors: [{ name: SITE.author }],
    openGraph: {
      type: p.kind === "guide" ? "article" : "website",
      siteName: SITE.name,
      locale: "en_IN",
      url: p.path,
      title: p.seo.metaTitle,
      description: p.seo.metaDescription,
      images: [{ url: og.src, alt: og.alt }],
      ...(p.kind === "guide" ? { publishedTime: p.seo.publishedAt, modifiedTime: p.seo.updatedAt } : {}),
    },
    twitter: { card: "summary_large_image", site: "@Icanio_Techsch", title: p.seo.metaTitle, description: p.seo.metaDescription, images: [og.src] },
  };
}

export default async function Page({ params }: PageProps<"/[[...slug]]">) {
  const { slug } = await params;
  await ensureContent();
  const p = getPage(pathOf(slug));
  if (!p) notFound();
  return <PageView p={p} />;
}

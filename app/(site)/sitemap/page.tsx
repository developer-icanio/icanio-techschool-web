import type { Metadata } from "next";
import Link from "next/link";
import { allPages } from "@/lib/content/pages";
import { ensureContent } from "@/lib/content/store";

export const metadata: Metadata = { title: "Sitemap", description: "Every page on the Icanio Tech School website, grouped by section.", alternates: { canonical: "/sitemap" } };

const GROUPS: [string, string[]][] = [
  ["Start here", ["home", "hub"]],
  ["Internships", ["internship"]],
  ["Programs", ["program", "college"]],
  ["Career guides", ["guide"]],
  ["About and results", ["page"]],
];

export default async function SitemapPage() {
  await ensureContent();
  const pages = allPages();
  return (
    <main className="shell py-14">
      <h1 className="text-4xl font-bold">Sitemap</h1>
      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        {GROUPS.map(([title, kinds]) => (
          <section key={title}>
            <h2 className="text-xl font-semibold">{title}</h2>
            <ul className="mt-3 space-y-1.5">
              {pages.filter((p) => kinds.includes(p.kind)).map((p) => (
                <li key={p.path}><Link href={p.path} className="text-navy hover:underline">{p.label}</Link></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { ScorePill } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";
import { scoreboard } from "@/lib/seo-report";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Sitemap and robots" };

// Shows what /robots.txt and /sitemap.xml serve, built from the same code.
function robotsText() {
  const r = robots();
  const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
  const lines: string[] = [];
  for (const rule of rules) {
    for (const ua of [rule.userAgent ?? "*"].flat()) lines.push(`User-Agent: ${ua}`);
    for (const a of [rule.allow ?? []].flat()) lines.push(`Allow: ${a}`);
    for (const d of [rule.disallow ?? []].flat()) lines.push(`Disallow: ${d}`);
    lines.push("");
  }
  if (r.host) lines.push(`Host: ${r.host}`);
  for (const s of [r.sitemap ?? []].flat()) lines.push(`Sitemap: ${s}`);
  return lines.join("\n");
}

const LINKS = [
  { href: "/sitemap.xml", label: "sitemap.xml", note: "For Google, Bing and other search engines" },
  { href: "/robots.txt", label: "robots.txt", note: "Crawl rules, including AI crawlers" },
  { href: "/llms.txt", label: "llms.txt", note: "Plain-language site map for AI assistants" },
  { href: "/sitemap", label: "/sitemap", note: "Human-readable sitemap page" },
];

export default async function SitemapAdmin() {
  await requireAdmin();
  const entries = sitemap();
  const scores = new Map(scoreboard().rows.map((r) => [`${SITE.url}${r.path === "/" ? "" : r.path}`, r.score]));
  const images = entries.reduce((n, e) => n + (e.images?.length ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Sitemap and robots</h1>
        <p className="mt-1 text-body">Generated automatically from the page content, so a new page appears here as soon as it is added.</p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" className="block h-full rounded-2xl border border-line bg-white p-5 hover:border-navy/40">
              <p className="font-semibold text-navy">{l.label} ↗</p>
              <p className="mt-1 text-sm text-muted">{l.note}</p>
            </a>
          </li>
        ))}
      </ul>

      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="text-lg font-semibold">Submit to search engines</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-body">
          <li>Google Search Console: add the property {SITE.url}, open Sitemaps and submit <code className="rounded bg-soft px-1">{SITE.url}/sitemap.xml</code>.</li>
          <li>Bing Webmaster Tools: import the site from Search Console or submit the same URL. Bing also feeds ChatGPT search and Copilot.</li>
          <li>No need to resubmit after edits: search engines re-read the sitemap and use each page&apos;s last-modified date.</li>
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section className="rounded-2xl border border-line bg-white p-6">
          <h2 className="text-lg font-semibold">robots.txt</h2>
          <p className="mt-1 text-sm text-muted">Everything is crawlable except /api and /admin. Named AI crawlers are explicitly allowed (AEO and GEO).</p>
          <pre className="mt-4 max-h-[520px] overflow-auto rounded-xl bg-soft p-4 text-xs leading-relaxed text-heading">{robotsText()}</pre>
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-line px-6 py-4">
            <h2 className="text-lg font-semibold">sitemap.xml</h2>
            <p className="mt-1 text-sm text-muted">{entries.length} URLs and {images} images.</p>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-soft text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-semibold">URL</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Priority</th>
                  <th scope="col" className="px-4 py-2 font-semibold">Updated</th>
                  <th scope="col" className="px-4 py-2 font-semibold">SEO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {entries.map((e) => {
                  const path = e.url.replace(SITE.url, "") || "/";
                  const score = scores.get(e.url);
                  return (
                    <tr key={e.url}>
                      <td className="px-4 py-2">
                        <a href={path} target="_blank" className="text-navy hover:underline">{path}</a>
                        {e.images?.length ? <span className="ml-2 text-xs text-muted">{e.images.length} img</span> : null}
                      </td>
                      <td className="px-4 py-2 tabular-nums text-body">{e.priority}</td>
                      <td className="px-4 py-2 tabular-nums text-body">{String(e.lastModified ?? "")}</td>
                      <td className="px-4 py-2">{score !== undefined ? <ScorePill score={score} /> : <span className="text-xs text-muted">n/a</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { mediaRows } from "@/lib/media";

export const metadata: Metadata = { title: "Media" };

export default async function Media({ searchParams }: PageProps<"/admin/media">) {
  await requireAdmin();
  const sp = await searchParams;
  const all = mediaRows();
  const pages = [...new Map(all.map((r) => [r.pagePath, r.page])).entries()];
  const page = typeof sp.page === "string" ? sp.page : "";
  const q = typeof sp.q === "string" ? sp.q.toLowerCase() : "";
  const rows = all.filter((r) => (!page || r.pagePath === page) && (!q || `${r.file} ${r.alt} ${r.folder}`.toLowerCase().includes(q)));
  const unique = new Set(all.map((r) => r.url)).size;
  const withKw = all.filter((r) => r.altHasKeyword).length;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Media</h1>
          <p className="mt-1 text-body">Every image on the site, page by page: folder, SEO file name, web address, alt text and size. {unique} images across {pages.length} pages; {withKw} image uses carry the page keyword in their alt text.</p>
        </div>
        <a href={`/admin/media-export${page ? `?page=${encodeURIComponent(page)}` : ""}`} className="btn btn-outline !py-2">Download CSV</a>
      </header>

      <form className="flex flex-wrap gap-2">
        <select name="page" defaultValue={page} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="">All pages</option>
          {pages.map(([p, l]) => <option key={p} value={p}>{l} ({p})</option>)}
        </select>
        <input name="q" defaultValue={q} placeholder="Search file name or alt text" className="min-w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
        <button className="btn btn-primary !py-2">Filter</button>
      </form>

      <p className="text-sm text-muted">Alt text is edited in the section that shows the image: use &ldquo;Edit page&rdquo;. Students, trainers, reviews and college logos are edited in their libraries.</p>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-soft text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="p-3">Image</th>
              <th className="p-3">File and folder</th>
              <th className="p-3">Alt text</th>
              <th className="p-3">Size</th>
              <th className="p-3">Page</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={`${r.pagePath}-${r.url}-${i}`} className="align-top">
                <td className="p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.url.replace(/^https?:\/\/[^/]+(?=\/images\/)/, "")} alt="" loading="lazy" className="h-14 w-20 rounded-md bg-soft object-contain" />
                </td>
                <td className="max-w-xs p-3">
                  <p className="break-all font-medium text-heading">{r.file}</p>
                  <p className="text-xs text-muted">/{r.folder}/</p>
                  <a href={r.url} target="_blank" rel="noopener" className="text-xs text-navy hover:underline">Open image ↗</a>
                </td>
                <td className="max-w-md p-3">
                  <p className="text-heading">{r.alt}</p>
                  <p className={`mt-1 text-xs ${r.altHasKeyword ? "text-emerald-700" : "text-muted"}`}>{r.altHasKeyword ? `✓ includes "${r.keyword}"` : `No "${r.keyword}"`}</p>
                </td>
                <td className="whitespace-nowrap p-3 text-muted">{r.w && r.h ? `${r.w}×${r.h}` : "—"}<br />{r.kb !== undefined ? `${r.kb} KB` : ""}</td>
                <td className="p-3">
                  <p className="text-heading">{r.page}</p>
                  <Link href={`/admin/content${r.pagePath === "/" ? "/home" : r.pagePath}`} className="text-xs font-semibold text-navy hover:underline">Edit page</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-6 text-center text-muted">No images match.</p>}
      </div>
    </div>
  );
}

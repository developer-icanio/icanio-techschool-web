import { getUrlExportItems } from "@/lib/siteContent";

const PLURALS: Record<string, string> = { category: "categories" };

function pluralize(type: string, count: number): string {
  if (count === 1) return type;
  return PLURALS[type] ?? `${type}s`;
}

export default async function UrlExportPage() {
  const items = await getUrlExportItems();
  const published = items.filter((item) => item.status === "published").length;
  const draft = items.length - published;

  const byType = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">URL Export</h1>
        <p className="mt-2 text-gray-500">
          Every URL on the site, generated fresh from current content on each download.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <p className="text-gray-600">
          {items.length} URLs total &mdash; {published} published, {draft} draft.
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {Object.entries(byType)
            .map(([type, count]) => `${count} ${pluralize(type, count)}`)
            .join(" · ")}
        </p>
        <a
          href="/api/admin/url-export"
          className="mt-4 inline-block rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          Download CSV
        </a>
      </div>
    </div>
  );
}

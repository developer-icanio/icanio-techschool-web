import type { Metadata } from "next";
import SpeedTable from "@/components/admin/SpeedTable";
import { requireAdmin } from "@/lib/admin";
import { allPages } from "@/lib/content/pages";
import { hasSpeedKey, latestSpeed, speedBaseUrl } from "@/lib/pagespeed";
import { KIND_LABEL } from "@/lib/seo-report";

export const metadata: Metadata = { title: "PageSpeed" };
// Each Google test takes 10 to 40 seconds.
export const maxDuration = 60;

export default async function Speed() {
  await requireAdmin();
  const latest = (await latestSpeed()) ?? [];
  const pages = allPages().map((p) => ({ path: p.path, label: p.label, kind: KIND_LABEL[p.kind] }));
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">PageSpeed</h1>
        <p className="mt-1 max-w-3xl text-body">
          Google PageSpeed Insights for every page, on mobile and desktop. Tests run on <a href={speedBaseUrl()} target="_blank" className="font-medium text-navy hover:underline">{speedBaseUrl().replace(/^https?:\/\//, "")}</a> and each takes 10 to 40 seconds. Results are saved, so the table always shows the latest run.
        </p>
      </header>
      {!hasSpeedKey() ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Add a PageSpeed API key to run tests.</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Enable the API: <a className="underline" target="_blank" href="https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com">PageSpeed Insights API</a></li>
            <li>Create a key: <a className="underline" target="_blank" href="https://console.cloud.google.com/apis/credentials">Credentials, then Create credentials, then API key</a></li>
            <li>Set <code>GOOGLE_PAGESPEED_API_KEY</code> in .env.local (locally) and in Vercel, then restart or redeploy.</li>
          </ol>
        </div>
      ) : null}
      <SpeedTable pages={pages} initial={latest} canRun={hasSpeedKey()} base={speedBaseUrl()} />
    </div>
  );
}

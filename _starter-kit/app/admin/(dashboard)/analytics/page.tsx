export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Analytics</h1>
        <p className="mt-2 text-gray-500">
          Traffic and engagement data for the site.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-10 text-center shadow-sm">
        <p className="text-2xl font-bold text-gray-400">Coming Soon</p>
        <p className="mt-3 text-gray-500">
          No analytics provider is connected yet. Once one is wired in
          (Google Analytics, Plausible, or similar), traffic, top posts, and
          conversion data will show up here.
        </p>
      </div>
    </div>
  );
}

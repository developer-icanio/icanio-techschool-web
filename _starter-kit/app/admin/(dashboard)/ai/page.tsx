export default function AdminAIToolsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">AI Tools</h1>
        <p className="mt-2 text-gray-500">
          AI-assisted content and SEO tooling.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-10 text-center shadow-sm">
        <p className="text-2xl font-bold text-gray-400">Coming Soon</p>
        <p className="mt-3 text-gray-500">
          The SEO audit tool already surfaces AI-oriented content checks
          (FAQ blocks, answer blocks, entity coverage) under{" "}
          <a href="/admin/seo" className="text-blue-600 hover:underline">
            SEO
          </a>
          . A dedicated AI tools workspace (bulk rewrite, generation, etc.)
          is not built yet.
        </p>
      </div>
    </div>
  );
}

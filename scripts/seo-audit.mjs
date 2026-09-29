// Scores pages against the 69-rule engine in lib/seo.
//   npm run audit:seo                     scoreboard for every page
//   npm run audit:seo -- /internships     full report for one page (failed rules + fixes)
//   npm run audit:seo -- /internships --doc   print the markdown the engine scores
import { register } from "node:module";
import { pathToFileURL } from "node:url";
register("./ts-hooks.mjs", pathToFileURL("./scripts/"));

const { allPages, getPage } = await import("../lib/content/pages.ts");
const { seoDocumentOf } = await import("../lib/content/seo-document.ts");
const { analyzeBlog } = await import("../lib/seo/analyzer.ts");

const arg = process.argv[2];
const words = (s) => s.split(/\s+/).filter(Boolean).length;

function report(p) {
  const doc = seoDocumentOf(p);
  const a = analyzeBlog(doc);
  return {
    doc,
    score: a.overallScore,
    rules: `${a.passedRules}/${a.rules.length}`,
    words: words(doc.content),
    density: a.rules.find((r) => r.id === "keyword-density")?.value,
    failed: a.rules.filter((r) => !r.passed).map((r) => ({ id: r.id, lost: r.total - r.earned, value: r.value, expected: r.expected, fix: r.recommendation })),
  };
}

if (!arg || arg === "all") {
  const rows = allPages().map((p) => ({ p, r: report(p) }));
  for (const { p, r } of rows)
    console.log(`${String(r.score).padStart(3)}  ${r.rules.padEnd(6)} ${String(r.words).padStart(5)}w  ${String(r.density).padStart(6)}  ${p.path}${r.failed.length ? "  x " + r.failed.map((f) => f.id).join(", ") : ""}`);
  const avg = Math.round(rows.reduce((s, x) => s + x.r.score, 0) / (rows.length || 1));
  console.log(`\n${rows.length} pages, average ${avg}/100`);
} else {
  const p = getPage(arg);
  if (!p) {
    console.error(`No page with path ${arg}`);
    process.exit(1);
  }
  const r = report(p);
  if (process.argv.includes("--doc")) console.log(r.doc.content);
  else console.log(JSON.stringify({ path: p.path, score: r.score, rules: r.rules, words: r.words, density: r.density, failed: r.failed }, null, 2));
}

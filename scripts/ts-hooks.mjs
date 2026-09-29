// Lets plain Node (type stripping) import the app's TypeScript: maps "@/x"
// to the project root and adds the missing ".ts" extension.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = process.cwd();
const tryFile = (base) => [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find((f) => fs.existsSync(f) && fs.statSync(f).isFile());

export async function resolve(spec, ctx, next) {
  let base;
  if (spec.startsWith("@/")) base = path.join(root, spec.slice(2));
  else if ((spec.startsWith("./") || spec.startsWith("../")) && ctx.parentURL?.startsWith("file:")) base = path.resolve(path.dirname(fileURLToPath(ctx.parentURL)), spec);
  if (base) {
    const f = tryFile(base);
    if (f) return { url: pathToFileURL(f).href, shortCircuit: true };
  }
  return next(spec, ctx);
}

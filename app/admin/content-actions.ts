"use server";

import { revalidatePath } from "next/cache";
import type { LibraryKind } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { getPage } from "@/lib/content/pages";
import { ensureContent, libraryDelete, libraryReorder, librarySave, resetPage, restoreRevision, savePage } from "@/lib/content/store";
import type { Block, PageContent } from "@/lib/content/types";
import { pageReport } from "@/lib/seo-report";

// Server side of the content editor. Every save re-scores the page with the
// 69-rule engine and reports what changed, so non-technical editors see
// straight away if an edit hurt SEO.

const EDITORS = ["owner", "admin", "editor"] as const;

type Result = { ok: boolean; message: string; score?: number; before?: number; failed?: string[]; fixes?: string[] };

/** Trims strings and swaps characters the SEO rules forbid (em dash). */
function clean<T>(v: T): T {
  if (typeof v === "string") return v.replace(/\s*—\s*/g, ", ").replace(/–/g, "-").replace(/[ \t]+\n/g, "\n").trim() as T;
  if (Array.isArray(v)) return v.map(clean) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])) as T;
  return v;
}

function headingWarnings(p: PageContent) {
  const long: string[] = [];
  const check = (h?: string) => h && h.length >= 70 && long.push(`"${h.slice(0, 40)}..." is ${h.length} characters (keep headings under 70).`);
  check(p.hero.title);
  p.sections.forEach((b) => {
    check(b.heading);
    if (b.type === "cards") b.items.forEach((c) => check(c.title));
  });
  p.faqs.forEach((f) => check(f.q));
  return long;
}

async function commit(next: PageContent, by: string, note: string): Promise<Result> {
  const before = pageReport(next.path)?.audit.overallScore;
  await savePage(next, by, note);
  await ensureContent();
  const after = pageReport(next.path)!;
  revalidatePath(next.path);
  revalidatePath(`/admin/content${next.path === "/" ? "/home" : next.path}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/sitemaps/[file]", "page");
  revalidatePath("/llms.txt");
  const failed = after.audit.rules.filter((r) => !r.passed);
  const warn = headingWarnings(next);
  const score = after.audit.overallScore;
  return {
    ok: true,
    message: before !== undefined && score < before ? `Saved. SEO score dropped from ${before} to ${score}.` : `Saved and live. SEO score ${score}/100.`,
    score,
    before,
    failed: failed.map((r) => r.name),
    fixes: [...failed.map((r) => `${r.name}: ${r.recommendation}`), ...warn],
  };
}

function current(path: string) {
  const p = getPage(path);
  if (!p) throw new Error("Page not found.");
  return structuredClone(p);
}

export async function saveSection(path: string, index: number, block: Block): Promise<Result> {
  const me = await requireAdmin([...EDITORS]);
  try {
    const p = current(path);
    const old = p.sections[index];
    if (!old || old.type !== block.type) return { ok: false, message: "This section changed while you were editing. Reload the page." };
    p.sections[index] = clean(block);
    return await commit(p, me.email, `Edited section "${old.heading}"`);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function saveHero(path: string, hero: PageContent["hero"]): Promise<Result> {
  const me = await requireAdmin([...EDITORS]);
  try {
    const p = current(path);
    p.hero = { ...p.hero, ...clean(hero), primary: p.hero.primary, secondary: p.hero.secondary };
    return await commit(p, me.email, "Edited hero");
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function saveFaqs(path: string, faqs: PageContent["faqs"]): Promise<Result> {
  const me = await requireAdmin([...EDITORS]);
  try {
    const p = current(path);
    p.faqs = clean(faqs).filter((f) => f.q && f.a);
    return await commit(p, me.email, "Edited FAQs");
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function restoreVersion(id: string): Promise<Result> {
  const me = await requireAdmin([...EDITORS]);
  try {
    const path = await restoreRevision(id, me.email);
    await ensureContent();
    revalidatePath(path);
    revalidatePath(`/admin/content${path === "/" ? "/home" : path}`);
    return { ok: true, message: "Previous version restored and live." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function resetToOriginal(path: string): Promise<Result> {
  const me = await requireAdmin(["owner", "admin"]);
  await resetPage(path, me.email);
  await ensureContent();
  revalidatePath(path);
  return { ok: true, message: "All dashboard edits removed. The page is back to its original content." };
}

// Libraries -----------------------------------------------------------------

const LIB_PATHS: Record<LibraryKind, string> = { video: "videos", student: "students", college: "colleges" };

function refreshAll(kind: LibraryKind) {
  // Library items appear on many pages: refresh the whole site.
  revalidatePath("/", "layout");
  revalidatePath(`/admin/library/${LIB_PATHS[kind]}`);
}

export async function saveLibraryItem(kind: LibraryKind, id: string | null, data: Record<string, string>, published: boolean): Promise<Result & { id?: string }> {
  const me = await requireAdmin([...EDITORS]);
  try {
    const d = clean(data);
    if (!d.name) return { ok: false, message: "Name is required." };
    if (kind === "video" && (!d.video || !d.photo || !d.quote)) return { ok: false, message: "A video, a photo and a quote are required." };
    if (kind === "student" && (!d.photo || !d.track || !d.college)) return { ok: false, message: "Photo, track and college are required." };
    if (kind === "student") d.text = `${d.name} completed a ${d.duration || "short"} internship in ${d.track} as a ${d.degree || "student"} student from ${d.college}.`;
    if (kind === "college" && (!d.city || !d.logo)) return { ok: false, message: "City and logo are required." };
    const newId = await librarySave(kind, id, d, published, me.email);
    refreshAll(kind);
    return { ok: true, message: published ? "Saved and live on every page that shows it." : "Saved as hidden.", id: newId };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function reorderLibrary(kind: LibraryKind, ids: string[]): Promise<Result> {
  await requireAdmin([...EDITORS]);
  await libraryReorder(ids);
  refreshAll(kind);
  return { ok: true, message: "New order saved." };
}

export async function deleteLibraryItem(kind: LibraryKind, id: string): Promise<Result> {
  await requireAdmin(["owner", "admin", "editor"]);
  await libraryDelete(id);
  refreshAll(kind);
  return { ok: true, message: "Deleted." };
}

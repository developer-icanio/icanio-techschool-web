"use server";

import { revalidatePath } from "next/cache";
import type { LibraryKind } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { getPage } from "@/lib/content/pages";
import { ensureContent, libraryDelete, libraryReorder, librarySave, resetPage, restoreRevision, savePage, saveSettings } from "@/lib/content/store";
import type { SiteSettings } from "@/lib/site";
import type { Block, PageContent } from "@/lib/content/types";
import { pageReport } from "@/lib/seo-report";
import { safeUrl } from "@/lib/security";

// Server side of the content editor. Every save re-scores the page with the
// 69-rule engine and reports what changed, so non-technical editors see
// straight away if an edit hurt SEO.

const EDITORS = ["owner", "admin", "editor"] as const;

type Result = { ok: boolean; message: string; score?: number; before?: number; failed?: string[]; fixes?: string[] };

/** Fields that hold a link or a file address. */
const URL_KEYS = new Set(["href", "src", "video", "photo", "logo", "poster", "url"]);

/**
 * Trims strings, swaps characters the SEO rules forbid (em dash) and drops
 * script or data URLs from link and media fields, so a dashboard edit can
 * never put runnable code on the public site.
 */
function clean<T>(v: T, key = ""): T {
  if (typeof v === "string") {
    const s = v.replace(/\s*—\s*/g, ", ").replace(/–/g, "-").replace(/[ \t]+\n/g, "\n").trim();
    return (URL_KEYS.has(key) ? safeUrl(s) : s) as T;
  }
  if (Array.isArray(v)) return v.map((x) => clean(x, key)) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).filter(([k]) => k !== "__proto__" && k !== "constructor").map(([k, x]) => [k, clean(x, k)])) as T;
  return v;
}

/** Rejects oversized or malformed edits before they reach the database. */
function checkSize(v: unknown, max = 200_000) {
  if (v === null || typeof v !== "object") throw new Error("Invalid content.");
  if (JSON.stringify(v).length > max) throw new Error("This section is too large to save. Split it into smaller sections.");
}

const LIB_KINDS = new Set<LibraryKind>(["video", "student", "college", "review", "expert"]);
const checkKind = (kind: LibraryKind) => {
  if (!LIB_KINDS.has(kind)) throw new Error("Unknown library.");
};

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
  // The "Updated" date on the page is the day it was last saved (India time).
  next.seo = { ...next.seo, updatedAt: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) };
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
    checkSize(block);
    const p = current(path);
    const old = Number.isInteger(index) ? p.sections[index] : undefined;
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
    checkSize(hero, 20_000);
    const p = current(path);
    const h = clean(hero);
    const btn = (l?: { label?: unknown; href?: unknown }) => (l && typeof l.label === "string" && typeof l.href === "string" && l.label && l.href ? { label: l.label.slice(0, 60), href: l.href } : undefined);
    p.hero = {
      ...p.hero,
      eyebrow: String(h.eyebrow ?? p.hero.eyebrow),
      title: String(h.title ?? p.hero.title),
      subtitle: String(h.subtitle ?? p.hero.subtitle),
      image: h.image?.src ? h.image : p.hero.image,
      primary: btn(h.primary) ?? p.hero.primary,
      secondary: h.secondary === undefined ? p.hero.secondary : btn(h.secondary),
      highlights: Array.isArray(h.highlights) ? h.highlights.filter((x) => typeof x === "string" && x).slice(0, 6) : p.hero.highlights,
      imageLeft: Boolean(h.imageLeft) || undefined,
    };
    return await commit(p, me.email, "Edited hero");
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function saveFaqs(path: string, faqs: PageContent["faqs"]): Promise<Result> {
  const me = await requireAdmin([...EDITORS]);
  try {
    checkSize(faqs, 100_000);
    if (!Array.isArray(faqs)) throw new Error("Invalid FAQs.");
    const p = current(path);
    p.faqs = clean(faqs).filter((f) => typeof f?.q === "string" && typeof f?.a === "string" && f.q && f.a).map((f) => ({ q: f.q, a: f.a }));
    return await commit(p, me.email, "Edited FAQs");
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

const strs = (v: unknown, max = 40) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").slice(0, max) : []);
const link = (v: unknown) => {
  const l = v as { label?: unknown; href?: unknown } | undefined;
  return l && typeof l.label === "string" && typeof l.href === "string" && l.label && l.href ? { label: l.label.slice(0, 120), href: l.href } : undefined;
};

/** Everything on a page outside the hero and the sections: SEO, quick answer, facts, takeaways, conclusion, references and the call to action. */
export type PageDetails = Pick<PageContent, "label" | "facts" | "answer" | "takeaways" | "conclusion" | "references" | "cta"> & { seo: Pick<PageContent["seo"], "metaTitle" | "metaDescription" | "focusKeyword" | "secondaryKeywords"> };

export async function savePageDetails(path: string, details: PageDetails): Promise<Result> {
  const me = await requireAdmin([...EDITORS]);
  try {
    checkSize(details, 60_000);
    const d = clean(details);
    const p = current(path);
    if (!d.seo?.metaTitle || !d.seo.metaDescription || !d.seo.focusKeyword) return { ok: false, message: "SEO title, description and focus keyword are required." };
    if (!d.answer?.question || !d.answer.answer) return { ok: false, message: "The quick answer needs a question and an answer." };
    p.label = typeof d.label === "string" && d.label ? d.label.slice(0, 60) : p.label;
    p.seo = { ...p.seo, metaTitle: d.seo.metaTitle.slice(0, 80), metaDescription: d.seo.metaDescription.slice(0, 200), focusKeyword: d.seo.focusKeyword.toLowerCase().slice(0, 60), secondaryKeywords: strs(d.seo.secondaryKeywords, 10).map((k) => k.toLowerCase()) };
    p.facts = Array.isArray(d.facts) ? d.facts.filter((f) => f?.label && f?.value).slice(0, 6).map((f) => ({ label: String(f.label), value: String(f.value) })) : p.facts;
    if (p.facts && !p.facts.length) delete p.facts;
    p.answer = { question: String(d.answer.question), answer: String(d.answer.answer) };
    p.takeaways = strs(d.takeaways, 12);
    p.conclusion = strs(d.conclusion, 6);
    p.references = (Array.isArray(d.references) ? d.references : []).map(link).filter(Boolean).slice(0, 12) as PageContent["references"];
    const primary = link(d.cta?.primary);
    if (!d.cta?.title || !primary) return { ok: false, message: "The call-to-action band needs a title and a main button." };
    p.cta = { title: String(d.cta.title), body: String(d.cta.body ?? ""), primary, secondary: link(d.cta.secondary) };
    return await commit(p, me.email, "Edited page details and SEO");
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

// Section structure -----------------------------------------------------------

const TEMPLATES: Record<Block["type"], () => Block> = {
  prose: () => ({ type: "prose", heading: "New text section", paragraphs: ["Write the text for this section here."] }),
  cards: () => ({ type: "cards", heading: "New card grid", columns: 3, items: [{ title: "Card title", body: "Card text." }] }),
  steps: () => ({ type: "steps", heading: "New steps", items: [{ title: "First step", body: "What happens in this step." }] }),
  phases: () => ({ type: "phases", heading: "New curriculum", items: [{ label: "Phase 1", title: "Phase title", points: ["Topic"] }] }),
  tools: () => ({ type: "tools", heading: "Tools you will use", items: [{ name: "Tool name", role: "What it is used for" }] }),
  table: () => ({ type: "table", heading: "New table", columns: ["Item", "Details"], rows: [["Row", "Value"]] }),
  checklist: () => ({ type: "checklist", heading: "New checklist", items: ["First point"] }),
  stats: () => ({ type: "stats", heading: "Our numbers", items: [{ value: "100+", label: "Label" }] }),
  partners: () => ({ type: "partners", heading: "Colleges that partner with us" }),
  testimonials: () => ({ type: "testimonials", heading: "What our interns say" }),
  stories: () => ({ type: "stories", heading: "Students who completed internships with us", limit: 6 }),
  gallery: () => ({ type: "gallery", heading: "New photo gallery", items: [] }),
  links: () => ({ type: "links", heading: "Related pages", items: [] }),
  form: () => ({ type: "form", heading: "Apply for an internship", form: "student" }),
  batches: () => ({ type: "batches", heading: "Upcoming batches", weekday: 2, time: "9am to 6pm", modes: ["Offline", "Online", "Part time"], items: [] }),
  reviews: () => ({ type: "reviews", heading: "What People Say About Us" }),
  events: () => ({ type: "events", heading: "Upcoming events", items: [] }),
  experts: () => ({ type: "experts", heading: "Meet the Industry Trainers Behind Your Learning Journey" }),
};

export async function addSection(path: string, at: number, type: Block["type"]): Promise<Result> {
  const me = await requireAdmin([...EDITORS]);
  try {
    if (!TEMPLATES[type]) throw new Error("Unknown section type.");
    const p = current(path);
    const i = Number.isInteger(at) ? Math.min(Math.max(at, 0), p.sections.length) : p.sections.length;
    p.sections.splice(i, 0, TEMPLATES[type]());
    return await commit(p, me.email, `Added a ${type} section`);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function moveSection(path: string, from: number, to: number): Promise<Result> {
  const me = await requireAdmin([...EDITORS]);
  try {
    const p = current(path);
    if (!Number.isInteger(from) || !Number.isInteger(to) || !p.sections[from] || to < 0 || to >= p.sections.length) return { ok: false, message: "Can't move that section." };
    const [b] = p.sections.splice(from, 1);
    p.sections.splice(to, 0, b);
    return await commit(p, me.email, `Moved section "${b.heading}"`);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function deleteSection(path: string, index: number): Promise<Result> {
  const me = await requireAdmin([...EDITORS]);
  try {
    const p = current(path);
    const b = Number.isInteger(index) ? p.sections[index] : undefined;
    if (!b) return { ok: false, message: "Section not found." };
    p.sections.splice(index, 1);
    return await commit(p, me.email, `Removed section "${b.heading}"`);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function restoreVersion(id: string): Promise<Result> {
  const me = await requireAdmin([...EDITORS]);
  try {
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Version not found.");
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
  current(path); // only real pages
  await resetPage(path, me.email);
  await ensureContent();
  revalidatePath(path);
  return { ok: true, message: "All dashboard edits removed. The page is back to its original content." };
}

// Libraries -----------------------------------------------------------------

const LIB_PATHS: Record<LibraryKind, string> = { video: "videos", student: "students", college: "colleges", review: "reviews", expert: "team" };

function refreshAll(kind: LibraryKind) {
  // Library items appear on many pages: refresh the whole site.
  revalidatePath("/", "layout");
  revalidatePath(`/admin/library/${LIB_PATHS[kind]}`);
}

export async function saveLibraryItem(kind: LibraryKind, id: string | null, data: Record<string, string>, published: boolean): Promise<Result & { id?: string }> {
  const me = await requireAdmin([...EDITORS]);
  try {
    checkKind(kind);
    checkSize(data, 20_000);
    if (id !== null && typeof id !== "string") throw new Error("Invalid item.");
    // Library items are flat text fields.
    const d = clean(Object.fromEntries(Object.entries(data).filter(([, v]) => typeof v === "string")) as Record<string, string>);
    if (!d.name) return { ok: false, message: "Name is required." };
    if (kind === "video" && (!d.video || !d.photo || !d.quote)) return { ok: false, message: "A video, a photo and a quote are required." };
    if (kind === "student" && (!d.photo || !d.track || !d.college)) return { ok: false, message: "Photo, track and college are required." };
    if (kind === "student") d.text = `${d.name} completed a ${d.duration || "short"} internship in ${d.track} as a ${d.degree || "student"} student from ${d.college}.`;
    if (kind === "college" && (!d.city || !d.logo)) return { ok: false, message: "City and logo are required." };
    if (kind === "review" && (!d.college || !d.track || !d.quote)) return { ok: false, message: "College, track and the review text are required." };
    if (kind === "expert" && (!d.role || !d.bio)) return { ok: false, message: "Role and a short bio are required." };
    const newId = await librarySave(kind, id, d, published, me.email);
    refreshAll(kind);
    return { ok: true, message: published ? "Saved and live on every page that shows it." : "Saved as hidden.", id: newId };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function reorderLibrary(kind: LibraryKind, ids: string[]): Promise<Result> {
  await requireAdmin([...EDITORS]);
  checkKind(kind);
  if (!Array.isArray(ids) || ids.length > 1000 || !ids.every((i) => typeof i === "string" && i.length < 100)) return { ok: false, message: "Invalid order." };
  await libraryReorder(ids);
  refreshAll(kind);
  return { ok: true, message: "New order saved." };
}

export async function deleteLibraryItem(kind: LibraryKind, id: string): Promise<Result> {
  await requireAdmin([...EDITORS]);
  checkKind(kind);
  if (typeof id !== "string") return { ok: false, message: "Invalid item." };
  await libraryDelete(id);
  refreshAll(kind);
  return { ok: true, message: "Deleted." };
}

// Site settings -----------------------------------------------------------------

export async function saveSiteSettings(input: SiteSettings): Promise<Result> {
  const me = await requireAdmin(["owner", "admin"]);
  try {
    checkSize(input, 20_000);
    const s = clean(input);
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.test(s.email) || !email.test(s.internshipEmail)) return { ok: false, message: "Enter valid email addresses." };
    if (s.phone.replace(/\D/g, "").length < 10) return { ok: false, message: "Enter a valid phone number with country code, e.g. +91 91500 09316." };
    const wa = String(s.whatsapp?.number ?? "").replace(/\D/g, "");
    if (wa.length < 10) return { ok: false, message: "Enter the WhatsApp number with country code, digits only, e.g. 919150009316." };
    for (const [k, v] of Object.entries(s.social ?? {})) if (v && !/^https:\/\//.test(v)) return { ok: false, message: `The ${k} link must start with https://` };
    const trust = (Array.isArray(s.trust) ? s.trust : []).filter((t) => t?.value && t?.label).slice(0, 4).map((t) => ({ value: String(t.value), label: String(t.label) }));
    const data: SiteSettings = {
      email: s.email,
      internshipEmail: s.internshipEmail,
      phone: s.phone,
      hours: s.hours || "Monday to Saturday",
      trust,
      whatsapp: { number: wa, greeting: String(s.whatsapp?.greeting ?? "") },
      social: { instagram: s.social?.instagram ?? "", linkedin: s.social?.linkedin ?? "", x: s.social?.x ?? "" },
      address: { ...s.address, addressCountry: "IN" },
    };
    await saveSettings(data, me.email);
    await ensureContent();
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved. The new details are live on every page." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

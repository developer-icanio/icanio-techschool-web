import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { LibraryKind } from "@/db/schema";
import { filePages, live, sharedFile, type Expert, type Partner, type Review, type Story, type Testimonial } from "./pages";
import type { PageContent } from "./types";
import { applySettings, type SiteSettings } from "@/lib/site";

// Dashboard-edited content lives in Postgres. Every render calls
// ensureContent() first; it loads page edits and the shared libraries into
// `live` (lib/content/pages.ts), which the sync helpers read. With no
// database configured the site simply uses the JSON files.

const SEEDS: Record<LibraryKind, () => { id: string }[]> = {
  video: () => sharedFile<Testimonial>("testimonials", "video"),
  student: () => sharedFile<Story>("stories", "student"),
  college: () => sharedFile<Partner>("partners", "college"),
  review: () => sharedFile<Review>("reviews", "review"),
  expert: () => sharedFile<Expert>("experts", "expert"),
};

let seeded: Promise<void> | undefined;

/** First run: copy content/shared/*.json into library_items so they become editable. */
async function seed() {
  const db = await getDb();
  if (!db) return;
  for (const kind of Object.keys(SEEDS) as LibraryKind[]) {
    const [any] = await db.select({ id: schema.libraryItems.id }).from(schema.libraryItems).where(eq(schema.libraryItems.kind, kind)).limit(1);
    if (any) continue;
    const rows = SEEDS[kind]().map(({ id, ...data }, i) => ({ id, kind, data, sort: i, updatedBy: "seed" }));
    if (rows.length) await db.insert(schema.libraryItems).values(rows).onConflictDoNothing();
  }
}

export async function ensureContent() {
  try {
    await load();
  } catch (e) {
    // Database unreachable: keep serving the last loaded edits, or the JSON
    // files if nothing was loaded yet. Visitors never see an error page.
    console.error("[content] database unavailable, serving cached or file content:", (e as Error).message);
  }
}

async function load() {
  const db = await getDb();
  if (!db) return;
  seeded ??= seed().catch((e) => {
    seeded = undefined;
    console.error("[content] seed failed", e);
  });
  await seeded;
  const [pages, items, settings] = await Promise.all([
    db.select().from(schema.contentPages),
    db.select().from(schema.libraryItems).where(eq(schema.libraryItems.published, 1)).orderBy(asc(schema.libraryItems.sort)),
    db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, "site")).limit(1),
  ]);
  applySettings(settings[0]?.data as Partial<SiteSettings> | undefined);
  live.pages = new Map(pages.map((p) => [p.path, p.data as PageContent]));
  const pick = <T,>(kind: LibraryKind) => items.filter((i) => i.kind === kind).map((i) => ({ ...(i.data as object), id: i.id }) as T);
  live.library = { video: pick<Testimonial>("video"), student: pick<Story>("student"), college: pick<Partner>("college"), review: pick<Review>("review"), expert: pick<Expert>("expert") };
}

// Pages ---------------------------------------------------------------------

export async function savePage(page: PageContent, by: string, note: string) {
  const db = await getDb();
  if (!db) throw new Error("No database configured (DATABASE_URL).");
  const prev = (await db.select().from(schema.contentPages).where(eq(schema.contentPages.path, page.path)).limit(1))[0]?.data ?? filePages().find((p) => p.path === page.path);
  if (prev) await db.insert(schema.contentRevisions).values({ path: page.path, data: prev, note: `Before: ${note}`, updatedBy: by });
  await db
    .insert(schema.contentPages)
    .values({ path: page.path, data: page, updatedBy: by, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.contentPages.path, set: { data: page, updatedBy: by, updatedAt: new Date() } });
}

export async function pageMeta(path: string) {
  const db = await getDb();
  if (!db) return { edited: null, revisions: [] };
  const [edited] = await db.select({ updatedBy: schema.contentPages.updatedBy, updatedAt: schema.contentPages.updatedAt }).from(schema.contentPages).where(eq(schema.contentPages.path, path)).limit(1);
  const revisions = await db
    .select({ id: schema.contentRevisions.id, note: schema.contentRevisions.note, updatedBy: schema.contentRevisions.updatedBy, createdAt: schema.contentRevisions.createdAt })
    .from(schema.contentRevisions)
    .where(eq(schema.contentRevisions.path, path))
    .orderBy(desc(schema.contentRevisions.createdAt))
    .limit(15);
  return { edited: edited ?? null, revisions };
}

export async function restoreRevision(id: string, by: string) {
  const db = await getDb();
  if (!db) throw new Error("No database configured.");
  const [rev] = await db.select().from(schema.contentRevisions).where(eq(schema.contentRevisions.id, id)).limit(1);
  if (!rev) throw new Error("Version not found.");
  await savePage(rev.data as PageContent, by, `Restored version from ${rev.createdAt.toLocaleString("en-IN")}`);
  return rev.path;
}

/** Drops dashboard edits for a page, back to the JSON file. */
export async function resetPage(path: string, by: string) {
  const db = await getDb();
  if (!db) return;
  const [cur] = await db.select().from(schema.contentPages).where(eq(schema.contentPages.path, path)).limit(1);
  if (cur) await db.insert(schema.contentRevisions).values({ path, data: cur.data, note: "Before: reset to original", updatedBy: by });
  await db.delete(schema.contentPages).where(eq(schema.contentPages.path, path));
}

// Libraries ------------------------------------------------------------------

// Site settings ---------------------------------------------------------------

export async function saveSettings(data: SiteSettings, by: string) {
  const db = await getDb();
  if (!db) throw new Error("No database configured.");
  await db
    .insert(schema.siteSettings)
    .values({ key: "site", data, updatedBy: by, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.siteSettings.key, set: { data, updatedBy: by, updatedAt: new Date() } });
}

export async function libraryList(kind: LibraryKind) {
  const db = await getDb();
  if (!db) return null;
  await (seeded ??= seed());
  return db.select().from(schema.libraryItems).where(eq(schema.libraryItems.kind, kind)).orderBy(asc(schema.libraryItems.sort));
}

export async function librarySave(kind: LibraryKind, id: string | null, data: object, published: boolean, by: string) {
  const db = await getDb();
  if (!db) throw new Error("No database configured.");
  if (id) {
    await db.update(schema.libraryItems).set({ data, published: published ? 1 : 0, updatedBy: by, updatedAt: new Date() }).where(eq(schema.libraryItems.id, id));
    return id;
  }
  const list = await db.select({ sort: schema.libraryItems.sort }).from(schema.libraryItems).where(eq(schema.libraryItems.kind, kind));
  // New items go first: the newest testimonial or completion is shown first.
  const sort = list.length ? Math.min(...list.map((l) => l.sort)) - 1 : 0;
  const newId = `${kind}-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(schema.libraryItems).values({ id: newId, kind, data, sort, published: published ? 1 : 0, updatedBy: by });
  return newId;
}

export async function libraryReorder(ids: string[]) {
  const db = await getDb();
  if (!db) return;
  await Promise.all(ids.map((id, i) => db.update(schema.libraryItems).set({ sort: i }).where(eq(schema.libraryItems.id, id))));
}

export async function libraryDelete(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(schema.libraryItems).where(eq(schema.libraryItems.id, id));
}

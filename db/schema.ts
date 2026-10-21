import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

// Admin dashboard data. The public site itself needs no database.

export type AdminRole = "owner" | "admin" | "editor" | "seo";

/** Who may sign in to /admin (Google accounts). ADMIN_EMAILS are always owners, even if missing here. */
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  role: varchar("role", { length: 16 }).$type<AdminRole>().notNull().default("seo"),
  addedBy: varchar("added_by", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export interface SnapshotRow {
  path: string;
  score: number;
  passed: number;
  words: number;
  failed: string[];
}

/** One run of the 69-rule audit across every page, for the trend chart. */
export const seoSnapshots = pgTable("seo_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
  takenBy: varchar("taken_by", { length: 255 }),
  averageScore: integer("average_score").notNull(),
  pages: integer("pages").notNull(),
  perfectPages: integer("perfect_pages").notNull(),
  rows: jsonb("rows").$type<SnapshotRow[]>().notNull(),
  note: text("note"),
});

/** Edited copy of a page (the JSON files in content/pages are the defaults). */
export const contentPages = pgTable("content_pages", {
  path: text("path").primaryKey(),
  data: jsonb("data").notNull(),
  updatedBy: varchar("updated_by", { length: 255 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every saved version of a page, newest first, for "restore previous version". */
export const contentRevisions = pgTable("content_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  path: text("path").notNull(),
  data: jsonb("data").notNull(),
  note: text("note"),
  updatedBy: varchar("updated_by", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LibraryKind = "video" | "student" | "college" | "review" | "expert";

/** Shared, reusable content: video testimonials, student completions, partner colleges. */
export const libraryItems = pgTable("library_items", {
  id: text("id").primaryKey(),
  kind: varchar("kind", { length: 16 }).$type<LibraryKind>().notNull(),
  data: jsonb("data").notNull(),
  sort: integer("sort").notNull().default(0),
  published: integer("published").notNull().default(1),
  updatedBy: varchar("updated_by", { length: 255 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export interface SpeedMetrics { fcp?: string; lcp?: string; tbt?: string; cls?: string; si?: string; lcpMs?: number }
export interface SpeedIssue { title: string; value?: string; category: string }

/** Google PageSpeed Insights runs, one row per page and device. */
export const pagespeedResults = pgTable("pagespeed_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  path: text("path").notNull(),
  strategy: varchar("strategy", { length: 8 }).$type<"mobile" | "desktop">().notNull(),
  performance: integer("performance"),
  accessibility: integer("accessibility"),
  bestPractices: integer("best_practices"),
  seo: integer("seo"),
  metrics: jsonb("metrics").$type<SpeedMetrics>().notNull(),
  issues: jsonb("issues").$type<SpeedIssue[]>().notNull(),
  fieldData: varchar("field_data", { length: 16 }),
  runBy: varchar("run_by", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Site-wide settings edited in /admin/settings (one row, key "site"). */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  data: jsonb("data").notNull(),
  updatedBy: varchar("updated_by", { length: 255 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

const TABLES = ["admin_users", "seo_snapshots", "content_pages", "content_revisions", "library_items", "pagespeed_results", "rate_limits", "site_settings"];

// Supabase publishes every table in "public" through its REST API to the
// "anon" and "authenticated" roles. This site only connects as the database
// owner (which bypasses row-level security), so: RLS on with no policies,
// and no grants for the API roles. On PGlite those roles don't exist and the
// REVOKE is skipped.
const LOCK_DOWN_SQL = `
${TABLES.map((t) => `ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;`).join("\n")}
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE ${TABLES.join(", ")} FROM %I', r);
    END IF;
  END LOOP;
END $$;
`;

/** Kept in sync with the tables above; applied on first connection (idempotent). */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL UNIQUE,
  name varchar(255),
  role varchar(16) NOT NULL DEFAULT 'seo',
  added_by varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE TABLE IF NOT EXISTS seo_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taken_at timestamptz NOT NULL DEFAULT now(),
  taken_by varchar(255),
  average_score integer NOT NULL,
  pages integer NOT NULL,
  perfect_pages integer NOT NULL,
  rows jsonb NOT NULL,
  note text
);
CREATE INDEX IF NOT EXISTS seo_snapshots_taken_at_idx ON seo_snapshots (taken_at DESC);
CREATE TABLE IF NOT EXISTS content_pages (
  path text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_by varchar(255),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS content_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  data jsonb NOT NULL,
  note text,
  updated_by varchar(255),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_revisions_path_idx ON content_revisions (path, created_at DESC);
CREATE TABLE IF NOT EXISTS library_items (
  id text PRIMARY KEY,
  kind varchar(16) NOT NULL,
  data jsonb NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  published integer NOT NULL DEFAULT 1,
  updated_by varchar(255),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS library_items_kind_idx ON library_items (kind, sort);
CREATE TABLE IF NOT EXISTS pagespeed_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  strategy varchar(8) NOT NULL,
  performance integer,
  accessibility integer,
  best_practices integer,
  seo integer,
  metrics jsonb NOT NULL,
  issues jsonb NOT NULL,
  field_data varchar(16),
  run_by varchar(255),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pagespeed_results_path_idx ON pagespeed_results (path, strategy, created_at DESC);
CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_by varchar(255),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  reset_at timestamptz NOT NULL
);
${LOCK_DOWN_SQL}`;

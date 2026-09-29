import { integer, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

// Admin dashboard data. The public site itself needs no database.

export type AdminRole = "owner" | "admin" | "seo";

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
`;

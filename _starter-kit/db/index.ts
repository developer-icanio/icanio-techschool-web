import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "dotenv";
import * as schema from "./schema";

// Explicitly load .env.local here too — Next.js itself already loads
// .env.local automatically for the running app, but standalone scripts run
// via `tsx` (like our import scripts) don't get that for free, so without
// this line process.env.DATABASE_URL is undefined and pg falls back to
// trying localhost:5432. This call is safe to run even inside the Next.js
// app itself — dotenv won't override variables that are already set.
config({ path: ".env.local" });

// Keep the client-connection footprint small. `next build` spawns one
// worker process per CPU for static generation, and each worker imports
// this module and opens its own pool — with pg's default max of 10 that
// is ~70+ simultaneous clients against the Supabase transaction pooler,
// which caps clients at 200 and started returning
// "(EMAXCONN) max client connections reached" during builds and ISR
// regeneration (breaking /shop and every /shop/category/* page).
// max:3 keeps a full 8-worker build under ~25 clients; the pooler
// multiplexes those onto far fewer real Postgres connections anyway.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 15_000,
});

export const db = drizzle(pool, { schema });

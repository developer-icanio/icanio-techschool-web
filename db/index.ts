import "server-only";
import * as schema from "./schema";

// DATABASE_URL set  -> node-postgres (Supabase / Neon in production).
// Not set, in dev   -> PGlite, an embedded Postgres stored in .data/pglite,
//                      so the dashboard works locally with no install.
// Not set, in prod  -> no database: login falls back to ADMIN_EMAILS and
//                      snapshot history is unavailable (the scoreboard still works).

type Db = Awaited<ReturnType<typeof connect>>;

/**
 * Remote databases are always reached over TLS, so the password and content
 * never cross the network in plain text. Supabase signs its certificates with
 * its own root CA: put that certificate (Dashboard > Database > SSL) in
 * DATABASE_CA_CERT to also verify the server; without it the connection is
 * encrypted but the certificate is not checked. Local databases skip TLS.
 */
function sslFor(url: string) {
  const host = new URL(url).hostname;
  if (["localhost", "127.0.0.1", "::1"].includes(host)) return undefined;
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };
}

async function connect() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    // Small pool: serverless builds open one pool per worker (see starter kit notes).
    const pool = new Pool({ connectionString: url, ssl: sslFor(url), max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 15_000 });
    // A dropped connection (network blip, pooler restart) must not crash the
    // server: log it; the pool opens a fresh connection on the next query.
    pool.on("error", (e) => console.error("[db] connection lost:", e.message));
    // Several processes can connect at once (build workers, serverless
    // instances): an advisory lock makes them apply the schema one at a time
    // instead of deadlocking on the ALTER TABLE statements.
    const c = await pool.connect();
    try {
      await c.query(`BEGIN; SELECT pg_advisory_xact_lock(724001); ${schema.SCHEMA_SQL} COMMIT;`);
    } catch (e) {
      await c.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      c.release();
    }
    g.__techschoolDbKind = "postgres";
    return drizzle(pool, { schema });
  }
  if (process.env.NODE_ENV === "production") return null;
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(".data", { recursive: true });
  const client = new PGlite(".data/pglite");
  await client.exec(schema.SCHEMA_SQL);
  g.__techschoolDbKind = "embedded";
  return drizzle(client, { schema });
}

const g = globalThis as unknown as { __techschoolDb?: Promise<Db>; __techschoolDbKind?: "postgres" | "embedded" };

/** Which database the running server actually uses. */
export const dbKind = () => g.__techschoolDbKind;

/** The database, or null when none is configured. Connects once per process. */
export function getDb(): Promise<Db> {
  g.__techschoolDb ??= connect().catch((e) => {
    console.error("[db] connection failed", e);
    g.__techschoolDb = undefined;
    return null;
  });
  return g.__techschoolDb;
}

export { schema };

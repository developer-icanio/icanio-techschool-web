import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { AdminRole } from "@/db/schema";

// Admin sign-in: Google accounts on an allowlist.
// - ADMIN_EMAILS (comma separated) are always "owner", even with an empty
//   or unreachable database, so the owner can never be locked out.
// - Everyone else must be added in /admin/team (admin_users table).
// - AUTH_DEV_LOGIN=1 adds a password-less "dev" sign-in for local testing.
//   It is never available in production builds.

declare module "next-auth" {
  interface Session {
    user: { role?: AdminRole } & DefaultSession["user"];
  }
}

const allowlist = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

const devLogin = process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "1";

/** ADMIN_NO_LOGIN=1 opens /admin without signing in, on localhost only. Ignored in production builds. */
export const noLogin = process.env.NODE_ENV !== "production" && process.env.ADMIN_NO_LOGIN === "1";

/** Looks up the role for an email: owner via ADMIN_EMAILS, else the admin_users row. */
async function roleFor(email: string, touch = false): Promise<AdminRole | undefined> {
  const e = email.toLowerCase();
  if (allowlist().includes(e)) return "owner";
  // Imported lazily so the proxy bundle never pulls in database drivers.
  const { getDb, schema } = await import("@/db");
  const { eq } = await import("drizzle-orm");
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, e)).limit(1);
  if (row && touch) await db.update(schema.adminUsers).set({ lastLoginAt: new Date() }).where(eq(schema.adminUsers.email, e));
  return row?.role;
}

const REFRESH_MS = 5 * 60 * 1000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  trustHost: true,
  providers: [
    Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }),
    ...(devLogin
      ? [
          Credentials({
            id: "dev",
            name: "Dev login",
            credentials: { email: { label: "Email", type: "email" } },
            authorize: async (c) => {
              const email = String(c?.email ?? "").toLowerCase();
              return (await roleFor(email)) ? { id: email, email, name: email.split("@")[0] } : null;
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    // Only allowlisted or invited accounts get a session at all.
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      // Google must have verified the address, so nobody can sign in as an
      // admin with an unverified email that merely matches the allowlist.
      if (account?.provider === "google" && profile?.email_verified !== true) return false;
      return Boolean(await roleFor(user.email, true));
    },
    async jwt({ token, user }) {
      const email = (user?.email ?? token.email) as string | undefined;
      const stale = !token.checkedAt || Date.now() - (token.checkedAt as number) > REFRESH_MS;
      if (email && (user || stale)) {
        // Re-checked every few minutes so removing someone in /admin/team
        // takes effect without waiting for their session to expire.
        token.role = await roleFor(email).catch(() => token.role as AdminRole | undefined);
        token.checkedAt = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role as AdminRole | undefined;
      return session;
    },
  },
  pages: { signIn: "/admin/login", error: "/admin/login" },
});

export const isDevLogin = devLogin;

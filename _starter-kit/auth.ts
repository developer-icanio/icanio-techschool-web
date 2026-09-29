import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { sendNewUserRegistrationEmail } from "@/lib/resend";

// Permanent break-glass path for /admin access — see ADMIN_EMAILS in
// .env.local. Anyone on this list is always "owner" regardless of the
// users table's admin_role column, so a bad row or empty table can
// never lock the site owner out.
const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),

    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!dbUser || !dbUser.passwordHash) return null;

        const valid = await bcrypt.compare(password, dbUser.passwordHash);
        if (!valid) return null;

        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name ?? undefined,
        };
      },
    }),
  ],

  callbacks: {
    // Google sign-in has no password — create a matching row in our own
    // users table on first sign-in so orders/addresses have someone to
    // belong to, since we aren't using the NextAuth DB adapter.
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        });
        if (!existing) {
          await db.insert(users).values({
            email: user.email,
            name: user.name ?? null,
          });
          void sendNewUserRegistrationEmail({
            email: user.email,
            name: user.name ?? null,
            provider: "google",
          });
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      const email = user?.email ?? token.email;
      if (email) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        const isAllowlisted = adminEmails.includes(email.toLowerCase());

        if (dbUser) {
          token.userId = dbUser.id;
          token.role = isAllowlisted ? "admin" : dbUser.role;
          token.adminRole = isAllowlisted ? "owner" : dbUser.adminRole ?? undefined;
        } else if (isAllowlisted) {
          // Allowlisted admin who has never signed in before (no users
          // row yet) — treat as owner for this session; a row gets
          // created on their next Google sign-in via the callback above,
          // or already exists if they registered a password first.
          token.userId = undefined;
          token.role = "admin";
          token.adminRole = "owner";
        } else {
          // The user this token was issued for no longer exists (deleted
          // account, revoked test user, ...) — clear every privilege
          // field instead of leaving the last-known-good values in
          // place. Without this, a deleted admin's existing session JWT
          // would keep working as if the account were still active,
          // since JWT sessions aren't invalidated server-side by default.
          token.userId = undefined;
          token.role = undefined;
          token.adminRole = undefined;
        }
      }
      return token;
    },

    async session({ session, token }) {
      const userId = token.userId as string | undefined;
      const role = token.role as "customer" | "admin" | undefined;
      const adminRole = token.adminRole as "owner" | "seo" | "sales" | undefined;
      if (session.user && userId) {
        session.user.id = userId;
      }
      if (session.user) {
        session.user.role = role ?? "customer";
        session.user.adminRole = role === "admin" ? adminRole ?? "owner" : undefined;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
});

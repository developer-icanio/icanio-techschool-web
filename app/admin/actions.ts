"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { getDb, schema } from "@/db";
import type { AdminRole } from "@/db/schema";
import { canManageTeam, requireAdmin, saveSnapshot } from "@/lib/admin";

const safeNext = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  return s.startsWith("/admin") ? s : "/admin/seo";
};

export async function signInWithGoogle(form: FormData) {
  await signIn("google", { redirectTo: safeNext(form.get("next")) });
}

export async function signInDev(form: FormData) {
  try {
    await signIn("dev", { email: String(form.get("email") ?? ""), redirectTo: safeNext(form.get("next")) });
  } catch (e) {
    if (e instanceof AuthError) redirect("/admin/login?error=AccessDenied");
    throw e;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/admin/login" });
}

export async function takeSnapshot(form: FormData) {
  const me = await requireAdmin();
  await saveSnapshot(me.email, String(form.get("note") ?? "").slice(0, 200) || undefined);
  revalidatePath("/admin/seo");
}

const ROLES: AdminRole[] = ["owner", "admin", "seo"];

export async function addMember(_: unknown, form: FormData): Promise<{ ok: boolean; message: string }> {
  const me = await requireAdmin();
  if (!canManageTeam(me.role)) return { ok: false, message: "Only owners and admins can manage the team." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = String(form.get("role") ?? "seo") as AdminRole;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Enter a valid Google account email." };
  if (!ROLES.includes(role) || (role === "owner" && me.role !== "owner")) return { ok: false, message: "You can't grant that role." };
  const db = await getDb();
  if (!db) return { ok: false, message: "No database configured. Set DATABASE_URL to invite team members." };
  await db
    .insert(schema.adminUsers)
    .values({ email, role, name: String(form.get("name") ?? "").trim() || null, addedBy: me.email })
    .onConflictDoUpdate({ target: schema.adminUsers.email, set: { role } });
  revalidatePath("/admin/team");
  return { ok: true, message: `${email} can now sign in with Google.` };
}

export async function removeMember(form: FormData) {
  const me = await requireAdmin();
  if (!canManageTeam(me.role)) return;
  const email = String(form.get("email") ?? "");
  if (email === me.email) return; // can't remove yourself
  const db = await getDb();
  if (!db) return;
  const [row] = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, email)).limit(1);
  if (row?.role === "owner" && me.role !== "owner") return;
  await db.delete(schema.adminUsers).where(eq(schema.adminUsers.email, email));
  revalidatePath("/admin/team");
}

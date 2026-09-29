"use server";

import { db } from "@/db";
import { users, adminRoleEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

type AdminUserRole = (typeof adminRoleEnum.enumValues)[number];

async function requireOwner() {
  const session = await auth();
  const isOwner =
    session?.user?.role === "admin" && (session.user.adminRole ?? "owner") === "owner";
  if (!isOwner) {
    throw new Error("Only owners can manage admin access.");
  }
}

export async function inviteAdminUser(formData: FormData) {
  await requireOwner();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "seo") as AdminUserRole;
  if (!email) return;

  await db
    .insert(users)
    .values({ email, name, role: "admin", adminRole: role })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: name ?? undefined, role: "admin", adminRole: role },
    });

  revalidatePath("/admin/team");
}

export async function updateAdminUserRole(id: string, role: AdminUserRole) {
  await requireOwner();
  await db.update(users).set({ adminRole: role }).where(eq(users.id, id));
  revalidatePath("/admin/team");
}

// Revokes admin access without deleting the account — the person keeps
// whatever storefront customer history they have, they just drop back
// to a regular "customer" role with no /admin access.
export async function revokeAdminAccess(id: string) {
  await requireOwner();
  await db.update(users).set({ role: "customer", adminRole: null }).where(eq(users.id, id));
  revalidatePath("/admin/team");
}

"use server";

import { db } from "@/db";
import { redirects, redirectTypeEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type RedirectType = (typeof redirectTypeEnum.enumValues)[number];

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export async function createRedirect(formData: FormData) {
  const sourcePath = normalizePath(String(formData.get("sourcePath") ?? ""));
  const destinationPath = String(formData.get("destinationPath") ?? "").trim();
  const type = String(formData.get("type") ?? "permanent") as RedirectType;

  if (!sourcePath || !destinationPath) return;
  if (sourcePath === destinationPath) return;

  await db.insert(redirects).values({ sourcePath, destinationPath, type }).onConflictDoUpdate({
    target: redirects.sourcePath,
    set: { destinationPath, type, isActive: true },
  });

  revalidatePath("/admin/redirects");
}

export async function setRedirectActive(id: string, isActive: boolean) {
  await db.update(redirects).set({ isActive }).where(eq(redirects.id, id));
  revalidatePath("/admin/redirects");
}

export async function deleteRedirect(id: string) {
  await db.delete(redirects).where(eq(redirects.id, id));
  revalidatePath("/admin/redirects");
}

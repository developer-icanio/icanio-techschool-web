"use server";

import { db } from "@/db";
import { leads, leadStatusEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type LeadStatus = (typeof leadStatusEnum.enumValues)[number];

export async function updateLeadStatus(id: string, status: LeadStatus) {
  await db.update(leads).set({ status }).where(eq(leads.id, id));
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin/leads");
}

export async function updateLeadNotes(id: string, notes: string) {
  await db.update(leads).set({ notes }).where(eq(leads.id, id));
  revalidatePath(`/admin/leads/${id}`);
}

export async function markQuoteSent(id: string) {
  await db
    .update(leads)
    .set({ status: "quote_sent", quoteSentAt: new Date() })
    .where(eq(leads.id, id));
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin/leads");
}

export async function scheduleCall(id: string, whenIso: string) {
  await db
    .update(leads)
    .set({ status: "call_scheduled", callScheduledAt: new Date(whenIso) })
    .where(eq(leads.id, id));
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin/leads");
}

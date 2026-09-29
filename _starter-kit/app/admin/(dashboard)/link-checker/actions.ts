"use server";

import { startLinkCheckRun } from "@/lib/linkChecker";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function runNewLinkCheck() {
  const runId = await startLinkCheckRun();
  revalidatePath("/admin/link-checker");
  redirect(`/admin/link-checker/${runId}`);
}

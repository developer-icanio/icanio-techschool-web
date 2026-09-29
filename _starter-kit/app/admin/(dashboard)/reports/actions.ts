"use server";

import { generateSeoReport } from "@/lib/seoReports";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function runNewSeoReport() {
  const runId = await generateSeoReport();
  revalidatePath("/admin/reports");
  redirect(`/admin/reports/${runId}`);
}

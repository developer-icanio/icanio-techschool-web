import { generateSeoReport } from "@/lib/seoReports";

// Triggered every Monday by vercel.json's cron entry — same
// shared-secret guard as the other cron routes.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const runId = await generateSeoReport();
  return Response.json({ runId });
}

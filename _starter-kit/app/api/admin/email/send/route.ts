import { auth } from "@/auth";
import { z } from "zod";
import { db } from "@/db";
import { subscribers, emailBroadcasts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendBroadcast } from "@/lib/resend";

// proxy.ts only gates /admin/:path*, not /api/admin/*, so this route
// needs its own auth check rather than relying on the middleware.

const sendSchema = z.object({
  subject: z.string().min(1).max(255),
  bodyHtml: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Invalid subject or body", { status: 400 });
  }

  const activeSubscribers = await db
    .select({ email: subscribers.email, unsubscribeToken: subscribers.unsubscribeToken })
    .from(subscribers)
    .where(eq(subscribers.status, "active"));

  if (activeSubscribers.length === 0) {
    return Response.json({ error: "No active subscribers" }, { status: 400 });
  }

  const result = await sendBroadcast(activeSubscribers, parsed.data.subject, parsed.data.bodyHtml);

  const [broadcast] = await db
    .insert(emailBroadcasts)
    .values({
      subject: parsed.data.subject,
      bodyHtml: parsed.data.bodyHtml,
      recipientCount: result.sent,
    })
    .returning();

  return Response.json({ broadcast, ...result });
}

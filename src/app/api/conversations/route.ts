import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ conversations: [] });
    const items = await db.select({ id: conversations.id, title: conversations.title, updatedAt: conversations.updatedAt })
      .from(conversations).where(eq(conversations.userId, user.id)).orderBy(desc(conversations.updatedAt)).limit(40);
    return Response.json({ conversations: items });
  } catch (error) {
    console.error("Could not load conversations:", error);
    return Response.json({ error: "تعذّر تحميل المحادثات." }, { status: 500 });
  }
}

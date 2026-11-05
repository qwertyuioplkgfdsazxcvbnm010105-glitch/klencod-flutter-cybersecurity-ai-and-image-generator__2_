import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
    const { id } = await params;
    if (!uuidPattern.test(id)) return Response.json({ error: "المحادثة غير موجودة." }, { status: 404 });
    const [conversation] = await db.select().from(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, user.id))).limit(1);
    if (!conversation) return Response.json({ error: "المحادثة غير موجودة." }, { status: 404 });
    const items = await db.select({ id: messages.id, role: messages.role, content: messages.content }).from(messages)
      .where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
    return Response.json({ conversation, messages: items });
  } catch (error) {
    console.error("Could not load conversation:", error);
    return Response.json({ error: "تعذّر تحميل المحادثة." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
    const { id } = await params;
    if (!uuidPattern.test(id)) return Response.json({ error: "المحادثة غير موجودة." }, { status: 404 });
    const deleted = await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, user.id))).returning({ id: conversations.id });
    return deleted.length ? Response.json({ ok: true }) : Response.json({ error: "المحادثة غير موجودة." }, { status: 404 });
  } catch {
    return Response.json({ error: "تعذّر حذف المحادثة." }, { status: 500 });
  }
}

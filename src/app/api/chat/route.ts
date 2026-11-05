import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { generateReply, type AIMessage } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 120;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const content = typeof body.message === "string" ? body.message.trim() : "";
    if (!content || content.length > 6000) return Response.json({ error: "اكتب رسالة لا تزيد عن ٦٠٠٠ حرف." }, { status: 400 });
    const user = await getCurrentUser();
    let conversationId: string | null = typeof body.conversationId === "string" ? body.conversationId : null;
    let history: AIMessage[] = [];
    if (user && conversationId) {
      if (!uuidPattern.test(conversationId)) return Response.json({ error: "المحادثة غير موجودة." }, { status: 404 });
      const [conversation] = await db.select({ id: conversations.id }).from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id))).limit(1);
      if (!conversation) return Response.json({ error: "المحادثة غير موجودة." }, { status: 404 });
      const stored = await db.select({ role: messages.role, content: messages.content }).from(messages)
        .where(eq(messages.conversationId, conversationId)).orderBy(desc(messages.createdAt)).limit(16);
      history = stored.reverse().filter((item) => item.role === "user" || item.role === "assistant") as AIMessage[];
    } else {
      conversationId = null;
      if (Array.isArray(body.history)) {
        history = body.history.slice(-16).filter((item: unknown): item is { role: "user" | "assistant"; content: string } => {
          if (!item || typeof item !== "object") return false;
          const value = item as { role?: unknown; content?: unknown };
          return (value.role === "user" || value.role === "assistant") && typeof value.content === "string" && value.content.length <= 6000;
        }).map((item: { role: "user" | "assistant"; content: string }) => ({ role: item.role, content: item.content }));
      }
    }
    const reply = await generateReply([...history, { role: "user", content }]);
    if (user) {
      if (!conversationId) {
        const [created] = await db.insert(conversations).values({ userId: user.id, title: content.slice(0, 70) }).returning({ id: conversations.id });
        conversationId = created.id;
      }
      const now = Date.now();
      await db.insert(messages).values([
        { conversationId, role: "user", content, createdAt: new Date(now) },
        { conversationId, role: "assistant", content: reply, createdAt: new Date(now + 1) },
      ]);
      await db.update(conversations).set({ updatedAt: new Date(now + 1) }).where(and(eq(conversations.id, conversationId), eq(conversations.userId, user.id)));
    }
    return Response.json({ reply, conversationId });
  } catch (error) {
    console.error("Chat request failed:", error);
    return Response.json({ error: error instanceof Error && error.message.includes("خدمة المحادثة") ? error.message : "تعذّر إرسال الرسالة. حاول مرة أخرى." }, { status: 503 });
  }
}

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { generatedImages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { generateImage } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ images: [] });
    const images = await db.select().from(generatedImages).where(eq(generatedImages.userId, user.id)).orderBy(desc(generatedImages.createdAt)).limit(20);
    return Response.json({ images });
  } catch {
    return Response.json({ error: "تعذّر تحميل الصور." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const style = ["realistic", "digital", "cinematic", "anime"].includes(body.style) ? body.style : "digital";
    const ratio = ["square", "landscape", "portrait"].includes(body.ratio) ? body.ratio : "square";
    if (!prompt || prompt.length > 1000) return Response.json({ error: "اكتب وصفاً للصورة لا يزيد عن ١٠٠٠ حرف." }, { status: 400 });
    const imageData = await generateImage(prompt, style, ratio);
    const user = await getCurrentUser();
    if (user) {
      const [image] = await db.insert(generatedImages).values({ userId: user.id, prompt, style, imageData }).returning();
      return Response.json({ image });
    }
    return Response.json({ image: { id: crypto.randomUUID(), prompt, style, imageData, createdAt: new Date().toISOString() } });
  } catch (error) {
    console.error("Image generation failed:", error);
    return Response.json({ error: error instanceof Error && /[\u0600-\u06ff]/.test(error.message) ? error.message : "خدمة الصور غير متاحة حالياً. حاول مرة أخرى." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "سجّل دخولك أولاً." }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: "الصورة غير موجودة." }, { status: 404 });
    const deleted = await db.delete(generatedImages).where(and(eq(generatedImages.id, id), eq(generatedImages.userId, user.id))).returning({ id: generatedImages.id });
    return deleted.length ? Response.json({ ok: true }) : Response.json({ error: "الصورة غير موجودة." }, { status: 404 });
  } catch {
    return Response.json({ error: "تعذّر حذف الصورة." }, { status: 500 });
  }
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

type Attempt = { count: number; expiresAt: number };
const globalAttempts = globalThis as typeof globalThis & { __haseenLoginAttempts?: Map<string, Attempt> };
const attempts = globalAttempts.__haseenLoginAttempts ?? new Map<string, Attempt>();
globalAttempts.__haseenLoginAttempts = attempts;
const WINDOW_MS = 10 * 60 * 1000;
const dummyHash = `${"00".repeat(16)}:${"00".repeat(64)}`;

function limited(key: string, max: number) {
  const item = attempts.get(key);
  if (!item) return false;
  if (item.expiresAt <= Date.now()) { attempts.delete(key); return false; }
  return item.count >= max;
}
function recordFailure(key: string) {
  const item = attempts.get(key);
  if (!item || item.expiresAt <= Date.now()) attempts.set(key, { count: 1, expiresAt: Date.now() + WINDOW_MS });
  else item.count += 1;
  if (attempts.size > 10000) {
    for (const [entry, value] of attempts) if (value.expiresAt <= Date.now()) attempts.delete(entry);
    if (attempts.size > 10000) { const oldest = attempts.keys().next().value; if (oldest) attempts.delete(oldest); }
  }
}

export async function GET() {
  try {
    return Response.json({ user: await getCurrentUser() });
  } catch {
    return Response.json({ error: "تعذّر التحقق من الحساب." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === "logout") {
      await destroySession();
      return Response.json({ ok: true });
    }
    if (body.action !== "register" && body.action !== "login") return Response.json({ error: "طلب غير صالح." }, { status: 400 });
    const displayName = typeof body.username === "string" ? body.username.trim().normalize("NFC") : "";
    const username = displayName.toLocaleLowerCase("en-US");
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[\p{L}\p{N}_.-]{3,32}$/u.test(username)) {
      return Response.json({ error: "اسم المستخدم من ٣ إلى ٣٢ حرفاً أو رقماً، ويمكن استخدام _ و - و ." }, { status: 400 });
    }
    if (!password || password.length > 256) return Response.json({ error: "أدخل كلمة مرور لا تزيد عن ٢٥٦ حرفاً." }, { status: 400 });

    if (body.action === "register") {
      if (/^([\s\S]+?)\1+$/u.test(password)) return Response.json({ error: "اختر كلمة مرور غير مكوّنة من نمط متكرر فقط." }, { status: 400 });
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
      if (existing.length) return Response.json({ error: "اسم المستخدم مستخدم بالفعل، اختر اسماً آخر." }, { status: 409 });
      const passwordHash = await hashPassword(password);
      const [user] = await db.insert(users).values({ username, displayName, passwordHash }).returning({ id: users.id, username: users.username, displayName: users.displayName });
      await createSession(user.id);
      return Response.json({ user }, { status: 201 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userKey = `user:${username}`;
    const ipKey = `ip:${ip}`;
    if (limited(userKey, 8) || limited(ipKey, 30)) return Response.json({ error: "محاولات دخول كثيرة. انتظر بضع دقائق ثم حاول مجدداً." }, { status: 429 });
    recordFailure(userKey); recordFailure(ipKey);
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const valid = await verifyPassword(password, user?.passwordHash || dummyHash);
    if (!user || !valid) {
      return Response.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة." }, { status: 401 });
    }
    attempts.delete(userKey);
    await createSession(user.id);
    return Response.json({ user: { id: user.id, username: user.username, displayName: user.displayName } });
  } catch (error) {
    const cause = error as { code?: string; cause?: { code?: string } };
    if (cause?.code === "23505" || cause?.cause?.code === "23505") return Response.json({ error: "اسم المستخدم مستخدم بالفعل، اختر اسماً آخر." }, { status: 409 });
    console.error("Authentication failed:", error);
    return Response.json({ error: "تعذّر إتمام الطلب. حاول مرة أخرى." }, { status: 500 });
  }
}

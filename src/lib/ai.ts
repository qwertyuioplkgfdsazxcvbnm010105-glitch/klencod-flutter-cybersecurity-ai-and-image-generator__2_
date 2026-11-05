import sharp from "sharp";

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };

const systemMessage: AIMessage = {
  role: "system",
  content: "أنت حصين، مساعد ذكي ودود متخصص في الأمن السيبراني والحماية الرقمية، وتجيب أيضاً عن الأسئلة العامة في كل المجالات. أجب بلغة المستخدم وبطريقة دقيقة وواضحة وعملية. عند الإجابة بالعربية استخدم العربية السليمة ولا تخلط لغات أخرى إلا أسماء ومصطلحات تقنية ضرورية. اجعل الإجابة موجزة ومنظمة ما لم يُطلب التفصيل، وتجنب الجداول الكبيرة ما لم تكن مفيدة. ساعد في التعلم والحماية والاختبارات المصرح بها، ولا تدّع الوصول إلى أنظمة أو معلومات غير متاحة. إذا كان الجواب غير مؤكد فوضّح ذلك.",
};

async function chatRequest(url: string, model: string, messages: AIMessage[], key?: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({ model, messages: [systemMessage, ...messages], temperature: 0.6, max_tokens: 1800, ...(model.startsWith("gpt-oss-") ? { reasoning_effort: "low" } : {}) }),
    signal: AbortSignal.timeout(25000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`provider returned ${response.status}`);
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("provider returned an empty response");
  return content.trim();
}

export async function generateReply(messages: AIMessage[]) {
  const openaiKey = process.env.OPENAI_API_KEY;
  const pollinationsKey = process.env.POLLINATIONS_API_KEY;
  const attempts: { url: string; model: string; key?: string }[] = [];
  if (openaiKey) attempts.push({ url: "https://api.openai.com/v1/chat/completions", model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini", key: openaiKey });
  if (pollinationsKey) attempts.push({ url: "https://gen.pollinations.ai/v1/chat/completions", model: process.env.POLLINATIONS_CHAT_MODEL || "openai", key: pollinationsKey });
  attempts.push({ url: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions", model: "gpt-oss-120b", key: process.env.OVHCLOUD_API_KEY });
  attempts.push({ url: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions", model: "Mistral-Small-3.2-24B-Instruct-2506", key: process.env.OVHCLOUD_API_KEY });
  attempts.push({ url: "https://text.pollinations.ai/openai", model: "openai" });

  for (const provider of attempts) {
    try {
      return await chatRequest(provider.url, provider.model, messages, provider.key);
    } catch (error) {
      console.error("Chat provider unavailable:", error instanceof Error ? error.message : "unknown error");
    }
  }
  throw new Error("خدمة المحادثة مشغولة أو غير متاحة حالياً. حاول مجدداً بعد قليل.");
}

const styles: Record<string, string> = {
  realistic: "photorealistic, highly detailed, beautiful natural lighting",
  digital: "digital artwork, detailed, vibrant colors, beautiful composition",
  cinematic: "cinematic scene, dramatic lighting, highly detailed",
  anime: "beautiful anime illustration, detailed, expressive colors",
};

async function openAIImage(prompt: string, ratio: string, key: string) {
  const size = ratio === "landscape" ? "1536x1024" : ratio === "portrait" ? "1024x1536" : "1024x1024";
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1", prompt, size, n: 1 }),
    signal: AbortSignal.timeout(70000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`OpenAI image returned ${response.status}`);
  const result = await response.json();
  const base64 = result?.data?.[0]?.b64_json;
  if (!base64 || typeof base64 !== "string") throw new Error("empty image response");
  return `data:image/png;base64,${base64}`;
}

async function pollinationsImage(prompt: string, ratio: string, key?: string) {
  const dimensions = ratio === "landscape" ? [896, 640] : ratio === "portrait" ? [640, 896] : [768, 768];
  const params = new URLSearchParams({ width: String(dimensions[0]), height: String(dimensions[1]), seed: String(Math.floor(Math.random() * 2147483647)), safe: "true" });
  if (key) params.set("model", process.env.POLLINATIONS_IMAGE_MODEL || "flux");
  const base = key ? "https://gen.pollinations.ai/image/" : "https://image.pollinations.ai/prompt/";
  const response = await fetch(`${base}${encodeURIComponent(prompt)}?${params}`, {
    headers: { Accept: "image/jpeg, image/png, application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    signal: AbortSignal.timeout(50000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Pollinations image returned ${response.status}`);
  const type = response.headers.get("content-type")?.split(";")[0];
  if (type !== "image/jpeg" && type !== "image/png" && type !== "image/webp") throw new Error("invalid image content type");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) throw new Error("invalid image size");
  return `data:${type};base64,${bytes.toString("base64")}`;
}

async function fallbackImage(prompt: string, ratio: string) {
  const key = process.env.OVHCLOUD_API_KEY;
  const response = await fetch("https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({ model: "stable-diffusion-xl-base-v10", prompt, size: "1024x1024" }),
    signal: AbortSignal.timeout(50000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`fallback image returned ${response.status}`);
  const result = await response.json();
  const base64 = result?.data?.[0]?.b64_json;
  if (!base64 || typeof base64 !== "string" || base64.length > 16 * 1024 * 1024) throw new Error("invalid fallback image");
  const image = sharp(Buffer.from(base64, "base64"));
  if (ratio === "landscape") image.resize(1024, 732, { fit: "cover" });
  if (ratio === "portrait") image.resize(732, 1024, { fit: "cover" });
  const bytes = await image.jpeg({ quality: 90 }).toBuffer();
  return `data:image/jpeg;base64,${bytes.toString("base64")}`;
}

export async function generateImage(prompt: string, style: string, ratio: string) {
  const styledPrompt = `${prompt}. ${styles[style] || styles.digital}`;
  const openaiKey = process.env.OPENAI_API_KEY;
  const pollinationsKey = process.env.POLLINATIONS_API_KEY;
  const attempts: Array<() => Promise<string>> = [];
  if (openaiKey) attempts.push(() => openAIImage(styledPrompt, ratio, openaiKey));
  attempts.push(() => pollinationsImage(styledPrompt, ratio, pollinationsKey));
  attempts.push(() => fallbackImage(styledPrompt, ratio));
  for (const attempt of attempts) {
    try { return await attempt(); }
    catch (error) { console.error("Image provider unavailable:", error instanceof Error ? error.message : "unknown error"); }
  }
  throw new Error("خدمات الصور مشغولة أو غير متاحة حالياً. انتظر قليلاً ثم حاول مجدداً.");
}

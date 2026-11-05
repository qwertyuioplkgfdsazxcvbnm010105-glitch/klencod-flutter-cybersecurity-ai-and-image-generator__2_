export type User = { id: string; username: string; displayName: string };
export type ChatMessage = { id?: string; role: "user" | "assistant"; content: string };
export type Conversation = { id: string; title: string; updatedAt: string };
export type GeneratedImage = { id: string; prompt: string; style: string; imageData: string; createdAt: string };
export type Page = "home" | "chat" | "images" | "history" | "guide";

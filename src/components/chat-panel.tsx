"use client";

import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Bot, CircleHelp, LockKeyhole, Plus, Sparkles, UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/types";

type Props = {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  onSend: (value: string) => void;
  onNew: () => void;
  loading: boolean;
  error: string;
  expanded?: boolean;
};

const suggestions = ["كيف أحمي حساباتي؟", "ما هو التصيد الاحتيالي؟", "اشرح لي الذكاء الاصطناعي"];

export default function ChatPanel({ messages, input, setInput, onSend, onNew, loading, error, expanded = false }: Props) {
  const bottom = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (messages.length && expanded) bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages.length, loading, expanded]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!loading && input.trim()) onSend(input);
  }
  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!loading && input.trim()) onSend(input);
    }
  }

  return (
    <section className={`chat-panel surface ${expanded ? "chat-expanded" : ""}`} id="chat-panel">
      <div className="panel-heading">
        <div className="panel-title-group"><div className="small-icon green"><Sparkles size={17} /></div><div><h2>المساعد الذكي</h2><p>إجابات تفهم ما تبحث عنه</p></div></div>
        <button className="subtle-button new-chat-small" onClick={onNew}><Plus size={15} /> محادثة جديدة</button>
      </div>
      {messages.length === 0 ? (
        <div className="chat-empty">
          <div className="chat-greeting"><div className="bot-avatar"><Bot size={20} /></div><div><h3>أهلاً! كيف يمكنني مساعدتك اليوم؟ <span>✦</span></h3><p>اسألني عن الأمن السيبراني، أو أي شيء آخر يدور في بالك.</p></div></div>
          <div className="suggestion-row">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => onSend(suggestion)} disabled={loading}><CircleHelp size={14} />{suggestion}</button>)}</div>
        </div>
      ) : (
        <div className="chat-transcript" aria-live="polite">
          {messages.map((message, index) => <div className={`message-row ${message.role}`} key={message.id || `${message.role}-${index}`}><div className={`message-avatar ${message.role === "assistant" ? "bot-avatar" : "human-avatar"}`}>{message.role === "assistant" ? <Bot size={17} /> : <UserRound size={17} />}</div><div className="message-content"><div className="message-name">{message.role === "assistant" ? "حصين" : "أنت"}</div><div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown></div></div></div>)}
          {loading && <div className="message-row assistant"><div className="message-avatar bot-avatar"><Bot size={17} /></div><div className="typing"><span /><span /><span /></div></div>}
          <div ref={bottom} />
        </div>
      )}
      {error && <div className="inline-error" role="alert">{error}</div>}
      <form className="composer" onSubmit={submit}>
        <textarea ref={textarea} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKey} placeholder="اسأل حصين عن أي شيء..." aria-label="اكتب رسالتك" rows={1} maxLength={6000} />
        <button type="submit" disabled={!input.trim() || loading} aria-label="إرسال الرسالة"><ArrowUp size={19} /></button>
      </form>
      <div className="chat-footnote"><LockKeyhole size={12} /> قد يخطئ حصين؛ تحقّق من المعلومات المهمة ولا تشارك كلمات مرورك.</div>
    </section>
  );
}

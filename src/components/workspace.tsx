"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpLeft, BadgeCheck, BookOpen, ChevronDown, CircleHelp, Clock3, Fingerprint, Globe2, History, Image as ImageIcon, LayoutGrid, LockKeyhole, LogIn, LogOut, MessageCircle, MessageSquareText, Plus, ScanEye, Shield, ShieldCheck, Sparkles, Trash2, UserRound, WandSparkles, Zap } from "lucide-react";
import AuthModal from "@/components/auth-modal";
import ChatPanel from "@/components/chat-panel";
import ImageStudio from "@/components/image-studio";
import type { ChatMessage, Conversation, GeneratedImage, Page, User } from "@/lib/types";

const navItems: { id: Page; label: string; icon: typeof LayoutGrid }[] = [
  { id: "home", label: "نظرة عامة", icon: LayoutGrid },
  { id: "chat", label: "المساعد الذكي", icon: MessageSquareText },
  { id: "images", label: "استوديو الصور", icon: ImageIcon },
  { id: "history", label: "محادثاتي", icon: History },
  { id: "guide", label: "دليل الحماية", icon: ShieldCheck },
];

const guideItems = [
  { icon: Fingerprint, title: "أمّن حساباتك", text: "استخدم كلمات مرور فريدة وفعّل المصادقة الثنائية كلما أمكن.", prompt: "كيف أؤمن حساباتي وأفعّل المصادقة الثنائية؟", color: "green" },
  { icon: ScanEye, title: "تعرّف على التصيد", text: "انتبه للروابط والرسائل غير المتوقعة قبل مشاركة أي معلومات.", prompt: "كيف أتعرف على رسائل التصيد الاحتيالي؟", color: "violet" },
  { icon: LockKeyhole, title: "احمِ خصوصيتك", text: "راجع أذونات التطبيقات ولا تشارك بياناتك الحساسة دون ضرورة.", prompt: "ما أهم الخطوات لحماية خصوصيتي على الإنترنت؟", color: "amber" },
  { icon: Shield, title: "حدّث أجهزتك", text: "التحديثات الدورية تسد ثغرات أمنية وتحمي بياناتك وأجهزتك.", prompt: "لماذا تحديث البرامج والأجهزة مهم للأمان؟", color: "blue" },
];

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? "compact" : ""}`}><div className="brand-icon"><ShieldCheck size={24} strokeWidth={1.8} /></div>{!compact && <div className="brand-word"><strong>حَصين<span> .</span></strong><small>HASEEN AI</small></div>}</div>;
}

export default function Workspace() {
  const [page, setPage] = useState<Page>("home");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [accountMenu, setAccountMenu] = useState(false);
  const [topMenu, setTopMenu] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [notice, setNotice] = useState("");
  const chatRun = useRef(0);

  const refreshConversations = useCallback(async () => {
    try { const response = await fetch("/api/conversations", { cache: "no-store" }); const data = await response.json(); if (response.ok) setConversations(data.conversations || []); } catch { /* Keep the interface usable offline. */ }
  }, []);
  const refreshImages = useCallback(async () => {
    try { const response = await fetch("/api/images", { cache: "no-store" }); const data = await response.json(); if (response.ok) setImages(data.images || []); } catch { /* Retry on the next visit. */ }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth", { cache: "no-store" }).then((response) => response.json()).then((data) => { if (active && data.user) setUser(data.user); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => { if (user) { void refreshConversations(); void refreshImages(); } }, [user, refreshConversations, refreshImages]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(""), 4000); return () => window.clearTimeout(timer); }, [notice]);

  function newChat() {
    chatRun.current += 1;
    setConversationId(null); setMessages([]); setInput(""); setChatError(""); setChatLoading(false); setPage("chat");
  }
  function goToChat(prompt = "") {
    setPage("chat");
    if (prompt) setInput(prompt);
  }
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); newChat(); } };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  async function sendMessage(value: string) {
    const content = value.trim();
    if (!content || chatLoading) return;
    const previous = messages;
    const run = ++chatRun.current;
    setMessages([...previous, { role: "user", content }]); setInput(""); setChatError(""); setChatLoading(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: content, conversationId, history: previous }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر إرسال الرسالة.");
      if (chatRun.current !== run) { if (user) void refreshConversations(); return; }
      setMessages([...previous, { role: "user", content }, { role: "assistant", content: data.reply }]);
      if (data.conversationId) setConversationId(data.conversationId);
      if (user) void refreshConversations();
    } catch (error) {
      if (chatRun.current !== run) return;
      setMessages(previous); setInput(content); setChatError(error instanceof Error ? error.message : "حدث خطأ. حاول مرة أخرى.");
    } finally { if (chatRun.current === run) setChatLoading(false); }
  }

  async function loadConversation(id: string) {
    chatRun.current += 1; setChatLoading(false); setChatError("");
    try {
      const response = await fetch(`/api/conversations/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setConversationId(id); setMessages(data.messages); setInput(""); setPage("chat");
    } catch { setNotice("تعذّر تحميل المحادثة. حاول مجدداً."); }
  }
  async function deleteConversation(id: string) {
    if (!window.confirm("هل تريد حذف هذه المحادثة؟")) return;
    try {
      const response = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setConversations((items) => items.filter((item) => item.id !== id));
      if (conversationId === id) { setConversationId(null); setMessages([]); }
      setNotice("تم حذف المحادثة.");
    } catch { setNotice("تعذّر حذف المحادثة."); }
  }
  async function deleteImage(id: string) {
    if (!window.confirm("هل تريد حذف هذه الصورة؟")) return;
    if (user) {
      try { const response = await fetch(`/api/images?id=${encodeURIComponent(id)}`, { method: "DELETE" }); if (!response.ok) throw new Error(); }
      catch { setNotice("تعذّر حذف الصورة."); return; }
    }
    setImages((items) => items.filter((item) => item.id !== id)); setNotice("تم حذف الصورة.");
  }
  async function logout() {
    try {
      await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    } finally {
      chatRun.current += 1; setUser(null); setConversations([]); setImages([]); setConversationId(null); setMessages([]); setInput(""); setChatLoading(false); setAccountMenu(false); setPage("home"); setNotice("تم تسجيل الخروج.");
    }
  }
  function authenticated(nextUser: User) {
    chatRun.current += 1; setUser(nextUser); setAuthMode(null); setConversationId(null); setMessages([]); setInput(""); setChatError(""); setChatLoading(false); setNotice(`أهلاً بك، ${nextUser.displayName}!`);
  }
  const pageLabel = navItems.find((item) => item.id === page)?.label || "نظرة عامة";
  const chatProps = { messages, input, setInput, onSend: sendMessage, onNew: newChat, loading: chatLoading, error: chatError };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top"><button className="brand-button" onClick={() => setPage("home")} aria-label="حصين - الصفحة الرئيسية"><Brand /></button><span className="brand-tag">AI</span></div>
        <div className="sidebar-scroll">
          <button className="sidebar-new" onClick={newChat}><span className="plus-box"><Plus size={17} /></span><span>محادثة جديدة</span><span className="shortcut" dir="ltr">⌘ K</span></button>
          <div className="nav-caption">مساحة العمل</div>
          <nav className="side-nav" aria-label="التنقل الرئيسي">{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === "images" && <span className="nav-new">جديد</span>}{page === item.id && <span className="active-dot" />}</button>; })}</nav>
          <div className="sidebar-divider" />
          <div className="recent-heading"><span>المحادثات الأخيرة</span><button onClick={newChat} aria-label="محادثة جديدة"><Plus size={16} /></button></div>
          {conversations.length ? <div className="recent-list">{conversations.slice(0, 4).map((conversation) => <button key={conversation.id} className={conversationId === conversation.id ? "selected" : ""} onClick={() => loadConversation(conversation.id)}><MessageCircle size={15} /><span>{conversation.title}</span></button>)}</div> : <div className="recent-empty"><Clock3 size={15} /><span>ستظهر محادثاتك هنا</span></div>}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-callout"><div className="callout-icon"><ShieldCheck size={20} /></div><strong>{user ? "مساحتك جاهزة لك" : "كل أفكارك، في مكان واحد"}</strong><p>{user ? "ارجع إلى محادثاتك وصورك في أي وقت." : "أنشئ حسابك لحفظ محادثاتك وصورك بسهولة."}</p><button onClick={() => user ? setPage("history") : setAuthMode("register")}>{user ? "عرض محادثاتي" : "أنشئ حساباً مجاناً"}<ArrowLeft size={14} /></button></div>
          <div className="sidebar-profile"><div className="profile-avatar">{user ? user.displayName.charAt(0).toUpperCase() : <UserRound size={18} />}</div><button className="profile-info" onClick={() => user ? setAccountMenu(!accountMenu) : setAuthMode("login")}><strong>{user ? user.displayName : "أهلاً بك!"}</strong><span>{user ? "حسابك الشخصي" : "سجّل الدخول للمتابعة"}</span></button><button className="profile-more" onClick={() => user ? setAccountMenu(!accountMenu) : setAuthMode("login")} aria-label={user ? "قائمة الحساب" : "تسجيل الدخول"}><ChevronDown size={16} /></button>{accountMenu && user && <div className="account-popover"><div>{user.displayName}<small>@{user.username}</small></div><button onClick={logout}><LogOut size={16} /> تسجيل الخروج</button></div>}</div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="breadcrumbs"><span className="mobile-brand"><Brand compact /></span><span className="crumb-muted">مساحة العمل</span><span className="crumb-separator">/</span><strong>{pageLabel}</strong></div><div className="top-actions"><div className="online-status"><span className="tiny-dot" /> جاهز للمساعدة</div><button className="help-button" onClick={() => setPage("guide")} aria-label="دليل الحماية"><CircleHelp size={18} /></button><span className="top-separator" />{user ? <div className="top-user-wrap"><button className="top-user" onClick={() => setTopMenu(!topMenu)}><span>{user.displayName.charAt(0).toUpperCase()}</span>{user.displayName}<ChevronDown size={14} /></button>{topMenu && <div className="top-account-popover"><div>{user.displayName}<small>@{user.username}</small></div><button onClick={() => { setTopMenu(false); void logout(); }}><LogOut size={16} /> تسجيل الخروج</button></div>}</div> : <button className="top-login" onClick={() => setAuthMode("login")}><LogIn size={16} /> تسجيل الدخول</button>}</div></header>
        <div className="main-content">
          {page === "home" && <>
            <div className="page-intro home-intro"><div><h1>أهلاً بك في <span>حصين</span> <span className="hello-spark">✦</span></h1><p>مساحتك الذكية للتعلّم، الحماية، والإبداع.</p></div><div className="intro-tag"><span className="tiny-dot" /> ذكاء يصنع الفرق</div></div>
            <section className="hero"><div className="hero-art" /><div className="hero-copy"><div className="hero-eyebrow"><span className="tiny-dot" /> مساعدك الذكي، بكل ثقة</div><h2>ذكاء يحميك،<br /><span>وإبداع يلهمك.</span></h2><p>من أسئلتك اليومية إلى عالم الأمن السيبراني،<br className="desktop-break" /> ومن فكرة بسيطة إلى صورة مدهشة.</p><div className="hero-actions"><button className="primary-button" onClick={() => goToChat()}><Sparkles size={16} /> ابدأ المحادثة <ArrowLeft size={16} /></button><button className="hero-secondary" onClick={() => setPage("images")}><ImageIcon size={16} /> جرّب توليد الصور</button></div></div><div className="hero-float"><span><ShieldCheck size={17} /></span><div><strong>ذكاء تفهمه ويَفهمك</strong><small>معك في كل خطوة</small></div><BadgeCheck size={16} /></div></section>
            <div className="section-heading"><div><h2>استكشف إمكانيات حصين <span>✦</span></h2><p>كل ما تحتاجه، في مكان واحد.</p></div><button className="text-button" onClick={() => setPage("guide")}>اكتشف المزيد <ArrowLeft size={15} /></button></div>
            <div className="feature-grid">
              <button className="feature-card surface" onClick={() => goToChat("كيف أحمي حساباتي وبياناتي من الاختراق؟")}><div className="feature-top"><span className="feature-icon green"><ShieldCheck size={21} /></span><ArrowUpLeft className="feature-arrow" size={17} /></div><h3>الأمن السيبراني</h3><p>إرشادات ذكية لحماية عالمك الرقمي.</p><span className="feature-label green-label"><span /> حماية وخصوصية</span></button>
              <button className="feature-card surface" onClick={() => goToChat()}><div className="feature-top"><span className="feature-icon violet"><Sparkles size={21} /></span><ArrowUpLeft className="feature-arrow" size={17} /></div><h3>اسأل عن أي شيء</h3><p>إجابات وأفكار لكل ما يشغل بالك.</p><span className="feature-label violet-label"><span /> معرفة بلا حدود</span></button>
              <button className="feature-card surface" onClick={() => setPage("images")}><div className="feature-top"><span className="feature-icon amber"><WandSparkles size={21} /></span><ArrowUpLeft className="feature-arrow" size={17} /></div><h3>توليد الصور</h3><p>حوّل الكلمات إلى صور تستحق المشاركة.</p><span className="feature-label amber-label"><span /> من خيالك إلى واقع</span></button>
            </div>
            <div className="section-heading workbench-heading"><div><h2>ابدأ من هنا <span>✦</span></h2><p>فكرة واحدة كافية لتبدأ.</p></div><button className="text-button" onClick={() => setPage("chat")}>فتح المحادثة <ArrowLeft size={15} /></button></div>
            <div className="workbench-grid"><ChatPanel {...chatProps} /><button className="studio-teaser surface" onClick={() => setPage("images")}><div className="teaser-image"><span className="teaser-pill"><Sparkles size={12} /> استوديو الصور</span><span className="teaser-icon"><ArrowUpLeft size={17} /></span></div><div className="teaser-copy"><div><h3>تخيّلها. صفها. شاهدها.</h3><p>أطلق إبداعك بصورة من صنع خيالك.</p></div><span className="teaser-link">ابدأ الإبداع <ArrowLeft size={14} /></span></div></button></div>
          </>}
          {page === "chat" && <div className="chat-page"><div className="page-intro"><div><div className="section-kicker"><span className="tiny-dot" /> مساعدك الذكي</div><h1>ما الذي يدور في بالك؟ <span>✦</span></h1><p>اسأل بحرية، حصين هنا ليساعدك على الفهم والاكتشاف.</p></div><div className="intro-tag"><ShieldCheck size={15} /> معرفة تساعدك على الحماية</div></div><ChatPanel {...chatProps} expanded /><p className="page-disclaimer">تُرسل رسائلك إلى مزوّد ذكاء اصطناعي خارجي لمعالجتها. لا تشارك بيانات حساسة.</p></div>}
          {page === "images" && <ImageStudio user={user} images={images} onAdd={(image) => setImages((previous) => [image, ...previous])} onRemove={deleteImage} openAuth={() => setAuthMode("register")} />}
          {page === "history" && <div className="history-page"><div className="page-intro"><div><div className="section-kicker"><span className="tiny-dot" /> مساحتك الشخصية</div><h1>محادثاتي <span>✦</span></h1><p>كل أفكارك وأسئلتك السابقة في مكان واحد.</p></div><button className="primary-button" onClick={newChat}><Plus size={17} /> محادثة جديدة</button></div>{!user ? <div className="history-empty surface"><div className="empty-illustration"><History size={28} /></div><h2>احتفظ بما يهمك</h2><p>أنشئ حساباً باسم مستخدم وكلمة مرور لحفظ محادثاتك والعودة إليها في أي وقت.</p><button className="primary-button" onClick={() => setAuthMode("register")}>إنشاء حساب <ArrowLeft size={16} /></button><button className="text-button" onClick={() => setAuthMode("login")}>لديّ حساب بالفعل</button></div> : conversations.length ? <div className="history-list surface">{conversations.map((conversation) => <div className="history-row" key={conversation.id}><button className="history-open" onClick={() => loadConversation(conversation.id)}><span className="small-icon green"><MessageSquareText size={17} /></span><span><strong>{conversation.title}</strong><small>{new Intl.DateTimeFormat("ar", { dateStyle: "medium" }).format(new Date(conversation.updatedAt))}</small></span></button><button className="history-delete" onClick={() => deleteConversation(conversation.id)} aria-label="حذف المحادثة"><Trash2 size={17} /></button><ArrowLeft size={16} className="history-arrow" /></div>)}</div> : <div className="history-empty surface"><div className="empty-illustration"><MessageSquareText size={28} /></div><h2>بداية قصة جديدة</h2><p>لم تبدأ أي محادثات بعد. اسأل حصين وسيتم حفظ محادثتك هنا.</p><button className="primary-button" onClick={newChat}>ابدأ محادثة <ArrowLeft size={16} /></button></div>}</div>}
          {page === "guide" && <div className="guide-page"><div className="page-intro"><div><div className="section-kicker"><span className="tiny-dot" /> معرفة تحميك</div><h1>دليل الحماية الرقمية <span>✦</span></h1><p>خطوات بسيطة تصنع فرقاً كبيراً في أمانك الرقمي.</p></div><div className="intro-tag"><ShieldCheck size={15} /> أمانك يبدأ بالوعي</div></div><div className="guide-banner"><div><span><ShieldCheck size={15} /> أمنك الرقمي يهمنا</span><h2>معرفة أكثر، أمان أكبر.</h2><p>ابدأ بهذه الأساسيات، واسأل حصين عن أي موضوع تريد التعمق فيه.</p></div><ShieldCheck size={100} strokeWidth={0.8} /></div><div className="guide-grid">{guideItems.map((item) => { const Icon = item.icon; return <div className="guide-card surface" key={item.title}><span className={`feature-icon ${item.color}`}><Icon size={22} /></span><h3>{item.title}</h3><p>{item.text}</p><button className="text-button" onClick={() => goToChat(item.prompt)}>اسأل حصين <ArrowLeft size={15} /></button></div>; })}</div><div className="guide-note"><BookOpen size={18} /><span>معلومة مفيدة: لا تشارك كلمات المرور أو رموز التحقق مع أي شخص، حتى لو ادّعى أنه من جهة موثوقة.</span></div></div>}
          <footer className="page-footer"><span>صُنع لمساحة رقمية أكثر وعياً <span className="footer-star">✦</span></span><span><Globe2 size={13} /> حصين AI · رفيقك الذكي</span></footer>
        </div>
      </main>
      <nav className="mobile-nav" aria-label="التنقل عبر الهاتف">{navItems.slice(0, 4).map((item) => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}><Icon size={19} /><span>{item.label}</span></button>; })}</nav>
      {notice && <div className="toast" role="status"><CheckIcon />{notice}</div>}
      {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} onAuthenticated={authenticated} />}
    </div>
  );
}

function CheckIcon() { return <span className="toast-icon"><Zap size={14} /></span>; }

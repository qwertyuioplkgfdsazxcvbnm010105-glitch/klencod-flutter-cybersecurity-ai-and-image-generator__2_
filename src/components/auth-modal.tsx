"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, ShieldCheck, UserRound, X } from "lucide-react";
import type { User } from "@/lib/types";

type Props = {
  initialMode: "login" | "register";
  onClose: () => void;
  onAuthenticated: (user: User) => void;
};

export default function AuthModal({ initialMode, onClose, onAuthenticated }: Props) {
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, username, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "حدث خطأ، حاول مجدداً.");
      onAuthenticated(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر الاتصال. حاول مجدداً.");
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close icon-button" onClick={onClose} aria-label="إغلاق"><X size={19} /></button>
        <div className="auth-emblem"><ShieldCheck size={27} strokeWidth={1.8} /></div>
        <div className="auth-intro">
          <span className="eyebrow">أهلاً بك في حصين</span>
          <h2 id="auth-title">مساحتك الذكية تبدأ هنا</h2>
          <p>اسم مستخدم وكلمة مرور فقط، بدون بريد إلكتروني أو رقم هاتف.</p>
        </div>
        <div className="auth-tabs" role="tablist" aria-label="خيارات الحساب">
          <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "selected" : ""} onClick={() => { setMode("register"); setError(""); }}>إنشاء حساب</button>
          <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "selected" : ""} onClick={() => { setMode("login"); setError(""); }}>تسجيل الدخول</button>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label htmlFor="username">اسم المستخدم</label>
          <div className="field-wrap"><UserRound size={18} /><input id="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="اختر اسم المستخدم" autoComplete="username" minLength={3} maxLength={32} required autoFocus /></div>
          <label htmlFor="password">كلمة المرور</label>
          <div className="field-wrap"><KeyRound size={18} /><input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="اكتب كلمة المرور" autoComplete={mode === "login" ? "current-password" : "new-password"} maxLength={256} required /><button type="button" className="field-eye" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          {mode === "register" && <><p className="password-hint"><Check size={14} /> نقبل أي كلمة مرور غير مكوّنة من نمط متكرر فقط. ننصحك بكلمة قوية وفريدة.</p><p className="recovery-hint">احتفظ بكلمة مرورك؛ لا تتوفر استعادتها بالبريد أو الهاتف.</p></>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={loading}>{loading ? "جارٍ الانتظار..." : mode === "register" ? "إنشاء حسابي" : "الدخول إلى حصين"}<ArrowLeft size={17} /></button>
        </form>
        <p className="auth-bottom">{mode === "register" ? "لديك حساب بالفعل؟" : "جديد في حصين؟"} <button onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}>{mode === "register" ? "سجّل دخولك" : "أنشئ حساباً"}</button></p>
      </div>
    </div>
  );
}

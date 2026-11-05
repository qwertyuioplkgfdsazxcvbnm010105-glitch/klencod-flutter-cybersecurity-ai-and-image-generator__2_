"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowDownToLine, ArrowLeft, Check, Clapperboard, Image as ImageIcon, Images, LoaderCircle, Maximize2, Palette, RefreshCw, Sparkles, Square, Trash2, WandSparkles } from "lucide-react";
import type { GeneratedImage, User } from "@/lib/types";

type Props = {
  user: User | null;
  images: GeneratedImage[];
  onAdd: (image: GeneratedImage) => void;
  onRemove: (id: string) => void;
  openAuth: () => void;
};

const styleOptions = [
  { id: "digital", label: "فن رقمي", icon: Palette },
  { id: "realistic", label: "واقعي", icon: Sparkles },
  { id: "cinematic", label: "سينمائي", icon: Clapperboard },
  { id: "anime", label: "أنمي", icon: WandSparkles },
];
const ratios = [ { id: "square", label: "مربع", detail: "1:1" }, { id: "landscape", label: "أفقي", detail: "7:5" }, { id: "portrait", label: "عمودي", detail: "5:7" } ];

export default function ImageStudio({ user, images, onAdd, onRemove, openAuth }: Props) {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("digital");
  const [ratio, setRatio] = useState("square");
  const [selected, setSelected] = useState<GeneratedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (selected && !images.some((image) => image.id === selected.id)) setSelected(null); }, [images, selected]);

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/images", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, style, ratio }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذّر توليد الصورة.");
      onAdd(data.image);
      setSelected(data.image);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر الاتصال بالخدمة.");
    } finally { setLoading(false); }
  }
  const imageSource = selected?.imageData || "/images/studio-preview.png";

  return (
    <div className="studio-page">
      <div className="page-intro studio-intro"><div><div className="section-kicker"><span className="tiny-dot" /> مساحة للإبداع</div><h1>استوديو الصور <span>✦</span></h1><p>فكرة صغيرة قد تصنع صورة مدهشة. صف ما تتخيله ودع الباقي علينا.</p></div><div className="intro-tag"><Sparkles size={15} /> أطلق العنان لخيالك</div></div>
      <div className="studio-layout">
        <form className="studio-form surface" onSubmit={generate}>
          <div className="studio-form-title"><div className="small-icon violet"><WandSparkles size={18} /></div><div><h2>اصنع شيئاً رائعاً</h2><p>كل صورة تبدأ بفكرة</p></div></div>
          <div className="form-section"><div className="label-line"><label htmlFor="image-prompt">صف الصورة التي تتخيلها</label><span>{prompt.length} / 1000</span></div><textarea id="image-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={1000} placeholder="مثلاً: مدينة مستقبلية وسط الجبال، أضواء نيون وانعكاسها على الماء..." rows={5} /><button type="button" className="example-link" onClick={() => setPrompt("مدينة مستقبلية بين الجبال عند الغروب، أضواء نيون تنعكس على بحيرة هادئة، تفاصيل مدهشة")}> <Sparkles size={13} /> جرّب وصفاً للإلهام</button></div>
          <div className="form-section"><label>اختر أسلوب الصورة</label><div className="style-options">{styleOptions.map((option) => { const Icon = option.icon; return <button type="button" key={option.id} className={style === option.id ? "selected" : ""} onClick={() => setStyle(option.id)}><Icon size={17} />{option.label}{style === option.id && <Check className="style-check" size={13} />}</button>; })}</div></div>
          <div className="form-section"><label>أبعاد الصورة</label><div className="ratio-options">{ratios.map((option) => <button type="button" key={option.id} className={ratio === option.id ? "selected" : ""} onClick={() => setRatio(option.id)}><span className={`ratio-icon ${option.id}`} /><span>{option.label}<small dir="ltr">{option.detail}</small></span></button>)}</div></div>
          {error && <div className="inline-error" role="alert">{error}</div>}
          <button className="primary-button generate-button" type="submit" disabled={!prompt.trim() || loading}>{loading ? <><LoaderCircle className="spin" size={19} /> جارٍ تخيّل صورتك...</> : <><WandSparkles size={18} /> توليد الصورة <ArrowLeft size={17} /></>}</button>
          <p className="provider-note">يُرسل وصفك إلى مزود صور خارجي. تعتمد السرعة والتوفر على الخدمة، وقد تطبّق حدود مؤقتة.</p>
        </form>
        <section className="studio-result surface"><div className="result-header"><div><h2>مساحة المعاينة</h2><p>{selected ? "صورتك جاهزة للحفظ والمشاركة" : "هنا تبدأ أفكارك بالظهور"}</p></div><div className="result-status"><span className="tiny-dot" /> {selected ? "تم التوليد" : "للإلهام"}</div></div><div className={`result-art ${loading ? "is-loading" : ""}`}>
          {/* Generated data URLs and bundled preview are rendered directly. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}<img src={imageSource} alt={selected ? selected.prompt : "مثال فني لمشهد خيالي تحت قمر مضيء"} />
          {!selected && !loading && <div className="result-overlay"><div className="result-overlay-icon"><ImageIcon size={20} /></div><strong>خيالك هو نقطة البداية</strong><span>صورة للإلهام · اكتب وصفك لتوليد صورتك</span></div>}
          {loading && <div className="loading-overlay"><LoaderCircle className="spin" size={30} /><strong>نحوّل فكرتك إلى صورة...</strong><span>قد يستغرق هذا بعض الوقت</span></div>}
        </div><div className="result-footer">{selected ? <><div><span>الوصف</span><p>{selected.prompt}</p></div><a className="download-button" href={selected.imageData} download={`haseen-${selected.id}.${selected.imageData.startsWith("data:image/png") ? "png" : "jpg"}`}><ArrowDownToLine size={16} /> تحميل</a></> : <><div><span>إلهام بلا حدود</span><p>صفها، تخيّلها، ثم شاهدها.</p></div><div className="result-footer-icon"><Maximize2 size={18} /></div></>}</div></section>
      </div>
      <div className="gallery-heading"><div><h2>إبداعاتك الأخيرة <span>{images.length}</span></h2><p>{user ? "صورك المحفوظة في مساحتك" : "سجّل دخولك للاحتفاظ بصورك بعد مغادرة الصفحة"}</p></div>{!user && <button className="text-button" onClick={openAuth}>إنشاء حساب <ArrowLeft size={15} /></button>}</div>
      {images.length ? <div className="gallery-grid">{images.map((image) => <div className={`gallery-item ${selected?.id === image.id ? "selected" : ""}`} key={image.id}><button className="gallery-pick" onClick={() => setSelected(image)} aria-label={`عرض صورة: ${image.prompt}`}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={image.imageData} alt={image.prompt} /><span>{image.prompt}</span></button><button className="gallery-delete" onClick={() => onRemove(image.id)} aria-label="حذف الصورة"><Trash2 size={15} /></button></div>)}</div> : <div className="gallery-empty"><Images size={22} /><span>ستظهر صورك التي تنشئها هنا.</span><RefreshCw size={15} /></div>}
    </div>
  );
}

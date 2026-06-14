import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Save, Coffee, Clock, Phone, MapPin, Image, Loader2, CheckCircle, Palette, Share2, Star, Upload, X, Link, ImageIcon, DollarSign, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";

const BUCKET = "images";

function ImageUpload({ value, onChange, folder = "general", label = "الصورة", previewHeight = "h-36" }) {
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState(value ? "preview" : "upload");
  const [urlInput, setUrlInput] = useState("");
  const inputRef = useRef();

  const upload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("الصورة أكبر من 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      const path = `${folder}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
      setTab("preview");
    } catch (e) {
      alert("فشل الرفع: " + (e.message || "تأكد من إنشاء bucket باسم images في Supabase Storage"));
    } finally {
      setUploading(false);
    }
  };

  const applyUrl = () => {
    if (urlInput.startsWith("http")) { onChange(urlInput); setTab("preview"); }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value && (
        <div className={`relative rounded-xl overflow-hidden border border-border ${previewHeight}`}>
          <img src={value} alt="صورة" className="w-full h-full object-cover" onError={e => e.target.style.opacity='.3'} />
          <button type="button" onClick={() => { onChange(""); setTab("upload"); }}
            className="absolute top-2 left-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">✓ تم التحديد</div>
        </div>
      )}
      {(!value || tab !== "preview") && (
        <div className="border-2 border-dashed border-border rounded-xl overflow-hidden">
          <div className="flex border-b border-border">
            <button type="button" onClick={() => setTab("upload")}
              className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${tab === "upload" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              <Upload className="w-3.5 h-3.5" /> رفع من الجهاز
            </button>
            <button type="button" onClick={() => setTab("url")}
              className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${tab === "url" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              <Link className="w-3.5 h-3.5" /> رابط URL
            </button>
          </div>
          {tab === "upload" && (
            <label className={`flex flex-col items-center justify-center gap-2 py-6 cursor-pointer group transition-colors ${uploading ? "opacity-60 pointer-events-none" : "hover:bg-muted/50"}`}>
              <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={e => upload(e.target.files?.[0])} disabled={uploading} />
              {uploading ? (
                <><Loader2 className="w-8 h-8 text-primary animate-spin" /><p className="text-sm font-medium text-primary">جاري الرفع...</p></>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <ImageIcon className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">اضغط لاختيار صورة</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP — حتى 5MB</p>
                </>
              )}
            </label>
          )}
          {tab === "url" && (
            <div className="p-3 space-y-2">
              <Input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg" dir="ltr"
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), applyUrl())} />
              <Button type="button" onClick={applyUrl} className="w-full h-9 rounded-lg" variant="outline" disabled={!urlInput}>
                تطبيق الرابط
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== قائمة العملات المدعومة =====
const CURRENCIES = [
  {
    code: "SAR", symbol: "ر.س", name: "ريال سعودي", flag: "🇸🇦",
    dual: false,
  },
  {
    code: "TRY", symbol: "₺", name: "ليرة تركية", flag: "🇹🇷",
    dual: false,
  },
  {
    code: "SYP", symbol: "ل.س", name: "ليرة سورية — القديمة", flag: "🇸🇾",
    dual: true, altSymbol: "ل.ج", altLabel: "الليرة الجديدة",
    rateHint: "كم ليرة قديمة = 1 ليرة جديدة؟ (مثال: 15000)",
  },
  {
    code: "SYN", symbol: "ل.ج", name: "ليرة سورية — الجديدة", flag: "🇸🇾",
    dual: true, altSymbol: "ل.س", altLabel: "الليرة القديمة",
    rateHint: "كم ليرة جديدة = 1 ليرة قديمة؟ (مثال: 0.000067)",
  },
];

const THEME_COLORS = [
  { name: "برتقالي", hsl: "32 85% 48%",   hex: "#e8820c" },
  { name: "أزرق",    hsl: "217 91% 60%",  hex: "#3b82f6" },
  { name: "أخضر",    hsl: "142 76% 36%",  hex: "#16a34a" },
  { name: "بنفسجي",  hsl: "271 91% 65%",  hex: "#a855f7" },
  { name: "وردي",    hsl: "330 81% 60%",  hex: "#ec4899" },
  { name: "أحمر",    hsl: "0 84% 60%",    hex: "#ef4444" },
  { name: "فيروزي",  hsl: "173 80% 40%",  hex: "#0d9488" },
  { name: "ذهبي",    hsl: "45 93% 47%",   hex: "#eab308" },
];

export default function BusinessSettings() {
  const { user, businessSettings, refreshBusinessSettings } = useAuth();
  const [form, setForm] = useState({
    name: "", name_en: "", address: "", phone: "",
    logo_url: "", currency: "ر.س", currency_code: "SAR",
    currency_dual: false, currency_alt_symbol: "", currency_rate: 1,
    opening_time: "09:00", closing_time: "24:00",
    primary_color: "32 85% 48%",
    hero_image: "",
    menu_tagline: "",
    instagram_url: "",
    twitter_url: "",
    snapchat_url: "",
    tiktok_url: "",
    whatsapp: "",
    google_review_url: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (businessSettings) {
      setForm({
        name:          businessSettings.name          || "",
        name_en:       businessSettings.name_en       || "",
        address:       businessSettings.address       || "",
        phone:         businessSettings.phone         || "",
        logo_url:      businessSettings.logo_url      || "",
        currency:           businessSettings.currency           || "ر.س",
        currency_code:      businessSettings.currency_code      || "SAR",
        currency_dual:      businessSettings.currency_dual      || false,
        currency_alt_symbol: businessSettings.currency_alt_symbol || "",
        currency_rate:      businessSettings.currency_rate      || 1,
        opening_time:  businessSettings.opening_time  || "09:00",
        closing_time:  businessSettings.closing_time  || "24:00",
        primary_color:     businessSettings.primary_color     || "32 85% 48%",
        hero_image:        businessSettings.hero_image        || "",
        menu_tagline:      businessSettings.menu_tagline      || "",
        instagram_url:     businessSettings.instagram_url     || "",
        twitter_url:       businessSettings.twitter_url       || "",
        snapchat_url:      businessSettings.snapchat_url      || "",
        tiktok_url:        businessSettings.tiktok_url        || "",
        whatsapp:          businessSettings.whatsapp          || "",
        google_review_url: businessSettings.google_review_url || "",
      });
    }
  }, [businessSettings]);

  const saveSettings = useMutation({
    mutationFn: async (data) => {
      const bid = user.business_id;
      if (!bid) throw new Error('لا يوجد business_id للمستخدم');
      const { error } = await supabase.from('businesses').update(data).eq('id', bid);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshBusinessSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => {
      alert('فشل الحفظ: ' + err.message);
    },
  });

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  if (!user?.business_id) {
    return <div className="text-center py-20 text-muted-foreground">لا توجد إعدادات متاحة</div>;
  }

  return (
    <div dir="rtl" className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold">إعدادات الكافيه</h1>
        <p className="text-muted-foreground text-xs mt-1">تخصيص معلومات وإعدادات الكافيه</p>
      </div>

      <form onSubmit={e => { e.preventDefault(); saveSettings.mutate(form); }} className="space-y-4">

        {/* المعلومات الأساسية */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Coffee className="w-4 h-4 text-primary" /> المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>اسم الكافيه (عربي) *</Label>
                <Input value={form.name} onChange={set("name")} required placeholder="اسم الكافيه" />
              </div>
              <div className="space-y-1.5">
                <Label>اسم الكافيه (إنجليزي)</Label>
                <Input value={form.name_en} onChange={set("name_en")} placeholder="Zabat Chai" />
              </div>
            </div>
            <ImageUpload
              value={form.logo_url}
              onChange={v => setForm(p => ({ ...p, logo_url: v }))}
              folder="logos"
              label="شعار الكافيه (لوقو)"
              previewHeight="h-24"
            />
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />رقم الهاتف</Label>
              <Input value={form.phone} onChange={set("phone")} placeholder="05xxxxxxxx" />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />العنوان</Label>
              <Input value={form.address} onChange={set("address")} placeholder="المدينة، الحي، الشارع" />
            </div>
          </CardContent>
        </Card>

        {/* ===== العملة ===== */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> العملة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* منتقي العملة */}
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map(cur => (
                <button key={cur.code} type="button"
                  onClick={() => setForm(p => ({
                    ...p,
                    currency_code:      cur.code,
                    currency:           cur.symbol,
                    currency_dual:      false,
                    currency_alt_symbol: cur.altSymbol || "",
                    currency_rate:      1,
                  }))}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-right transition-all ${
                    form.currency_code === cur.code
                      ? "border-primary bg-primary/8 shadow-sm"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="text-2xl">{cur.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight">{cur.symbol}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{cur.name}</p>
                  </div>
                  {form.currency_code === cur.code && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* إعدادات العملة المزدوجة — سوريا فقط */}
            {CURRENCIES.find(c => c.code === form.currency_code)?.dual && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-green-800 flex items-center gap-1.5">
                      <ArrowLeftRight className="w-4 h-4" />
                      زر تبديل العملة في المنيو
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">
                      يُظهر زراً في المنيو لتبديل العرض بين {form.currency} و {CURRENCIES.find(c=>c.code===form.currency_code)?.altSymbol}
                    </p>
                  </div>
                  <button type="button"
                    onClick={() => setForm(p => ({ ...p, currency_dual: !p.currency_dual }))}
                    className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${form.currency_dual ? "bg-green-500" : "bg-gray-300"}`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.currency_dual ? "right-1" : "right-7"}`} />
                  </button>
                </div>

                {form.currency_dual && (
                  <div className="space-y-2 pt-1 border-t border-green-200">
                    <Label className="text-green-800 text-xs">
                      {CURRENCIES.find(c=>c.code===form.currency_code)?.rateHint}
                    </Label>
                    <Input
                      type="number" min="0" step="any"
                      value={form.currency_rate}
                      onChange={e => setForm(p => ({ ...p, currency_rate: parseFloat(e.target.value) || 1 }))}
                      placeholder="مثال: 15000"
                      className="bg-white border-green-300"
                    />
                    <p className="text-[11px] text-green-600">
                      مثال: إذا أسعارك بالليرة القديمة وتريد عرض الجديدة ← ضع 15000
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* تصميم المنيو */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Image className="w-4 h-4 text-primary" /> تصميم المنيو
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload
              value={form.hero_image}
              onChange={v => setForm(p => ({ ...p, hero_image: v }))}
              folder="heroes"
              label="صورة الغلاف (Hero)"
              previewHeight="h-40"
            />
            <div className="space-y-1.5">
              <Label>وصف تحت الاسم في المنيو</Label>
              <Input value={form.menu_tagline} onChange={set("menu_tagline")} placeholder="أفضل تجربة شاي وقهوة" />
            </div>
          </CardContent>
        </Card>

        {/* لون النظام */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" /> لون النظام والمنيو
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">اختر اللون الرئيسي للمنيو والواجهة</p>
            <div className="flex flex-wrap gap-3">
              {THEME_COLORS.map(c => (
                <button
                  key={c.hsl}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, primary_color: c.hsl }))}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className={`w-10 h-10 rounded-xl border-4 transition-all ${form.primary_color === c.hsl ? "scale-110 border-gray-800" : "border-transparent"}`}
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-[10px] text-muted-foreground">{c.name}</span>
                </button>
              ))}
            </div>
            {/* معاينة */}
            <div className="mt-4 p-3 rounded-xl border border-border bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">معاينة الألوان:</p>
              <div className="flex gap-2">
                <div className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: THEME_COLORS.find(c => c.hsl === form.primary_color)?.hex || '#e8820c' }}>
                  زر رئيسي
                </div>
                <div className="px-4 py-2 rounded-lg text-sm font-medium border-2" style={{ borderColor: THEME_COLORS.find(c => c.hsl === form.primary_color)?.hex || '#e8820c', color: THEME_COLORS.find(c => c.hsl === form.primary_color)?.hex || '#e8820c' }}>
                  زر ثانوي
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* التواصل الاجتماعي */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" /> التواصل الاجتماعي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">📸 Instagram</Label>
                <Input value={form.instagram_url} onChange={set("instagram_url")} placeholder="https://instagram.com/..." />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">𝕏 Twitter / X</Label>
                <Input value={form.twitter_url} onChange={set("twitter_url")} placeholder="https://x.com/..." />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">👻 Snapchat</Label>
                <Input value={form.snapchat_url} onChange={set("snapchat_url")} placeholder="https://snapchat.com/add/..." />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">🎵 TikTok</Label>
                <Input value={form.tiktok_url} onChange={set("tiktok_url")} placeholder="https://tiktok.com/@..." />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">💬 WhatsApp</Label>
                <Input value={form.whatsapp} onChange={set("whatsapp")} placeholder="9665xxxxxxxx" dir="ltr" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* رابط تقييم Google */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> تقييم Google Maps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label>رابط صفحة التقييم</Label>
              <Input value={form.google_review_url} onChange={set("google_review_url")} placeholder="https://g.page/r/..." dir="ltr" />
              <p className="text-xs text-muted-foreground">يظهر كزر "قيّم تجربتك" في فوتر المنيو</p>
            </div>
          </CardContent>
        </Card>

        {/* أوقات العمل */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> أوقات العمل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>وقت الفتح</Label>
                <Input type="time" value={form.opening_time} onChange={set("opening_time")} />
              </div>
              <div className="space-y-1.5">
                <Label>وقت الإغلاق</Label>
                <Input type="time" value={form.closing_time} onChange={set("closing_time")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-12" disabled={saveSettings.isPending}>
          {saveSettings.isPending ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الحفظ...</>
          : saved ? <><CheckCircle className="w-4 h-4 ml-2" />تم الحفظ ✓</>
          : <><Save className="w-4 h-4 ml-2" />حفظ الإعدادات</>}
        </Button>
      </form>
    </div>
  );
}

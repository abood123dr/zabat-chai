import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Save, Coffee, Clock, Phone, MapPin, Image, Loader2, CheckCircle, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";

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
    logo_url: "", currency: "ر.س",
    opening_time: "09:00", closing_time: "24:00",
    primary_color: "32 85% 48%",
    hero_image: "",
    menu_tagline: "",
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
        currency:      businessSettings.currency      || "ر.س",
        opening_time:  businessSettings.opening_time  || "09:00",
        closing_time:  businessSettings.closing_time  || "24:00",
        primary_color: businessSettings.primary_color || "32 85% 48%",
        hero_image:    businessSettings.hero_image    || "",
        menu_tagline:  businessSettings.menu_tagline  || "",
      });
    }
  }, [businessSettings]);

  const saveSettings = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('businesses').update(data).eq('id', user.business_id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshBusinessSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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
            <div className="space-y-1.5">
              <Label>شعار الكافيه (رابط صورة)</Label>
              <Input value={form.logo_url} onChange={set("logo_url")} placeholder="https://..." />
              {form.logo_url && <img src={form.logo_url} alt="شعار" className="w-16 h-16 rounded-xl object-cover border mt-2" onError={e => e.target.style.display='none'} />}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />رقم الهاتف</Label>
                <Input value={form.phone} onChange={set("phone")} placeholder="05xxxxxxxx" />
              </div>
              <div className="space-y-1.5">
                <Label>العملة</Label>
                <Input value={form.currency} onChange={set("currency")} placeholder="ر.س" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />العنوان</Label>
              <Input value={form.address} onChange={set("address")} placeholder="المدينة، الحي، الشارع" />
            </div>
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
            <div className="space-y-1.5">
              <Label>صورة الغلاف (Hero)</Label>
              <Input value={form.hero_image} onChange={set("hero_image")} placeholder="https://..." />
              {form.hero_image && <img src={form.hero_image} alt="غلاف" className="w-full h-32 object-cover rounded-xl border mt-2" onError={e => e.target.style.display='none'} />}
            </div>
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

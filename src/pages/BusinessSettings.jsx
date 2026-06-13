import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Coffee, Clock, Phone, MapPin, Image, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/api/supabaseClient";

export default function BusinessSettings() {
  const { user, businessSettings, refreshBusinessSettings } = useAuth();
  const [form, setForm] = useState({
    name: "", name_en: "", address: "", phone: "",
    logo_url: "", currency: "ر.س",
    opening_time: "09:00", closing_time: "24:00",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (businessSettings) {
      setForm({
        name: businessSettings.name || "",
        name_en: businessSettings.name_en || "",
        address: businessSettings.address || "",
        phone: businessSettings.phone || "",
        logo_url: businessSettings.logo_url || "",
        currency: businessSettings.currency || "ر.س",
        opening_time: businessSettings.opening_time || "09:00",
        closing_time: businessSettings.closing_time || "24:00",
      });
    }
  }, [businessSettings]);

  const saveSettings = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase
        .from('businesses')
        .update(data)
        .eq('id', user.business_id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshBusinessSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveSettings.mutate(form);
  };

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  if (!user?.business_id) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        لا توجد إعدادات متاحة لهذا الحساب
      </div>
    );
  }

  return (
    <div dir="rtl" className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold">إعدادات الكافيه</h1>
        <p className="text-muted-foreground text-xs mt-1">تخصيص معلومات وإعدادات الكافيه</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Coffee className="w-4 h-4 text-primary" />
              المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">اسم الكافيه (عربي) *</Label>
                <Input id="name" value={form.name} onChange={set("name")} required placeholder="ظبط شاي" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name_en">اسم الكافيه (إنجليزي)</Label>
                <Input id="name_en" value={form.name_en} onChange={set("name_en")} placeholder="Zabat Chai" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="logo_url" className="flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5" /> رابط الشعار
              </Label>
              <Input id="logo_url" value={form.logo_url} onChange={set("logo_url")} placeholder="https://..." />
              {form.logo_url && (
                <img src={form.logo_url} alt="شعار" className="w-16 h-16 rounded-xl object-cover border border-border mt-2" onError={(e) => e.target.style.display = 'none'} />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> رقم الهاتف
                </Label>
                <Input id="phone" value={form.phone} onChange={set("phone")} placeholder="05xxxxxxxx" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">العملة</Label>
                <Input id="currency" value={form.currency} onChange={set("currency")} placeholder="ر.س" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> العنوان
              </Label>
              <Input id="address" value={form.address} onChange={set("address")} placeholder="المدينة، الحي، الشارع" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              أوقات العمل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="opening_time">وقت الفتح</Label>
                <Input id="opening_time" type="time" value={form.opening_time} onChange={set("opening_time")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="closing_time">وقت الإغلاق</Label>
                <Input id="closing_time" type="time" value={form.closing_time} onChange={set("closing_time")} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-12" disabled={saveSettings.isPending}>
          {saveSettings.isPending ? (
            <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الحفظ...</>
          ) : saved ? (
            <><CheckCircle className="w-4 h-4 ml-2" />تم الحفظ</>
          ) : (
            <><Save className="w-4 h-4 ml-2" />حفظ الإعدادات</>
          )}
        </Button>
      </form>
    </div>
  );
}

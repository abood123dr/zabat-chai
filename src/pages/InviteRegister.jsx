import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { supabase } from "@/api/supabaseClient";

export default function InviteRegister() {
  const [params] = useSearchParams();
  const code = params.get("code");

  const [invitation, setInvitation] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ email: "", password: "", confirm: "", full_name: "" });

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    (async () => {
      const { data: inv } = await supabase
        .from('user_invitations')
        .select('*, businesses(*)')
        .eq('invite_code', code)
        .eq('is_used', false)
        .single();

      if (inv) {
        setInvitation(inv);
        setBusiness(inv.businesses);
        if (inv.email) setForm(p => ({ ...p, email: inv.email }));
      } else {
        setError("رابط الدعوة غير صالح أو تم استخدامه مسبقاً");
      }
      setLoading(false);
    })();
  }, [code]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError("كلمتا المرور غير متطابقتين"); return; }
    if (form.password.length < 6) { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }

    setSubmitting(true);
    setError("");
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            role: invitation.role,
            business_id: invitation.business_id,
          },
        },
      });

      if (signUpError) throw signUpError;

      // ربط المستخدم بالعمل
      if (data?.user) {
        await supabase.from('business_users').insert([{
          business_id: invitation.business_id,
          user_id: data.user.id,
          email: form.email,
          full_name: form.full_name,
          role: invitation.role,
        }]);

        // تعيين الدعوة كمستخدمة
        await supabase.from('user_invitations').update({ is_used: true }).eq('id', invitation.id);
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message || "حدث خطأ في إنشاء الحساب");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!code || (!loading && !invitation && !error)) return (
    <AuthLayout icon={AlertCircle} title="رابط غير صالح" subtitle="">
      <p className="text-center text-muted-foreground text-sm mb-6">لا يوجد رابط دعوة صالح</p>
      <Button asChild className="w-full"><Link to="/login">العودة للدخول</Link></Button>
    </AuthLayout>
  );

  if (success) return (
    <AuthLayout icon={CheckCircle} title="تم إنشاء حسابك!" subtitle="">
      <p className="text-center text-muted-foreground text-sm mb-6">
        تم إنشاء حسابك في <strong>{business?.name}</strong>. يمكنك الآن تسجيل الدخول.
      </p>
      <Button asChild className="w-full h-12"><Link to="/login">تسجيل الدخول</Link></Button>
    </AuthLayout>
  );

  if (error && !invitation) return (
    <AuthLayout icon={AlertCircle} title="رابط منتهي" subtitle="">
      <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center mb-6">{error}</div>
      <Button asChild className="w-full"><Link to="/login">العودة للدخول</Link></Button>
    </AuthLayout>
  );

  return (
    <AuthLayout
      icon={UserPlus}
      title="إنشاء حساب"
      subtitle={business ? `انضم إلى ${business.name}` : "تسجيل عبر الدعوة"}
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
          {error}
        </div>
      )}

      {business && (
        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
          <p className="text-sm font-medium text-primary">{business.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            الدور: {invitation?.role === 'admin' ? 'مدير' : invitation?.role === 'cashier' ? 'كاشير' : invitation?.role}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">الاسم الكامل</Label>
          <Input
            id="full_name" value={form.full_name}
            onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))}
            placeholder="اسمك الكامل" required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">البريد الإلكتروني</Label>
          <Input
            id="email" type="email" value={form.email}
            onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
            placeholder="email@example.com" required
            readOnly={!!invitation?.email}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">كلمة المرور</Label>
          <Input
            id="password" type="password" value={form.password}
            onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
            placeholder="6 أحرف على الأقل" required minLength={6}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
          <Input
            id="confirm" type="password" value={form.confirm}
            onChange={(e) => setForm(p => ({ ...p, confirm: e.target.value }))}
            placeholder="أعد كتابة كلمة المرور" required
          />
        </div>
        <Button type="submit" className="w-full h-12" disabled={submitting}>
          {submitting ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الإنشاء...</> : "إنشاء الحساب"}
        </Button>
      </form>
    </AuthLayout>
  );
}

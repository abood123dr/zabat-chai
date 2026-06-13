import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building, Plus, Pencil, Trash2, Users, UserPlus, Settings, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/api/supabaseClient";
import db from "@/api/supabaseClient";

// admin client يستخدم service_role لإنشاء مستخدمين مؤكدين مباشرة
const adminSupabase = createClient(
  "https://qgtpekhtoonqpoyirpvq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFndHBla2h0b29ucXBveWlycHZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDMxMTY4OSwiZXhwIjoyMDk1ODg3Njg5fQ.HJpHrdSNox74GoxWUtZX63WfSj40xhO63uaUaToO_p4",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const EMPTY_BIZ = { name: "", name_en: "", address: "", phone: "", logo_url: "", currency: "ر.س", opening_time: "09:00", closing_time: "24:00", is_active: true };
const EMPTY_USER = { full_name: "", email: "", password: "", role: "cashier", business_id: "" };

export default function BusinessManagement() {
  const [tab, setTab] = useState("businesses");
  const [bizDialog, setBizDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [userDialog, setUserDialog] = useState(false);
  const [bizForm, setBizForm] = useState(EMPTY_BIZ);
  const [settingsForm, setSettingsForm] = useState(EMPTY_BIZ);
  const [userForm, setUserForm] = useState(EMPTY_USER);
  const [editingId, setEditingId] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [userError, setUserError] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const queryClient = useQueryClient();

  const { data: businesses = [], isLoading: bizLoading } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => db.entities.Business.list("-created_date"),
  });

  const { data: businessUsers = [] } = useQuery({
    queryKey: ["business_users"],
    queryFn: async () => {
      const { data } = await supabase.from('business_users').select('*, businesses(name)').order('created_date', { ascending: false });
      return data || [];
    },
  });

  // ===== Businesses =====
  const saveBusiness = useMutation({
    mutationFn: (data) => editingId
      ? db.entities.Business.update(editingId, data)
      : db.entities.Business.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      setBizDialog(false); setEditingId(null); setBizForm(EMPTY_BIZ);
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (data) => {
      const { error } = await supabase.from('businesses').update(data).eq('id', settingsId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      setSettingsDialog(false);
    },
  });

  const deleteBusiness = useMutation({
    mutationFn: (id) => db.entities.Business.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["businesses"] }),
  });

  // ===== Create User =====
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserError("");
    if (!userForm.business_id) { setUserError("اختر الكافيه أولاً"); return; }
    if (userForm.password.length < 6) { setUserError("كلمة المرور 6 أحرف على الأقل"); return; }

    setCreatingUser(true);
    try {
      // إنشاء مستخدم مؤكد مباشرة عبر admin API
      const { data, error } = await adminSupabase.auth.admin.createUser({
        email: userForm.email,
        password: userForm.password,
        email_confirm: true,
        user_metadata: {
          full_name: userForm.full_name,
          role: userForm.role,
          business_id: userForm.business_id,
        },
      });

      if (error) throw error;

      // إضافة سجل في business_users
      if (data?.user) {
        const { error: insertError } = await adminSupabase.from('business_users').insert([{
          business_id: userForm.business_id,
          user_id: data.user.id,
          email: userForm.email,
          full_name: userForm.full_name,
          role: userForm.role,
        }]);
        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ["business_users"] });
      setUserDialog(false);
      setUserForm(EMPTY_USER);
    } catch (err) {
      setUserError(err.message || "حدث خطأ أثناء إنشاء المستخدم");
    } finally {
      setCreatingUser(false);
    }
  };

  const deactivateUser = useMutation({
    mutationFn: (id) => supabase.from('business_users').update({ is_active: false }).eq('id', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["business_users"] }),
  });

  // ===== Helpers =====
  const setBiz = (key) => (e) => setBizForm(p => ({ ...p, [key]: e.target?.value ?? e }));
  const setSet = (key) => (e) => setSettingsForm(p => ({ ...p, [key]: e.target?.value ?? e }));

  const openAdd = () => { setBizForm(EMPTY_BIZ); setEditingId(null); setBizDialog(true); };
  const openEdit = (b) => {
    setBizForm({ name: b.name||"", name_en: b.name_en||"", address: b.address||"", phone: b.phone||"", logo_url: b.logo_url||"", currency: b.currency||"ر.س", opening_time: b.opening_time||"09:00", closing_time: b.closing_time||"24:00", is_active: b.is_active!==false });
    setEditingId(b.id); setBizDialog(true);
  };
  const openSettings = (b) => {
    setSettingsForm({ name: b.name||"", name_en: b.name_en||"", address: b.address||"", phone: b.phone||"", logo_url: b.logo_url||"", currency: b.currency||"ر.س", opening_time: b.opening_time||"09:00", closing_time: b.closing_time||"24:00" });
    setSettingsId(b.id); setSettingsDialog(true);
  };

  const roleLabel = (r) => r === 'admin' ? 'مدير' : r === 'cashier' ? 'كاشير' : r === 'super_admin' ? 'مدير عام' : r || 'موظف';

  return (
    <div dir="rtl">
      <div className="mb-5">
        <h1 className="font-heading text-xl font-bold">إدارة الأعمال</h1>
        <p className="text-muted-foreground text-xs">تحكم كامل بالكافيهات والمستخدمين</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-border overflow-hidden mb-5 w-fit">
        {[
          { key: "businesses", label: "الكافيهات", icon: Building, count: businesses.length },
          { key: "users", label: "المستخدمون", icon: Users, count: businessUsers.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${tab === t.key ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-white/20" : "bg-muted-foreground/20"}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ===== TAB: Businesses ===== */}
      {tab === "businesses" && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" />إضافة كافيه</Button>
          </div>

          {bizLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">لا توجد كافيهات بعد</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {businesses.map(b => {
                const users = businessUsers.filter(u => u.business_id === b.id && u.is_active !== false);
                return (
                  <Card key={b.id} className="overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        {b.logo_url
                          ? <img src={b.logo_url} alt={b.name} className="w-11 h-11 rounded-xl object-cover border border-border shrink-0" onError={e => e.target.style.display='none'} />
                          : <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Building className="w-5 h-5 text-primary" /></div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{b.name}</p>
                          {b.name_en && <p className="text-xs text-muted-foreground">{b.name_en}</p>}
                        </div>
                        <Badge variant={b.is_active ? "default" : "secondary"} className="text-xs shrink-0">
                          {b.is_active ? "نشط" : "موقوف"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {users.length > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{users.length} مستخدم</span>}
                        {b.opening_time && <span>⏰ {b.opening_time}–{b.closing_time}</span>}
                        {b.phone && <span>📞 {b.phone}</span>}
                        {b.address && <span>📍 {b.address}</span>}
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openSettings(b)} className="gap-1 text-xs flex-1">
                          <Settings className="w-3.5 h-3.5" /> الإعدادات
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { if(confirm(`حذف "${b.name}"?`)) deleteBusiness.mutate(b.id) }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===== TAB: Users ===== */}
      {tab === "users" && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setUserForm(EMPTY_USER); setUserError(""); setUserDialog(true); }} className="gap-2">
              <UserPlus className="w-4 h-4" /> إنشاء مستخدم
            </Button>
          </div>

          {businessUsers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">لا يوجد مستخدمون بعد</div>
          ) : (
            <div className="space-y-2">
              {businessUsers.map(u => (
                <Card key={u.id}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {(u.full_name || u.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{u.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs py-0">{roleLabel(u.role)}</Badge>
                        {u.businesses?.name && <span className="text-xs text-muted-foreground">{u.businesses.name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={u.is_active !== false ? "default" : "secondary"} className="text-xs">
                        {u.is_active !== false ? "نشط" : "موقوف"}
                      </Badge>
                      {u.is_active !== false && (
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive text-xs h-7"
                          onClick={() => { if(confirm("إيقاف هذا المستخدم؟")) deactivateUser.mutate(u.id) }}>
                          إيقاف
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== Dialog: Add/Edit Business ===== */}
      <Dialog open={bizDialog} onOpenChange={setBizDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل الكافيه" : "إضافة كافيه جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveBusiness.mutate(bizForm); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الاسم (عربي) *</Label><Input value={bizForm.name} onChange={setBiz("name")} required /></div>
              <div><Label>الاسم (إنجليزي)</Label><Input value={bizForm.name_en} onChange={setBiz("name_en")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>وقت الفتح</Label><Input type="time" value={bizForm.opening_time} onChange={setBiz("opening_time")} /></div>
              <div><Label>وقت الإغلاق</Label><Input type="time" value={bizForm.closing_time} onChange={setBiz("closing_time")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الهاتف</Label><Input value={bizForm.phone} onChange={setBiz("phone")} /></div>
              <div><Label>العملة</Label><Input value={bizForm.currency} onChange={setBiz("currency")} /></div>
            </div>
            <div><Label>العنوان</Label><Input value={bizForm.address} onChange={setBiz("address")} /></div>
            <div><Label>رابط الشعار</Label><Input value={bizForm.logo_url} onChange={setBiz("logo_url")} placeholder="https://..." /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setBizDialog(false)}>إلغاء</Button>
              <Button type="submit" disabled={saveBusiness.isPending}>{editingId ? "تحديث" : "إضافة"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog: Business Settings ===== */}
      <Dialog open={settingsDialog} onOpenChange={setSettingsDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="w-4 h-4" />إعدادات الكافيه</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveSettings.mutate(settingsForm); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الاسم (عربي)</Label><Input value={settingsForm.name} onChange={setSet("name")} required /></div>
              <div><Label>الاسم (إنجليزي)</Label><Input value={settingsForm.name_en} onChange={setSet("name_en")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>وقت الفتح</Label><Input type="time" value={settingsForm.opening_time} onChange={setSet("opening_time")} /></div>
              <div><Label>وقت الإغلاق</Label><Input type="time" value={settingsForm.closing_time} onChange={setSet("closing_time")} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الهاتف</Label><Input value={settingsForm.phone} onChange={setSet("phone")} /></div>
              <div><Label>العملة</Label><Input value={settingsForm.currency} onChange={setSet("currency")} /></div>
            </div>
            <div><Label>العنوان</Label><Input value={settingsForm.address} onChange={setSet("address")} /></div>
            <div><Label>رابط الشعار</Label><Input value={settingsForm.logo_url} onChange={setSet("logo_url")} placeholder="https://..." /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSettingsDialog(false)}>إلغاء</Button>
              <Button type="submit" disabled={saveSettings.isPending}>حفظ</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog: Create User ===== */}
      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-4 h-4" />إنشاء مستخدم جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-3">
            {userError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{userError}</div>
            )}
            <div>
              <Label>الاسم الكامل</Label>
              <Input value={userForm.full_name} onChange={e => setUserForm(p => ({...p, full_name: e.target.value}))} placeholder="اسم الموظف" required />
            </div>
            <div>
              <Label>البريد الإلكتروني *</Label>
              <Input type="email" value={userForm.email} onChange={e => setUserForm(p => ({...p, email: e.target.value}))} placeholder="email@example.com" required />
            </div>
            <div>
              <Label>كلمة المرور *</Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={userForm.password}
                  onChange={e => setUserForm(p => ({...p, password: e.target.value}))}
                  placeholder="6 أحرف على الأقل"
                  required minLength={6}
                  className="pl-10"
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>الكافيه *</Label>
              <Select value={userForm.business_id} onValueChange={v => setUserForm(p => ({...p, business_id: v}))}>
                <SelectTrigger><SelectValue placeholder="اختر الكافيه" /></SelectTrigger>
                <SelectContent>
                  {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الصلاحية *</Label>
              <Select value={userForm.role} onValueChange={v => setUserForm(p => ({...p, role: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير</SelectItem>
                  <SelectItem value="cashier">كاشير</SelectItem>
                  <SelectItem value="staff">موظف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setUserDialog(false)}>إلغاء</Button>
              <Button type="submit" disabled={creatingUser}>
                {creatingUser ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الإنشاء...</> : "إنشاء المستخدم"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

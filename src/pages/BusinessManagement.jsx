import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building, Plus, Pencil, Trash2, Users, Link2, Copy, Check, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/api/supabaseClient";
import db from "@/api/supabaseClient";

const EMPTY_BUSINESS = {
  name: "", name_en: "", address: "", phone: "",
  logo_url: "", currency: "ر.س",
  opening_time: "09:00", closing_time: "24:00",
  is_active: true,
};

const EMPTY_INVITE = { business_id: "", email: "", role: "cashier" };

export default function BusinessManagement() {
  const [tab, setTab] = useState("businesses");
  const [bizDialog, setBizDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_BUSINESS);
  const [settingsForm, setSettingsForm] = useState(EMPTY_BUSINESS);
  const [inviteForm, setInviteForm] = useState(EMPTY_INVITE);
  const [editingId, setEditingId] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [expandedBiz, setExpandedBiz] = useState(null);
  const queryClient = useQueryClient();

  const { data: businesses = [], isLoading: bizLoading } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => db.entities.Business.list("-created_date"),
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const { data } = await supabase.from('user_invitations').select('*, businesses(name)').order('created_date', { ascending: false });
      return data || [];
    },
  });

  const { data: businessUsers = [] } = useQuery({
    queryKey: ["business_users"],
    queryFn: async () => {
      const { data } = await supabase.from('business_users').select('*, businesses(name)').order('created_date', { ascending: false });
      return data || [];
    },
  });

  const saveBusiness = useMutation({
    mutationFn: (data) => editingId
      ? db.entities.Business.update(editingId, data)
      : db.entities.Business.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      setBizDialog(false); setEditingId(null); setForm(EMPTY_BUSINESS);
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

  const createInvite = useMutation({
    mutationFn: async (data) => {
      const { data: inv, error } = await supabase
        .from('user_invitations')
        .insert([{ business_id: data.business_id, email: data.email || null, role: data.role }])
        .select().single();
      if (error) throw error;
      return inv;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      setInviteDialog(false); setInviteForm(EMPTY_INVITE);
    },
  });

  const deleteInvite = useMutation({
    mutationFn: (id) => supabase.from('user_invitations').delete().eq('id', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["invitations"] }),
  });

  const deactivateUser = useMutation({
    mutationFn: (id) => supabase.from('business_users').update({ is_active: false }).eq('id', id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["business_users"] }),
  });

  const getInviteUrl = (code) => `${window.location.origin}/invite?code=${code}`;

  const copyInvite = (code) => {
    navigator.clipboard.writeText(getInviteUrl(code));
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openAdd = () => { setForm(EMPTY_BUSINESS); setEditingId(null); setBizDialog(true); };
  const openEdit = (b) => {
    setForm({ name: b.name || "", name_en: b.name_en || "", address: b.address || "", phone: b.phone || "", logo_url: b.logo_url || "", currency: b.currency || "ر.س", opening_time: b.opening_time || "09:00", closing_time: b.closing_time || "24:00", is_active: b.is_active !== false });
    setEditingId(b.id); setBizDialog(true);
  };
  const openSettings = (b) => {
    setSettingsForm({ name: b.name || "", name_en: b.name_en || "", address: b.address || "", phone: b.phone || "", logo_url: b.logo_url || "", currency: b.currency || "ر.س", opening_time: b.opening_time || "09:00", closing_time: b.closing_time || "24:00" });
    setSettingsId(b.id); setSettingsDialog(true);
  };

  const set = (setter) => (key) => (e) => setter(p => ({ ...p, [key]: e.target?.value ?? e }));

  return (
    <div dir="rtl">
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold">إدارة الأعمال</h1>
          <p className="text-muted-foreground text-xs">إدارة المقاهي والمستخدمين</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-border overflow-hidden mb-5 w-fit">
        {[
          { key: "businesses", label: `الأعمال (${businesses.length})`, icon: Building },
          { key: "users", label: `المستخدمون (${businessUsers.length})`, icon: Users },
          { key: "invites", label: `الدعوات (${invitations.filter(i => !i.is_used).length})`, icon: Link2 },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${tab === t.key ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* === TAB: Businesses === */}
      {tab === "businesses" && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={openAdd} className="gap-2">
              <Plus className="w-4 h-4" /> إضافة كافيه
            </Button>
          </div>
          {bizLoading ? (
            <div className="text-center py-16 text-muted-foreground">تحميل...</div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">لا توجد أعمال بعد</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {businesses.map(b => {
                const users = businessUsers.filter(u => u.business_id === b.id && u.is_active !== false);
                const pendingInvites = invitations.filter(i => i.business_id === b.id && !i.is_used);
                return (
                  <Card key={b.id} className="overflow-hidden">
                    <CardHeader className="pb-3 pt-4 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {b.logo_url
                            ? <img src={b.logo_url} alt={b.name} className="w-10 h-10 rounded-xl object-cover border border-border shrink-0" onError={(e) => e.target.style.display='none'} />
                            : <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Building className="w-5 h-5 text-primary" /></div>
                          }
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate">{b.name}</CardTitle>
                            {b.name_en && <p className="text-xs text-muted-foreground">{b.name_en}</p>}
                          </div>
                        </div>
                        <Badge variant={b.is_active ? "default" : "secondary"} className="shrink-0 text-xs">
                          {b.is_active ? "نشط" : "موقوف"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-3">
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{users.length} مستخدم</span>
                        {b.opening_time && <span>⏰ {b.opening_time} - {b.closing_time}</span>}
                        {b.phone && <span>📞 {b.phone}</span>}
                      </div>
                      {pendingInvites.length > 0 && (
                        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
                          {pendingInvites.length} دعوة معلقة
                        </p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => openSettings(b)} className="gap-1 text-xs flex-1">
                          <Settings className="w-3.5 h-3.5" /> الإعدادات
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEdit(b)} className="gap-1 text-xs">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteBusiness.mutate(b.id)} className="gap-1 text-xs">
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

      {/* === TAB: Users === */}
      {tab === "users" && (
        <div className="space-y-3">
          {businessUsers.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">لا يوجد مستخدمون بعد. أنشئ دعوة أولاً.</div>
          ) : (
            businessUsers.map(u => (
              <Card key={u.id}>
                <CardContent className="flex items-center justify-between p-4 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0">
                      {(u.full_name || u.email || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{u.full_name || u.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs py-0">
                          {u.role === 'admin' ? 'مدير' : u.role === 'cashier' ? 'كاشير' : u.role}
                        </Badge>
                        {u.businesses?.name && <span className="text-xs text-muted-foreground">· {u.businesses.name}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={u.is_active !== false ? "default" : "secondary"} className="text-xs">
                      {u.is_active !== false ? "نشط" : "موقوف"}
                    </Badge>
                    {u.is_active !== false && (
                      <Button size="sm" variant="ghost" onClick={() => deactivateUser.mutate(u.id)} className="text-destructive hover:text-destructive text-xs">
                        إيقاف
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* === TAB: Invites === */}
      {tab === "invites" && (
        <>
          <div className="flex justify-end mb-4">
            <Button onClick={() => setInviteDialog(true)} className="gap-2">
              <Link2 className="w-4 h-4" /> إنشاء دعوة
            </Button>
          </div>
          {invitations.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">لا توجد دعوات بعد</div>
          ) : (
            <div className="space-y-3">
              {invitations.map(inv => (
                <Card key={inv.id} className={inv.is_used ? "opacity-60" : ""}>
                  <CardContent className="flex items-center justify-between p-4 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={inv.is_used ? "secondary" : "default"} className="text-xs">
                          {inv.is_used ? "مستخدمة" : "نشطة"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {inv.role === 'admin' ? 'مدير' : inv.role === 'cashier' ? 'كاشير' : inv.role}
                        </Badge>
                        {inv.businesses?.name && <span className="text-xs text-muted-foreground">{inv.businesses.name}</span>}
                      </div>
                      {inv.email && <p className="text-xs text-muted-foreground">{inv.email}</p>}
                      {!inv.is_used && (
                        <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                          {getInviteUrl(inv.invite_code)}
                        </p>
                      )}
                    </div>
                    {!inv.is_used && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => copyInvite(inv.invite_code)} className="gap-1 text-xs">
                          {copiedCode === inv.invite_code ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedCode === inv.invite_code ? "نُسخ" : "نسخ"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteInvite.mutate(inv.id)} className="text-xs">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* === Dialog: Add/Edit Business === */}
      <Dialog open={bizDialog} onOpenChange={setBizDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل الكافيه" : "إضافة كافيه جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveBusiness.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bname">الاسم (عربي) *</Label>
                <Input id="bname" value={form.name} onChange={set(setForm)("name")} required />
              </div>
              <div>
                <Label htmlFor="bname_en">الاسم (إنجليزي)</Label>
                <Input id="bname_en" value={form.name_en} onChange={set(setForm)("name_en")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>وقت الفتح</Label>
                <Input type="time" value={form.opening_time} onChange={set(setForm)("opening_time")} />
              </div>
              <div>
                <Label>وقت الإغلاق</Label>
                <Input type="time" value={form.closing_time} onChange={set(setForm)("closing_time")} />
              </div>
            </div>
            <div>
              <Label>الهاتف</Label>
              <Input value={form.phone} onChange={set(setForm)("phone")} />
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={form.address} onChange={set(setForm)("address")} />
            </div>
            <div>
              <Label>رابط الشعار</Label>
              <Input value={form.logo_url} onChange={set(setForm)("logo_url")} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>العملة</Label>
                <Input value={form.currency} onChange={set(setForm)("currency")} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setBizDialog(false)}>إلغاء</Button>
              <Button type="submit" disabled={saveBusiness.isPending}>{editingId ? "تحديث" : "إضافة"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* === Dialog: Business Settings === */}
      <Dialog open={settingsDialog} onOpenChange={setSettingsDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="w-4 h-4" />إعدادات الكافيه</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveSettings.mutate(settingsForm); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>اسم الكافيه (عربي)</Label>
                <Input value={settingsForm.name} onChange={set(setSettingsForm)("name")} required />
              </div>
              <div>
                <Label>الاسم (إنجليزي)</Label>
                <Input value={settingsForm.name_en} onChange={set(setSettingsForm)("name_en")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>وقت الفتح</Label>
                <Input type="time" value={settingsForm.opening_time} onChange={set(setSettingsForm)("opening_time")} />
              </div>
              <div>
                <Label>وقت الإغلاق</Label>
                <Input type="time" value={settingsForm.closing_time} onChange={set(setSettingsForm)("closing_time")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الهاتف</Label>
                <Input value={settingsForm.phone} onChange={set(setSettingsForm)("phone")} />
              </div>
              <div>
                <Label>العملة</Label>
                <Input value={settingsForm.currency} onChange={set(setSettingsForm)("currency")} />
              </div>
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={settingsForm.address} onChange={set(setSettingsForm)("address")} />
            </div>
            <div>
              <Label>رابط الشعار</Label>
              <Input value={settingsForm.logo_url} onChange={set(setSettingsForm)("logo_url")} placeholder="https://..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSettingsDialog(false)}>إلغاء</Button>
              <Button type="submit" disabled={saveSettings.isPending}>حفظ</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* === Dialog: Create Invite === */}
      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Link2 className="w-4 h-4" />إنشاء دعوة تسجيل</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createInvite.mutate(inviteForm); }} className="space-y-4">
            <div>
              <Label>الكافيه *</Label>
              <Select value={inviteForm.business_id} onValueChange={(v) => setInviteForm(p => ({ ...p, business_id: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر الكافيه" /></SelectTrigger>
                <SelectContent>
                  {businesses.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الدور *</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">مدير</SelectItem>
                  <SelectItem value="cashier">كاشير</SelectItem>
                  <SelectItem value="staff">موظف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>البريد الإلكتروني (اختياري)</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm(p => ({ ...p, email: e.target.value }))}
                placeholder="يمكن تركه فارغاً"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setInviteDialog(false)}>إلغاء</Button>
              <Button type="submit" disabled={!inviteForm.business_id || createInvite.isPending}>إنشاء الرابط</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

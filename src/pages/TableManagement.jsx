import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import db from "@/api/supabaseClient";

import { Plus, Pencil, Trash2, QrCode, Copy, Check, Printer, Download, MonitorPlay } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_LABELS = { available: "متاحة", occupied: "مشغولة", maintenance: "صيانة" };
const STATUS_COLORS = { available: "bg-green-100 text-green-700", occupied: "bg-red-100 text-red-700", maintenance: "bg-yellow-100 text-yellow-700" };
const EMPTY_TABLE = { number: "", name: "", type: "table", status: "available", device_type: "", hourly_rate: 0, capacity: 4 };

export default function TableManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrDialog, setQrDialog] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_TABLE);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: () => db.entities.DiningTable.list("number"),
  });

  const save = useMutation({
    mutationFn: (data) => editingId ? db.entities.DiningTable.update(editingId, data) : db.entities.DiningTable.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tables"] }); closeDialog(); },
  });

  const remove = useMutation({
    mutationFn: (id) => db.entities.DiningTable.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tables"] }); setDeleteId(null); },
  });

  const openAdd = () => { setForm(EMPTY_TABLE); setEditingId(null); setDialogOpen(true); };
  const openEdit = (t) => { setForm({ number: t.number, name: t.name, type: t.type, status: t.status || "available", device_type: t.device_type || "", hourly_rate: t.hourly_rate || 0, capacity: t.capacity || 4 }); setEditingId(t.id); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingId(null); };

  const getBaseUrl = () => {
    // Use configured URL from env (set VITE_APP_URL in Vercel environment variables)
    if (import.meta.env.VITE_APP_URL) return import.meta.env.VITE_APP_URL;
    const hostname = window.location.hostname;
    // Auto-convert Vercel preview URL to production URL
    // Preview: {project}-git-{branch}-{team}.vercel.app
    // Production: {project}-{team}.vercel.app
    if (hostname.includes('-git-') && hostname.endsWith('.vercel.app')) {
      const production = hostname.replace(/-git-[a-z0-9]+(?=-)/, '');
      if (production !== hostname) return `https://${production}`;
    }
    return window.location.origin;
  };

  const getMenuUrl = (t) => {
    const base = getBaseUrl();
    const param = t.type === "room" ? "room" : "table";
    const bid = (t.business_id || user?.business_id) ? `&bid=${t.business_id || user.business_id}` : '';
    return `${base}/menu?${param}=${t.number}&name=${encodeURIComponent(t.name)}${bid}`;
  };

  const getQrUrl = (t) => {
    const menuUrl = encodeURIComponent(getMenuUrl(t));
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${menuUrl}`;
  };

  const copyUrl = (t) => {
    navigator.clipboard.writeText(getMenuUrl(t));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = (t) => {
    const link = document.createElement("a");
    link.href = getQrUrl(t);
    link.download = `qr-${t.name}.png`;
    link.target = "_blank";
    link.click();
  };

  const printAllQRs = () => {
    const bid = user?.business_id;
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>QR Codes - جميع الطاولات</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; }
    h1 { text-align: center; padding: 20px; font-size: 20px; color: #333; border-bottom: 2px solid #f0f0f0; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 0 20px 20px; }
    .card { border: 2px solid #e5e7eb; border-radius: 16px; padding: 16px; text-align: center; page-break-inside: avoid; }
    .card img { width: 140px; height: 140px; margin: 0 auto 10px; display: block; }
    .name { font-weight: 900; font-size: 18px; color: #111; margin-bottom: 4px; }
    .sub  { font-size: 13px; color: #666; }
    @media print { .grid { gap: 10px; } }
  </style>
</head>
<body>
  <h1>🗂️ QR Codes — جميع الطاولات والغرف</h1>
  <div class="grid">
    ${filtered.map(t => `
      <div class="card">
        <img src="${getQrUrl(t)}" alt="QR" crossorigin="anonymous"/>
        <p class="name">${t.name}</p>
        <p class="sub">${t.type === 'room' ? '🎮 غرفة سوني' : '🪑 طاولة'} · رقم ${t.number}</p>
      </div>
    `).join("")}
  </div>
  <script>window.onload = () => setTimeout(() => window.print(), 800);<\/script>
</body>
</html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  };

  const openKitchen = () => {
    const bid = user?.business_id;
    window.open(`/kitchen${bid ? `?bid=${bid}` : ""}`, "_blank");
  };

  const filtered = filter === "all" ? tables : tables.filter(t => t.type === filter);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">الطاولات والغرف</h1>
          <p className="text-muted-foreground text-sm">{tables.length} طاولة/غرفة</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="rounded-xl gap-2 text-sm" onClick={openKitchen}>
            <MonitorPlay className="w-4 h-4" /> شاشة المطبخ
          </Button>
          <Button variant="outline" className="rounded-xl gap-2 text-sm" onClick={printAllQRs}>
            <Printer className="w-4 h-4" /> طباعة كل QR
          </Button>
          <Button className="rounded-xl gap-2" onClick={openAdd}><Plus className="w-4 h-4" />إضافة</Button>
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-4">
        <TabsList className="rounded-xl">
          <TabsTrigger value="all" className="rounded-lg">الكل ({tables.length})</TabsTrigger>
          <TabsTrigger value="table" className="rounded-lg">طاولات ({tables.filter(t => t.type === "table").length})</TabsTrigger>
          <TabsTrigger value="room" className="rounded-lg">غرف سوني ({tables.filter(t => t.type === "room").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => (
            <div key={t.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-heading font-bold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">رقم {t.number} • {t.type === "room" ? "غرفة سوني" : "طاولة"}</p>
                  {t.type === "room" && t.device_type && <p className="text-xs text-muted-foreground">{t.device_type} • {t.hourly_rate} ر.س/ساعة</p>}
                </div>
                <Badge className={`${STATUS_COLORS[t.status]} border-0 text-xs`}>{STATUS_LABELS[t.status]}</Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="rounded-lg gap-1 text-xs flex-1" onClick={() => setQrDialog(t)}>
                  <QrCode className="w-3.5 h-3.5" /> QR Code
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Dialog */}
      <Dialog open={!!qrDialog} onOpenChange={() => setQrDialog(null)}>
        <DialogContent className="max-w-sm text-center" dir="rtl">
          <DialogHeader><DialogTitle className="font-heading">QR Code - {qrDialog?.name}</DialogTitle></DialogHeader>
          {qrDialog && (
            <div className="space-y-4">
              <img src={getQrUrl(qrDialog)} alt="QR Code" className="w-56 h-56 mx-auto rounded-2xl shadow-lg" />
              <p className="text-xs text-muted-foreground break-all bg-muted/50 p-2 rounded-lg">{getMenuUrl(qrDialog)}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl gap-2 flex-1" onClick={() => copyUrl(qrDialog)}>
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? "تم النسخ" : "نسخ الرابط"}
                </Button>
                <Button variant="outline" className="rounded-xl gap-2 flex-1" onClick={() => downloadQr(qrDialog)}>
                  <Download className="w-4 h-4" /> تحميل
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle className="font-heading">{editingId ? "تعديل" : "إضافة جديد"}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); save.mutate({ ...form, number: parseInt(form.number), hourly_rate: parseFloat(form.hourly_rate) || 0, capacity: parseInt(form.capacity) || 4 }); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">الرقم *</Label><Input type="number" value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} required /></div>
              <div><Label className="text-xs">الاسم *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">النوع</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="table">طاولة</SelectItem><SelectItem value="room">غرفة سوني</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">الحالة</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="available">متاحة</SelectItem><SelectItem value="occupied">مشغولة</SelectItem><SelectItem value="maintenance">صيانة</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {form.type === "room" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">نوع الجهاز</Label><Input value={form.device_type} onChange={e => setForm(p => ({ ...p, device_type: e.target.value }))} placeholder="PS5, Xbox..." /></div>
                <div><Label className="text-xs">سعر الساعة (ر.س)</Label><Input type="number" step="0.5" value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} /></div>
              </div>
            )}
            <div><Label className="text-xs">السعة</Label><Input type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} /></div>
            <Button type="submit" className="w-full rounded-xl" disabled={save.isPending}>{save.isPending ? "جاري الحفظ..." : "حفظ"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">حذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد؟ لا يمكن التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate(deleteId)} className="bg-destructive text-destructive-foreground">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
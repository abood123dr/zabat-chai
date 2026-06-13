import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import db from "@/api/supabaseClient";

import { Plus, Pencil, Trash2, EyeOff, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_PRODUCT = { name: "", name_en: "", description: "", price: 0, image: "", category: "", is_available: true, is_featured: false, is_offer: false, offer_price: 0, calories: 0 };

export default function ProductManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => db.entities.Product.list("-created_date"),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => db.entities.Category.list("sort_order"),
  });

  const save = useMutation({
    mutationFn: (data) => editingId ? db.entities.Product.update(editingId, data) : db.entities.Product.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products-all"] }); closeDialog(); },
  });

  const remove = useMutation({
    mutationFn: (id) => db.entities.Product.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products-all"] }); setDeleteId(null); },
  });

  const openAdd = () => { setForm(EMPTY_PRODUCT); setEditingId(null); setDialogOpen(true); };
  const openEdit = (p) => { setForm({ name: p.name, name_en: p.name_en || "", description: p.description || "", price: p.price, image: p.image || "", category: p.category, is_available: p.is_available !== false, is_featured: p.is_featured || false, is_offer: p.is_offer || false, offer_price: p.offer_price || 0, calories: p.calories || 0 }); setEditingId(p.id); setDialogOpen(true); };
  const closeDialog = () => { setDialogOpen(false); setEditingId(null); setForm(EMPTY_PRODUCT); };

  const handleSubmit = (e) => {
    e.preventDefault();
    save.mutate({ ...form, price: parseFloat(form.price) || 0, offer_price: parseFloat(form.offer_price) || 0, calories: parseInt(form.calories) || 0 });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">المنتجات</h1>
          <p className="text-muted-foreground text-sm">{products.length} منتج</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={openAdd}><Plus className="w-4 h-4" />إضافة منتج</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(p => (
            <div key={p.id} className="bg-card rounded-xl border border-border p-3 flex gap-3">
              <img src={p.image || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=100"} alt={p.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {p.is_featured && <Star className="w-3.5 h-3.5 text-primary fill-primary" />}
                    {!p.is_available && <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary text-sm">{p.price} ر.س</span>
                    {p.is_offer && <Badge variant="destructive" className="text-[10px] px-1 h-4">عرض</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingId ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">الاسم (عربي) *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div><Label className="text-xs">الاسم (إنجليزي)</Label><Input value={form.name_en} onChange={e => setForm(p => ({ ...p, name_en: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">الوصف</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">السعر (ر.س) *</Label><Input type="number" step="0.5" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} required /></div>
              <div><Label className="text-xs">القسم *</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">رابط صورة المنتج</Label>
              <Input
                value={form.image}
                onChange={e => setForm(p => ({ ...p, image: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                className="text-xs"
              />
              {form.image && (
                <img src={form.image} alt="preview" className="w-full h-32 object-cover rounded-lg mt-2"
                  onError={e => e.target.style.display = 'none'} />
              )}
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_available} onCheckedChange={v => setForm(p => ({ ...p, is_available: v }))} />متوفر</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_featured} onCheckedChange={v => setForm(p => ({ ...p, is_featured: v }))} />مميز</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_offer} onCheckedChange={v => setForm(p => ({ ...p, is_offer: v }))} />عرض خاص</label>
            </div>
            {form.is_offer && (
              <div><Label className="text-xs">سعر العرض</Label><Input type="number" step="0.5" value={form.offer_price} onChange={e => setForm(p => ({ ...p, offer_price: e.target.value }))} /></div>
            )}
            <Button type="submit" className="w-full rounded-xl" disabled={save.isPending}>{save.isPending ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة المنتج"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">حذف المنتج</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع.</AlertDialogDescription>
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
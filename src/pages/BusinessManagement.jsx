import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import db from "@/api/supabaseClient";

const EMPTY_BUSINESS = { name: "", address: "", phone: "", is_active: true };

export default function BusinessManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_BUSINESS);
  const [editingId, setEditingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => db.entities.Business.list("-created_date"),
  });

  const saveBusiness = useMutation({
    mutationFn: (data) => editingId ? db.entities.Business.update(editingId, data) : db.entities.Business.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(EMPTY_BUSINESS);
    },
  });

  const deleteBusiness = useMutation({
    mutationFn: (id) => db.entities.Business.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["businesses"] }),
  });

  const openAdd = () => { setForm(EMPTY_BUSINESS); setEditingId(null); setDialogOpen(true); };
  const openEdit = (business) => { setForm({ name: business.name || "", address: business.address || "", phone: business.phone || "", is_active: business.is_active !== false }); setEditingId(business.id); setDialogOpen(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveBusiness.mutate(form);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">إدارة الأعمال</h1>
          <p className="text-muted-foreground text-sm">أنشئ وقم بإدارة المقاهي والمطاعم ضمن النظام.</p>
        </div>
        <Button className="rounded-xl gap-2" onClick={openAdd}><Plus className="w-4 h-4" />إضافة عمل جديد</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full p-10 text-center text-muted-foreground">تحميل...</div>
        ) : businesses.length === 0 ? (
          <div className="col-span-full p-10 text-center text-muted-foreground">لا توجد أعمال بعد.</div>
        ) : businesses.map((business) => (
          <Card key={business.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold"><Building className="w-5 h-5" />{business.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{business.address}</p>
              <p className="text-sm text-muted-foreground">{business.phone}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(business)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="destructive" size="sm" onClick={() => deleteBusiness.mutate(business.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "تحديث العمل" : "إضافة عمل جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">اسم العمل</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="address">العنوان</Label>
              <Input id="address" value={form.address} onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="phone">الهاتف</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saveBusiness.isLoading}>{editingId ? "تحديث" : "حفظ"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

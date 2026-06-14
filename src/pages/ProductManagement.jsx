import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import db, { supabase } from "@/api/supabaseClient";
import { useBusiness } from "@/lib/BusinessContext";
import { Plus, Pencil, Trash2, Package, Tag, ChevronDown, ChevronUp, AlertCircle, Upload, X, Loader2, Link, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ICONS = ["☕", "🍵", "🧋", "🥤", "🍰", "🥪", "🍕", "🍔", "🍟", "🥗", "🍩", "🎮", "⭐", "🥛", "🧃"];
const BUCKET = "images";

// ============================================================
// مكوّن رفع الصور
// ============================================================
function ImageUpload({ value, onChange, folder = "general", label = "الصورة" }) {
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState(value ? "preview" : "upload");
  const [urlInput, setUrlInput] = useState("");
  const inputRef = useRef();

  const upload = async (file) => {
    if (!file) return;
    const max = 5 * 1024 * 1024;
    if (file.size > max) { alert("الصورة أكبر من 5MB"); return; }
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

      {/* معاينة الصورة الحالية */}
      {value && (
        <div className="relative rounded-xl overflow-hidden border border-border h-36">
          <img src={value} alt="صورة" className="w-full h-full object-cover" onError={e => e.target.style.opacity='.3'} />
          <button type="button" onClick={() => { onChange(""); setTab("upload"); }}
            className="absolute top-2 left-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full">✓ تم التحديد</div>
        </div>
      )}

      {/* خيارات الرفع */}
      {(!value || tab !== "preview") && (
        <div className="border-2 border-dashed border-border rounded-xl overflow-hidden">
          {/* تبويبات */}
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
                <>
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm font-medium text-primary">جاري الرفع...</p>
                </>
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

// ============================================================
// أقسام
// ============================================================
function CategoriesTab({ activeBid }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", icon: "☕", image_url: "", sort_order: 0 });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const qc = useQueryClient();

  const { data: cats = [], isLoading } = useQuery({
    queryKey: ["categories-all", activeBid],
    queryFn: () => db.entities.Category.list("sort_order"),
    enabled: !!activeBid,
  });

  const save = useMutation({
    mutationFn: (d) => editId ? db.entities.Category.update(editId, d) : db.entities.Category.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories-all"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false); setEditId(null); setError("");
      setForm({ name: "", icon: "☕", sort_order: 0 });
    },
    onError: (err) => setError(err.message || "حدث خطأ، حاول مرة أخرى"),
  });

  const del = useMutation({
    mutationFn: (id) => db.entities.Category.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories-all"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const openAdd = () => { setForm({ name: "", icon: "☕", image_url: "", sort_order: cats.length }); setEditId(null); setError(""); setOpen(true); };
  const openEdit = (c) => { setForm({ name: c.name, icon: c.icon || "☕", image_url: c.image_url || "", sort_order: c.sort_order || 0 }); setEditId(c.id); setError(""); setOpen(true); };

  if (!activeBid) return (
    <div className="text-center py-20 text-muted-foreground">
      <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
      <p>اختر الكافيه أولاً من الأعلى</p>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{cats.length} قسم</p>
        <Button onClick={openAdd} className="gap-2 rounded-xl"><Plus className="w-4 h-4" />قسم جديد</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : cats.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">لا توجد أقسام</p>
          <p className="text-xs mt-1">اضغط "قسم جديد" لإضافة أول قسم</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cats.map(c => (
            <div key={c.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
              {c.image_url
                ? <img src={c.image_url} alt={c.name} className="w-10 h-10 rounded-lg object-cover" onError={e => e.target.style.display='none'} />
                : <span className="text-2xl">{c.icon || "☕"}</span>
              }
              <p className="flex-1 font-medium">{c.name}</p>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm(`حذف "${c.name}"؟`)) del.mutate(c.id); }}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>{editId ? "تعديل القسم" : "قسم جديد"}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); setError(""); save.mutate({ ...form, sort_order: parseInt(form.sort_order) || 0 }); }} className="space-y-4">
            {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
            <div>
              <Label>اسم القسم *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: مشروبات ساخنة" required autoFocus />
            </div>
            <ImageUpload
              value={form.image_url}
              onChange={v => setForm(p => ({ ...p, image_url: v }))}
              folder="categories"
              label="صورة القسم"
            />
            <div>
              <Label className="mb-2 block text-sm text-muted-foreground">أيقونة احتياطية (تظهر إذا لم تُضف صورة)</Label>
              <div className="flex flex-wrap gap-1.5">
                {ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => setForm(p => ({ ...p, icon: ic }))}
                    className={`text-xl w-9 h-9 rounded-xl border-2 transition-all ${form.icon === ic ? "border-primary bg-primary/10 scale-110" : "border-border hover:border-primary/50"}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full rounded-xl h-11" disabled={save.isPending}>
              {save.isPending ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري الحفظ...</> : editId ? "حفظ التعديلات" : "إضافة القسم"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// منتجات
// ============================================================
function ProductsTab({ activeBid }) {
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", price: "", category: "", image: "", is_available: true, is_featured: false, description: "", is_offer: false, offer_price: "" });
  const qc = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-all", activeBid],
    queryFn: () => db.entities.Product.list("-created_date"),
    enabled: !!activeBid,
  });

  const { data: cats = [] } = useQuery({
    queryKey: ["categories-all", activeBid],
    queryFn: () => db.entities.Category.list("sort_order"),
    enabled: !!activeBid,
  });

  const save = useMutation({
    mutationFn: (d) => editId ? db.entities.Product.update(editId, d) : db.entities.Product.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products-all"] });
      setOpen(false); setEditId(null); setShowMore(false); setError("");
      setForm({ name: "", price: "", category: "", image: "", is_available: true, is_featured: false, description: "", is_offer: false, offer_price: "" });
    },
    onError: (err) => setError(err.message || "حدث خطأ، حاول مرة أخرى"),
  });

  const del = useMutation({
    mutationFn: (id) => db.entities.Product.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products-all"] }); setDeleteId(null); },
  });

  const openAdd = () => {
    setForm({ name: "", price: "", category: "", image: "", is_available: true, is_featured: false, description: "", is_offer: false, offer_price: "" });
    setEditId(null); setShowMore(false); setError(""); setOpen(true);
  };
  const openEdit = (p) => {
    setForm({ name: p.name, price: p.price, category: p.category || "", image: p.image || "", is_available: p.is_available !== false, is_featured: !!p.is_featured, description: p.description || "", is_offer: !!p.is_offer, offer_price: p.offer_price || "" });
    setEditId(p.id); setShowMore(false); setError(""); setOpen(true);
  };

  const submit = (e) => {
    e.preventDefault();
    setError("");
    save.mutate({ ...form, price: parseFloat(form.price) || 0, offer_price: parseFloat(form.offer_price) || 0 });
  };

  if (!activeBid) return (
    <div className="text-center py-20 text-muted-foreground">
      <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
      <p>اختر الكافيه أولاً من الأعلى</p>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{products.length} منتج</p>
        <Button onClick={openAdd} className="gap-2 rounded-xl"><Plus className="w-4 h-4" />منتج جديد</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">لا توجد منتجات</p>
          <p className="text-xs mt-1">اضغط "منتج جديد" للبدء</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(p => (
            <div key={p.id} className="bg-card rounded-xl border border-border p-3 flex gap-3">
              {p.image
                ? <img src={p.image} alt={p.name} className="w-16 h-16 rounded-xl object-cover shrink-0" onError={e => e.target.style.display = 'none'} />
                : <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shrink-0">☕</div>
              }
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category}</p>
                <p className="font-bold text-primary text-sm mt-1">{p.price} ر.س</p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة إضافة/تعديل */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editId ? "تعديل المنتج" : "منتج جديد"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

            <div>
              <Label>اسم المنتج *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: قهوة عربية" required autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>السعر (ر.س) *</Label>
                <Input type="number" step="0.5" min="0" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="0.00" required />
              </div>
              <div>
                <Label>القسم</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    {cats.map(c => <SelectItem key={c.id} value={c.name}>{c.icon} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Switch checked={form.is_available} onCheckedChange={v => setForm(p => ({ ...p, is_available: v }))} />
                متوفر الآن
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Switch checked={form.is_featured} onCheckedChange={v => setForm(p => ({ ...p, is_featured: v }))} />
                ⭐ مميز
              </label>
            </div>

            <button type="button" onClick={() => setShowMore(v => !v)}
              className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
              {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showMore ? "إخفاء الخيارات الإضافية" : "خيارات إضافية (صورة، وصف، عروض...)"}
            </button>

            {showMore && (
              <div className="space-y-3 border-t border-border pt-3">
                <ImageUpload
                  value={form.image}
                  onChange={v => setForm(p => ({ ...p, image: v }))}
                  folder="products"
                  label="صورة المنتج"
                />
                <div>
                  <Label>وصف المنتج</Label>
                  <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="وصف قصير..." />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Switch checked={form.is_offer} onCheckedChange={v => setForm(p => ({ ...p, is_offer: v }))} />
                  🔥 عرض خاص
                </label>
                {form.is_offer && (
                  <div>
                    <Label>سعر العرض (ر.س)</Label>
                    <Input type="number" step="0.5" min="0" value={form.offer_price} onChange={e => setForm(p => ({ ...p, offer_price: e.target.value }))} placeholder="0.00" />
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full rounded-xl h-11 text-base" disabled={save.isPending}>
              {save.isPending ? "جاري الحفظ..." : editId ? "حفظ التعديلات" : "إضافة المنتج ✓"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* تأكيد الحذف */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-xs text-center" dir="rtl">
          <p className="text-lg font-bold mb-1">حذف المنتج؟</p>
          <p className="text-muted-foreground text-sm mb-4">لا يمكن التراجع عن هذا الإجراء</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>إلغاء</Button>
            <Button variant="destructive" className="flex-1" onClick={() => del.mutate(deleteId)}>حذف</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// الصفحة الرئيسية
// ============================================================
export default function ProductManagement() {
  const [tab, setTab] = useState("products");
  const { activeBid, isSuperAdmin } = useBusiness();

  return (
    <div dir="rtl">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="font-heading text-xl font-bold flex-1">المنتجات والأقسام</h1>
        <div className="flex rounded-xl border border-border overflow-hidden">
          <button onClick={() => setTab("products")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${tab === "products" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
            <Package className="w-4 h-4" /> المنتجات
          </button>
          <button onClick={() => setTab("categories")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${tab === "categories" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
            <Tag className="w-4 h-4" /> الأقسام
          </button>
        </div>
      </div>

      {isSuperAdmin && !activeBid && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">اختر الكافيه من القائمة الجانبية لعرض بياناته</p>
        </div>
      )}

      {tab === "products" ? <ProductsTab activeBid={activeBid} /> : <CategoriesTab activeBid={activeBid} />}
    </div>
  );
}

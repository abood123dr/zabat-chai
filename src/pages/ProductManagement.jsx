import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import db, { supabase } from "@/api/supabaseClient";
import { useBusiness } from "@/lib/BusinessContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Package, Tag, ChevronDown, ChevronUp,
  AlertCircle, Upload, X, Loader2, Link, ImageIcon, Search,
  Eye, EyeOff, Star, Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ICONS = ["☕","🍵","🧋","🥤","🍰","🥪","🍕","🍔","🍟","🥗","🍩","🎮","⭐","🥛","🧃"];
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
      alert("فشل الرفع: " + (e.message || "تأكد من bucket images في Supabase"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
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
      {(!value || tab !== "preview") && (
        <div className="border-2 border-dashed border-border rounded-xl overflow-hidden">
          <div className="flex border-b border-border">
            <button type="button" onClick={() => setTab("upload")}
              className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${tab==="upload" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              <Upload className="w-3.5 h-3.5" /> رفع من الجهاز
            </button>
            <button type="button" onClick={() => setTab("url")}
              className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${tab==="url" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
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
                <><div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"><ImageIcon className="w-6 h-6 text-primary" /></div>
                <p className="text-sm font-semibold">اضغط لاختيار صورة</p>
                <p className="text-xs text-muted-foreground">PNG, JPG, WEBP — حتى 5MB</p></>
              )}
            </label>
          )}
          {tab === "url" && (
            <div className="p-3 space-y-2">
              <Input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg" dir="ltr"
                onKeyDown={e => e.key==="Enter" && (e.preventDefault(), urlInput.startsWith("http") && onChange(urlInput))} />
              <Button type="button" onClick={() => { if (urlInput.startsWith("http")) { onChange(urlInput); setTab("preview"); } }}
                className="w-full h-9 rounded-lg" variant="outline" disabled={!urlInput}>
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
// Skeleton loading
// ============================================================
function ProductSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border p-3 flex gap-3 animate-pulse">
      <div className="w-20 h-20 rounded-xl bg-muted shrink-0" />
      <div className="flex-1 space-y-2 py-1">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-1/4 mt-2" />
      </div>
    </div>
  );
}

function CatSkeleton() {
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 animate-pulse">
      <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
      <div className="flex-1 h-4 bg-muted rounded w-1/2" />
      <div className="w-16 h-7 bg-muted rounded-lg" />
      <div className="w-7 h-7 bg-muted rounded-lg" />
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
    staleTime: 2 * 60_000,
  });

  const save = useMutation({
    mutationFn: (d) => editId ? db.entities.Category.update(editId, d) : db.entities.Category.create(d),
    onMutate: async (newData) => {
      await qc.cancelQueries({ queryKey: ["categories-all", activeBid] });
      const prev = qc.getQueryData(["categories-all", activeBid]);
      if (editId) {
        qc.setQueryData(["categories-all", activeBid], old =>
          old?.map(c => c.id === editId ? { ...c, ...newData } : c) ?? []
        );
      }
      return { prev };
    },
    onError: (err, _, ctx) => {
      if (ctx?.prev) qc.setQueryData(["categories-all", activeBid], ctx.prev);
      setError(err.message || "حدث خطأ");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories-all"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false); setEditId(null); setError("");
      setForm({ name: "", icon: "☕", sort_order: 0 });
    },
  });

  const del = useMutation({
    mutationFn: (id) => db.entities.Category.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["categories-all", activeBid] });
      const prev = qc.getQueryData(["categories-all", activeBid]);
      qc.setQueryData(["categories-all", activeBid], old => old?.filter(c => c.id !== id) ?? []);
      return { prev };
    },
    onError: (_, __, ctx) => { if (ctx?.prev) qc.setQueryData(["categories-all", activeBid], ctx.prev); },
    onSettled: () => { qc.invalidateQueries({ queryKey: ["categories-all"] }); },
  });

  const openAdd = () => { setForm({ name: "", icon: "☕", image_url: "", sort_order: cats.length }); setEditId(null); setError(""); setOpen(true); };
  const openEdit = (c) => { setForm({ name: c.name, icon: c.icon || "☕", image_url: c.image_url || "", sort_order: c.sort_order || 0 }); setEditId(c.id); setError(""); setOpen(true); };

  if (!activeBid) return (
    <div className="text-center py-20 text-muted-foreground">
      <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
      <p>اختر الكافيه أولاً من القائمة الجانبية</p>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{cats.length} قسم</p>
        <Button onClick={openAdd} className="gap-2 rounded-xl"><Plus className="w-4 h-4" />قسم جديد</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <CatSkeleton key={i} />)}</div>
      ) : cats.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">لا توجد أقسام</p>
          <p className="text-xs mt-1">اضغط "قسم جديد" لإضافة أول قسم</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {cats.map(c => (
              <motion.div key={c.id} layout
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                {c.image_url
                  ? <img src={c.image_url} alt={c.name} loading="lazy" className="w-10 h-10 rounded-lg object-cover" onError={e => e.target.style.display='none'} />
                  : <span className="text-2xl w-10 text-center">{c.icon || "☕"}</span>
                }
                <p className="flex-1 font-medium">{c.name}</p>
                <Button variant="outline" size="sm" className="h-8 rounded-lg" onClick={() => openEdit(c)}>
                  <Pencil className="w-3.5 h-3.5 ml-1" />تعديل
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => { if (confirm(`حذف "${c.name}"؟`)) del.mutate(c.id); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>{editId ? "تعديل القسم" : "قسم جديد"}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); setError(""); save.mutate({ ...form, sort_order: parseInt(form.sort_order)||0 }); }} className="space-y-4">
            {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
            <div><Label>اسم القسم *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="مثال: مشروبات ساخنة" required autoFocus />
            </div>
            <ImageUpload value={form.image_url} onChange={v => setForm(p => ({ ...p, image_url: v }))} folder="categories" label="صورة القسم" />
            <div>
              <Label className="mb-2 block text-sm text-muted-foreground">أيقونة احتياطية</Label>
              <div className="flex flex-wrap gap-1.5">
                {ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => setForm(p => ({ ...p, icon: ic }))}
                    className={`text-xl w-9 h-9 rounded-xl border-2 transition-all ${form.icon===ic ? "border-primary bg-primary/10 scale-110" : "border-border hover:border-primary/50"}`}>
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
// منشئ الخيارات والإضافات
// ============================================================
function VariantBuilder({ value, onChange }) {
  const groups = useMemo(() => {
    try { return JSON.parse(value || '[]'); } catch { return []; }
  }, [value]);

  const emit = (g) => onChange(JSON.stringify(g));
  const addGroup = () => emit([...groups, { name: '', required: true, multiSelect: false, options: [{ name: '', price: 0 }] }]);
  const removeGroup = (gi) => emit(groups.filter((_, i) => i !== gi));
  const upGroup = (gi, k, v) => emit(groups.map((g, i) => i === gi ? { ...g, [k]: v } : g));
  const addOption = (gi) => emit(groups.map((g, i) => i === gi ? { ...g, options: [...g.options, { name: '', price: 0 }] } : g));
  const removeOption = (gi, oi) => emit(groups.map((g, i) => i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g));
  const upOpt = (gi, oi, k, v) => emit(groups.map((g, i) => i === gi ? { ...g, options: g.options.map((o, j) => j === oi ? { ...o, [k]: v } : o) } : g));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">الخيارات والإضافات</Label>
        <button type="button" onClick={addGroup}
          className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
          <Plus className="w-3 h-3" /> مجموعة جديدة
        </button>
      </div>
      {groups.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded-xl">
          مثال: "الحجم" → صغير / وسط / كبير
        </p>
      ) : groups.map((group, gi) => (
        <div key={gi} className="border border-border rounded-xl p-3 space-y-2.5 bg-muted/20">
          <div className="flex items-center gap-2">
            <Input value={group.name}
              onChange={e => upGroup(gi, 'name', e.target.value)}
              placeholder="اسم المجموعة (مثال: الحجم)" className="flex-1 h-8 text-sm" />
            <button type="button" onClick={() => removeGroup(gi)}
              className="w-7 h-7 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors shrink-0">
              <X className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={group.required}
                onChange={e => upGroup(gi, 'required', e.target.checked)}
                className="w-3.5 h-3.5 accent-primary rounded" />
              مطلوب
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={group.multiSelect}
                onChange={e => upGroup(gi, 'multiSelect', e.target.checked)}
                className="w-3.5 h-3.5 accent-primary rounded" />
              اختيار متعدد
            </label>
          </div>
          <div className="space-y-1.5">
            {group.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-1.5">
                <Input value={opt.name}
                  onChange={e => upOpt(gi, oi, 'name', e.target.value)}
                  placeholder="الاسم (مثال: كبير)" className="flex-1 h-7 text-xs" />
                <div className="flex items-center gap-0.5 shrink-0">
                  <span className="text-[10px] text-muted-foreground">+</span>
                  <Input type="number" step="0.5" min="0" value={opt.price}
                    onChange={e => upOpt(gi, oi, 'price', parseFloat(e.target.value) || 0)}
                    className="w-14 h-7 text-xs text-center px-1" />
                </div>
                <button type="button" onClick={() => removeOption(gi, oi)}
                  className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center shrink-0">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addOption(gi)}
              className="text-xs text-primary/70 hover:text-primary flex items-center gap-1 px-1 transition-colors">
              <Plus className="w-3 h-3" /> خيار
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// منتجات
// ============================================================
function ProductsTab({ activeBid }) {
  const [open, setOpen]       = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [editId, setEditId]   = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [form, setForm] = useState({ name:"", price:"", category:"", image:"", is_available:true, is_featured:false, description:"", is_offer:false, offer_price:"", variants:"" });
  const qc = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-all", activeBid],
    queryFn: () => db.entities.Product.list("-created_date"),
    enabled: !!activeBid,
    staleTime: 2 * 60_000,
  });

  const { data: cats = [] } = useQuery({
    queryKey: ["categories-all", activeBid],
    queryFn: () => db.entities.Category.list("sort_order"),
    enabled: !!activeBid,
    staleTime: 2 * 60_000,
  });

  // فلترة فورية client-side
  const filtered = useMemo(() => {
    let list = products;
    if (filterCat !== "all") list = list.filter(p => p.category === filterCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.category||"").toLowerCase().includes(q));
    }
    return list;
  }, [products, filterCat, search]);

  // Optimistic toggle availability
  const toggleAvail = useMutation({
    mutationFn: ({ id, val }) => db.entities.Product.update(id, { is_available: val }),
    onMutate: async ({ id, val }) => {
      await qc.cancelQueries({ queryKey: ["products-all", activeBid] });
      const prev = qc.getQueryData(["products-all", activeBid]);
      qc.setQueryData(["products-all", activeBid], old => old?.map(p => p.id===id ? {...p, is_available: val} : p) ?? []);
      return { prev };
    },
    onError: (_, __, ctx) => { if (ctx?.prev) qc.setQueryData(["products-all", activeBid], ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["products-all"] }),
  });

  const save = useMutation({
    mutationFn: (d) => editId ? db.entities.Product.update(editId, d) : db.entities.Product.create(d),
    onMutate: async (newData) => {
      if (!editId) return;
      await qc.cancelQueries({ queryKey: ["products-all", activeBid] });
      const prev = qc.getQueryData(["products-all", activeBid]);
      qc.setQueryData(["products-all", activeBid], old =>
        old?.map(p => p.id===editId ? {...p, ...newData} : p) ?? []
      );
      return { prev };
    },
    onError: (err, _, ctx) => {
      if (ctx?.prev) qc.setQueryData(["products-all", activeBid], ctx.prev);
      setError(err.message || "حدث خطأ");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products-all"] });
      setOpen(false); setEditId(null); setShowMore(false); setError("");
      setForm({ name:"", price:"", category:"", image:"", is_available:true, is_featured:false, description:"", is_offer:false, offer_price:"", variants:"" });
    },
  });

  const del = useMutation({
    mutationFn: (id) => db.entities.Product.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["products-all", activeBid] });
      const prev = qc.getQueryData(["products-all", activeBid]);
      qc.setQueryData(["products-all", activeBid], old => old?.filter(p => p.id!==id) ?? []);
      return { prev };
    },
    onError: (_, __, ctx) => { if (ctx?.prev) qc.setQueryData(["products-all", activeBid], ctx.prev); },
    onSettled: () => { qc.invalidateQueries({ queryKey: ["products-all"] }); setDeleteId(null); },
  });

  const openAdd  = () => { setForm({ name:"", price:"", category:"", image:"", is_available:true, is_featured:false, description:"", is_offer:false, offer_price:"", variants:"" }); setEditId(null); setShowMore(false); setError(""); setOpen(true); };
  const openEdit = (p) => { setForm({ name:p.name, price:p.price, category:p.category||"", image:p.image||"", is_available:p.is_available!==false, is_featured:!!p.is_featured, description:p.description||"", is_offer:!!p.is_offer, offer_price:p.offer_price||"", variants:p.variants||"" }); setEditId(p.id); setShowMore(false); setError(""); setOpen(true); };
  const submit   = (e) => { e.preventDefault(); setError(""); save.mutate({ ...form, price: parseFloat(form.price)||0, offer_price: parseFloat(form.offer_price)||0 }); };

  if (!activeBid) return (
    <div className="text-center py-20 text-muted-foreground">
      <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
      <p>اختر الكافيه أولاً من القائمة الجانبية</p>
    </div>
  );

  return (
    <div>
      {/* شريط البحث والفلتر */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن منتج..." className="pr-9 rounded-xl"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Button onClick={openAdd} className="gap-2 rounded-xl shrink-0"><Plus className="w-4 h-4" />جديد</Button>
      </div>

      {/* تبويبات الأقسام */}
      {cats.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
          <button onClick={() => setFilterCat("all")}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${filterCat==="all" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            الكل ({products.length})
          </button>
          {cats.map(c => {
            const cnt = products.filter(p => p.category===c.name).length;
            return (
              <button key={c.id} onClick={() => setFilterCat(filterCat===c.name ? "all" : c.name)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${filterCat===c.name ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                <span>{c.icon}</span>{c.name} ({cnt})
              </button>
            );
          })}
        </div>
      )}

      {/* النتائج */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-muted-foreground">
          {search || filterCat!=="all" ? `${filtered.length} نتيجة من ${products.length}` : `${products.length} منتج`}
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">{search ? "لا توجد نتائج" : "لا توجد منتجات"}</p>
          {!search && <p className="text-xs mt-1">اضغط "جديد" للبدء</p>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {filtered.map(p => (
              <motion.div key={p.id} layout
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-card rounded-2xl border overflow-hidden transition-all ${p.is_available ? "border-border" : "border-border/40 opacity-60"}`}
              >
                {/* صورة المنتج */}
                <div className="relative h-28 bg-muted overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt={p.name} loading="lazy"
                      className="w-full h-full object-cover transition-transform hover:scale-105 duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">☕</div>
                  )}
                  {/* شارات */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {p.is_featured && <span className="bg-amber-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5"><Star className="w-2.5 h-2.5" />مميز</span>}
                    {p.is_offer && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" />عرض</span>}
                  </div>
                  {/* زر التوفر */}
                  <button
                    onClick={() => toggleAvail.mutate({ id: p.id, val: !p.is_available })}
                    className={`absolute top-2 left-2 flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full transition-all shadow-sm ${
                      p.is_available ? "bg-green-500 text-white" : "bg-gray-400 text-white"
                    }`}
                  >
                    {p.is_available ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {p.is_available ? "متوفر" : "مخفي"}
                  </button>
                </div>

                {/* بيانات المنتج */}
                <div className="p-3">
                  <p className="font-bold text-sm leading-tight line-clamp-1">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.category || "بدون قسم"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      {p.is_offer && p.offer_price ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-black text-red-500 text-sm">{p.offer_price} ر.س</span>
                          <span className="text-xs text-muted-foreground line-through">{p.price}</span>
                        </div>
                      ) : (
                        <span className="font-black text-primary text-sm">{p.price} ر.س</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)}
                        className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                        <Pencil className="w-3.5 h-3.5 text-primary" />
                      </button>
                      <button onClick={() => setDeleteId(p.id)}
                        className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* نافذة إضافة/تعديل */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editId ? "تعديل المنتج" : "منتج جديد"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
            <div><Label>اسم المنتج *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="مثال: قهوة عربية" required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>السعر (ر.س) *</Label>
                <Input type="number" step="0.5" min="0" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} placeholder="0.00" required />
              </div>
              <div><Label>القسم</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({...p, category: v}))}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    {cats.map(c => <SelectItem key={c.id} value={c.name}>{c.icon} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Switch checked={form.is_available} onCheckedChange={v => setForm(p => ({...p, is_available: v}))} />متوفر الآن
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Switch checked={form.is_featured} onCheckedChange={v => setForm(p => ({...p, is_featured: v}))} />⭐ مميز
              </label>
            </div>
            <button type="button" onClick={() => setShowMore(v => !v)}
              className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
              {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showMore ? "إخفاء الخيارات الإضافية" : "خيارات إضافية (صورة، وصف، عروض...)"}
            </button>
            {showMore && (
              <div className="space-y-3 border-t border-border pt-3">
                <ImageUpload value={form.image} onChange={v => setForm(p => ({...p, image: v}))} folder="products" label="صورة المنتج" />
                <div><Label>وصف المنتج</Label>
                  <Input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="وصف قصير..." />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Switch checked={form.is_offer} onCheckedChange={v => setForm(p => ({...p, is_offer: v}))} />🔥 عرض خاص
                </label>
                {form.is_offer && (
                  <div><Label>سعر العرض (ر.س)</Label>
                    <Input type="number" step="0.5" min="0" value={form.offer_price} onChange={e => setForm(p => ({...p, offer_price: e.target.value}))} placeholder="0.00" />
                  </div>
                )}
                <div className="border-t border-border/60 pt-3">
                  <VariantBuilder value={form.variants} onChange={v => setForm(p => ({...p, variants: v}))} />
                </div>
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
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${tab==="products" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
            <Package className="w-4 h-4" /> المنتجات
          </button>
          <button onClick={() => setTab("categories")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${tab==="categories" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}>
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

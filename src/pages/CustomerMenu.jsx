import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import db, { setCurrentBusinessId, supabase } from "@/api/supabaseClient";
import { Search, ShoppingCart, Bell, Receipt, Star, ChevronDown, MapPin, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ProductCard from "../components/customer/ProductCard";
import CartSheet from "../components/customer/CartSheet";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_HERO = "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&q=90";

// ===== أيقونات التواصل الاجتماعي =====
const SocialIcons = {
  instagram: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  twitter: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  snapchat: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M12.017 0C8.396 0 8.025.015 6.79.074c-1.237.057-2.08.254-2.82.543A5.69 5.69 0 0 0 1.914 1.91 5.703 5.703 0 0 0 .617 3.97C.328 4.71.131 5.553.074 6.79.015 8.025 0 8.396 0 12.017c0 3.62.015 3.99.074 5.226.057 1.236.254 2.08.543 2.82a5.69 5.69 0 0 0 1.293 2.056 5.703 5.703 0 0 0 2.057 1.297c.74.289 1.583.486 2.82.543 1.235.059 1.606.074 5.226.074 3.62 0 3.99-.015 5.227-.074 1.236-.057 2.08-.254 2.82-.543a5.703 5.703 0 0 0 2.056-1.297 5.69 5.69 0 0 0 1.297-2.057c.289-.74.486-1.583.543-2.82.059-1.235.074-1.606.074-5.226 0-3.621-.015-3.991-.074-5.227-.057-1.236-.254-2.08-.543-2.82A5.69 5.69 0 0 0 22.09 1.91 5.703 5.703 0 0 0 20.034.617C19.293.328 18.45.131 17.213.074 15.978.015 15.607 0 11.987 0h.03zm-.717 2.164h.7c3.558 0 3.977.013 5.38.077 1.298.06 2.003.275 2.472.457.621.241 1.065.53 1.53.994.465.466.754.91.994 1.531.182.47.398 1.174.458 2.473.063 1.404.077 1.824.077 5.375s-.014 3.97-.077 5.375c-.06 1.298-.276 2.003-.458 2.472-.241.621-.53 1.065-.994 1.53-.465.465-.91.754-1.53.994-.47.182-1.175.398-2.473.458-1.403.063-1.823.077-5.38.077-3.558 0-3.977-.014-5.38-.077-1.298-.06-2.003-.276-2.473-.458a4.12 4.12 0 0 1-1.53-.994 4.12 4.12 0 0 1-.994-1.53c-.182-.47-.398-1.175-.458-2.473-.063-1.403-.076-1.823-.076-5.38s.013-3.971.076-5.374c.06-1.298.276-2.003.458-2.473.241-.62.53-1.065.994-1.53a4.12 4.12 0 0 1 1.53-.994c.47-.182 1.175-.398 2.473-.458 1.228-.056 1.703-.073 4.18-.076v.003zm-.01 3.676a6.177 6.177 0 1 0 0 12.354 6.177 6.177 0 0 0 0-12.354zm0 10.18a4.003 4.003 0 1 1 0-8.006 4.003 4.003 0 0 1 0 8.006zm7.852-10.406a1.443 1.443 0 1 1-2.885 0 1.443 1.443 0 0 1 2.885 0z" />
    </svg>
  ),
  tiktok: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.22 8.22 0 0 0 4.81 1.54V6.76a4.85 4.85 0 0 1-1.04-.07z" />
    </svg>
  ),
  whatsapp: () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  ),
};

function SocialLink({ url, icon: Icon, label, color }) {
  if (!url) return null;
  const href = url.startsWith("http") ? url : `https://${url}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 shadow-lg`}
      aria-label={label}>
      <Icon />
    </a>
  );
}

export default function CustomerMenu() {
  const urlParams   = new URLSearchParams(window.location.search);
  const tableNumber = urlParams.get("table") || urlParams.get("room") || "1";
  const tableType   = urlParams.get("room") ? "room" : "table";
  const tableName   = urlParams.get("name") || (tableType === "room" ? `غرفة ${tableNumber}` : `طاولة ${tableNumber}`);
  const bid         = urlParams.get("bid");

  setCurrentBusinessId(bid || null);
  useEffect(() => {
    setCurrentBusinessId(bid || null);
    return () => setCurrentBusinessId(null);
  }, [bid]);

  // جلب إعدادات الكافيه
  const { data: biz } = useQuery({
    queryKey: ["biz-public", bid],
    queryFn: async () => {
      if (!bid) return null;
      const { data } = await supabase
        .from("businesses")
        .select("name,hero_image,menu_tagline,primary_color,logo_url,phone,address,opening_time,closing_time,instagram_url,twitter_url,snapchat_url,tiktok_url,whatsapp,google_review_url")
        .eq("id", bid).single();
      return data;
    },
    enabled: !!bid,
  });

  // تطبيق اللون
  useEffect(() => {
    const c = biz?.primary_color || "32 85% 48%";
    document.documentElement.style.setProperty("--primary", c);
    return () => document.documentElement.style.setProperty("--primary", "32 85% 48%");
  }, [biz?.primary_color]);

  const cafeName = biz?.name      || "المنيو";
  const heroImg  = biz?.hero_image || DEFAULT_HERO;
  const tagline  = biz?.menu_tagline || "أهلاً بك";

  const [cart, setCart]               = useState([]);
  const [search, setSearch]           = useState("");
  const [activeCategory, setCategory] = useState("all");
  const [cartOpen, setCartOpen]       = useState(false);
  const [notifSent, setNotifSent]     = useState(null);
  const menuRef = useRef(null);
  const qc = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", bid],
    queryFn: () => db.entities.Category.filter({ is_active: true }, "sort_order"),
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", bid],
    queryFn: () => db.entities.Product.filter({ is_available: true }),
  });

  const filtered      = useMemo(() => products.filter(p => {
    const matchCat    = activeCategory === "all" || p.category === activeCategory;
    const matchSearch = !search || p.name.includes(search) || (p.name_en?.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  }), [products, activeCategory, search]);

  const featured = useMemo(() => products.filter(p => p.is_featured), [products]);
  const offers   = useMemo(() => products.filter(p => p.is_offer),    [products]);

  const addToCart = (product) => setCart(prev => {
    const ex = prev.find(i => i.product.id === product.id);
    if (ex) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
    return [...prev, { product, quantity: 1 }];
  });

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => {
    const p = i.product.is_offer && i.product.offer_price ? i.product.offer_price : i.product.price;
    return s + p * i.quantity;
  }, 0);

  const sendNotif = useMutation({
    mutationFn: (type) => db.entities.ServiceRequest.create({
      table_number: parseInt(tableNumber), table_name: tableName, table_type: tableType, type, status: "pending",
    }),
    onSuccess: (_, type) => { setNotifSent(type); setTimeout(() => setNotifSent(null), 4000); },
  });

  const hasSocial = biz?.instagram_url || biz?.twitter_url || biz?.snapchat_url || biz?.tiktok_url || biz?.whatsapp;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ==================== HERO LANDING ==================== */}
      <section className="relative min-h-[100svh] flex flex-col">
        {/* صورة الخلفية */}
        <div className="absolute inset-0">
          <img src={heroImg} alt={cafeName} className="w-full h-full object-cover"
            onError={e => { e.target.src = DEFAULT_HERO; }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />
        </div>

        {/* المحتوى */}
        <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 pt-16 pb-8">

          {/* اللوغو */}
          {biz?.logo_url ? (
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}
              src={biz.logo_url} alt={cafeName}
              className="w-28 h-28 rounded-3xl object-cover border-4 border-white/30 shadow-2xl mb-6"
              onError={e => e.target.style.display = 'none'}
            />
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}
              className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center mb-6 shadow-2xl"
            >
              <span className="text-4xl">☕</span>
            </motion.div>
          )}

          {/* الاسم */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-4xl sm:text-5xl font-heading font-bold text-white mb-3 leading-tight"
          >
            {cafeName}
          </motion.h1>

          {/* الوصف */}
          <motion.p
            initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-white/80 text-lg mb-2"
          >
            {tagline}
          </motion.p>

          {/* الطاولة */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-1.5 text-white/90 text-sm mb-6"
          >
            <span className="text-base">{tableType === "room" ? "🎮" : "🪑"}</span>
            {tableName}
          </motion.div>

          {/* معلومات */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-8"
          >
            {biz?.opening_time && (
              <span className="flex items-center gap-1.5 text-white/75 text-sm">
                <Clock className="w-3.5 h-3.5" />
                {biz.opening_time} – {biz.closing_time}
              </span>
            )}
            {biz?.address && (
              <span className="flex items-center gap-1.5 text-white/75 text-sm">
                <MapPin className="w-3.5 h-3.5" />
                {biz.address}
              </span>
            )}
            {biz?.phone && (
              <a href={`tel:${biz.phone}`} className="flex items-center gap-1.5 text-white/75 text-sm hover:text-white transition-colors">
                <Phone className="w-3.5 h-3.5" />
                {biz.phone}
              </a>
            )}
          </motion.div>

          {/* التواصل الاجتماعي */}
          {hasSocial && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="flex items-center gap-3 mb-10"
            >
              <SocialLink url={biz?.instagram_url} icon={SocialIcons.instagram} label="Instagram" color="bg-gradient-to-br from-purple-500 to-pink-500" />
              <SocialLink url={biz?.twitter_url}   icon={SocialIcons.twitter}   label="X / Twitter" color="bg-black" />
              <SocialLink url={biz?.snapchat_url}  icon={SocialIcons.snapchat}  label="Snapchat"  color="bg-yellow-400" />
              <SocialLink url={biz?.tiktok_url}    icon={SocialIcons.tiktok}    label="TikTok"    color="bg-black" />
              {biz?.whatsapp && (
                <SocialLink url={`https://wa.me/${biz.whatsapp.replace(/\D/g, "")}`} icon={SocialIcons.whatsapp} label="WhatsApp" color="bg-green-500" />
              )}
            </motion.div>
          )}

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
            className="flex flex-col items-center gap-3 w-full max-w-xs"
          >
            {/* أزرار الخدمة */}
            <div className="flex gap-2 w-full">
              <button onClick={() => sendNotif.mutate("call_waiter")}
                disabled={sendNotif.isPending || notifSent === "call_waiter"}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/30 text-white text-sm font-medium transition-all hover:bg-white/25 active:scale-95 disabled:opacity-60">
                <Bell className="w-4 h-4" />
                {notifSent === "call_waiter" ? "✓ تم" : "استدعاء موظف"}
              </button>
              <button onClick={() => sendNotif.mutate("request_bill")}
                disabled={sendNotif.isPending || notifSent === "request_bill"}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/30 text-white text-sm font-medium transition-all hover:bg-white/25 active:scale-95 disabled:opacity-60">
                <Receipt className="w-4 h-4" />
                {notifSent === "request_bill" ? "✓ تم" : "طلب الحساب"}
              </button>
            </div>

            {/* زر المنيو */}
            <button onClick={() => menuRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-base shadow-xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              عرض المنيو
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </button>
          </motion.div>
        </div>

        {/* تأكيد التنبيه */}
        <AnimatePresence>
          {notifSent && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute top-4 left-4 right-4 bg-green-500 text-white text-center py-2.5 rounded-2xl text-sm font-bold shadow-xl z-20">
              {notifSent === "call_waiter" ? "🔔 تم إرسال طلب استدعاء الموظف" : "🧾 تم إرسال طلب الحساب"}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ==================== المنيو ==================== */}
      <section ref={menuRef} className="bg-gray-50 min-h-screen">

        {/* شريط البحث + الأقسام */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
          <div className="px-4 pt-3 pb-2">
            <div className="relative mb-2.5">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ابحث في المنيو..."
                className="pr-10 rounded-xl bg-gray-50 border-gray-200 h-10 text-sm" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button onClick={() => setCategory("all")}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeCategory === "all" ? "bg-primary text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                الكل
              </button>
              {categories.map(c => (
                <button key={c.id} onClick={() => setCategory(c.name)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeCategory === c.name ? "bg-primary text-white shadow-md" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 pb-32 pt-4 space-y-6">

          {/* العروض */}
          {offers.length > 0 && activeCategory === "all" && !search && (
            <div>
              <h2 className="font-heading font-bold text-base mb-3 flex items-center gap-2">
                🔥 <span>عروض اليوم</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {offers.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}
              </div>
            </div>
          )}

          {/* المميزة */}
          {featured.length > 0 && activeCategory === "all" && !search && (
            <div>
              <h2 className="font-heading font-bold text-base mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-primary fill-primary" /> الأكثر طلباً
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {featured.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}
              </div>
            </div>
          )}

          {/* الكل */}
          <div>
            {activeCategory !== "all" || search ? null : (
              <h2 className="font-heading font-bold text-base mb-3">جميع المنتجات</h2>
            )}
            {isLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-medium">لا توجد نتائج</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}
              </div>
            )}
          </div>
        </div>

        {/* ==================== FOOTER ==================== */}
        <footer className="bg-gray-900 text-white px-5 py-8">
          <div className="max-w-md mx-auto text-center">

            {/* لوغو وإسم */}
            <div className="flex items-center justify-center gap-3 mb-4">
              {biz?.logo_url
                ? <img src={biz.logo_url} alt={cafeName} className="w-10 h-10 rounded-xl object-cover" onError={e => e.target.style.display='none'} />
                : <span className="text-2xl">☕</span>
              }
              <p className="font-heading font-bold text-lg">{cafeName}</p>
            </div>

            {/* زر التقييم */}
            {biz?.google_review_url && (
              <a href={biz.google_review_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold px-6 py-3 rounded-2xl mb-5 shadow-lg hover:shadow-xl transition-all active:scale-95">
                <span className="text-yellow-400 text-lg">⭐⭐⭐⭐⭐</span>
                قيّم تجربتك على Google
              </a>
            )}

            {/* التواصل الاجتماعي */}
            {hasSocial && (
              <div className="flex items-center justify-center gap-3 mb-5">
                <SocialLink url={biz?.instagram_url} icon={SocialIcons.instagram} label="Instagram" color="bg-gradient-to-br from-purple-500 to-pink-500" />
                <SocialLink url={biz?.twitter_url}   icon={SocialIcons.twitter}   label="X"         color="bg-gray-700" />
                <SocialLink url={biz?.snapchat_url}  icon={SocialIcons.snapchat}  label="Snapchat"  color="bg-yellow-400" />
                <SocialLink url={biz?.tiktok_url}    icon={SocialIcons.tiktok}    label="TikTok"    color="bg-gray-700" />
                {biz?.whatsapp && (
                  <SocialLink url={`https://wa.me/${biz.whatsapp.replace(/\D/g, "")}`} icon={SocialIcons.whatsapp} label="WhatsApp" color="bg-green-600" />
                )}
              </div>
            )}

            {/* معلومات */}
            <div className="text-gray-400 text-xs space-y-1 mb-4">
              {biz?.opening_time && <p>⏰ أوقات العمل: {biz.opening_time} – {biz.closing_time}</p>}
              {biz?.address      && <p>📍 {biz.address}</p>}
              {biz?.phone        && <p>📞 {biz.phone}</p>}
            </div>

            <div className="border-t border-gray-700 pt-4">
              <p className="text-gray-500 text-[10px]">
                © {new Date().getFullYear()} {cafeName} · مدعوم بـ
                <span className="text-primary font-semibold"> المنيو الذكي</span>
              </p>
            </div>
          </div>
        </footer>
      </section>

      {/* ===== زر السلة العائم ===== */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-30">
            <button onClick={() => setCartOpen(true)}
              className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-base shadow-2xl shadow-primary/40 flex items-center justify-center gap-3 active:scale-95 transition-all">
              <ShoppingCart className="w-5 h-5" />
              عرض السلة
              <span className="bg-white text-primary text-xs font-black px-2.5 py-1 rounded-full mr-auto">{cartCount}</span>
              <span>{cartTotal.toFixed(2)} ر.س</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CartSheet open={cartOpen} onOpenChange={setCartOpen}
        cart={cart} setCart={setCart}
        tableNumber={tableNumber} tableType={tableType} tableName={tableName} />
    </div>
  );
}

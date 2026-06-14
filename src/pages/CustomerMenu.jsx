import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import db, { setCurrentBusinessId, supabase } from "@/api/supabaseClient";
import { Search, ShoppingCart, Bell, Receipt, ChevronDown, MapPin, Clock, Phone, Plus, X, Check, Star, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CartSheet from "../components/customer/CartSheet";

const DEFAULT_HERO    = "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1400&q=90";
const DEFAULT_PRODUCT = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80";

const HEX_MAP = {
  "32 85% 48%":  "#e8820c", "217 91% 60%": "#3b82f6",
  "142 76% 36%": "#16a34a", "271 91% 65%": "#a855f7",
  "330 81% 60%": "#ec4899", "0 84% 60%":   "#ef4444",
  "173 80% 40%": "#0d9488", "45 93% 47%":  "#eab308",
};

const CAT_GRADIENTS = [
  ["#f97316","#ef4444"], ["#3b82f6","#8b5cf6"], ["#10b981","#06b6d4"],
  ["#f59e0b","#f97316"], ["#ec4899","#a855f7"], ["#0d9488","#3b82f6"],
  ["#84cc16","#10b981"], ["#f43f5e","#ec4899"], ["#6366f1","#8b5cf6"],
];

const IGIcon   = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;
const XIcon    = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
const SnapIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12.017 0C8.396 0 8.025.015 6.79.074c-1.237.057-2.08.254-2.82.543A5.69 5.69 0 0 0 1.914 1.91 5.703 5.703 0 0 0 .617 3.97C.328 4.71.131 5.553.074 6.79.015 8.025 0 8.396 0 12.017c0 3.62.015 3.99.074 5.226.057 1.236.254 2.08.543 2.82a5.69 5.69 0 0 0 1.293 2.056 5.703 5.703 0 0 0 2.057 1.297c.74.289 1.583.486 2.82.543 1.235.059 1.606.074 5.226.074 3.62 0 3.99-.015 5.227-.074 1.236-.057 2.08-.254 2.82-.543a5.703 5.703 0 0 0 2.056-1.297 5.69 5.69 0 0 0 1.297-2.057c.289-.74.486-1.583.543-2.82.059-1.235.074-1.606.074-5.226 0-3.621-.015-3.991-.074-5.227-.057-1.236-.254-2.08-.543-2.82A5.69 5.69 0 0 0 22.09 1.91 5.703 5.703 0 0 0 20.034.617C19.293.328 18.45.131 17.213.074 15.978.015 15.607 0 11.987 0h.03z"/></svg>;
const TKIcon   = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.22 8.22 0 0 0 4.81 1.54V6.76a4.85 4.85 0 0 1-1.04-.07z"/></svg>;
const WAIcon   = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>;

function SocialBtn({ url, icon: Icon, label, cls }) {
  if (!url) return null;
  const href = url.startsWith("http") ? url : `https://${url}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 hover:scale-110 shadow-md ${cls}`}>
      <Icon />
    </a>
  );
}

// ===== بطاقة قسم كبيرة =====
function BigCategoryCard({ cat, index, color, productCount, onClick }) {
  const [c1, c2] = CAT_GRADIENTS[index % CAT_GRADIENTS.length];
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 260, damping: 22 }}
      whileTap={{ scale: 0.94 }}
      className="relative rounded-3xl overflow-hidden aspect-square w-full shadow-lg active:shadow-sm transition-shadow"
    >
      {/* الصورة أو التدرج */}
      {cat.image_url ? (
        <img src={cat.image_url} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
      )}

      {/* طبقة التعتيم */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

      {/* أيقونة (بدون صورة) */}
      {!cat.image_url && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-6xl drop-shadow-lg">{cat.icon || "🍽️"}</span>
        </div>
      )}

      {/* معلومات */}
      <div className="absolute bottom-0 inset-x-0 p-4 text-right">
        <p className="text-white font-black text-[17px] leading-tight drop-shadow-sm">{cat.name}</p>
        <p className="text-white/70 text-xs mt-0.5">{productCount} منتج</p>
      </div>

      {/* سهم */}
      <div className="absolute top-3 left-3 w-7 h-7 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
        <ChevronRight className="w-4 h-4 text-white rotate-180" />
      </div>
    </motion.button>
  );
}

// ===== بطاقة عروض (full-width) =====
function OffersCard({ count, color, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      whileTap={{ scale: 0.96 }}
      className="relative w-full rounded-3xl overflow-hidden h-[110px] shadow-lg"
      style={{ background: "linear-gradient(135deg, #ff6b35, #f7041d)" }}
    >
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)" }} />
      <div className="relative h-full flex items-center justify-between px-6">
        <div className="text-right">
          <p className="text-white font-black text-xl leading-tight">عروض اليوم 🔥</p>
          <p className="text-white/80 text-sm mt-0.5">{count} عرض متاح</p>
        </div>
        <div className="text-6xl opacity-80">🎁</div>
      </div>
    </motion.button>
  );
}

// ===== بطاقة مميزة =====
function FeaturedCard({ count, color, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.06, type: "spring", stiffness: 240, damping: 20 }}
      whileTap={{ scale: 0.96 }}
      className="relative w-full rounded-3xl overflow-hidden h-[110px] shadow-lg"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
    >
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)" }} />
      <div className="relative h-full flex items-center justify-between px-6">
        <div className="text-right">
          <p className="text-white font-black text-xl leading-tight">الأكثر طلباً ⭐</p>
          <p className="text-white/80 text-sm mt-0.5">{count} منتج مميز</p>
        </div>
        <div className="text-6xl opacity-80">🌟</div>
      </div>
    </motion.button>
  );
}

// ===== بطاقة منتج =====
function ProductCard({ product, onAdd, currency, color, index = 0 }) {
  const hasOffer = product.is_offer && product.offer_price;
  const price = hasOffer ? product.offer_price : product.price;
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!product.is_available) return;
    onAdd(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 280, damping: 24 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group border border-gray-50"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={product.image || DEFAULT_PRODUCT} alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          onError={e => { e.target.src = DEFAULT_PRODUCT; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {hasOffer && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg">خصم</div>
        )}
        {product.is_featured && !hasOffer && (
          <div className="absolute top-2 right-2 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1"
            style={{ backgroundColor: color }}>
            <Star className="w-2.5 h-2.5 fill-white" /> مميز
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.75 }}
          onClick={handleAdd}
          disabled={!product.is_available}
          className="absolute bottom-2 left-2 w-9 h-9 rounded-full flex items-center justify-center shadow-xl disabled:opacity-40"
          style={{ backgroundColor: added ? "#22c55e" : color }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {added ? (
              <motion.span key="c" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.18 }}>
                <Check className="w-4 h-4 text-white" />
              </motion.span>
            ) : (
              <motion.span key="p" initial={{ scale: 0, rotate: 90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                <Plus className="w-4 h-4 text-white" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {!product.is_available && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-white/95 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full">غير متوفر</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-1 mb-0.5">{product.name}</p>
        {product.description && (
          <p className="text-gray-400 text-[11px] line-clamp-1 mb-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-black text-[15px]" style={{ color }}>{price}</span>
            <span className="text-gray-400 text-[10px] mr-0.5">{currency}</span>
          </div>
          {hasOffer && <span className="text-gray-400 text-[11px] line-through">{product.price}</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ===== Skeleton =====
function Skeleton({ index = 0 }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl overflow-hidden border border-gray-50 animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>
    </motion.div>
  );
}

// ===== الشاشة الرئيسية =====
export default function CustomerMenu() {
  const params      = new URLSearchParams(window.location.search);
  const tableNumber = params.get("table") || params.get("room") || "1";
  const tableType   = params.get("room") ? "room" : "table";
  const tableName   = params.get("name") || (tableType === "room" ? `غرفة ${tableNumber}` : `طاولة ${tableNumber}`);
  const bid         = params.get("bid");

  useEffect(() => {
    setCurrentBusinessId(bid || null);
    return () => setCurrentBusinessId(null);
  }, [bid]);

  const { data: biz } = useQuery({
    queryKey: ["biz-public", bid],
    queryFn: async () => {
      if (!bid) return null;
      const { data } = await supabase.from("businesses").select("*").eq("id", bid).single();
      return data;
    },
    enabled: !!bid,
  });

  const primaryHex = HEX_MAP[biz?.primary_color] || "#e8820c";
  useEffect(() => {
    document.documentElement.style.setProperty("--primary", biz?.primary_color || "32 85% 48%");
  }, [biz?.primary_color]);

  const cafeName  = biz?.name        || "المنيو";
  const heroImg   = biz?.hero_image  || DEFAULT_HERO;
  const tagline   = biz?.menu_tagline || "";
  const currency  = biz?.currency    || "ر.س";
  const hasSocial = biz?.instagram_url || biz?.twitter_url || biz?.snapchat_url || biz?.tiktok_url || biz?.whatsapp;

  const [cart, setCart]           = useState([]);
  const [search, setSearch]       = useState("");
  const [cartOpen, setCartOpen]   = useState(false);
  const [notifSent, setNotifSent] = useState(null);
  // selectedCat: null=شبكة الأقسام | {type:'offers'} | {type:'featured'} | {type:'cat', cat: obj}
  const [selectedCat, setSelectedCat] = useState(null);
  const menuRef = useRef(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", bid],
    enabled: !!bid,
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("business_id", bid)
        .order("sort_order");
      return data || [];
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", bid],
    enabled: !!bid,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", bid);
      return data || [];
    },
  });

  const offers   = useMemo(() => products.filter(p => p.is_offer),    [products]);
  const featured = useMemo(() => products.filter(p => p.is_featured), [products]);

  const visibleProducts = useMemo(() => {
    if (search) return products.filter(p =>
      p.name.includes(search) || (p.name_en?.toLowerCase().includes(search.toLowerCase()))
    );
    if (!selectedCat) return [];
    if (selectedCat.type === "offers")    return offers;
    if (selectedCat.type === "featured")  return featured;
    if (selectedCat.type === "cat")       return products.filter(p =>
      p.category === selectedCat.cat.name || p.category === selectedCat.cat.id
    );
    return [];
  }, [products, search, selectedCat, offers, featured]);

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

  // اسم القسم المختار لعنوان الـ header
  const catTitle = search
    ? `نتائج "${search}"`
    : selectedCat?.type === "offers" ? "عروض اليوم 🔥"
    : selectedCat?.type === "featured" ? "الأكثر طلباً ⭐"
    : selectedCat?.type === "cat" ? selectedCat.cat.name
    : null;

  const showProducts = search || selectedCat;

  return (
    <div className="min-h-screen bg-[#f5f5f7]" dir="rtl">

      {/* =================== HERO =================== */}
      <section className="relative min-h-[100svh] flex flex-col overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="w-full h-full object-cover"
            style={{ animation: "kb 25s ease-in-out infinite alternate" }}
            onError={e => { e.target.src = DEFAULT_HERO; }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/50 to-black/90" />
        </div>
        <style>{`@keyframes kb{from{transform:scale(1.05)}to{transform:scale(1.15) translate(-1.5%,-1%)}}`}</style>

        <div className="relative flex-1 flex flex-col items-center justify-center text-center px-5 pt-16 pb-8">
          {/* لوغو */}
          <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.05 }} className="mb-5">
            {biz?.logo_url ? (
              <div className="relative inline-block">
                <div className="absolute -inset-3 rounded-full blur-2xl opacity-50" style={{ background: primaryHex }} />
                <img src={biz.logo_url} alt={cafeName}
                  className="relative w-24 h-24 rounded-full object-cover border-4 border-white/90 shadow-2xl"
                  onError={e => e.target.style.display = "none"} />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-lg border-2 border-white/30 flex items-center justify-center text-4xl shadow-2xl">☕</div>
            )}
          </motion.div>

          <motion.h1 initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-1.5">
            {cafeName}
          </motion.h1>

          {tagline && (
            <motion.p initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.22 }}
              className="text-white/60 text-sm mb-4 font-light">{tagline}</motion.p>
          )}

          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.28 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/25 bg-white/10 backdrop-blur-md text-white text-sm font-semibold mb-5">
            <span>{tableType === "room" ? "🎮" : "🍽️"}</span>
            {tableName}
          </motion.div>

          {(biz?.opening_time || biz?.address || biz?.phone) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.33 }}
              className="flex flex-wrap justify-center gap-2 mb-5">
              {biz?.opening_time && (
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/75 text-[11px] px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <Clock className="w-3 h-3" />{biz.opening_time} – {biz.closing_time}
                </span>
              )}
              {biz?.address && (
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/75 text-[11px] px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <MapPin className="w-3 h-3" />{biz.address}
                </span>
              )}
              {biz?.phone && (
                <a href={`tel:${biz.phone}`} className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/75 text-[11px] px-3 py-1.5 rounded-full backdrop-blur-sm hover:bg-white/20 transition-colors">
                  <Phone className="w-3 h-3" />{biz.phone}
                </a>
              )}
            </motion.div>
          )}

          {hasSocial && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
              className="flex items-center gap-2.5 mb-7">
              <SocialBtn url={biz?.instagram_url} icon={IGIcon}   label="Instagram" cls="bg-gradient-to-br from-purple-500 to-pink-500 text-white" />
              <SocialBtn url={biz?.twitter_url}   icon={XIcon}    label="X"         cls="bg-black text-white" />
              <SocialBtn url={biz?.snapchat_url}  icon={SnapIcon} label="Snapchat"  cls="bg-yellow-400 text-black" />
              <SocialBtn url={biz?.tiktok_url}    icon={TKIcon}   label="TikTok"    cls="bg-black text-white" />
              {biz?.whatsapp && <SocialBtn url={`https://wa.me/${biz.whatsapp.replace(/\D/g,"")}`} icon={WAIcon} label="WhatsApp" cls="bg-green-500 text-white" />}
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}
            className="w-full max-w-xs space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: "call_waiter", label: "استدعاء موظف", icon: <Bell className="w-4 h-4" /> },
                { type: "request_bill", label: "طلب الحساب",  icon: <Receipt className="w-4 h-4" /> },
              ].map(({ type, label, icon }) => (
                <button key={type} onClick={() => sendNotif.mutate(type)}
                  disabled={sendNotif.isPending || notifSent === type}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-white/25 bg-white/10 backdrop-blur-md text-white text-[13px] font-semibold hover:bg-white/20 active:scale-95 transition-all disabled:opacity-50">
                  {icon}
                  {notifSent === type ? "✓ تم" : label}
                </button>
              ))}
            </div>
            <motion.button whileTap={{ scale: 0.96 }}
              onClick={() => menuRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryHex, boxShadow: `0 8px 30px ${primaryHex}60` }}>
              <ShoppingCart className="w-5 h-5" />
              استعرض المنيو
              <motion.span animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}>
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </motion.button>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="relative flex justify-center pb-6">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2.2 }}
            className="w-5 h-9 rounded-full border-2 border-white/30 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-white/50" />
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {notifSent && (
            <motion.div initial={{ opacity: 0, y: -40, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.9 }}
              className="absolute top-4 inset-x-4 z-30 bg-green-500 text-white py-3.5 px-5 rounded-2xl font-bold text-sm shadow-2xl flex items-center justify-center gap-2">
              <Check className="w-5 h-5" />
              {notifSent === "call_waiter" ? "تم إرسال طلب استدعاء الموظف" : "تم إرسال طلب الحساب"}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* =================== MENU =================== */}
      <section ref={menuRef}>

        {/* شريط علوي ثابت */}
        <div className="sticky top-0 z-20 bg-white/96 backdrop-blur-xl border-b border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            {/* زر الرجوع */}
            <AnimatePresence>
              {(selectedCat || search) && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: 36 }}
                  exit={{ opacity: 0, scale: 0.7, width: 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 26 }}
                  onClick={() => { setSelectedCat(null); setSearch(""); }}
                  className="shrink-0 w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors overflow-hidden"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* عنوان القسم أو بحث */}
            <AnimatePresence mode="wait">
              {catTitle && !search ? (
                <motion.p key="title"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="font-black text-gray-900 text-base flex-1">
                  {catTitle}
                </motion.p>
              ) : (
                <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input type="text" value={search} onChange={e => { setSearch(e.target.value); if (e.target.value) setSelectedCat(null); }}
                    placeholder="ابحث عن منتج..." dir="rtl"
                    className="w-full h-10 pr-10 pl-9 text-sm rounded-xl bg-gray-100 border-0 outline-none"
                    style={{ boxShadow: search ? `0 0 0 2px ${primaryHex}40` : undefined }} />
                  <AnimatePresence>
                    {search && (
                      <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                        onClick={() => setSearch("")}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <X className="w-4 h-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* زر البحث عند وجود عنوان */}
            {catTitle && !search && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={() => setSearch(" ")}
                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0">
                <Search className="w-4 h-4 text-gray-500" />
              </motion.button>
            )}
          </div>
        </div>

        {/* ===== المحتوى ===== */}
        <div className="pb-32">
          <AnimatePresence mode="wait">

            {/* شبكة الأقسام */}
            {!showProducts && (
              <motion.div key="grid"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="px-4 pt-5 space-y-3">

                {isLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="aspect-square rounded-3xl bg-gray-200 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* عروض */}
                    {offers.length > 0 && (
                      <OffersCard count={offers.length} color={primaryHex} onClick={() => setSelectedCat({ type: "offers" })} />
                    )}

                    {/* مميزة */}
                    {featured.length > 0 && (
                      <FeaturedCard count={featured.length} color={primaryHex} onClick={() => setSelectedCat({ type: "featured" })} />
                    )}

                    {/* الأقسام */}
                    {categories.length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {categories.map((cat, i) => {
                          const count = products.filter(p =>
                            p.category === cat.name || p.category === cat.id
                          ).length;
                          return (
                            <BigCategoryCard
                              key={cat.id} cat={cat} index={i}
                              color={primaryHex}
                              productCount={count}
                              onClick={() => setSelectedCat({ type: "cat", cat })}
                            />
                          );
                        })}
                      </div>
                    )}

                    {categories.length === 0 && products.length === 0 && (
                      <div className="text-center py-24">
                        <p className="text-6xl mb-4">☕</p>
                        <p className="font-black text-gray-500 text-lg">لا توجد منتجات</p>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* قائمة المنتجات */}
            {showProducts && (
              <motion.div key={selectedCat?.type + (selectedCat?.cat?.id || "") + search}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="px-4 pt-5">

                {isLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} index={i} />)}
                  </div>
                ) : visibleProducts.length === 0 ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24">
                    <p className="text-6xl mb-4">🔍</p>
                    <p className="font-black text-gray-600 text-xl">لا توجد نتائج</p>
                    <p className="text-gray-400 text-sm mt-2">جرب كلمة بحث مختلفة</p>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {visibleProducts.map((p, i) => (
                      <ProductCard key={p.id} product={p} onAdd={addToCart} currency={currency} color={primaryHex} index={i} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* =================== FOOTER =================== */}
        <footer className="bg-gray-950 text-white overflow-hidden">
          <div className="h-[3px]" style={{ background: `linear-gradient(90deg,transparent,${primaryHex},transparent)` }} />
          <div className="max-w-sm mx-auto px-6 py-10 text-center">
            <div className="flex flex-col items-center gap-3 mb-7">
              {biz?.logo_url ? (
                <img src={biz.logo_url} alt={cafeName} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10"
                  onError={e => e.target.style.display = "none"} />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">☕</div>
              )}
              <div>
                <p className="font-black text-xl">{cafeName}</p>
                {tagline && <p className="text-gray-500 text-sm">{tagline}</p>}
              </div>
            </div>

            {biz?.google_review_url && (
              <a href={biz.google_review_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 bg-white text-gray-900 font-bold px-6 py-3 rounded-2xl mb-6 hover:bg-gray-50 active:scale-95 transition-all shadow-xl">
                <span className="text-yellow-400 tracking-widest">★★★★★</span>
                قيّم تجربتك
              </a>
            )}

            {hasSocial && (
              <div className="flex items-center justify-center gap-3 mb-6">
                <SocialBtn url={biz?.instagram_url} icon={IGIcon}   label="Instagram" cls="bg-gradient-to-br from-purple-500 to-pink-500 text-white" />
                <SocialBtn url={biz?.twitter_url}   icon={XIcon}    label="X"         cls="bg-gray-700 text-white" />
                <SocialBtn url={biz?.snapchat_url}  icon={SnapIcon} label="Snapchat"  cls="bg-yellow-400 text-black" />
                <SocialBtn url={biz?.tiktok_url}    icon={TKIcon}   label="TikTok"    cls="bg-gray-700 text-white" />
                {biz?.whatsapp && <SocialBtn url={`https://wa.me/${biz.whatsapp.replace(/\D/g,"")}`} icon={WAIcon} label="WhatsApp" cls="bg-green-600 text-white" />}
              </div>
            )}

            <div className="space-y-2 text-sm text-gray-500 mb-6">
              {biz?.opening_time && <p className="flex items-center justify-center gap-2"><Clock className="w-3.5 h-3.5" />{biz.opening_time} – {biz.closing_time}</p>}
              {biz?.address      && <p className="flex items-center justify-center gap-2"><MapPin className="w-3.5 h-3.5" />{biz.address}</p>}
              {biz?.phone        && <a href={`tel:${biz.phone}`} className="flex items-center justify-center gap-2 hover:text-white transition-colors"><Phone className="w-3.5 h-3.5" />{biz.phone}</a>}
            </div>

            <div className="border-t border-white/5 pt-5">
              <p className="text-gray-600 text-[11px]">
                © {new Date().getFullYear()} {cafeName} · مدعوم بـ
                <span className="font-bold" style={{ color: primaryHex }}> المنيو الذكي</span>
              </p>
            </div>
          </div>
        </footer>
      </section>

      {/* سلة عائمة */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed bottom-6 inset-x-4 z-40">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setCartOpen(true)}
              className="w-full h-14 rounded-2xl text-white font-bold flex items-center justify-between px-5"
              style={{ backgroundColor: primaryHex, boxShadow: `0 8px 32px ${primaryHex}60` }}>
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5" />
                <span className="text-base font-black">السلة</span>
              </div>
              <div className="flex items-center gap-3">
                <motion.span
                  key={cartCount}
                  initial={{ scale: 1.6 }} animate={{ scale: 1 }}
                  className="bg-white/25 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                  {cartCount}
                </motion.span>
                <span className="font-black">{cartTotal.toFixed(2)} {currency}</span>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <CartSheet open={cartOpen} onOpenChange={setCartOpen}
        cart={cart} setCart={setCart}
        tableNumber={tableNumber} tableType={tableType} tableName={tableName} />
    </div>
  );
}

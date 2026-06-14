import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import db, { setCurrentBusinessId, supabase } from "@/api/supabaseClient";
import {
  Search, ShoppingCart, Bell, Receipt, ChevronDown,
  MapPin, Clock, Phone, Plus, X, Check, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CartSheet from "../components/customer/CartSheet";

const DEFAULT_HERO = "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1400&q=90";
const DEFAULT_PRODUCT = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80";

// خريطة الألوان HEX لكل لون HSL
const HEX_MAP = {
  "32 85% 48%":  "#e8820c",
  "217 91% 60%": "#3b82f6",
  "142 76% 36%": "#16a34a",
  "271 91% 65%": "#a855f7",
  "330 81% 60%": "#ec4899",
  "0 84% 60%":   "#ef4444",
  "173 80% 40%": "#0d9488",
  "45 93% 47%":  "#eab308",
};

// ===== أيقونات التواصل =====
const IGIcon  = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;
const XIcon  = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
const SnapIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12.017 0C8.396 0 8.025.015 6.79.074c-1.237.057-2.08.254-2.82.543A5.69 5.69 0 0 0 1.914 1.91 5.703 5.703 0 0 0 .617 3.97C.328 4.71.131 5.553.074 6.79.015 8.025 0 8.396 0 12.017c0 3.62.015 3.99.074 5.226.057 1.236.254 2.08.543 2.82a5.69 5.69 0 0 0 1.293 2.056 5.703 5.703 0 0 0 2.057 1.297c.74.289 1.583.486 2.82.543 1.235.059 1.606.074 5.226.074 3.62 0 3.99-.015 5.227-.074 1.236-.057 2.08-.254 2.82-.543a5.703 5.703 0 0 0 2.056-1.297 5.69 5.69 0 0 0 1.297-2.057c.289-.74.486-1.583.543-2.82.059-1.235.074-1.606.074-5.226 0-3.621-.015-3.991-.074-5.227-.057-1.236-.254-2.08-.543-2.82A5.69 5.69 0 0 0 22.09 1.91 5.703 5.703 0 0 0 20.034.617C19.293.328 18.45.131 17.213.074 15.978.015 15.607 0 11.987 0h.03zm-.717 2.164h.7c3.558 0 3.977.013 5.38.077 1.298.06 2.003.275 2.472.457.621.241 1.065.53 1.53.994.465.466.754.91.994 1.531.182.47.398 1.174.458 2.473.063 1.404.077 1.824.077 5.375s-.014 3.97-.077 5.375c-.06 1.298-.276 2.003-.458 2.472-.241.621-.53 1.065-.994 1.53-.465.465-.91.754-1.53.994-.47.182-1.175.398-2.473.458-1.403.063-1.823.077-5.38.077-3.558 0-3.977-.014-5.38-.077-1.298-.06-2.003-.276-2.473-.458a4.12 4.12 0 0 1-1.53-.994 4.12 4.12 0 0 1-.994-1.53c-.182-.47-.398-1.175-.458-2.473-.063-1.403-.076-1.823-.076-5.38s.013-3.971.076-5.374c.06-1.298.276-2.003.458-2.473.241-.62.53-1.065.994-1.53a4.12 4.12 0 0 1 1.53-.994c.47-.182 1.175-.398 2.473-.458 1.228-.056 1.703-.073 4.18-.076v.003zm-.01 3.676a6.177 6.177 0 1 0 0 12.354 6.177 6.177 0 0 0 0-12.354zm0 10.18a4.003 4.003 0 1 1 0-8.006 4.003 4.003 0 0 1 0 8.006zm7.852-10.406a1.443 1.443 0 1 1-2.885 0 1.443 1.443 0 0 1 2.885 0z"/></svg>;
const TKIcon  = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.22 8.22 0 0 0 4.81 1.54V6.76a4.85 4.85 0 0 1-1.04-.07z"/></svg>;
const WAIcon  = () => <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>;

function SocialBtn({ url, icon: Icon, label, className }) {
  if (!url) return null;
  const href = url.startsWith("http") ? url : `https://${url}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 hover:scale-110 shadow-md ${className}`}>
      <Icon />
    </a>
  );
}

function SectionHeader({ icon, title, color }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xl leading-none">{icon}</span>
      <h2 className="font-black text-gray-900 text-base">{title}</h2>
      <div className="flex-1 h-px" style={{ background: `${color}30` }} />
    </div>
  );
}

function ProductCard({ product, onAdd, currency, color }) {
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
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={product.image || DEFAULT_PRODUCT}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => { e.target.src = DEFAULT_PRODUCT; }}
        />
        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {hasOffer && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">عرض</span>
          )}
          {product.is_featured && !hasOffer && (
            <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow flex items-center gap-0.5"
              style={{ backgroundColor: color }}>
              <Star className="w-2.5 h-2.5 fill-white" /> مميز
            </span>
          )}
        </div>
        {/* Unavailable overlay */}
        {!product.is_available && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-white/90 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full">غير متوفر</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-1 mb-0.5">{product.name}</p>
        {product.description && (
          <p className="text-gray-400 text-[11px] line-clamp-1 mb-2">{product.description}</p>
        )}
        <div className="flex items-end justify-between mt-1">
          <div>
            <span className="font-black text-base" style={{ color }}>{price}</span>
            <span className="text-gray-400 text-[10px] mr-0.5">{currency}</span>
            {hasOffer && (
              <p className="text-gray-400 text-[10px] line-through">{product.price} {currency}</p>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleAdd}
            disabled={!product.is_available}
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors disabled:opacity-40"
            style={{ backgroundColor: added ? '#22c55e' : color }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {added ? (
                <motion.span key="c" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                  <Check className="w-4 h-4 text-white" />
                </motion.span>
              ) : (
                <motion.span key="p" initial={{ scale: 0, rotate: 90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                  <Plus className="w-4 h-4 text-white" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function ProductGrid({ products, onAdd, currency, color }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {products.map((p, i) => (
        <motion.div key={p.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        >
          <ProductCard product={p} onAdd={onAdd} currency={currency} color={color} />
        </motion.div>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
      <div className="aspect-[4/3] bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded-lg w-3/4" />
        <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
        <div className="flex justify-between items-center pt-1">
          <div className="h-5 bg-gray-200 rounded-lg w-1/3" />
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}

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

  // تطبيق اللون الرئيسي
  const primaryHex = HEX_MAP[biz?.primary_color] || "#e8820c";
  useEffect(() => {
    document.documentElement.style.setProperty("--primary", biz?.primary_color || "32 85% 48%");
  }, [biz?.primary_color]);

  const cafeName = biz?.name || "المنيو";
  const heroImg  = biz?.hero_image || DEFAULT_HERO;
  const tagline  = biz?.menu_tagline || "";
  const currency = biz?.currency || "ر.س";
  const hasSocial = biz?.instagram_url || biz?.twitter_url || biz?.snapchat_url || biz?.tiktok_url || biz?.whatsapp;

  const [cart, setCart]           = useState([]);
  const [search, setSearch]       = useState("");
  const [activeCategory, setCat]  = useState("all");
  const [cartOpen, setCartOpen]   = useState(false);
  const [notifSent, setNotifSent] = useState(null);
  const menuRef = useRef(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", bid],
    queryFn: () => db.entities.Category.filter({ is_active: true }, "sort_order"),
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", bid],
    queryFn: () => db.entities.Product.filter({ is_available: true }),
  });

  const filtered = useMemo(() => products.filter(p => {
    const matchCat    = activeCategory === "all" || p.category === activeCategory;
    const matchSearch = !search || p.name.includes(search) || (p.name_en?.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  }), [products, activeCategory, search]);

  const featured = useMemo(() => products.filter(p => p.is_featured), [products]);
  const offers   = useMemo(() => products.filter(p => p.is_offer), [products]);

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

  const scrollToMenu = () => menuRef.current?.scrollIntoView({ behavior: "smooth" });

  const isFiltered = search || activeCategory !== "all";

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* =================== HERO =================== */}
      <section className="relative min-h-[100svh] flex flex-col overflow-hidden">

        {/* خلفية بتأثير Ken Burns */}
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="w-full h-full object-cover"
            style={{ animation: "kb 25s ease-in-out infinite alternate" }}
            onError={e => { e.target.src = DEFAULT_HERO; }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/50 to-black/85" />
        </div>

        <style>{`@keyframes kb { from { transform: scale(1.05); } to { transform: scale(1.15) translate(-1.5%, -1%); } }`}</style>

        {/* محتوى الهيرو */}
        <div className="relative flex-1 flex flex-col items-center justify-center text-center px-5 pt-14 pb-8 gap-0">

          {/* لوغو */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.05 }}
            className="mb-5"
          >
            {biz?.logo_url ? (
              <div className="relative inline-block">
                <div className="absolute -inset-2 rounded-full blur-xl opacity-60"
                  style={{ background: primaryHex }} />
                <img src={biz.logo_url} alt={cafeName}
                  className="relative w-24 h-24 rounded-full object-cover border-[3px] border-white shadow-2xl"
                  onError={e => e.target.style.display = "none"} />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-lg border-2 border-white/30 flex items-center justify-center text-4xl shadow-2xl">☕</div>
            )}
          </motion.div>

          {/* الاسم */}
          <motion.h1
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-1.5 leading-none"
          >
            {cafeName}
          </motion.h1>

          {/* الوصف */}
          {tagline && (
            <motion.p
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.22 }}
              className="text-white/65 text-sm mb-4 font-light tracking-wide"
            >
              {tagline}
            </motion.p>
          )}

          {/* بادج الطاولة */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.28 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/25 bg-white/10 backdrop-blur-md text-white text-sm font-semibold mb-5 shadow-inner"
          >
            <span className="text-base">{tableType === "room" ? "🎮" : "🍽️"}</span>
            {tableName}
          </motion.div>

          {/* معلومات */}
          {(biz?.opening_time || biz?.address || biz?.phone) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.34 }}
              className="flex flex-wrap justify-center gap-2 mb-5"
            >
              {biz?.opening_time && (
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/15 text-white/75 text-[11px] px-3 py-1.5 rounded-full">
                  <Clock className="w-3 h-3 shrink-0" />{biz.opening_time} – {biz.closing_time}
                </span>
              )}
              {biz?.address && (
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/15 text-white/75 text-[11px] px-3 py-1.5 rounded-full">
                  <MapPin className="w-3 h-3 shrink-0" />{biz.address}
                </span>
              )}
              {biz?.phone && (
                <a href={`tel:${biz.phone}`} className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/15 text-white/75 text-[11px] px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors">
                  <Phone className="w-3 h-3 shrink-0" />{biz.phone}
                </a>
              )}
            </motion.div>
          )}

          {/* سوشيال */}
          {hasSocial && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-2.5 mb-7"
            >
              <SocialBtn url={biz?.instagram_url} icon={IGIcon}   label="Instagram" className="bg-gradient-to-br from-purple-500 to-pink-500 text-white" />
              <SocialBtn url={biz?.twitter_url}   icon={XIcon}    label="X / Twitter" className="bg-black text-white" />
              <SocialBtn url={biz?.snapchat_url}  icon={SnapIcon} label="Snapchat"  className="bg-yellow-400 text-black" />
              <SocialBtn url={biz?.tiktok_url}    icon={TKIcon}   label="TikTok"    className="bg-black text-white" />
              {biz?.whatsapp && (
                <SocialBtn url={`https://wa.me/${biz.whatsapp.replace(/\D/g, "")}`} icon={WAIcon} label="WhatsApp" className="bg-green-500 text-white" />
              )}
            </motion.div>
          )}

          {/* أزرار الإجراءات */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
            className="w-full max-w-xs space-y-2.5"
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => sendNotif.mutate("call_waiter")}
                disabled={sendNotif.isPending || notifSent === "call_waiter"}
                className="flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-white/25 bg-white/10 backdrop-blur-md text-white text-[13px] font-semibold hover:bg-white/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <Bell className="w-4 h-4 shrink-0" />
                {notifSent === "call_waiter" ? "✓ تم" : "استدعاء موظف"}
              </button>
              <button
                onClick={() => sendNotif.mutate("request_bill")}
                disabled={sendNotif.isPending || notifSent === "request_bill"}
                className="flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-white/25 bg-white/10 backdrop-blur-md text-white text-[13px] font-semibold hover:bg-white/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <Receipt className="w-4 h-4 shrink-0" />
                {notifSent === "request_bill" ? "✓ تم" : "طلب الحساب"}
              </button>
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={scrollToMenu}
              className="w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2 transition-all"
              style={{ backgroundColor: primaryHex, boxShadow: `0 8px 30px ${primaryHex}60` }}
            >
              <ShoppingCart className="w-5 h-5" />
              استعرض المنيو
              <motion.span animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}>
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </motion.button>
          </motion.div>
        </div>

        {/* مؤشر التمرير */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="relative flex justify-center pb-6"
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            className="w-5 h-9 rounded-full border-2 border-white/30 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-white/50" />
          </motion.div>
        </motion.div>

        {/* تنبيه النجاح */}
        <AnimatePresence>
          {notifSent && (
            <motion.div
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.9 }}
              className="absolute top-4 inset-x-4 z-30 bg-green-500 text-white py-3.5 px-5 rounded-2xl font-bold text-sm shadow-2xl flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              {notifSent === "call_waiter" ? "تم إرسال طلب استدعاء الموظف" : "تم إرسال طلب الحساب"}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* =================== قسم المنيو =================== */}
      <section ref={menuRef} className="bg-gray-50">

        {/* شريط ثابت: بحث + أقسام */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm">
          <div className="px-4 pt-3 pb-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث في المنيو..."
                className="w-full h-10 pr-10 pl-9 text-sm rounded-xl bg-gray-100 border-0 outline-none focus:ring-2 transition-all"
                style={{ focusRingColor: primaryHex }}
                dir="rtl"
              />
              <AnimatePresence>
                {search && (
                  <motion.button
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    onClick={() => setSearch("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide">
            {[{ id: "all", name: "الكل", icon: "✨" }, ...categories].map(c => {
              const isActive = c.id === "all" ? activeCategory === "all" : activeCategory === c.name;
              return (
                <button
                  key={c.id || c.name}
                  onClick={() => setCat(c.id === "all" ? "all" : c.name)}
                  className="shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap"
                  style={isActive
                    ? { backgroundColor: primaryHex, color: "white", boxShadow: `0 2px 12px ${primaryHex}50` }
                    : { backgroundColor: "#f3f4f6", color: "#4b5563" }
                  }
                >
                  {c.icon} {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* المنتجات */}
        <div className="px-4 pt-6 pb-32 space-y-8">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : isFiltered ? (
            filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="text-center py-24"
              >
                <p className="text-6xl mb-4">🔍</p>
                <p className="font-black text-gray-600 text-xl">لا توجد نتائج</p>
                <p className="text-gray-400 text-sm mt-2">جرب كلمة بحث مختلفة</p>
              </motion.div>
            ) : (
              <ProductGrid products={filtered} onAdd={addToCart} currency={currency} color={primaryHex} />
            )
          ) : (
            <>
              {offers.length > 0 && (
                <div>
                  <SectionHeader icon="🔥" title="عروض اليوم" color={primaryHex} />
                  <ProductGrid products={offers} onAdd={addToCart} currency={currency} color={primaryHex} />
                </div>
              )}
              {featured.length > 0 && (
                <div>
                  <SectionHeader icon="⭐" title="الأكثر طلباً" color={primaryHex} />
                  <ProductGrid products={featured} onAdd={addToCart} currency={currency} color={primaryHex} />
                </div>
              )}
              {categories.map(cat => {
                const catProds = products.filter(p => p.category === cat.name);
                if (!catProds.length) return null;
                return (
                  <div key={cat.id}>
                    <SectionHeader icon={cat.icon || "🍽️"} title={cat.name} color={primaryHex} />
                    <ProductGrid products={catProds} onAdd={addToCart} currency={currency} color={primaryHex} />
                  </div>
                );
              })}
              {categories.length === 0 && products.length > 0 && (
                <ProductGrid products={products} onAdd={addToCart} currency={currency} color={primaryHex} />
              )}
              {products.length === 0 && !isLoading && (
                <div className="text-center py-24">
                  <p className="text-6xl mb-4">☕</p>
                  <p className="font-black text-gray-500 text-lg">لا توجد منتجات بعد</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* =================== FOOTER =================== */}
        <footer className="bg-gray-950 text-white overflow-hidden">
          {/* خط لوني */}
          <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${primaryHex}, transparent)` }} />

          <div className="max-w-sm mx-auto px-6 py-10 text-center">

            {/* لوغو + اسم */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col items-center gap-3 mb-7"
            >
              {biz?.logo_url ? (
                <img src={biz.logo_url} alt={cafeName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10 shadow-lg"
                  onError={e => e.target.style.display = "none"} />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">☕</div>
              )}
              <div>
                <p className="font-black text-xl text-white">{cafeName}</p>
                {tagline && <p className="text-gray-500 text-sm">{tagline}</p>}
              </div>
            </motion.div>

            {/* زر Google Review */}
            {biz?.google_review_url && (
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mb-6">
                <a href={biz.google_review_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 bg-white text-gray-900 font-bold px-6 py-3 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all shadow-xl">
                  <span className="text-yellow-400 text-lg tracking-widest">★★★★★</span>
                  <span>قيّم تجربتك</span>
                </a>
              </motion.div>
            )}

            {/* سوشيال */}
            {hasSocial && (
              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                className="flex items-center justify-center gap-3 mb-6">
                <SocialBtn url={biz?.instagram_url} icon={IGIcon}   label="Instagram" className="bg-gradient-to-br from-purple-500 to-pink-500 text-white" />
                <SocialBtn url={biz?.twitter_url}   icon={XIcon}    label="X"         className="bg-gray-700 text-white" />
                <SocialBtn url={biz?.snapchat_url}  icon={SnapIcon} label="Snapchat"  className="bg-yellow-400 text-black" />
                <SocialBtn url={biz?.tiktok_url}    icon={TKIcon}   label="TikTok"    className="bg-gray-700 text-white" />
                {biz?.whatsapp && (
                  <SocialBtn url={`https://wa.me/${biz.whatsapp.replace(/\D/g, "")}`} icon={WAIcon} label="WhatsApp" className="bg-green-600 text-white" />
                )}
              </motion.div>
            )}

            {/* معلومات */}
            <div className="space-y-2 text-sm text-gray-500 mb-6">
              {biz?.opening_time && (
                <p className="flex items-center justify-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  {biz.opening_time} – {biz.closing_time}
                </p>
              )}
              {biz?.address && (
                <p className="flex items-center justify-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {biz.address}
                </p>
              )}
              {biz?.phone && (
                <a href={`tel:${biz.phone}`} className="flex items-center justify-center gap-2 hover:text-white transition-colors">
                  <Phone className="w-3.5 h-3.5" />
                  {biz.phone}
                </a>
              )}
            </div>

            {/* حقوق النشر */}
            <div className="border-t border-white/5 pt-5">
              <p className="text-gray-600 text-[11px]">
                © {new Date().getFullYear()} {cafeName}
                {" · "}مدعوم بـ
                <span className="font-bold" style={{ color: primaryHex }}> المنيو الذكي</span>
              </p>
            </div>
          </div>
        </footer>
      </section>

      {/* ===== زر السلة العائم ===== */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed bottom-6 inset-x-4 z-40"
          >
            <button
              onClick={() => setCartOpen(true)}
              className="w-full h-14 rounded-2xl text-white font-bold text-sm flex items-center justify-between px-5 active:scale-[0.97] transition-all"
              style={{ backgroundColor: primaryHex, boxShadow: `0 8px 32px ${primaryHex}60` }}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5" />
                <span className="text-base font-black">السلة</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-white/20 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">{cartCount}</span>
                <span className="font-black text-base">{cartTotal.toFixed(2)} {currency}</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <CartSheet
        open={cartOpen} onOpenChange={setCartOpen}
        cart={cart} setCart={setCart}
        tableNumber={tableNumber} tableType={tableType} tableName={tableName}
      />
    </div>
  );
}

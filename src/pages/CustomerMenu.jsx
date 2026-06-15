import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import db, { setCurrentBusinessId, supabase } from "@/api/supabaseClient";
import {
  Search, ShoppingCart, Bell, Receipt, ChevronDown, MapPin, Clock,
  Phone, Plus, X, Check, Star, ChevronRight, Minus, ArrowLeftRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CartSheet from "../components/customer/CartSheet";

// ============================================================
// صوتيات + اهتزاز
// ============================================================
const snd = {
  add: () => {
    try {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return;
      const ctx = new A();
      [[587, 0], [880, 0.07]].forEach(([f, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = f; o.type = "sine";
        const t = ctx.currentTime + d;
        g.gain.setValueAtTime(0.28, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
        o.start(t); o.stop(t + 0.11);
      });
    } catch {}
  },
  ping: () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[880, 0], [1100, 0.09], [880, 0.18]].forEach(([f, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = f; o.type = "sine";
        const t = ctx.currentTime + d;
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        o.start(t); o.stop(t + 0.09);
      });
    } catch {}
  },
};
const haptic = (p = [10]) => { try { navigator.vibrate?.(p); } catch {} };
const speak  = (text, rate = 0.88) => {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-SA"; u.rate = rate; u.pitch = 1.08; u.volume = 0.85;
    window.speechSynthesis.speak(u);
  } catch {}
};

// ============================================================
// Defaults
// ============================================================
const DEFAULT_HERO    = "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1400&q=90";
const DEFAULT_PRODUCT = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80";

const HEX_MAP = {
  "32 85% 48%":  "#e8820c", "217 91% 60%": "#3b82f6",
  "142 76% 36%": "#16a34a", "271 91% 65%": "#a855f7",
  "330 81% 60%": "#ec4899", "0 84% 60%":   "#ef4444",
  "173 80% 40%": "#0d9488", "45 93% 47%":  "#eab308",
};

const CAT_GRADIENTS = [
  ["#f97316","#ef4444"],["#3b82f6","#8b5cf6"],["#10b981","#06b6d4"],
  ["#f59e0b","#f97316"],["#ec4899","#a855f7"],["#0d9488","#3b82f6"],
  ["#84cc16","#10b981"],["#f43f5e","#ec4899"],["#6366f1","#8b5cf6"],
];

// ============================================================
// Social icons
// ============================================================
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
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg ${cls}`}>
      <Icon />
    </a>
  );
}

// ============================================================
// Tabs أفقية للأقسام
// ============================================================
function CategoryTabs({ tabs, activeId, onSelect, color }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current?.querySelector(`[data-tabid="${activeId}"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeId]);

  return (
    <div ref={ref} className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
      {tabs.map(t => {
        const active = t.id === activeId;
        return (
          <motion.button
            key={t.id}
            data-tabid={t.id}
            whileTap={{ scale: 0.90 }}
            onClick={() => onSelect(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-black whitespace-nowrap shrink-0 transition-colors"
            style={active
              ? { backgroundColor: color, color: "#fff", boxShadow: `0 4px 14px ${color}50` }
              : { backgroundColor: "#f3f4f6", color: "#6b7280" }
            }
          >
            {t.emoji && <span className="text-[15px] leading-none">{t.emoji}</span>}
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none ${
                active ? "bg-white/25 text-white" : "bg-gray-200/70 text-gray-500"
              }`}>{t.count}</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ============================================================
// بطاقة قسم كبيرة
// ============================================================
function BigCategoryCard({ cat, index, productCount, onClick }) {
  const [c1, c2] = CAT_GRADIENTS[index % CAT_GRADIENTS.length];
  return (
    <motion.button onClick={onClick}
      initial={{ opacity: 0, y: 40, scale: 0.88 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 240, damping: 22 }}
      whileTap={{ scale: 0.92 }}
      className="relative rounded-3xl overflow-hidden aspect-square w-full group"
      style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}
    >
      {cat.image_url ? (
        <img src={cat.image_url} alt={cat.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-active:scale-110"
          loading="lazy" />
      ) : (
        <div className="absolute inset-0 transition-transform duration-700 group-active:scale-110"
          style={{ background: `linear-gradient(145deg, ${c1}, ${c2})` }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl drop-shadow-lg opacity-90">{cat.icon || "🍽️"}</span>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />

      {productCount > 0 && (
        <div className="absolute top-3 right-3">
          <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
            {productCount} منتج
          </div>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 p-4">
        <p className="text-white font-black text-[17px] leading-tight drop-shadow-md text-right">{cat.name}</p>
      </div>
    </motion.button>
  );
}

// ============================================================
// بطاقة عروض / مميز
// ============================================================
function SpecialCard({ emoji, title, subtitle, gradient, onClick, index = 0 }) {
  return (
    <motion.button onClick={onClick}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 260, damping: 22 }}
      whileTap={{ scale: 0.96 }}
      className="relative w-full rounded-3xl overflow-hidden h-[90px]"
      style={{ background: gradient, boxShadow: "0 6px 25px rgba(0,0,0,0.18)" }}>
      <div className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(circle at 80% 50%, white 0%, transparent 55%)" }} />
      <div className="relative h-full flex items-center justify-between px-5">
        <div className="text-right">
          <p className="text-white font-black text-[17px] leading-tight">{title}</p>
          <p className="text-white/70 text-[12px] mt-0.5">{subtitle}</p>
        </div>
        <span className="text-5xl opacity-85 ml-2">{emoji}</span>
      </div>
    </motion.button>
  );
}

// ============================================================
// بطاقة منتج
// ============================================================
function ProductCard({ product, onTap, currency, color, index = 0, formatPrice = String }) {
  const hasOffer = product.is_offer && product.offer_price;
  const price    = hasOffer ? product.offer_price : product.price;
  const discount = hasOffer ? Math.round((1 - product.offer_price / product.price) * 100) : 0;

  return (
    <motion.div
      onClick={() => product.is_available !== false && onTap(product)}
      initial={{ opacity: 0, y: 20, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.045, type: "spring", stiffness: 300, damping: 26 }}
      whileTap={{ scale: product.is_available !== false ? 0.95 : 1 }}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer group"
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img src={product.image || DEFAULT_PRODUCT} alt={product.name} loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-active:scale-110"
          onError={e => { e.target.src = DEFAULT_PRODUCT; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

        {hasOffer && (
          <div className="absolute top-2.5 right-2.5 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg">
            -{discount}%
          </div>
        )}
        {product.is_featured && !hasOffer && (
          <div className="absolute top-2.5 right-2.5 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1"
            style={{ backgroundColor: color }}>
            <Star className="w-2.5 h-2.5 fill-white" /> مميز
          </div>
        )}

        {product.is_available !== false ? (
          <div className="absolute bottom-2.5 left-2.5 w-8 h-8 rounded-full flex items-center justify-center shadow-xl"
            style={{ backgroundColor: color }}>
            <Plus className="w-4 h-4 text-white" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-white/95 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full shadow">غير متوفر</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">{product.name}</p>
        {product.description && (
          <p className="text-gray-400 text-[11px] line-clamp-1 mt-0.5">{product.description}</p>
        )}
        <div className="flex items-end justify-between mt-2">
          <div>
            <span className="font-black text-base" style={{ color }}>{formatPrice(price)}</span>
            <span className="text-gray-400 text-[10px] mr-1">{currency}</span>
          </div>
          {hasOffer && (
            <span className="text-gray-400 text-[11px] line-through">{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// مودال تفاصيل المنتج — Bottom Sheet
// ============================================================
function ProductModal({ product, onClose, onAdd, currency, color, formatPrice = String }) {
  const [qty, setQty]       = useState(1);
  const [added, setAdded]   = useState(false);

  const variantGroups = useMemo(() => {
    try { return JSON.parse(product?.variants || "[]"); } catch { return []; }
  }, [product?.variants]);

  const [selections, setSelections] = useState({});

  const variantTotal = useMemo(() => variantGroups.reduce((sum, group, gi) => {
    const sel = selections[gi];
    if (sel === undefined || sel === null) return sum;
    const indices = Array.isArray(sel) ? sel : [sel];
    return sum + indices.reduce((s, oi) => s + (group.options[oi]?.price || 0), 0);
  }, 0), [selections, variantGroups]);

  const canAdd   = product?.is_available !== false && variantGroups.every((g, gi) => !g.required || selections[gi] !== undefined);
  const hasOffer = product?.is_offer && product?.offer_price;
  const basePrice = hasOffer ? product?.offer_price : product?.price;
  const discount  = hasOffer ? Math.round((1 - product.offer_price / product.price) * 100) : 0;

  const handleAdd = () => {
    if (!canAdd) return;
    const variantMap = {};
    variantGroups.forEach((g, gi) => {
      const sel = selections[gi];
      if (sel === undefined) return;
      const indices = Array.isArray(sel) ? sel : [sel];
      const names   = indices.map(oi => g.options[oi]?.name).filter(Boolean);
      variantMap[g.name] = g.multiSelect ? names : (names[0] || "");
    });
    onAdd(product, variantMap, variantTotal, qty);
    setAdded(true);
    setTimeout(() => { setAdded(false); onClose(); }, 900);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50"
        onClick={onClose} />

      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-[32px] overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* صورة */}
        <div className="relative mx-4 rounded-2xl overflow-hidden" style={{ height: 220 }}>
          <img src={product?.image || DEFAULT_PRODUCT} alt={product?.name}
            className="w-full h-full object-cover" onError={e => { e.target.src = DEFAULT_PRODUCT; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {hasOffer && (
            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
              خصم {discount}%
            </div>
          )}
          {product?.is_featured && !hasOffer && (
            <div className="absolute top-3 right-3 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5"
              style={{ backgroundColor: color }}>
              <Star className="w-3 h-3 fill-white" /> الأكثر طلباً
            </div>
          )}
          <button onClick={onClose}
            className="absolute top-3 left-3 w-9 h-9 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* محتوى */}
        <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 290px)" }}>
          <h2 className="font-black text-gray-900 text-xl leading-tight mb-1">{product?.name}</h2>
          {product?.description && (
            <p className="text-gray-500 text-sm leading-relaxed mb-3">{product.description}</p>
          )}

          {/* السعر */}
          <div className="flex items-center gap-3 mb-4">
            <motion.span key={basePrice + variantTotal}
              initial={{ scale: 1.1 }} animate={{ scale: 1 }}
              className="font-black text-3xl" style={{ color }}>
              {formatPrice(basePrice + variantTotal)}
            </motion.span>
            <span className="text-gray-500 text-sm">{currency}</span>
            {hasOffer && (
              <span className="text-gray-400 text-base line-through mr-auto">
                {formatPrice(product?.price)} {currency}
              </span>
            )}
          </div>

          {/* خيارات المتغيرات */}
          {variantGroups.length > 0 && (
            <div className="space-y-4 mb-5">
              {variantGroups.map((group, gi) => (
                <div key={gi}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <p className="font-bold text-sm text-gray-800">{group.name}</p>
                    {group.required && (
                      <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full font-bold">مطلوب</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((opt, oi) => {
                      const isSelected = group.multiSelect
                        ? Array.isArray(selections[gi]) && selections[gi].includes(oi)
                        : selections[gi] === oi;
                      return (
                        <motion.button key={oi} type="button" whileTap={{ scale: 0.91 }}
                          onClick={() => {
                            if (group.multiSelect) {
                              setSelections(prev => {
                                const cur  = Array.isArray(prev[gi]) ? prev[gi] : [];
                                const next = isSelected ? cur.filter(i => i !== oi) : [...cur, oi];
                                return { ...prev, [gi]: next.length ? next : undefined };
                              });
                            } else {
                              setSelections(prev => ({ ...prev, [gi]: oi }));
                            }
                            haptic([8]);
                          }}
                          className="px-3.5 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all"
                          style={isSelected
                            ? { backgroundColor: color, borderColor: color, color: "white" }
                            : { borderColor: "#e5e7eb", color: "#4b5563" }
                          }
                        >
                          {opt.name}{opt.price > 0 ? ` +${formatPrice(opt.price)}` : ""}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!product?.is_available && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm font-bold px-4 py-2.5 rounded-xl mb-4 text-center">
              هذا المنتج غير متوفر حالياً
            </div>
          )}

          {product?.is_available !== false && (
            <div className="flex items-center gap-4">
              {/* الكمية */}
              <div className="flex items-center gap-4 bg-gray-100 rounded-2xl px-5 py-3">
                <motion.button whileTap={{ scale: 0.78 }} onClick={() => { setQty(q => Math.max(1, q - 1)); haptic([6]); }}
                  className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
                  <Minus className="w-4 h-4 text-gray-700" />
                </motion.button>
                <motion.span key={qty} initial={{ scale: 1.5 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                  className="font-black text-xl w-7 text-center text-gray-900">{qty}</motion.span>
                <motion.button whileTap={{ scale: 0.78 }} onClick={() => { setQty(q => q + 1); haptic([6]); }}
                  className="w-8 h-8 rounded-full flex items-center justify-center shadow"
                  style={{ backgroundColor: color }}>
                  <Plus className="w-4 h-4 text-white" />
                </motion.button>
              </div>

              {/* زر الإضافة */}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleAdd}
                className="flex-1 py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2"
                style={{
                  backgroundColor: added ? "#22c55e" : canAdd ? color : "#9ca3af",
                  boxShadow: `0 4px 20px ${added ? "#22c55e" : canAdd ? color : "#9ca3af"}55`,
                  transition: "background-color 0.25s",
                }}>
                <AnimatePresence mode="wait" initial={false}>
                  {added ? (
                    <motion.span key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="flex items-center gap-2">
                      <Check className="w-5 h-5" /> تمت الإضافة ✓
                    </motion.span>
                  ) : (
                    <motion.span key="add" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      {canAdd || variantGroups.length === 0
                        ? `أضف · ${formatPrice((basePrice + variantTotal) * qty)} ${currency}`
                        : "اختر الخيارات أولاً"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          )}
        </div>
        <div className="h-7" />
      </motion.div>
    </>
  );
}

// ============================================================
// Skeleton
// ============================================================
function Skeleton({ index = 0 }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.04 }}
      className="bg-white rounded-2xl overflow-hidden animate-pulse" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <div className="aspect-square bg-gray-200/80" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded-lg w-3/4" />
        <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
        <div className="h-4 bg-gray-200 rounded-lg w-1/3" />
      </div>
    </motion.div>
  );
}

// ============================================================
// الشاشة الرئيسية
// ============================================================
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
    enabled: !!bid,
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("*").eq("id", bid).single();
      return data;
    },
  });

  const primaryHex = HEX_MAP[biz?.primary_color] || "#e8820c";
  useEffect(() => {
    document.documentElement.style.setProperty("--primary", biz?.primary_color || "32 85% 48%");
  }, [biz?.primary_color]);

  const cafeName  = biz?.name         || "المنيو";
  const heroImg   = biz?.hero_image   || DEFAULT_HERO;
  const tagline   = biz?.menu_tagline || "";
  const hasSocial = biz?.instagram_url || biz?.twitter_url || biz?.snapchat_url || biz?.tiktok_url || biz?.whatsapp;

  // عملة مزدوجة
  const hasDualCurrency = !!(biz?.currency_dual && biz?.currency_rate && biz?.currency_alt_symbol);
  const [useAltCurrency, setUseAltCurrency] = useState(false);
  const mainSymbol = biz?.currency || "ر.س";
  const altSymbol  = biz?.currency_alt_symbol || "";
  const altRate    = biz?.currency_rate || 1;
  const currency   = useAltCurrency ? altSymbol : mainSymbol;

  const isOpen = useMemo(() => {
    if (!biz?.opening_time || !biz?.closing_time) return true;
    const toMins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const now       = new Date();
    const nowMins   = now.getHours() * 60 + now.getMinutes();
    const openMins  = toMins(biz.opening_time);
    const closeMins = toMins(biz.closing_time);
    if (closeMins < openMins) return nowMins >= openMins || nowMins < closeMins;
    return nowMins >= openMins && nowMins < closeMins;
  }, [biz?.opening_time, biz?.closing_time]);

  const fmtPrice = (raw) => {
    if (!raw && raw !== 0) return "0";
    const val = useAltCurrency ? raw / altRate : raw;
    if (val >= 1000) return val.toLocaleString("ar-SA", { maximumFractionDigits: 0 });
    return val % 1 === 0 ? String(val) : val.toFixed(2);
  };

  // حالة التصفح
  const [view, setView]           = useState("home");   // "home" | "browse"
  const [browseTab, setBrowseTab] = useState(null);     // catId | "offers" | "featured"
  const [search, setSearch]       = useState("");
  const [cart, setCart]           = useState([]);
  const [cartOpen, setCartOpen]   = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const [addedToast, setAddedToast] = useState(null);
  const [notifSent, setNotifSent]   = useState(null);
  const [modalProduct, setModalProduct] = useState(null);
  const menuRef = useRef(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", bid],
    enabled: !!bid,
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*")
        .eq("business_id", bid).order("sort_order");
      return data || [];
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", bid],
    enabled: !!bid,
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("business_id", bid);
      return data || [];
    },
  });

  const catIndex = useMemo(() => {
    const map = {};
    categories.forEach((c, i) => { map[c.id] = i; map[c.name] = i; });
    return map;
  }, [categories]);

  const offers   = useMemo(() => products.filter(p => p.is_offer && p.is_available !== false),   [products]);
  const featured = useMemo(() => products.filter(p => p.is_featured && p.is_available !== false), [products]);

  // tabs للعرض في browse mode
  const tabs = useMemo(() => [
    ...(offers.length   > 0 ? [{ id: "offers",   label: "عروض",   emoji: "🔥", count: offers.length   }] : []),
    ...(featured.length > 0 ? [{ id: "featured", label: "مميز",   emoji: "⭐", count: featured.length }] : []),
    ...categories.map(c => ({
      id:    c.id,
      label: c.name,
      emoji: c.icon || null,
      count: products.filter(p => (p.category === c.name || p.category === c.id) && p.is_available !== false).length,
    })),
  ], [offers, featured, categories, products]);

  // المنتجات المرئية
  const visibleProducts = useMemo(() => {
    if (search) {
      return products.filter(p =>
        p.name?.includes(search) || p.name_en?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (view !== "browse" || !browseTab) return [];
    if (browseTab === "offers")   return offers;
    if (browseTab === "featured") return featured;
    const cat = categories.find(c => c.id === browseTab);
    if (!cat) return [];
    return products.filter(p => p.category === cat.name || p.category === cat.id);
  }, [products, offers, featured, categories, view, browseTab, search]);

  const activeCat    = view === "browse" && browseTab && browseTab !== "offers" && browseTab !== "featured"
    ? categories.find(c => c.id === browseTab) : null;
  const activeCatIdx = activeCat ? (catIndex[activeCat.id] ?? 0) : 0;

  const goBrowse = (tab) => { setView("browse"); setBrowseTab(tab); setSearch(""); };
  const goHome   = () => { setView("home"); setBrowseTab(null); setSearch(""); };

  const addToCart = (product, variants = {}, variantPrice = 0, qty = 1) => {
    snd.add();
    speak("أُضيف", 1.0);
    haptic([15]);
    setCartPulse(true);
    setTimeout(() => setCartPulse(false), 600);
    setAddedToast(product.name);
    setTimeout(() => setAddedToast(null), 2200);
    const cartKey = `${product.id}__${JSON.stringify(variants)}`;
    setCart(prev => {
      const ex = prev.find(i => i.cartKey === cartKey);
      if (ex) return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { cartKey, product, quantity: qty, variants, variantPrice }];
    });
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => {
    const p = i.product.is_offer && i.product.offer_price ? i.product.offer_price : i.product.price;
    return s + (p + (i.variantPrice || 0)) * i.quantity;
  }, 0);

  const sendNotif = useMutation({
    mutationFn: (type) => db.entities.ServiceRequest.create({
      table_number: parseInt(tableNumber), table_name: tableName,
      table_type: tableType, type, status: "pending",
    }),
    onSuccess: (_, type) => {
      snd.ping();
      haptic([30, 20, 30]);
      setNotifSent(type);
      setTimeout(() => setNotifSent(null), 3500);
    },
  });

  const showProducts = !!search || view === "browse";
  const browseSectionTitle = search
    ? `نتائج "${search}"`
    : browseTab === "offers"   ? "عروض اليوم 🔥"
    : browseTab === "featured" ? "الأكثر طلباً ⭐"
    : activeCat?.name || "";

  return (
    <div className="min-h-screen bg-[#f2f2f7]" dir="rtl">

      {/* ======================================= HERO ======================================= */}
      <section className="relative min-h-[100svh] flex flex-col overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="w-full h-full object-cover"
            style={{ animation: "kb 26s ease-in-out infinite alternate" }}
            onError={e => { e.target.src = DEFAULT_HERO; }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/45 to-black/85" />
        </div>
        <style>{`@keyframes kb{from{transform:scale(1.04)}to{transform:scale(1.14) translate(-1%,-1%)}}`}</style>

        <div className="relative flex-1 flex flex-col items-center justify-center text-center px-5 pt-20 pb-10">
          {/* لوغو */}
          <motion.div initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.05 }} className="mb-6">
            {biz?.logo_url ? (
              <div className="relative inline-block">
                <div className="absolute -inset-4 rounded-full blur-3xl opacity-60" style={{ background: primaryHex }} />
                <img src={biz.logo_url} alt={cafeName}
                  className="relative w-28 h-28 rounded-full object-cover border-[3px] border-white/80 shadow-2xl"
                  onError={e => e.target.style.display = "none"} />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-xl border-2 border-white/25 flex items-center justify-center text-5xl shadow-2xl">☕</div>
            )}
          </motion.div>

          <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.18, type: "spring", stiffness: 180 }}
            className="text-5xl font-black text-white tracking-tight mb-2 drop-shadow-lg">
            {cafeName}
          </motion.h1>

          {tagline && (
            <motion.p initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.26 }}
              className="text-white/65 text-sm mb-5 font-light max-w-xs">{tagline}</motion.p>
          )}

          {/* طاولة badge */}
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.32 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl text-white text-sm font-bold mb-6 shadow-lg">
            <span className="text-lg">{tableType === "room" ? "🎮" : "🍽️"}</span>
            {tableName}
          </motion.div>

          {/* معلومات */}
          {(biz?.opening_time || biz?.address || biz?.phone) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
              className="flex flex-wrap justify-center gap-2 mb-5">
              {biz?.opening_time && (
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/70 text-[11px] px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <Clock className="w-3 h-3" />{biz.opening_time} – {biz.closing_time}
                </span>
              )}
              {biz?.address && (
                <span className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/70 text-[11px] px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <MapPin className="w-3 h-3" />{biz.address}
                </span>
              )}
              {biz?.phone && (
                <a href={`tel:${biz.phone}`} className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white/70 text-[11px] px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <Phone className="w-3 h-3" />{biz.phone}
                </a>
              )}
            </motion.div>
          )}

          {/* سوشل */}
          {hasSocial && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
              className="flex items-center gap-2.5 mb-8">
              <SocialBtn url={biz?.instagram_url} icon={IGIcon}   label="Instagram" cls="bg-gradient-to-br from-purple-500 to-pink-500 text-white" />
              <SocialBtn url={biz?.twitter_url}   icon={XIcon}    label="X"         cls="bg-black text-white" />
              <SocialBtn url={biz?.snapchat_url}  icon={SnapIcon} label="Snapchat"  cls="bg-yellow-400 text-black" />
              <SocialBtn url={biz?.tiktok_url}    icon={TKIcon}   label="TikTok"    cls="bg-black text-white" />
              {biz?.whatsapp && (
                <SocialBtn url={`https://wa.me/${biz.whatsapp.replace(/\D/g,"")}`} icon={WAIcon} label="WhatsApp" cls="bg-green-500 text-white" />
              )}
            </motion.div>
          )}

          {/* أزرار الخدمة */}
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="w-full max-w-xs space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { type: "call_waiter",  label: "استدعاء موظف", icon: <Bell className="w-4 h-4" /> },
                { type: "request_bill", label: "طلب الحساب",   icon: <Receipt className="w-4 h-4" /> },
              ].map(({ type, label, icon }) => (
                <motion.button key={type} whileTap={{ scale: 0.93 }}
                  onClick={() => sendNotif.mutate(type)}
                  disabled={sendNotif.isPending || notifSent === type}
                  className="flex items-center justify-center gap-1.5 py-3.5 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl text-white text-[13px] font-semibold disabled:opacity-50 transition-all">
                  {icon}
                  {notifSent === type ? "✓ تم الإرسال" : label}
                </motion.button>
              ))}
            </div>

            <motion.button whileTap={{ scale: 0.97 }}
              onClick={() => menuRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="w-full py-4 rounded-2xl font-black text-white text-base flex items-center justify-center gap-2.5 shadow-2xl"
              style={{ backgroundColor: primaryHex, boxShadow: `0 10px 35px ${primaryHex}65` }}>
              <ShoppingCart className="w-5 h-5" />
              استعرض المنيو
              <motion.span animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
                <ChevronDown className="w-4 h-4" />
              </motion.span>
            </motion.button>
          </motion.div>
        </div>

        {/* scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
          className="relative flex justify-center pb-7">
          <motion.div animate={{ y: [0, 9, 0] }} transition={{ repeat: Infinity, duration: 2.3 }}
            className="w-5 h-9 rounded-full border-2 border-white/30 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2.5 rounded-full bg-white/50" />
          </motion.div>
        </motion.div>

        {/* تأكيد الإشعار */}
        <AnimatePresence>
          {notifSent && (
            <motion.div initial={{ opacity: 0, y: -50, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.85 }}
              className="absolute top-5 inset-x-5 z-30 bg-green-500 text-white py-4 px-5 rounded-2xl font-bold text-sm shadow-2xl flex items-center justify-center gap-2">
              <Check className="w-5 h-5" />
              {notifSent === "call_waiter" ? "تم إرسال طلب الموظف ✓" : "تم إرسال طلب الحساب ✓"}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ======================================= MENU ======================================= */}
      <section ref={menuRef}>

        {/* شريط المغلق */}
        {!isOpen && (
          <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-center gap-2 text-sm font-bold">
            <Clock className="w-4 h-4 text-amber-400" />
            المحل مغلق حالياً
            {biz?.opening_time && <span className="text-gray-400">· يفتح {biz.opening_time}</span>}
          </div>
        )}

        {/* ========= الهيدر الثابت ========= */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-2xl border-b border-gray-100"
          style={{ boxShadow: "0 1px 20px rgba(0,0,0,0.06)" }}>

          {/* صف البحث */}
          <div className="flex items-center gap-2 px-4 py-2.5">
            <AnimatePresence>
              {(view === "browse" || !!search) && (
                <motion.button
                  initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                  animate={{ opacity: 1, width: 36, marginLeft: 0 }}
                  exit={{ opacity: 0, width: 0 }}
                  onClick={goHome}
                  className="shrink-0 w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </motion.button>
              )}
            </AnimatePresence>

            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text" value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  if (e.target.value) setView("browse");
                }}
                placeholder={view === "browse" && !search && browseSectionTitle ? browseSectionTitle : "ابحث في المنيو..."}
                dir="rtl"
                className="w-full h-10 pr-10 pl-9 text-sm rounded-xl bg-gray-100/80 border-0 outline-none transition-all"
                style={{ boxShadow: search ? `0 0 0 2px ${primaryHex}40` : undefined }}
              />
              <AnimatePresence>
                {search && (
                  <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    onClick={() => setSearch("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* tabs الأقسام */}
          <AnimatePresence>
            {view === "browse" && !search && tabs.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                <CategoryTabs tabs={tabs} activeId={browseTab} onSelect={setBrowseTab} color={primaryHex} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ========= المحتوى ========= */}
        <div className="pb-36">
          <AnimatePresence mode="wait">

            {/* ---- شبكة الأقسام (Home) ---- */}
            {!showProducts && (
              <motion.div key="home"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="px-4 pt-5 space-y-3">

                {isLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                        className="aspect-square rounded-3xl bg-gray-200 animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <>
                    {offers.length > 0 && (
                      <SpecialCard index={0} emoji="🔥" title="عروض اليوم" subtitle={`${offers.length} عرض متاح`}
                        gradient="linear-gradient(135deg, #ff6b35, #e8020d)"
                        onClick={() => { goBrowse("offers"); haptic([10]); }} />
                    )}
                    {featured.length > 0 && (
                      <SpecialCard index={1} emoji="⭐" title="الأكثر طلباً" subtitle={`${featured.length} منتج مميز`}
                        gradient={`linear-gradient(135deg, ${primaryHex}, ${primaryHex}aa)`}
                        onClick={() => { goBrowse("featured"); haptic([10]); }} />
                    )}

                    {categories.length > 0 && (
                      <div className="grid grid-cols-2 gap-3">
                        {categories.map((cat, i) => {
                          const count = products.filter(p =>
                            p.category === cat.name || p.category === cat.id
                          ).length;
                          return (
                            <BigCategoryCard key={cat.id} cat={cat} index={i}
                              productCount={count}
                              onClick={() => { goBrowse(cat.id); haptic([10]); }} />
                          );
                        })}
                      </div>
                    )}

                    {!isLoading && categories.length === 0 && products.length === 0 && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="text-center py-28">
                        <p className="text-7xl mb-5">☕</p>
                        <p className="font-black text-gray-500 text-xl">لا توجد منتجات بعد</p>
                        <p className="text-gray-400 text-sm mt-2">سيتم إضافة المنيو قريباً</p>
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* ---- قائمة المنتجات (Browse / Search) ---- */}
            {showProducts && (
              <motion.div key={`browse-${browseTab}-${search}`}
                initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ type: "spring", stiffness: 340, damping: 30 }}>

                {/* بانر القسم المحدد */}
                {activeCat && !search && (() => {
                  const [c1, c2] = CAT_GRADIENTS[activeCatIdx % CAT_GRADIENTS.length];
                  return (
                    <div className="relative mx-4 mt-4 mb-2 h-[72px] rounded-2xl overflow-hidden"
                      style={{ background: activeCat.image_url ? undefined : `linear-gradient(135deg, ${c1}, ${c2})` }}>
                      {activeCat.image_url && (
                        <>
                          <img src={activeCat.image_url} className="absolute inset-0 w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-black/40" />
                        </>
                      )}
                      <div className="absolute inset-0 flex items-center px-4 gap-3">
                        <span className="text-3xl">{activeCat.icon || "🍽️"}</span>
                        <div>
                          <p className="text-white font-black text-lg drop-shadow">{activeCat.name}</p>
                          {activeCat.description && <p className="text-white/70 text-xs">{activeCat.description}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="px-4 pt-4">
                  {isLoading ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[...Array(6)].map((_, i) => <Skeleton key={i} index={i} />)}
                    </div>
                  ) : visibleProducts.length === 0 ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      className="text-center py-24">
                      <p className="text-6xl mb-4">🔍</p>
                      <p className="font-black text-gray-600 text-xl">لا توجد نتائج</p>
                      <p className="text-gray-400 text-sm mt-2">جرب كلمة بحث مختلفة</p>
                    </motion.div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {visibleProducts.map((p, i) => (
                        <ProductCard key={`${p.id}-${browseTab}`} product={p} index={i}
                          onTap={setModalProduct}
                          currency={currency} color={primaryHex}
                          formatPrice={fmtPrice} />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ======= FOOTER ======= */}
        <footer className="bg-gray-950 text-white overflow-hidden">
          <div className="h-[3px]" style={{ background: `linear-gradient(90deg,transparent,${primaryHex},transparent)` }} />
          <div className="max-w-sm mx-auto px-6 py-10 text-center">
            <div className="flex flex-col items-center gap-3 mb-7">
              {biz?.logo_url
                ? <img src={biz.logo_url} alt={cafeName} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10" onError={e => e.target.style.display="none"} />
                : <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">☕</div>
              }
              <div>
                <p className="font-black text-xl">{cafeName}</p>
                {tagline && <p className="text-gray-500 text-sm mt-0.5">{tagline}</p>}
              </div>
            </div>

            {biz?.google_review_url && (
              <a href={biz.google_review_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 bg-white text-gray-900 font-bold px-6 py-3 rounded-2xl mb-6 active:scale-95 transition-all shadow-xl">
                <span className="text-yellow-400 tracking-widest text-sm">★★★★★</span>
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
              <p className="text-gray-600 text-[11px]">© {new Date().getFullYear()} {cafeName} · مدعوم بـ<span className="font-bold" style={{ color: primaryHex }}> المنيو الذكي</span></p>
            </div>
          </div>
        </footer>
      </section>

      {/* ======= زر السلة العائم ======= */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-6 inset-x-4 z-40">
            <motion.button
              animate={cartPulse ? { scale: [1, 1.06, 0.97, 1.03, 1] } : { scale: 1 }}
              transition={{ duration: 0.45, type: "spring" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCartOpen(true)}
              className="w-full h-[58px] rounded-[18px] text-white font-bold flex items-center justify-between px-5"
              style={{ backgroundColor: primaryHex, boxShadow: `0 10px 36px ${primaryHex}65` }}>
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5" />
                <span className="font-black text-base">عرض السلة</span>
              </div>
              <div className="flex items-center gap-3">
                <motion.span key={cartCount} initial={{ scale: 1.8 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500 }}
                  className="bg-white/25 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                  {cartCount}
                </motion.span>
                <span className="font-black">{fmtPrice(cartTotal)} {currency}</span>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======= تنبيه الإضافة ======= */}
      <AnimatePresence>
        {addedToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.93 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
            className="fixed bottom-[84px] inset-x-8 z-40 flex justify-center pointer-events-none">
            <div className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-sm font-bold shadow-2xl max-w-xs text-center"
              style={{ backgroundColor: primaryHex }}>
              <Check className="w-4 h-4 shrink-0" />
              <span className="line-clamp-1">أُضيف: {addedToast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======= مودال المنتج ======= */}
      <AnimatePresence>
        {modalProduct && (
          <ProductModal
            product={modalProduct}
            onClose={() => setModalProduct(null)}
            onAdd={addToCart}
            currency={currency}
            color={primaryHex}
            formatPrice={fmtPrice}
          />
        )}
      </AnimatePresence>

      {/* ======= السلة ======= */}
      <CartSheet
        open={cartOpen} onOpenChange={setCartOpen}
        cart={cart} setCart={setCart}
        tableNumber={tableNumber} tableType={tableType} tableName={tableName}
        currency={currency} formatPrice={fmtPrice} color={primaryHex}
      />

      {/* ======= زر تبديل العملة ======= */}
      <AnimatePresence>
        {hasDualCurrency && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setUseAltCurrency(v => !v)}
            className="fixed bottom-24 left-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl font-bold text-sm"
            style={{
              backgroundColor: useAltCurrency ? "#16a34a" : primaryHex,
              color: "white",
              boxShadow: `0 4px 20px ${useAltCurrency ? "#16a34a" : primaryHex}55`,
            }}
          >
            <motion.span
              key={useAltCurrency ? "alt" : "main"}
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {useAltCurrency ? altSymbol : mainSymbol}
              <span className="opacity-70 text-[11px]">← {useAltCurrency ? mainSymbol : altSymbol}</span>
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

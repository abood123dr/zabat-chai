import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import db, { setCurrentBusinessId, supabase } from "@/api/supabaseClient";
import { Search, ShoppingCart, Bell, Receipt, Plus, X, Check, Star, ChevronLeft, Minus, ArrowLeftRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CartSheet from "../components/customer/CartSheet";

// ============================================================
// أدوات مساعدة
// ============================================================
const sndAdd = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
};

const haptic = (p = [10]) => { try { navigator.vibrate?.(p); } catch {} };

const speak = (text) => {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-SA"; u.rate = 1.0; u.pitch = 1.08; u.volume = 0.85;
    window.speechSynthesis.speak(u);
  } catch {}
};

const DEFAULT_HERO    = "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1400&q=90";
const DEFAULT_PRODUCT = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80";

const HEX_MAP = {
  "32 85% 48%":  "#e8820c", "217 91% 60%": "#3b82f6",
  "142 76% 36%": "#16a34a", "271 91% 65%": "#a855f7",
  "330 81% 60%": "#ec4899", "0 84% 60%":   "#ef4444",
  "173 80% 40%": "#0d9488", "45 93% 47%":  "#eab308",
};

// ============================================================
// تبويبات الأقسام
// ============================================================
function CategoryTabs({ tabs, activeId, onSelect, color }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.querySelector(`[data-id="${activeId}"]`)
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeId]);

  return (
    <div ref={ref} className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1" style={{ scrollbarWidth: "none" }}>
      {tabs.map(t => {
        const active = t.id === activeId;
        return (
          <button key={t.id} data-id={t.id}
            onClick={() => onSelect(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap shrink-0 transition-colors"
            style={active
              ? { backgroundColor: color, color: "#fff" }
              : { backgroundColor: "#f3f4f6", color: "#6b7280" }
            }>
            {t.emoji && <span className="text-[15px] leading-none">{t.emoji}</span>}
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                active ? "bg-white/25 text-white" : "bg-gray-200/70 text-gray-500"
              }`}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// بطاقة منتج
// ============================================================
function ProductCard({ product, onTap, currency, color, formatPrice = String }) {
  const hasOffer = product.is_offer && product.offer_price;
  const price    = hasOffer ? product.offer_price : product.price;
  const discount = hasOffer ? Math.round((1 - product.offer_price / product.price) * 100) : 0;
  const unavailable = product.is_available === false;

  return (
    <motion.div
      onClick={() => !unavailable && onTap(product)}
      whileTap={{ scale: unavailable ? 1 : 0.96 }}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer"
      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img src={product.image || DEFAULT_PRODUCT} alt={product.name} loading="lazy"
          className="w-full h-full object-cover"
          onError={e => { e.target.src = DEFAULT_PRODUCT; }} />

        {hasOffer && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            -{discount}%
          </div>
        )}
        {product.is_featured && !hasOffer && (
          <div className="absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
            style={{ backgroundColor: color }}>
            <Star className="w-2.5 h-2.5 fill-white" /> مميز
          </div>
        )}

        {unavailable ? (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-800 text-xs font-bold px-3 py-1 rounded-full">غير متوفر</span>
          </div>
        ) : (
          <div className="absolute bottom-2 left-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: color }}>
            <Plus className="w-3.5 h-3.5 text-white" />
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">{product.name}</p>
        <div className="flex items-center justify-between mt-1.5">
          <div>
            <span className="font-black text-sm" style={{ color }}>{formatPrice(price)}</span>
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
// مودال تفاصيل المنتج
// ============================================================
function ProductModal({ product, onClose, onAdd, currency, color, formatPrice = String }) {
  const [qty, setQty]         = useState(1);
  const [added, setAdded]     = useState(false);
  const [selections, setSelections] = useState({});

  const variantGroups = useMemo(() => {
    try { return JSON.parse(product?.variants || "[]"); } catch { return []; }
  }, [product?.variants]);

  const variantTotal = useMemo(() => variantGroups.reduce((sum, group, gi) => {
    const sel = selections[gi];
    if (sel === undefined) return sum;
    const idx = Array.isArray(sel) ? sel : [sel];
    return sum + idx.reduce((s, oi) => s + (group.options[oi]?.price || 0), 0);
  }, 0), [selections, variantGroups]);

  const hasOffer  = product?.is_offer && product?.offer_price;
  const basePrice = hasOffer ? product?.offer_price : product?.price;
  const canAdd    = product?.is_available !== false &&
    variantGroups.every((g, gi) => !g.required || selections[gi] !== undefined);

  const handleAdd = () => {
    if (!canAdd) return;
    const variantMap = {};
    variantGroups.forEach((g, gi) => {
      const sel = selections[gi];
      if (sel === undefined) return;
      const idx = Array.isArray(sel) ? sel : [sel];
      variantMap[g.name] = g.multiSelect ? idx.map(i => g.options[i]?.name) : (g.options[sel]?.name || "");
    });
    onAdd(product, variantMap, variantTotal, qty);
    setAdded(true);
    setTimeout(() => { setAdded(false); onClose(); }, 800);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />

      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-[28px] overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* صورة */}
        <div className="relative mx-4 rounded-2xl overflow-hidden" style={{ height: 200 }}>
          <img src={product?.image || DEFAULT_PRODUCT} alt={product?.name}
            className="w-full h-full object-cover" onError={e => { e.target.src = DEFAULT_PRODUCT; }} />
          {hasOffer && (
            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              خصم {Math.round((1 - product.offer_price / product.price) * 100)}%
            </div>
          )}
          <button onClick={onClose}
            className="absolute top-3 left-3 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* محتوى */}
        <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: "calc(90vh - 260px)" }}>
          <h2 className="font-black text-gray-900 text-xl mb-1">{product?.name}</h2>
          {product?.description && (
            <p className="text-gray-500 text-sm mb-3">{product.description}</p>
          )}

          <div className="flex items-baseline gap-2 mb-4">
            <span className="font-black text-3xl" style={{ color }}>
              {formatPrice(basePrice + variantTotal)}
            </span>
            <span className="text-gray-400 text-sm">{currency}</span>
            {hasOffer && (
              <span className="text-gray-400 text-sm line-through mr-auto">
                {formatPrice(product?.price)}
              </span>
            )}
          </div>

          {/* خيارات */}
          {variantGroups.map((group, gi) => (
            <div key={gi} className="mb-4">
              <p className="font-bold text-sm text-gray-800 mb-2">
                {group.name}
                {group.required && <span className="text-red-500 text-[10px] mr-1">*مطلوب</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.options.map((opt, oi) => {
                  const isSelected = group.multiSelect
                    ? Array.isArray(selections[gi]) && selections[gi].includes(oi)
                    : selections[gi] === oi;
                  return (
                    <button key={oi} type="button"
                      onClick={() => {
                        haptic([8]);
                        if (group.multiSelect) {
                          setSelections(prev => {
                            const cur  = Array.isArray(prev[gi]) ? prev[gi] : [];
                            const next = isSelected ? cur.filter(i => i !== oi) : [...cur, oi];
                            return { ...prev, [gi]: next.length ? next : undefined };
                          });
                        } else {
                          setSelections(prev => ({ ...prev, [gi]: oi }));
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-sm font-semibold border-2 transition-all"
                      style={isSelected
                        ? { backgroundColor: color, borderColor: color, color: "#fff" }
                        : { borderColor: "#e5e7eb", color: "#4b5563" }
                      }>
                      {opt.name}{opt.price > 0 ? ` +${formatPrice(opt.price)}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {product?.is_available !== false && (
            <div className="flex items-center gap-3">
              {/* الكمية */}
              <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-2.5">
                <button onClick={() => { setQty(q => Math.max(1, q - 1)); haptic([6]); }}
                  className="w-7 h-7 rounded-full bg-white shadow flex items-center justify-center">
                  <Minus className="w-3.5 h-3.5 text-gray-700" />
                </button>
                <span className="font-black text-lg w-6 text-center">{qty}</span>
                <button onClick={() => { setQty(q => q + 1); haptic([6]); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: color }}>
                  <Plus className="w-3.5 h-3.5 text-white" />
                </button>
              </div>

              {/* زر الإضافة */}
              <button onClick={handleAdd}
                className="flex-1 py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 transition-colors"
                style={{ backgroundColor: added ? "#22c55e" : canAdd ? color : "#9ca3af" }}>
                {added
                  ? <><Check className="w-4 h-4" /> تمت الإضافة</>
                  : <><ShoppingCart className="w-4 h-4" />
                      {canAdd || !variantGroups.length
                        ? `أضف · ${formatPrice((basePrice + variantTotal) * qty)} ${currency}`
                        : "اختر الخيارات"}</>
                }
              </button>
            </div>
          )}
        </div>
        <div className="h-6" />
      </motion.div>
    </>
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

  const cafeName = biz?.name || "المنيو";
  const heroImg  = biz?.hero_image || DEFAULT_HERO;

  // عملة مزدوجة
  const hasDual     = !!(biz?.currency_dual && biz?.currency_rate && biz?.currency_alt_symbol);
  const [useAlt, setUseAlt] = useState(false);
  const mainSym  = biz?.currency || "ر.س";
  const altSym   = biz?.currency_alt_symbol || "";
  const altRate  = biz?.currency_rate || 1;
  const currency = useAlt ? altSym : mainSym;

  const fmtPrice = (raw) => {
    if (!raw && raw !== 0) return "0";
    const val = useAlt ? raw / altRate : raw;
    if (val >= 1000) return val.toLocaleString("ar-SA", { maximumFractionDigits: 0 });
    return val % 1 === 0 ? String(val) : val.toFixed(2);
  };

  const [view, setView]               = useState("home");
  const [browseTab, setBrowseTab]     = useState(null);
  const [search, setSearch]           = useState("");
  const [cart, setCart]               = useState([]);
  const [cartOpen, setCartOpen]       = useState(false);
  const [cartPulse, setCartPulse]     = useState(false);
  const [addedToast, setAddedToast]   = useState(null);
  const [notifSent, setNotifSent]     = useState(null);
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

  const offers   = useMemo(() => products.filter(p => p.is_offer && p.is_available !== false),   [products]);
  const featured = useMemo(() => products.filter(p => p.is_featured && p.is_available !== false), [products]);

  const tabs = useMemo(() => [
    ...(offers.length   > 0 ? [{ id: "offers",   label: "عروض",  emoji: "🔥", count: offers.length }]   : []),
    ...(featured.length > 0 ? [{ id: "featured", label: "مميز",  emoji: "⭐", count: featured.length }] : []),
    ...categories.map(c => ({
      id:    c.id,
      label: c.name,
      emoji: c.icon || null,
      count: products.filter(p => (p.category === c.name || p.category === c.id) && p.is_available !== false).length,
    })),
  ], [offers, featured, categories, products]);

  const visibleProducts = useMemo(() => {
    if (search) return products.filter(p => p.name?.includes(search) || p.name_en?.toLowerCase().includes(search.toLowerCase()));
    if (view !== "browse" || !browseTab) return [];
    if (browseTab === "offers")   return offers;
    if (browseTab === "featured") return featured;
    const cat = categories.find(c => c.id === browseTab);
    return cat ? products.filter(p => p.category === cat.name || p.category === cat.id) : [];
  }, [products, offers, featured, categories, view, browseTab, search]);

  const goBrowse = (tab) => { setView("browse"); setBrowseTab(tab); setSearch(""); };
  const goHome   = () => { setView("home"); setBrowseTab(null); setSearch(""); };

  const addToCart = (product, variants = {}, variantPrice = 0, qty = 1) => {
    sndAdd();
    speak("أُضيف");
    haptic([15]);
    setCartPulse(true); setTimeout(() => setCartPulse(false), 600);
    setAddedToast(product.name); setTimeout(() => setAddedToast(null), 2000);
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
      haptic([30, 20, 30]);
      setNotifSent(type);
      setTimeout(() => setNotifSent(null), 3000);
    },
  });

  const showProducts = !!search || view === "browse";

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ======= HERO ======= */}
      <section className="relative h-[100svh] flex flex-col overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="w-full h-full object-cover"
            onError={e => { e.target.src = DEFAULT_HERO; }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/80" />
        </div>

        <div className="relative flex-1 flex flex-col items-center justify-center text-center px-5">
          {/* لوغو */}
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }} className="mb-5">
            {biz?.logo_url ? (
              <img src={biz.logo_url} alt={cafeName}
                className="w-24 h-24 rounded-full object-cover border-3 border-white/70 shadow-xl mx-auto"
                onError={e => e.target.style.display = "none"} />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/25 flex items-center justify-center text-4xl mx-auto">☕</div>
            )}
          </motion.div>

          <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
            className="text-4xl font-black text-white mb-2 drop-shadow-lg">
            {cafeName}
          </motion.h1>

          {biz?.menu_tagline && (
            <p className="text-white/60 text-sm mb-4">{biz.menu_tagline}</p>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-bold mb-6">
            <span>{tableType === "room" ? "🎮" : "🍽️"}</span>
            {tableName}
          </motion.div>

          {/* أزرار الخدمة */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="w-full max-w-xs space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: "call_waiter",  label: "استدعاء موظف", icon: <Bell className="w-4 h-4" /> },
                { type: "request_bill", label: "طلب الحساب",   icon: <Receipt className="w-4 h-4" /> },
              ].map(({ type, label, icon }) => (
                <button key={type}
                  onClick={() => sendNotif.mutate(type)}
                  disabled={sendNotif.isPending || notifSent === type}
                  className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-white/20 bg-white/10 text-white text-sm font-semibold disabled:opacity-50">
                  {icon}
                  {notifSent === type ? "✓ تم" : label}
                </button>
              ))}
            </div>

            <button
              onClick={() => menuRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryHex, boxShadow: `0 8px 28px ${primaryHex}60` }}>
              <ShoppingCart className="w-5 h-5" />
              استعرض المنيو
            </button>
          </motion.div>
        </div>

        {/* تأكيد الإشعار */}
        <AnimatePresence>
          {notifSent && (
            <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }}
              className="absolute top-5 inset-x-5 z-20 bg-green-500 text-white py-3 px-5 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              {notifSent === "call_waiter" ? "تم إرسال طلب الموظف" : "تم إرسال طلب الحساب"}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ======= المنيو ======= */}
      <section ref={menuRef}>

        {/* هيدر ثابت */}
        <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2.5">
            <AnimatePresence>
              {(view === "browse" || !!search) && (
                <motion.button initial={{ width: 0, opacity: 0 }} animate={{ width: 36, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                  onClick={goHome}
                  className="shrink-0 w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </motion.button>
              )}
            </AnimatePresence>

            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input type="text" value={search}
                onChange={e => { setSearch(e.target.value); if (e.target.value) setView("browse"); }}
                placeholder="ابحث في المنيو..."
                dir="rtl"
                className="w-full h-10 pr-10 pl-8 text-sm rounded-xl bg-gray-100 border-0 outline-none" />
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

          <AnimatePresence>
            {view === "browse" && !search && tabs.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}>
                <CategoryTabs tabs={tabs} activeId={browseTab} onSelect={setBrowseTab} color={primaryHex} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* المحتوى */}
        <div className="pb-36">
          <AnimatePresence mode="wait">

            {/* الصفحة الرئيسية — قائمة الأقسام */}
            {!showProducts && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="px-4 pt-4 space-y-2">

                {isLoading ? (
                  <div className="space-y-2 pt-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 bg-white rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* عروض + مميز */}
                    {offers.length > 0 && (
                      <button onClick={() => { goBrowse("offers"); haptic([10]); }}
                        className="w-full flex items-center gap-4 px-4 py-4 bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-transform">
                        <span className="text-2xl">🔥</span>
                        <div className="flex-1 text-right">
                          <p className="font-bold text-gray-900">عروض اليوم</p>
                          <p className="text-xs text-gray-400">{offers.length} عرض متاح</p>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-gray-300" />
                      </button>
                    )}
                    {featured.length > 0 && (
                      <button onClick={() => { goBrowse("featured"); haptic([10]); }}
                        className="w-full flex items-center gap-4 px-4 py-4 bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-transform">
                        <span className="text-2xl">⭐</span>
                        <div className="flex-1 text-right">
                          <p className="font-bold text-gray-900">الأكثر طلباً</p>
                          <p className="text-xs text-gray-400">{featured.length} منتج مميز</p>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-gray-300" />
                      </button>
                    )}

                    {/* الأقسام */}
                    {categories.map(cat => {
                      const count = products.filter(p => p.category === cat.name || p.category === cat.id).length;
                      return (
                        <button key={cat.id} onClick={() => { goBrowse(cat.id); haptic([10]); }}
                          className="w-full flex items-center gap-4 px-4 py-4 bg-white rounded-2xl shadow-sm active:scale-[0.98] transition-transform">
                          <span className="text-2xl">{cat.icon || "🍽️"}</span>
                          <div className="flex-1 text-right">
                            <p className="font-bold text-gray-900">{cat.name}</p>
                            <p className="text-xs text-gray-400">{count} منتج</p>
                          </div>
                          <ChevronLeft className="w-4 h-4 text-gray-300" />
                        </button>
                      );
                    })}

                    {!isLoading && categories.length === 0 && products.length === 0 && (
                      <div className="text-center py-24">
                        <p className="text-5xl mb-3">☕</p>
                        <p className="font-bold text-gray-500">لا توجد منتجات بعد</p>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* قائمة المنتجات */}
            {showProducts && (
              <motion.div key={`browse-${browseTab}-${search}`}
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="px-4 pt-4">
                {isLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="rounded-2xl bg-white overflow-hidden animate-pulse">
                        <div className="aspect-square bg-gray-200" />
                        <div className="p-3 space-y-2">
                          <div className="h-3 bg-gray-200 rounded w-3/4" />
                          <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : visibleProducts.length === 0 ? (
                  <div className="text-center py-24">
                    <p className="text-5xl mb-3">🔍</p>
                    <p className="font-bold text-gray-500">لا توجد نتائج</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {visibleProducts.map(p => (
                      <ProductCard key={`${p.id}-${browseTab}`} product={p}
                        onTap={setModalProduct}
                        currency={currency} color={primaryHex}
                        formatPrice={fmtPrice} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="py-8 text-center border-t border-gray-100 bg-white">
          <p className="text-gray-400 text-xs">
            {cafeName} · مدعوم بـ<span className="font-bold" style={{ color: primaryHex }}> المنيو الذكي</span>
          </p>
          {biz?.google_review_url && (
            <a href={biz.google_review_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-gray-700 border border-gray-200 px-4 py-2 rounded-xl">
              ⭐ قيّم تجربتك
            </a>
          )}
        </div>
      </section>

      {/* زر السلة */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-6 inset-x-4 z-40">
            <motion.button
              animate={cartPulse ? { scale: [1, 1.05, 0.98, 1.02, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
              onClick={() => setCartOpen(true)}
              className="w-full h-14 rounded-2xl text-white font-bold flex items-center justify-between px-5"
              style={{ backgroundColor: primaryHex, boxShadow: `0 8px 28px ${primaryHex}60` }}>
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <span className="font-black">عرض السلة</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-white/25 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
                <span className="font-black">{fmtPrice(cartTotal)} {currency}</span>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* تنبيه الإضافة */}
      <AnimatePresence>
        {addedToast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-[84px] inset-x-8 z-40 flex justify-center pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg"
              style={{ backgroundColor: primaryHex }}>
              <Check className="w-4 h-4" />
              <span className="line-clamp-1">أُضيف: {addedToast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* مودال المنتج */}
      <AnimatePresence>
        {modalProduct && (
          <ProductModal product={modalProduct}
            onClose={() => setModalProduct(null)}
            onAdd={addToCart}
            currency={currency} color={primaryHex}
            formatPrice={fmtPrice} />
        )}
      </AnimatePresence>

      {/* السلة */}
      <CartSheet
        open={cartOpen} onOpenChange={setCartOpen}
        cart={cart} setCart={setCart}
        tableNumber={tableNumber} tableType={tableType} tableName={tableName}
        currency={currency} formatPrice={fmtPrice} color={primaryHex} />

      {/* تبديل العملة */}
      <AnimatePresence>
        {hasDual && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setUseAlt(v => !v)}
            className="fixed bottom-24 left-4 z-40 flex items-center gap-1.5 px-3 py-2 rounded-xl shadow-lg font-bold text-sm text-white"
            style={{ backgroundColor: useAlt ? "#16a34a" : primaryHex }}>
            <ArrowLeftRight className="w-3.5 h-3.5" />
            {useAlt ? altSym : mainSym}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

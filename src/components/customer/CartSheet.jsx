import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import db from "@/api/supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Trash2, Send, ShoppingBag, X } from "lucide-react";

const QUICK_NOTES = ["بدون سكر", "سكر قليل", "حار 🌶️", "بدون ثلج", "اكسترا شوت", "حليب شوفان"];

function playTick(up = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = up ? 660 : 440; o.type = "sine";
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.07);
  } catch {}
}

function playOrder() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f; o.type = "sine";
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.start(t); o.stop(t + 0.15);
    });
  } catch {}
}

const haptic = (p = [10]) => { try { navigator.vibrate?.(p); } catch {} };

export default function CartSheet({
  open, onOpenChange, cart, setCart,
  tableNumber, tableType, tableName,
  currency = "ر.س", formatPrice = String, color = "#e8820c",
}) {
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();

  const itemPrice = (item) =>
    (item.product.is_offer && item.product.offer_price ? item.product.offer_price : item.product.price) +
    (item.variantPrice || 0);

  const total      = cart.reduce((s, i) => s + itemPrice(i) * i.quantity, 0);
  const totalCount = cart.reduce((s, i) => s + i.quantity, 0);
  const getKey     = (item) => item.cartKey || item.product.id;

  const updateQty = (key, delta) => {
    haptic([6]);
    playTick(delta > 0);
    setCart(prev =>
      prev
        .map(item => getKey(item) === key ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
        .filter(item => item.quantity > 0)
    );
  };

  const removeItem = (key) => {
    haptic([10, 5, 10]);
    setCart(prev => prev.filter(item => getKey(item) !== key));
  };

  const appendNote = (note) => setNotes(prev => prev ? `${prev}، ${note}` : note);

  const placeOrder = useMutation({
    mutationFn: async () => {
      const orderNumber = "ORD-" + Date.now().toString(36).toUpperCase();
      const itemsData = cart.map(item => ({
        name: item.product.name,
        price: itemPrice(item),
        quantity: item.quantity,
        product_id: item.product.id,
        variants: item.variants || {},
      }));
      return db.entities.Order.create({
        order_number: orderNumber,
        table_number: parseInt(tableNumber) || 1,
        table_name: tableName || `طاولة ${tableNumber}`,
        table_type: tableType || "table",
        items: JSON.stringify(itemsData),
        notes,
        status: "received",
        total,
        customer_action: "none",
      });
    },
    onSuccess: (order) => {
      playOrder();
      haptic([50, 30, 50, 30, 100]);
      setCart([]);
      setNotes("");
      onOpenChange(false);
      navigate(`/order-tracking?id=${order.id}`);
    },
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl flex flex-col"
            style={{ maxHeight: "92vh", direction: "rtl" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${color}18` }}>
                  <ShoppingBag className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                  <p className="font-black text-gray-900 text-[15px]">سلة الطلبات</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {totalCount} منتج · {formatPrice(total)} {currency}
                  </p>
                </div>
              </div>
              <motion.button whileTap={{ scale: 0.86 }}
                onClick={() => onOpenChange(false)}
                className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-600" />
              </motion.button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {cart.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                    style={{ backgroundColor: `${color}12` }}>
                    <ShoppingBag className="w-10 h-10" style={{ color, opacity: 0.4 }} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-700">سلتك فارغة</p>
                    <p className="text-xs text-gray-400 mt-1">أضف منتجات من المنيو</p>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence initial={false}>
                    {cart.map(item => {
                      const key = getKey(item);
                      const price = itemPrice(item);
                      const variantEntries = item.variants
                        ? Object.entries(item.variants).filter(([, v]) => v && (Array.isArray(v) ? v.length : true))
                        : [];
                      return (
                        <motion.div key={key}
                          layout
                          initial={{ opacity: 0, scale: 0.93, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, x: 40 }}
                          transition={{ type: "spring", stiffness: 340, damping: 28 }}
                          className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100"
                        >
                          <img
                            src={item.product.image || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=100"}
                            alt={item.product.name}
                            className="w-16 h-16 rounded-xl object-cover shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">
                              {item.product.name}
                            </p>
                            {variantEntries.length > 0 && (
                              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                                {variantEntries.map(([k, v]) =>
                                  `${k}: ${Array.isArray(v) ? v.join(' + ') : v}`
                                ).join(' · ')}
                              </p>
                            )}
                            <p className="font-black text-sm mt-1.5" style={{ color }}>
                              {formatPrice(price * item.quantity)} {currency}
                            </p>
                          </div>

                          {/* Quantity controls */}
                          <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <motion.button whileTap={{ scale: 0.82 }}
                              onClick={() => updateQty(key, 1)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm"
                              style={{ backgroundColor: color }}>
                              <Plus className="w-3.5 h-3.5" />
                            </motion.button>

                            <motion.span key={item.quantity}
                              initial={{ scale: 1.6, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 500 }}
                              className="font-black text-base text-gray-900 w-6 text-center">
                              {item.quantity}
                            </motion.span>

                            {item.quantity > 1 ? (
                              <motion.button whileTap={{ scale: 0.82 }}
                                onClick={() => updateQty(key, -1)}
                                className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center">
                                <Minus className="w-3.5 h-3.5 text-gray-600" />
                              </motion.button>
                            ) : (
                              <motion.button whileTap={{ scale: 0.82 }}
                                onClick={() => removeItem(key)}
                                className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="shrink-0 border-t border-gray-100 bg-white px-4 pt-3 pb-7 space-y-3">
                {/* Quick notes */}
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_NOTES.map(n => (
                    <motion.button key={n} whileTap={{ scale: 0.88 }}
                      onClick={() => { appendNote(n); haptic([8]); }}
                      className="text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors"
                      style={{ borderColor: `${color}35`, color, backgroundColor: `${color}09` }}>
                      {n}
                    </motion.button>
                  ))}
                </div>

                <textarea
                  placeholder="ملاحظات إضافية (اختياري)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  dir="rtl"
                  rows={2}
                  className="w-full resize-none text-sm rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 outline-none placeholder:text-gray-400 focus:border-gray-300 transition-colors"
                />

                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium text-sm">الإجمالي</span>
                  <motion.div key={total} initial={{ scale: 1.14 }} animate={{ scale: 1 }}
                    className="flex items-baseline gap-1.5">
                    <span className="font-black text-2xl" style={{ color }}>{formatPrice(total)}</span>
                    <span className="text-gray-400 text-sm">{currency}</span>
                  </motion.div>
                </div>

                {/* Send button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => placeOrder.mutate()}
                  disabled={placeOrder.isPending}
                  className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2.5 disabled:opacity-70 transition-opacity"
                  style={{ backgroundColor: color, boxShadow: `0 8px 24px ${color}50` }}
                >
                  {placeOrder.isPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      إرسال الطلب
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

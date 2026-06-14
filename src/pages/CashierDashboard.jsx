import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import db from "@/api/supabaseClient";
import { useBusiness } from "@/lib/BusinessContext";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, BellRing, Clock, CheckCheck, ChevronLeft, ChevronRight, AlertTriangle, TrendingUp, ShoppingBag, Loader2 } from "lucide-react";
import RoomsPanel from "../components/cashier/RoomsPanel";

function playAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1100, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = "sine";
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.start(t); osc.stop(t + 0.15);
    });
  } catch {}
}

// ========== مؤقت حي ==========
function LiveTimer({ createdAt, status }) {
  const [mins, setMins] = useState(Math.floor((Date.now() - new Date(createdAt)) / 60000));
  useEffect(() => {
    const t = setInterval(() => setMins(Math.floor((Date.now() - new Date(createdAt)) / 60000)), 15000);
    return () => clearInterval(t);
  }, [createdAt]);

  const isLate = (status === "received" && mins >= 5) || (status === "preparing" && mins >= 12);
  const isWarn = (status === "received" && mins >= 3) || (status === "preparing" && mins >= 8);

  return (
    <div className={`flex items-center gap-1 text-xs font-semibold ${isLate ? "text-red-500" : isWarn ? "text-amber-500" : "text-gray-400"}`}>
      <Clock className="w-3 h-3" />
      <span>{mins < 1 ? "الآن" : `${mins} د`}</span>
      {isLate && <span className="flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" />متأخر</span>}
    </div>
  );
}

// ========== كارت طلب ==========
function OrderCard({ order, onNext, nextLabel, color, productImages }) {
  const items = useMemo(() => { try { return JSON.parse(order.items); } catch { return []; } }, [order.items]);
  const mins  = Math.floor((Date.now() - new Date(order.created_date)) / 60000);
  const isLate = (order.status === "received" && mins >= 5) || (order.status === "preparing" && mins >= 12);
  const isWarn = (order.status === "received" && mins >= 3) || (order.status === "preparing" && mins >= 8);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={`bg-white rounded-2xl overflow-hidden border-2 transition-all ${
        isLate ? "border-red-400 shadow-red-100 shadow-md" :
        isWarn ? "border-amber-300 shadow-amber-50 shadow-sm" :
        "border-gray-100 shadow-sm"
      }`}
    >
      {/* رأس الكارت */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        isLate ? "bg-red-50" : isWarn ? "bg-amber-50/60" : "bg-gray-50"
      }`}>
        <div>
          <p className="font-black text-gray-900 text-[15px] leading-tight">{order.table_name}</p>
          <LiveTimer createdAt={order.created_date} status={order.status} />
        </div>
        <div className="text-left">
          <p className="font-black text-lg" style={{ color }}>{order.total} <span className="text-xs font-medium text-gray-500">ر.س</span></p>
          <p className="text-[10px] text-gray-400 text-left font-mono">#{(order.order_number || order.id)?.slice(-4).toUpperCase()}</p>
        </div>
      </div>

      {/* المنتجات */}
      {items.length > 0 && (
        <div className="px-4 py-3 space-y-2.5 border-b border-gray-100">
          {items.map((item, i) => {
            const img = item.image || productImages[item.name];
            return (
              <div key={i} className="flex items-center gap-3">
                {img ? (
                  <img src={img} alt={item.name} className="w-9 h-9 rounded-xl object-cover shrink-0 border border-gray-100" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-primary/10 shrink-0 flex items-center justify-center text-base">☕</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-1">{item.name}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] bg-gray-100 text-gray-600 font-bold px-2 py-0.5 rounded-lg">×{item.quantity}</span>
                  <span className="text-sm font-bold text-gray-700">{(item.price * item.quantity).toFixed(0)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ملاحظات */}
      {order.notes && (
        <div className="mx-4 my-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 font-medium flex items-start gap-1.5">
          <span>📝</span>
          <span>{order.notes}</span>
        </div>
      )}

      {/* زر الإجراء */}
      {nextLabel && (
        <div className="p-3 pt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onNext}
            className="w-full py-3 rounded-xl text-white font-black text-sm shadow-sm active:opacity-90 transition-all"
            style={{ backgroundColor: color, boxShadow: `0 4px 16px ${color}40` }}
          >
            {nextLabel}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

// ========== الصفحة الرئيسية ==========
const COLS = [
  { key: "received",  label: "جديد",        emoji: "🆕", next: "preparing",  nextLabel: "ابدأ التحضير ✓", color: "#3b82f6", bg: "#eff6ff", badge: "bg-blue-500"  },
  { key: "preparing", label: "قيد التحضير", emoji: "👨‍🍳", next: "ready",      nextLabel: "جاهز للتسليم 🔔", color: "#f59e0b", bg: "#fffbeb", badge: "bg-amber-500" },
  { key: "ready",     label: "جاهز",         emoji: "✅", next: "delivered",  nextLabel: "تم التسليم 📦",   color: "#16a34a", bg: "#f0fdf4", badge: "bg-green-600" },
];

export default function CashierDashboard() {
  const [soundOn, setSoundOn]     = useState(true);
  const [newAlert, setNewAlert]   = useState(false);
  const [mainTab, setMainTab]     = useState("orders");
  const [activeCol, setActiveCol] = useState(0);
  const queryClient = useQueryClient();
  const { activeBid, isSuperAdmin } = useBusiness();

  const { data: products = [] } = useQuery({
    queryKey: ["products", activeBid],
    queryFn: () => db.entities.Product.list(),
    enabled: !!activeBid,
  });
  const productImages = useMemo(() => {
    const m = {};
    products.forEach(p => { if (p.image) m[p.name] = p.image; });
    return m;
  }, [products]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", activeBid],
    queryFn: () => db.entities.Order.list("-created_date", 200),
    refetchInterval: 8000,
    enabled: !!activeBid,
  });

  const { data: serviceReqs = [] } = useQuery({
    queryKey: ["service_requests", activeBid],
    queryFn: () => db.entities.ServiceRequest.filter({ status: "pending" }, "-created_date"),
    refetchInterval: 8000,
    enabled: !!activeBid,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => db.entities.Order.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const markDone = useMutation({
    mutationFn: (id) => db.entities.ServiceRequest.update(id, { status: "done" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service_requests"] }),
  });

  const markAllDone = useMutation({
    mutationFn: async () => {
      for (const r of serviceReqs) await db.entities.ServiceRequest.update(r.id, { status: "done" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service_requests"] }),
  });

  useEffect(() => {
    const unsub = db.entities.Order.subscribe((e) => {
      if (e.eventType === "INSERT") {
        if (soundOn) playAlert();
        setNewAlert(true);
        setTimeout(() => setNewAlert(false), 5000);
      }
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    });
    return unsub;
  }, [queryClient, soundOn]);

  useEffect(() => {
    const unsub = db.entities.ServiceRequest.subscribe((e) => {
      if (e.eventType === "INSERT" && soundOn) playAlert();
      queryClient.invalidateQueries({ queryKey: ["service_requests"] });
    });
    return unsub;
  }, [queryClient, soundOn]);

  const activeOrders = useMemo(() => orders.filter(o => o.status !== "delivered"), [orders]);
  const todayTotal   = useMemo(() => {
    const today = new Date().toDateString();
    return orders
      .filter(o => new Date(o.created_date).toDateString() === today && o.status === "delivered")
      .reduce((s, o) => s + (o.total || 0), 0);
  }, [orders]);

  const colOrders = (key) => orders.filter(o => o.status === key);

  // السوبر أدمن بدون اختيار كافيه
  if (isSuperAdmin && !activeBid) {
    return (
      <div dir="rtl" className="flex flex-col items-center justify-center py-32 gap-4 text-center">
        <div className="text-6xl">☕</div>
        <p className="text-xl font-black text-gray-700">اختر كافيه من القائمة الجانبية</p>
        <p className="text-gray-400 text-sm">ستظهر طلبات الكافيه المختار هنا</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">

      {/* ========== تنبيه طلب جديد ========== */}
      <AnimatePresence>
        {newAlert && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed top-4 inset-x-4 z-50 flex items-center gap-3 bg-red-500 text-white px-5 py-4 rounded-2xl shadow-2xl font-bold"
          >
            <motion.div animate={{ rotate: [0, -15, 15, -15, 15, 0] }} transition={{ duration: 0.5, repeat: 2 }}>
              <BellRing className="w-6 h-6" />
            </motion.div>
            <span className="text-base">🔥 طلب جديد وصل!</span>
            <button onClick={() => setNewAlert(false)} className="mr-auto text-white/70 hover:text-white text-xl leading-none">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== Header ========== */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold">الكاشير</h1>
          <p className="text-muted-foreground text-sm mt-0.5">مراقبة الطلبات في الوقت الفعلي</p>
        </div>
        <button
          onClick={() => setSoundOn(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
            soundOn ? "bg-primary/8 border-primary/25 text-primary" : "bg-gray-50 border-gray-200 text-gray-400"
          }`}
        >
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          {soundOn ? "الصوت مفعّل" : "الصوت مطفأ"}
        </button>
      </div>

      {/* ========== إحصائيات سريعة ========== */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "طلبات نشطة", value: activeOrders.length, icon: <ShoppingBag className="w-4 h-4" />, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "إيرادات اليوم", value: `${todayTotal.toFixed(0)} ر.س`, icon: <TrendingUp className="w-4 h-4" />, color: "text-green-600", bg: "bg-green-50" },
          { label: "تنبيهات معلقة", value: serviceReqs.length, icon: <BellRing className="w-4 h-4" />, color: serviceReqs.length > 0 ? "text-red-600" : "text-gray-500", bg: serviceReqs.length > 0 ? "bg-red-50" : "bg-gray-50" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={`${s.bg} rounded-2xl px-4 py-3`}>
            <div className={`flex items-center gap-1.5 ${s.color} text-xs font-semibold mb-1`}>
              {s.icon}{s.label}
            </div>
            <p className={`font-black text-xl ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* ========== تنبيهات الخدمة ========== */}
      <AnimatePresence>
        {serviceReqs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0] }} transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.5 }}>
                  <BellRing className="w-4 h-4 text-amber-600" />
                </motion.div>
                <p className="font-black text-amber-800 text-sm">تنبيهات الخدمة</p>
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{serviceReqs.length}</span>
              </div>
              <button onClick={() => markAllDone.mutate()}
                disabled={markAllDone.isPending}
                className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                {markAllDone.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                تأكيد الكل
              </button>
            </div>
            <div className="divide-y divide-amber-100 max-h-44 overflow-y-auto">
              {serviceReqs.map((r, i) => (
                <motion.div key={r.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl shrink-0">{r.type === "call_waiter" ? "🔔" : "🧾"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900">{r.type === "call_waiter" ? "استدعاء موظف" : "طلب الحساب"}</p>
                    <p className="text-xs text-gray-500">{r.table_name}</p>
                  </div>
                  <button onClick={() => markDone.mutate(r.id)}
                    className="shrink-0 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                    ✓ تم
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== تبويبات رئيسية ========== */}
      <div className="flex gap-2">
        {[
          { key: "orders", label: "الطلبات", emoji: "☕", count: activeOrders.length },
          { key: "rooms",  label: "غرف السوني", emoji: "🎮", count: null },
        ].map(tab => (
          <button key={tab.key} onClick={() => setMainTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              mainTab === tab.key
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            <span>{tab.emoji}</span>
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className={`text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center ${
                mainTab === tab.key ? "bg-white/25 text-white" : "bg-primary/15 text-primary"
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ========== غرف السوني ========== */}
      {mainTab === "rooms" && <RoomsPanel />}

      {/* ========== الطلبات ========== */}
      {mainTab === "orders" && (
        isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">جاري تحميل الطلبات...</p>
          </div>
        ) : activeOrders.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 space-y-3">
            <div className="text-6xl">☕</div>
            <p className="text-xl font-black text-gray-600">لا توجد طلبات حالياً</p>
            <p className="text-gray-400 text-sm">ستظهر الطلبات هنا فور وصولها</p>
          </motion.div>
        ) : (
          <>
            {/* Desktop: 3 columns */}
            <div className="hidden md:grid md:grid-cols-3 gap-4">
              {COLS.map(col => {
                const list = colOrders(col.key);
                return (
                  <div key={col.key} className="flex flex-col gap-3">
                    {/* عنوان العمود */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{col.emoji}</span>
                        <span className="font-black text-gray-800 text-sm">{col.label}</span>
                      </div>
                      <span className={`${col.badge} text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center`}>
                        {list.length}
                      </span>
                    </div>

                    {/* الطلبات */}
                    <div className="space-y-3 min-h-[120px]">
                      <AnimatePresence>
                        {list.length === 0 ? (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}
                            className="border-2 border-dashed border-gray-200 rounded-2xl h-24 flex items-center justify-center text-gray-400 text-sm">
                            لا يوجد
                          </motion.div>
                        ) : (
                          list.map(order => (
                            <OrderCard
                              key={order.id} order={order} productImages={productImages}
                              nextLabel={col.nextLabel} color={col.color}
                              onNext={() => updateStatus.mutate({ id: order.id, status: col.next })}
                            />
                          ))
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile: swipeable columns */}
            <div className="md:hidden">
              {/* تبويبات الأعمدة */}
              <div className="flex gap-2 mb-4">
                {COLS.map((col, i) => {
                  const count = colOrders(col.key).length;
                  return (
                    <button key={col.key} onClick={() => setActiveCol(i)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all flex-1 justify-center ${
                        activeCol === i ? "text-white shadow-sm" : "bg-gray-100 text-gray-600"
                      }`}
                      style={activeCol === i ? { backgroundColor: col.color } : {}}>
                      <span>{col.emoji}</span>
                      {col.label}
                      {count > 0 && (
                        <span className={`text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ${
                          activeCol === i ? "bg-white/30 text-white" : "bg-primary/10 text-primary"
                        }`}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* محتوى العمود */}
              <AnimatePresence mode="wait">
                <motion.div key={activeCol}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="space-y-3">
                  {colOrders(COLS[activeCol].key).length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl h-32 flex items-center justify-center text-gray-400 text-sm">
                      لا توجد طلبات
                    </div>
                  ) : (
                    colOrders(COLS[activeCol].key).map(order => (
                      <OrderCard
                        key={order.id} order={order} productImages={productImages}
                        nextLabel={COLS[activeCol].nextLabel} color={COLS[activeCol].color}
                        onNext={() => updateStatus.mutate({ id: order.id, status: COLS[activeCol].next })}
                      />
                    ))
                  )}
                </motion.div>
              </AnimatePresence>

              {/* أزرار التنقل */}
              <div className="flex items-center justify-between mt-4">
                <button onClick={() => setActiveCol(i => Math.max(0, i - 1))} disabled={activeCol === 0}
                  className="flex items-center gap-1 text-sm text-gray-500 disabled:opacity-30 font-medium">
                  <ChevronRight className="w-4 h-4" /> السابق
                </button>
                <div className="flex gap-1.5">
                  {COLS.map((_, i) => (
                    <div key={i} onClick={() => setActiveCol(i)} className={`w-2 h-2 rounded-full transition-all cursor-pointer ${activeCol === i ? "bg-primary w-4" : "bg-gray-300"}`} />
                  ))}
                </div>
                <button onClick={() => setActiveCol(i => Math.min(2, i + 1))} disabled={activeCol === 2}
                  className="flex items-center gap-1 text-sm text-gray-500 disabled:opacity-30 font-medium">
                  التالي <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}

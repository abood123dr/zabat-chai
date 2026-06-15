import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import db, { supabase } from "@/api/supabaseClient";
import { useBusiness } from "@/lib/BusinessContext";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, BellRing, CheckCheck, Loader2, Tag } from "lucide-react";
import RoomsPanel from "../components/cashier/RoomsPanel";

function playAlert() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1100, 880].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f; o.type = "sine";
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      o.start(t); o.stop(t + 0.15);
    });
  } catch {}
}

function playReady() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [659, 784, 1047, 1319].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f; o.type = "sine";
      const t = ctx.currentTime + i * 0.14;
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.start(t); o.stop(t + 0.13);
    });
  } catch {}
}

function speak(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-SA"; u.rate = 0.88; u.pitch = 1.05; u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {}
}

// ========== كارت طلب ==========
function OrderCard({ order, onNext, nextLabel, color, onDiscount, discountPresets = [], discountEnabled = false }) {
  const items   = useMemo(() => { try { return JSON.parse(order.items); } catch { return []; } }, [order.items]);
  const mins    = Math.floor((Date.now() - new Date(order.created_date)) / 60000);
  const isLate  = (order.status === "received" && mins >= 5) || (order.status === "preparing" && mins >= 12);
  const [showDisc, setShowDisc] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className={`bg-white rounded-2xl border-2 overflow-hidden ${isLate ? "border-red-400" : "border-gray-100"}`}
    >
      {/* رأس */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <p className="font-black text-gray-900">{order.table_name}</p>
          {mins > 0 && (
            <p className={`text-xs font-medium ${isLate ? "text-red-500" : "text-gray-400"}`}>
              {mins} د{isLate ? " ⚠️" : ""}
            </p>
          )}
        </div>
        <p className="font-black text-lg" style={{ color }}>{order.total} <span className="text-xs text-gray-400 font-normal">ر.س</span></p>
      </div>

      {/* المنتجات */}
      {items.length > 0 && (
        <div className="px-4 py-3 space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.name}</span>
              <span className="font-bold text-gray-500">×{item.quantity}</span>
            </div>
          ))}
        </div>
      )}

      {/* ملاحظات */}
      {order.notes && (
        <div className="mx-4 mb-2 px-3 py-2 bg-amber-50 rounded-xl text-xs text-amber-800">
          📝 {order.notes}
        </div>
      )}

      {/* خصم */}
      {discountEnabled && (
        showDisc ? (
          <div className="mx-3 mb-2 p-3 bg-purple-50 rounded-xl space-y-2">
            {discountPresets.length === 0 ? (
              <p className="text-xs text-center text-purple-600 py-1">أضف خصومات من إعدادات المتجر</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {discountPresets.map((p, i) => (
                  <button key={i} type="button"
                    onClick={() => {
                      const orig = order.original_total || order.total;
                      const disc = p.type === "percent" ? Math.min(orig * p.value / 100, orig) : Math.min(p.value, orig);
                      onDiscount({ id: order.id, discount_type: p.type, discount_amount: p.value, original_total: orig, total: Math.max(0, orig - disc) });
                      setShowDisc(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold">
                    {p.name} — {p.value}{p.type === "percent" ? "%" : " ر.س"}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setShowDisc(false)} className="text-xs text-purple-400">إلغاء</button>
          </div>
        ) : (
          <div className="px-4 mb-1">
            <button type="button" onClick={() => setShowDisc(true)}
              className="flex items-center gap-1 text-xs text-purple-500 font-semibold">
              <Tag className="w-3 h-3" />
              {order.original_total && order.original_total !== order.total
                ? `خصم مطبّق (${order.original_total} ← ${order.total})`
                : "تطبيق خصم"}
            </button>
          </div>
        )
      )}

      {/* الزر */}
      {nextLabel && (
        <div className="p-3 pt-1">
          <motion.button whileTap={{ scale: 0.97 }} onClick={onNext}
            className="w-full py-3 rounded-xl text-white font-black text-sm"
            style={{ backgroundColor: color }}>
            {nextLabel}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

// ========== أعمدة الكانبان ==========
const COLS = [
  { key: "received",  label: "جديد",        emoji: "🆕", next: "preparing",  nextLabel: "ابدأ التحضير", color: "#3b82f6" },
  { key: "preparing", label: "قيد التحضير", emoji: "👨‍🍳", next: "ready",      nextLabel: "جاهز للتسليم", color: "#f59e0b" },
  { key: "ready",     label: "جاهز",         emoji: "✅", next: "delivered",  nextLabel: "تم التسليم",   color: "#16a34a" },
];

export default function CashierDashboard() {
  const [soundOn, setSoundOn]   = useState(true);
  const [newAlert, setNewAlert] = useState(null); // null | { table, items }
  const [mainTab, setMainTab]   = useState("orders");
  const [activeCol, setActiveCol] = useState(0);
  const queryClient = useQueryClient();
  const { activeBid, isSuperAdmin } = useBusiness();

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

  const { data: bizDiscount } = useQuery({
    queryKey: ["biz-discount", activeBid],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("discount_enabled, discount_presets").eq("id", activeBid).single();
      return data;
    },
    enabled: !!activeBid,
    staleTime: 5 * 60_000,
  });

  const discountEnabled = bizDiscount?.discount_enabled ?? false;
  const discountPresets = useMemo(() => {
    try { return JSON.parse(bizDiscount?.discount_presets || "[]"); } catch { return []; }
  }, [bizDiscount?.discount_presets]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => db.entities.Order.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const applyDiscount = useMutation({
    mutationFn: ({ id, ...fields }) => db.entities.Order.update(id, fields),
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
      if (e.eventType === "INSERT" && soundOn) {
        playAlert();
        const table = e.new?.table_name || "طاولة";
        const items = (() => { try { return JSON.parse(e.new?.items||"[]"); } catch { return []; } })();
        const itemsText = items.length > 0
          ? `، ${items.slice(0,2).map(i=>`${i.name} ${i.quantity > 1 ? `×${i.quantity}` : ""}`).join("، ")}${items.length>2?" وغيرها":""}`
          : "";
        speak(`طلب جديد لـ ${table}${itemsText}`);
        setNewAlert({ table, count: items.length });
        setTimeout(() => setNewAlert(null), 6000);
      }
      if (e.eventType === "UPDATE" && e.new?.status === "ready" && soundOn) {
        playReady();
        speak(`طلب ${e.new?.table_name || "طاولة"} جاهز للتسليم`);
      }
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    });
    return unsub;
  }, [queryClient, soundOn]);

  useEffect(() => {
    const unsub = db.entities.ServiceRequest.subscribe((e) => {
      if (e.eventType === "INSERT" && soundOn) {
        playAlert();
        const table = e.new?.table_name || "طاولة";
        const msg = e.new?.type === "call_waiter"
          ? `طلب استدعاء موظف من ${table}`
          : `طلب حساب من ${table}`;
        speak(msg);
      }
      queryClient.invalidateQueries({ queryKey: ["service_requests"] });
    });
    return unsub;
  }, [queryClient, soundOn]);

  const activeOrders = useMemo(() => orders.filter(o => o.status !== "delivered"), [orders]);
  const colOrders = (key) => orders.filter(o => o.status === key);

  if (isSuperAdmin && !activeBid) {
    return (
      <div dir="rtl" className="flex flex-col items-center justify-center py-32 gap-3 text-center">
        <div className="text-5xl">☕</div>
        <p className="text-xl font-black text-gray-700">اختر كافيه من القائمة الجانبية</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">

      {/* تنبيه طلب جديد */}
      <AnimatePresence>
        {newAlert && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -60, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed top-4 inset-x-4 z-50 flex items-center gap-3 bg-red-500 text-white px-5 py-4 rounded-2xl shadow-2xl font-bold"
          >
            <motion.div animate={{ rotate: [0,-18,18,-18,0] }} transition={{ duration: 0.45, repeat: 3 }}>
              <BellRing className="w-6 h-6 shrink-0" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-base leading-tight">🔥 طلب جديد!</p>
              <p className="text-white/80 text-sm font-medium truncate">
                {newAlert.table}{newAlert.count > 0 ? ` — ${newAlert.count} منتج` : ""}
              </p>
            </div>
            <button onClick={() => setNewAlert(null)} className="text-white/60 hover:text-white text-xl shrink-0">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">الكاشير</h1>
        <button onClick={() => setSoundOn(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all ${
            soundOn ? "bg-primary/8 border-primary/20 text-primary" : "bg-gray-50 border-gray-200 text-gray-400"
          }`}>
          {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="text-xs font-medium">{soundOn ? "صوت" : "صامت"}</span>
        </button>
      </div>

      {/* تنبيهات الخدمة */}
      <AnimatePresence>
        {serviceReqs.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-amber-800 text-sm">تنبيهات</span>
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{serviceReqs.length}</span>
              </div>
              <button onClick={() => markAllDone.mutate()} disabled={markAllDone.isPending}
                className="flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50">
                {markAllDone.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                تأكيد الكل
              </button>
            </div>
            <div className="divide-y divide-amber-100 max-h-40 overflow-y-auto">
              {serviceReqs.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span>{r.type === "call_waiter" ? "🔔" : "🧾"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{r.type === "call_waiter" ? "استدعاء موظف" : "طلب حساب"} — {r.table_name}</p>
                  </div>
                  <button onClick={() => markDone.mutate(r.id)}
                    className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-lg">
                    ✓ تم
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* تبويبات */}
      <div className="flex gap-2">
        {[
          { key: "orders", label: "الطلبات", count: activeOrders.length },
          { key: "rooms",  label: "غرف السوني", count: null },
        ].map(tab => (
          <button key={tab.key} onClick={() => setMainTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              mainTab === tab.key ? "bg-primary text-white" : "bg-gray-100 text-gray-600"
            }`}>
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className={`text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center ${
                mainTab === tab.key ? "bg-white/25 text-white" : "bg-primary/15 text-primary"
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* غرف السوني */}
      {mainTab === "rooms" && <RoomsPanel />}

      {/* الطلبات */}
      {mainTab === "orders" && (
        isLoading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-gray-400">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            جاري التحميل...
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-24 space-y-2">
            <div className="text-5xl">☕</div>
            <p className="text-lg font-black text-gray-500">لا توجد طلبات</p>
          </div>
        ) : (
          <>
            {/* Desktop: 3 columns */}
            <div className="hidden md:grid md:grid-cols-3 gap-4">
              {COLS.map(col => {
                const list = colOrders(col.key);
                return (
                  <div key={col.key} className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="font-bold text-gray-700 text-sm">{col.emoji} {col.label}</span>
                      <span className="text-xs font-black text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: col.color }}>
                        {list.length}
                      </span>
                    </div>
                    <div className="space-y-3 min-h-[80px]">
                      <AnimatePresence>
                        {list.length === 0 ? (
                          <div className="border-2 border-dashed border-gray-200 rounded-2xl h-20 flex items-center justify-center text-gray-300 text-sm">
                            فارغ
                          </div>
                        ) : list.map(order => (
                          <OrderCard key={order.id} order={order}
                            nextLabel={col.nextLabel} color={col.color}
                            onNext={() => updateStatus.mutate({ id: order.id, status: col.next })}
                            onDiscount={(d) => applyDiscount.mutate(d)}
                            discountEnabled={discountEnabled}
                            discountPresets={discountPresets}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile: tab columns */}
            <div className="md:hidden">
              <div className="flex gap-1.5 mb-3">
                {COLS.map((col, i) => {
                  const count = colOrders(col.key).length;
                  return (
                    <button key={col.key} onClick={() => setActiveCol(i)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition-all flex-1 justify-center"
                      style={activeCol === i
                        ? { backgroundColor: col.color, color: "#fff" }
                        : { backgroundColor: "#f3f4f6", color: "#4b5563" }}>
                      {col.emoji} {col.label}
                      {count > 0 && (
                        <span className="ml-1 font-black" style={activeCol === i ? { color: "rgba(255,255,255,0.8)" } : { color: col.color }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={activeCol}
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3">
                  {colOrders(COLS[activeCol].key).length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl h-28 flex items-center justify-center text-gray-300 text-sm">
                      لا توجد طلبات
                    </div>
                  ) : colOrders(COLS[activeCol].key).map(order => (
                    <OrderCard key={order.id} order={order}
                      nextLabel={COLS[activeCol].nextLabel} color={COLS[activeCol].color}
                      onNext={() => updateStatus.mutate({ id: order.id, status: COLS[activeCol].next })}
                      onDiscount={(d) => applyDiscount.mutate(d)}
                      discountEnabled={discountEnabled}
                      discountPresets={discountPresets}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )
      )}
    </div>
  );
}

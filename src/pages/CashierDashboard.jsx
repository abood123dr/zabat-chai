import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import db from "@/api/supabaseClient";

import { Volume2, VolumeX, BellRing, Clock, Bell, X, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const COLS = [
  { key: "received",  title: "🆕 طلبات جديدة",  next: "preparing",  nextLabel: "✅ ابدأ التحضير", bg: "bg-blue-50",   header: "bg-blue-500",  border: "border-blue-200" },
  { key: "preparing", title: "👨🍳 قيد التحضير",  next: "ready",      nextLabel: "🔔 جاهز",         bg: "bg-amber-50",  header: "bg-amber-500", border: "border-amber-200" },
  { key: "ready",     title: "✅ جاهز للتسليم",  next: "delivered",  nextLabel: "📦 تسليم",        bg: "bg-green-50",  header: "bg-green-600", border: "border-green-200" },
];

function LiveTimer({ createdAt, status }) {
  const [mins, setMins] = useState(Math.floor((Date.now() - new Date(createdAt)) / 60000));
  useEffect(() => {
    const t = setInterval(() => setMins(Math.floor((Date.now() - new Date(createdAt)) / 60000)), 10000);
    return () => clearInterval(t);
  }, [createdAt]);

  const isLate   = status === "received"  && mins >= 5;
  const isWarn   = status === "preparing" && mins >= 10;
  const colorCls = isLate || isWarn ? "text-red-500 font-bold" : mins >= 3 ? "text-amber-500 font-semibold" : "text-gray-400";

  return (
    <p className={`text-xs flex items-center gap-1 mt-0.5 ${colorCls}`}>
      <Clock className="w-3 h-3" />
      {mins < 1 ? "الآن" : `${mins} د`}
      {(isLate || isWarn) && " ⚠ متأخر"}
    </p>
  );
}

function OrderCard({ order, onNext, nextLabel, productImages }) {
  const items     = (() => { try { return JSON.parse(order.items); } catch { return []; } })();
  const mins      = Math.floor((Date.now() - new Date(order.created_date)) / 60000);
  const isLate    = order.status === "received" && mins >= 5;
  const urgency   = isLate ? "border-red-400 shadow-red-100" : mins >= 3 ? "border-amber-300" : "border-gray-200";

  return (
    <div className={`rounded-2xl border-2 bg-white shadow-sm overflow-hidden ${urgency}`}>
      <div className={`px-4 py-3 flex items-center justify-between ${isLate ? "bg-red-50" : "bg-gray-50"}`}>
        <div>
          <p className="font-heading font-bold text-base">{order.table_name}</p>
          <LiveTimer createdAt={order.created_date} status={order.status} />
        </div>
        <div className="text-left">
          <p className="font-bold text-lg text-primary">{order.total} ر.س</p>
          <p className="text-[10px] text-gray-400 text-left">#{order.order_number?.slice(-4)}</p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="px-4 py-3 space-y-2 border-b border-gray-100">
          {items.map((item, i) => {
            const img = item.image || productImages[item.name];
            return (
              <div key={i} className="flex items-center gap-2.5">
                {img
                  ? <img src={img} alt={item.name} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-100" />
                  : <div className="w-10 h-10 rounded-xl bg-amber-50 shrink-0 flex items-center justify-center text-xl">☕</div>
                }
                <span className="flex-1 text-sm font-medium text-gray-800">{item.quantity}× {item.name}</span>
                <span className="text-sm font-bold text-gray-700">{(item.price * item.quantity).toFixed(0)} ر.س</span>
              </div>
            );
          })}
        </div>
      )}

      {order.notes && (
        <div className="px-4 py-2 text-sm text-amber-800 bg-amber-50 border-b border-amber-100">
          📝 {order.notes}
        </div>
      )}

      {nextLabel && (
        <div className="px-4 py-3">
          <button onClick={onNext}
            className="w-full py-3 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary/90 active:scale-95 transition-all shadow-sm">
            {nextLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export default function CashierDashboard() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newAlert, setNewAlert]         = useState(false);
  const [mainTab, setMainTab]           = useState("orders");
  const [showNotifs, setShowNotifs]     = useState(false);
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => db.entities.Product.list(),
  });

  const productImages = {};
  products.forEach(p => { if (p.image) productImages[p.name] = p.image; });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => db.entities.Order.list("-created_date", 200),
    refetchInterval: 8000,
  });

  // تنبيهات الخدمة (استدعاء موظف / طلب حساب)
  const { data: serviceRequests = [] } = useQuery({
    queryKey: ["service_requests"],
    queryFn: () => db.entities.ServiceRequest.filter({ status: "pending" }, "-created_date"),
    refetchInterval: 10000,
  });

  const markDone = useMutation({
    mutationFn: (id) => db.entities.ServiceRequest.update(id, { status: "done" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service_requests"] }),
  });

  const markAllDone = useMutation({
    mutationFn: async () => {
      for (const r of serviceRequests) {
        await db.entities.ServiceRequest.update(r.id, { status: "done" });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service_requests"] }),
  });

  useEffect(() => {
    const unsub = db.entities.Order.subscribe((event) => {
      if (event.eventType === "INSERT") {
        if (soundEnabled) playAlert();
        setNewAlert(true);
        setTimeout(() => setNewAlert(false), 5000);
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      } else if (event.eventType === "UPDATE" || event.eventType === "DELETE") {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      }
    });
    return unsub;
  }, [queryClient, soundEnabled]);

  // الاستماع لتنبيهات الخدمة
  useEffect(() => {
    const unsub = db.entities.ServiceRequest.subscribe((event) => {
      if (event.eventType === "INSERT") {
        if (soundEnabled) playAlert();
        queryClient.invalidateQueries({ queryKey: ["service_requests"] });
      }
    });
    return unsub;
  }, [queryClient, soundEnabled]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => db.entities.Order.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const activeOrders  = orders.filter(o => o.status !== "delivered");
  const pendingNotifs = serviceRequests.length;

  return (
    <div dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold">الكاشير</h1>
          {newAlert && (
            <div className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold animate-bounce shadow-lg">
              <BellRing className="w-4 h-4" /> طلب جديد وصل!
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* زر التنبيهات */}
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            <Bell className="w-4 h-4" />
            التنبيهات
            {pendingNotifs > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {pendingNotifs}
              </span>
            )}
          </button>
          <button
            onClick={() => setSoundEnabled(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${soundEnabled ? "bg-primary/5 border-primary/30 text-primary" : "bg-gray-50 border-gray-200 text-gray-400"}`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {soundEnabled ? "الصوت شغّال" : "الصوت مطفأ"}
          </button>
        </div>
      </div>

      {/* لوحة التنبيهات */}
      {showNotifs && (
        <div className="mb-5 bg-white border border-amber-200 rounded-2xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-200">
            <p className="font-bold text-amber-800 flex items-center gap-2">
              <Bell className="w-4 h-4" /> تنبيهات الخدمة
              {pendingNotifs > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingNotifs}</span>}
            </p>
            <div className="flex gap-2">
              {pendingNotifs > 0 && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50"
                  onClick={() => markAllDone.mutate()} disabled={markAllDone.isPending}>
                  <CheckCheck className="w-3.5 h-3.5" /> تأكيد الكل
                </Button>
              )}
              <button onClick={() => setShowNotifs(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {serviceRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">لا توجد تنبيهات معلقة</div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {serviceRequests.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="text-xl shrink-0">{r.type === "call_waiter" ? "🔔" : "🧾"}</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {r.type === "call_waiter" ? "استدعاء موظف" : "طلب الحساب"}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.table_name}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-green-700 hover:bg-green-50"
                    onClick={() => markDone.mutate(r.id)}>
                    ✓ تم
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* Main Tabs */}
      <div className="flex rounded-2xl border border-border overflow-hidden mb-6 w-fit">
        <button
          onClick={() => setMainTab("orders")}
          className={`px-6 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${mainTab === "orders" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          ☕ الطلبات
          {activeOrders.length > 0 && (
            <span className={`text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold ${mainTab === "orders" ? "bg-white/25 text-white" : "bg-primary/10 text-primary"}`}>
              {activeOrders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setMainTab("rooms")}
          className={`px-6 py-3 text-sm font-bold transition-colors ${mainTab === "rooms" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          🎮 غرف السوني
        </button>
      </div>

      {/* Rooms Tab */}
      {mainTab === "rooms" && <RoomsPanel />}

      {/* Orders Tab */}
      {mainTab === "orders" && (
        isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">☕</p>
            <p className="text-xl font-heading font-bold text-gray-600">لا توجد طلبات حالياً</p>
            <p className="text-gray-400 mt-2">ستظهر الطلبات هنا فور وصولها</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLS.map(col => {
              const colOrders = orders.filter(o => o.status === col.key);
              return (
                <div key={col.key} className={`rounded-2xl border ${col.border} overflow-hidden`}>
                  <div className={`${col.header} px-4 py-3 flex items-center justify-between`}>
                    <span className="text-white font-heading font-bold text-base">{col.title}</span>
                    <span className="bg-white/30 text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">
                      {colOrders.length}
                    </span>
                  </div>
                  <div className={`${col.bg} p-3 space-y-3 min-h-40`}>
                    {colOrders.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">لا يوجد</div>
                    ) : (
                      colOrders.map(order => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          nextLabel={col.nextLabel}
                          productImages={productImages}
                          onNext={() => updateStatus.mutate({ id: order.id, status: col.next })}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
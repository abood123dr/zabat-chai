import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ChefHat, CheckCircle, AlertTriangle, Maximize2, Volume2, VolumeX } from "lucide-react";

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [600, 800].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f; o.type = "sine";
      const t = ctx.currentTime + i * 0.15;
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      o.start(t); o.stop(t + 0.12);
    });
  } catch {}
}

function ElapsedTimer({ createdAt }) {
  const [mins, setMins] = useState(Math.floor((Date.now() - new Date(createdAt)) / 60000));
  useEffect(() => {
    const t = setInterval(() => setMins(Math.floor((Date.now() - new Date(createdAt)) / 60000)), 10000);
    return () => clearInterval(t);
  }, [createdAt]);

  const isLate = mins >= 10;
  const isWarn = mins >= 5;
  return (
    <span className={`flex items-center gap-1 font-mono font-black text-lg ${isLate ? "text-red-400" : isWarn ? "text-amber-400" : "text-gray-400"}`}>
      {isLate && <AlertTriangle className="w-4 h-4" />}
      <Clock className="w-4 h-4" />
      {mins < 1 ? "الآن" : `${mins} د`}
    </span>
  );
}

function KitchenOrderCard({ order, onAdvance, accentColor }) {
  const items = useMemo(() => { try { return JSON.parse(order.items); } catch { return []; } }, [order.items]);
  const mins = Math.floor((Date.now() - new Date(order.created_date)) / 60000);
  const isLate = mins >= 10;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={`rounded-2xl p-5 flex flex-col gap-4 border-2 transition-all ${
        isLate
          ? "bg-red-950/60 border-red-500/60"
          : "bg-gray-800/80 border-gray-700/50"
      }`}
    >
      {/* رأس الكارت */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white font-black text-2xl leading-none">{order.table_name}</p>
          <p className="text-gray-400 text-sm mt-1 font-mono">
            #{(order.order_number || order.id)?.slice(-4).toUpperCase()}
          </p>
        </div>
        <ElapsedTimer createdAt={order.created_date} />
      </div>

      {/* المنتجات */}
      <div className="space-y-2.5 flex-1">
        {items.map((item, i) => {
          const variantParts = item.variants
            ? Object.entries(item.variants).flatMap(([, v]) => Array.isArray(v) ? v : v ? [v] : [])
            : [];
          return (
            <div key={i} className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-white font-bold text-lg leading-tight block">{item.name}</span>
                {variantParts.length > 0 && (
                  <span className="text-gray-400 text-sm">{variantParts.join(' · ')}</span>
                )}
              </div>
              <span className="text-white font-black text-2xl bg-white/10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                {item.quantity}
              </span>
            </div>
          );
        })}
      </div>

      {/* ملاحظات */}
      {order.notes && (
        <div className="bg-amber-900/40 border border-amber-500/30 rounded-xl px-3 py-2 text-amber-300 text-sm font-medium">
          📝 {order.notes}
        </div>
      )}

      {/* زر الإجراء */}
      {onAdvance && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onAdvance}
          className="w-full py-4 rounded-xl font-black text-white text-lg transition-all"
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 0 20px ${accentColor}60`,
          }}
        >
          {order.status === "received" ? "✓ ابدأ التحضير" : "✓ جاهز للتسليم"}
        </motion.button>
      )}
    </motion.div>
  );
}

export default function KitchenDisplay() {
  const bid = new URLSearchParams(window.location.search).get("bid");
  const queryClient = useQueryClient();
  const [soundOn, setSoundOn] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: orders = [] } = useQuery({
    queryKey: ["kitchen-orders", bid],
    queryFn: async () => {
      let q = supabase.from("orders").select("*")
        .in("status", ["received", "preparing"])
        .order("created_date", { ascending: true });
      if (bid) q = q.eq("business_id", bid);
      const { data } = await q;
      return data || [];
    },
    enabled: !!bid,
    refetchInterval: 10000,
  });

  const advance = useMutation({
    mutationFn: async ({ id, status }) => {
      const next = status === "received" ? "preparing" : "ready";
      const { error } = await supabase.from("orders").update({ status: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kitchen-orders", bid] }),
  });

  useEffect(() => {
    const ch = supabase.channel(`kitchen_${bid}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
        if (soundOn) playBeep();
        queryClient.invalidateQueries({ queryKey: ["kitchen-orders", bid] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["kitchen-orders", bid] });
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [bid, queryClient, soundOn]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const received  = orders.filter(o => o.status === "received");
  const preparing = orders.filter(o => o.status === "preparing");

  if (!bid) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white text-center p-8" dir="rtl">
        <div>
          <p className="text-4xl mb-4">🍳</p>
          <p className="text-xl font-bold mb-2">شاشة المطبخ</p>
          <p className="text-gray-400">أضف <span className="font-mono text-green-400">?bid=BUSINESS_ID</span> للرابط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white" dir="rtl">
      {/* شريط العنوان */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-amber-400" />
          <span className="font-black text-lg text-white">شاشة المطبخ</span>
          <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full border border-red-500/30">
            ● مباشر
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSoundOn(v => !v)}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors">
            {soundOn ? <Volume2 className="w-5 h-5 text-gray-300" /> : <VolumeX className="w-5 h-5 text-gray-500" />}
          </button>
          <button onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors">
            <Maximize2 className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>

      {/* عداد سريع */}
      <div className="grid grid-cols-2 gap-px bg-gray-800">
        <div className="bg-gray-900 py-3 px-6 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-gray-400 text-sm">جديد</span>
          <span className="text-white font-black text-xl">{received.length}</span>
        </div>
        <div className="bg-gray-900 py-3 px-6 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-gray-400 text-sm">قيد التحضير</span>
          <span className="text-white font-black text-xl">{preparing.length}</span>
        </div>
      </div>

      {/* الكانبان */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 text-center">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }}
            className="text-7xl">✅</motion.div>
          <p className="text-2xl font-black text-gray-400">لا توجد طلبات معلقة</p>
          <p className="text-gray-600 text-sm">ستظهر الطلبات الجديدة هنا فور وصولها</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-gray-800 h-[calc(100vh-108px)]">
          {/* عمود الجديدة */}
          <div className="bg-gray-950 p-4 overflow-y-auto">
            <div className="flex items-center gap-2 mb-4 sticky top-0 bg-gray-950/95 py-2 backdrop-blur-sm">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-blue-400 font-black text-base">طلبات جديدة</p>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {received.length === 0 ? (
                  <div className="text-center py-16 text-gray-700">
                    <p className="text-4xl mb-2">🆕</p>
                    <p className="text-sm">لا يوجد</p>
                  </div>
                ) : received.map(o => (
                  <KitchenOrderCard key={o.id} order={o}
                    accentColor="#3b82f6"
                    onAdvance={() => advance.mutate({ id: o.id, status: o.status })} />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* عمود التحضير */}
          <div className="bg-gray-950 p-4 overflow-y-auto border-r border-gray-800">
            <div className="flex items-center gap-2 mb-4 sticky top-0 bg-gray-950/95 py-2 backdrop-blur-sm">
              <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-amber-400 font-black text-base">قيد التحضير</p>
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {preparing.length === 0 ? (
                  <div className="text-center py-16 text-gray-700">
                    <p className="text-4xl mb-2">👨‍🍳</p>
                    <p className="text-sm">لا يوجد</p>
                  </div>
                ) : preparing.map(o => (
                  <KitchenOrderCard key={o.id} order={o}
                    accentColor="#f59e0b"
                    onAdvance={() => advance.mutate({ id: o.id, status: o.status })} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

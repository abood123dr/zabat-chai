import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import db, { supabase } from "@/api/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

// ============================================================
// صوتيات + كلام عربي + اهتزاز
// ============================================================
function playStatusSound(status) {
  try {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return;
    const ctx = new A();
    const map = {
      received:  [[440,0],[550,0.1]],
      preparing: [[523,0],[659,0.13],[784,0.26]],
      ready:     [[880,0],[1100,0.12],[880,0.24],[1100,0.36],[1320,0.50]],
      delivered: [[523,0],[659,0.1],[784,0.2],[1047,0.32],[784,0.44],[1047,0.56],[1319,0.68],[1047,0.82],[1319,0.96]],
    };
    (map[status] || []).forEach(([f, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f; o.type = "sine";
      const t = ctx.currentTime + d;
      g.gain.setValueAtTime(status === "delivered" ? 0.3 : 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.start(t); o.stop(t + 0.18);
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

const STATUS_SPEECH = {
  received:  "وصل طلبك، الشيف يجهزه الحين",
  preparing: "طلبك قيد التحضير",
  ready:     "طلبك جاهز، في الطريق إليك",
  delivered: "تم التسليم، استمتع بطلبك",
};

const HAPTIC = {
  received:  [30],
  preparing: [30, 20, 40],
  ready:     [50, 30, 50, 30, 80],
  delivered: [100, 60, 100, 60, 200, 60, 150],
};
const haptic = (s) => { try { navigator.vibrate?.(HAPTIC[s] || [30]); } catch {} };

// ============================================================
// Canvas Confetti
// ============================================================
function Confetti({ active }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLS = ["#f59e0b","#ec4899","#3b82f6","#10b981","#a855f7","#ef4444","#eab308","#06b6d4","#f97316","#ffffff"];

    const parts = Array.from({ length: 220 }, (_, i) => ({
      x:     Math.random() * canvas.width,
      y:     -Math.random() * canvas.height * 0.6 - 20,
      vx:    (Math.random() - 0.5) * 5,
      vy:    Math.random() * 3.5 + 1,
      color: COLS[i % COLS.length],
      size:  Math.random() * 11 + 4,
      rot:   Math.random() * 360,
      rotV:  (Math.random() - 0.5) * 14,
      shape: ["rect","circle","ribbon","tri"][Math.floor(Math.random() * 4)],
    }));

    const start = Date.now();
    const FADE_START = 4000, FADE_DUR = 1500;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const elapsed = Date.now() - start;
      const alpha = elapsed > FADE_START ? Math.max(0, 1 - (elapsed - FADE_START) / FADE_DUR) : 1;
      if (alpha <= 0) return;

      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy + 0.06; p.rot += p.rotV;
        if (p.y > canvas.height + 20 && elapsed < FADE_START) {
          p.y = -20; p.x = Math.random() * canvas.width; p.vy = Math.random() * 3.5 + 1;
        }
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
        } else if (p.shape === "ribbon") {
          ctx.fillRect(-p.size / 2, -p.size / 5, p.size, p.size / 2.5);
        } else if (p.shape === "tri") {
          ctx.beginPath(); ctx.moveTo(0, -p.size/2); ctx.lineTo(p.size/2, p.size/2); ctx.lineTo(-p.size/2, p.size/2); ctx.closePath(); ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
        ctx.restore();
      });

      if (elapsed < FADE_START + FADE_DUR) animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 65 }} />;
}

// ============================================================
// إيموجي عائمة
// ============================================================
const EMOJIS = ["🎉","🎊","☕","⭐","✨","🌟","🥳","🎈","💫","🎁"];

function FloatingEmojis({ active }) {
  const items = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      emoji: EMOJIS[i % EMOJIS.length],
      x:     Math.random() * 90 + 5,
      delay: Math.random() * 1.8,
      size:  [28, 36, 46, 52][Math.floor(Math.random() * 4)],
      dur:   Math.random() * 1.5 + 2.2,
    }))
  ).current;

  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 63 }}>
      {items.map((it, i) => (
        <motion.span key={i}
          initial={{ y: "105vh", opacity: 0, scale: 0.4, rotate: -30 }}
          animate={{ y: "-15vh", opacity: [0, 1, 1, 0.5, 0], scale: [0.4, 1.3, 1, 1], rotate: [0, 15, -10, 5] }}
          transition={{ duration: it.dur, delay: it.delay, ease: "easeOut" }}
          className="absolute"
          style={{ left: `${it.x}%`, bottom: 0, fontSize: it.size, lineHeight: 1 }}>
          {it.emoji}
        </motion.span>
      ))}
    </div>
  );
}

// ============================================================
// شاشة الاحتفال الكاملة
// ============================================================
function CelebrationOverlay({ show, cafeName, onDismiss }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 flex flex-col items-center justify-center text-center px-8"
          style={{ zIndex: 60, background: "radial-gradient(ellipse at center, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.97) 100%)" }}
          onClick={onDismiss}
          dir="rtl"
        >
          {/* الإيموجي الكبير */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: [0, 1.5, 1.1, 1.3, 1.15], rotate: [0, 20, -10, 8, 0] }}
            transition={{ type: "spring", stiffness: 180, damping: 10, delay: 0.1 }}
            style={{ fontSize: 130, lineHeight: 1 }}
            className="mb-4 select-none"
          >
            🎉
          </motion.div>

          {/* نص كبير */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            className="text-white font-black leading-tight mb-3"
            style={{ fontSize: "clamp(2rem, 10vw, 3.5rem)" }}
          >
            وصل طلبك! 🎊
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-white/70 text-xl font-semibold mb-2"
          >
            استمتع بوقتك {cafeName ? `في ${cafeName}` : ""}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            className="text-white/50 text-base mb-10"
          >
            ☕ نتمنى لك تجربة رائعة
          </motion.p>

          {/* نجوم متطايرة */}
          {[...Array(8)].map((_, i) => (
            <motion.span key={i}
              className="absolute text-yellow-400 select-none"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.8, 0.9],
                opacity: [0, 1, 0],
                x: Math.cos((i / 8) * Math.PI * 2) * (90 + Math.random() * 50),
                y: Math.sin((i / 8) * Math.PI * 2) * (90 + Math.random() * 50),
              }}
              transition={{ delay: 0.3 + i * 0.08, duration: 1.2 }}
              style={{ fontSize: 26 - i * 1.5 }}
            >
              ⭐
            </motion.span>
          ))}

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
            className="flex items-center gap-2 text-white/30 text-sm"
          >
            <span>اضغط في أي مكان للمتابعة</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// خطوة الحالة
// ============================================================
const STEPS = [
  { key: "received",  emoji: "📋", label: "استُلم طلبك",      sub: "وصل طلبك للمطبخ" },
  { key: "preparing", emoji: "👨‍🍳", label: "جاري التحضير",    sub: "الشيف يحضّر طلبك بعناية" },
  { key: "ready",     emoji: "✅", label: "جاهز للتقديم",    sub: "طلبك في الطريق إليك!" },
  { key: "delivered", emoji: "🎉", label: "تم التسليم",       sub: "استمتع بطلبك 😊" },
];

const STEP_COLORS = {
  received:  "#3b82f6",
  preparing: "#f59e0b",
  ready:     "#16a34a",
  delivered: "#059669",
};

function StatusStep({ step, idx, currentIdx, isLast, color }) {
  const isDone    = idx < currentIdx;
  const isCurrent = idx === currentIdx;
  const isPending = idx > currentIdx;

  return (
    <div className="flex gap-4 items-start">
      {/* الأيقونة + الخط */}
      <div className="flex flex-col items-center" style={{ minWidth: 52 }}>
        <motion.div
          animate={isCurrent ? { scale: [1, 1.12, 1] } : { scale: isDone ? 1 : 0.9 }}
          transition={isCurrent ? { repeat: Infinity, duration: 2.2, ease: "easeInOut" } : { type: "spring" }}
          className="relative w-13 h-13 flex items-center justify-center rounded-full shrink-0"
          style={{
            width: 52, height: 52,
            backgroundColor: isDone || isCurrent ? color : "#f3f4f6",
            boxShadow: isCurrent ? `0 0 0 8px ${color}28, 0 4px 20px ${color}50` : isDone ? `0 2px 10px ${color}40` : "none",
          }}
        >
          {isDone ? (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400 }}
              className="text-white font-black text-xl">
              ✓
            </motion.span>
          ) : (
            <span style={{ fontSize: isCurrent ? 26 : 22, lineHeight: 1 }}>{step.emoji}</span>
          )}

          {/* حلقة نابضة للخطوة الحالية */}
          {isCurrent && (
            <>
              <motion.div
                animate={{ scale: [1, 1.7, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2.2 }}
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: color, opacity: 0.25 }}
              />
              <motion.div
                animate={{ scale: [1, 2.1, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ repeat: Infinity, duration: 2.2, delay: 0.4 }}
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: color, opacity: 0.15 }}
              />
            </>
          )}
        </motion.div>

        {!isLast && (
          <div className="relative mt-1 mb-1 rounded-full overflow-hidden"
            style={{ width: 3, flexGrow: 1, minHeight: 32, backgroundColor: "#e5e7eb" }}>
            <motion.div
              animate={{ height: isDone ? "100%" : "0%" }}
              initial={{ height: "0%" }}
              transition={{ duration: 0.9, ease: "easeInOut", delay: 0.1 }}
              className="absolute inset-x-0 top-0 rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
        )}
      </div>

      {/* المحتوى */}
      <div className={`pb-7 pt-2.5 flex-1 ${isPending ? "opacity-35" : ""}`}>
        <p className={`font-black text-[17px] leading-tight ${isPending ? "text-gray-500" : "text-gray-900"}`}>
          {step.label}
        </p>
        {(isDone || isCurrent) && (
          <motion.p
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm mt-1 font-medium"
            style={{ color: isCurrent ? color : "#9ca3af" }}
          >
            {isCurrent ? step.sub : "✓ مكتمل"}
          </motion.p>
        )}
        {isCurrent && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className="flex items-center gap-1.5 mt-2"
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, opacity: 0.6 }} />
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color, opacity: 0.3 }} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// الشاشة الرئيسية
// ============================================================
const BG = {
  received:  { from: "#eff6ff", to: "#dbeafe" },
  preparing: { from: "#fffbeb", to: "#fde68a" },
  ready:     { from: "#f0fdf4", to: "#bbf7d0" },
  delivered: { from: "#ecfdf5", to: "#a7f3d0" },
};

export default function OrderTracking() {
  const params  = new URLSearchParams(window.location.search);
  const orderId = params.get("id");

  const [order, setOrder]                   = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showDetails, setShowDetails]       = useState(false);
  const prevStatusRef = useRef(null);
  const celebratedRef = useRef(false);

  const { data: fetchedOrder, isLoading } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: () => db.entities.Order.get(orderId),
    enabled: !!orderId,
    refetchInterval: 6000,
  });

  // بيانات الكافيه
  const { data: biz } = useQuery({
    queryKey: ["biz-tracking", order?.business_id],
    enabled: !!order?.business_id,
    queryFn: async () => {
      const { data } = await supabase.from("businesses")
        .select("name, primary_color, logo_url, currency")
        .eq("id", order.business_id).single();
      return data;
    },
    staleTime: 120_000,
  });

  const HEX_MAP = {
    "32 85% 48%": "#e8820c","217 91% 60%":"#3b82f6","142 76% 36%":"#16a34a",
    "271 91% 65%":"#a855f7","330 81% 60%":"#ec4899","0 84% 60%":"#ef4444",
    "173 80% 40%":"#0d9488","45 93% 47%":"#eab308",
  };
  const brandColor = HEX_MAP[biz?.primary_color] || null;

  useEffect(() => {
    if (fetchedOrder) setOrder(fetchedOrder);
  }, [fetchedOrder]);

  // SubscribeRealtime
  useEffect(() => {
    if (!orderId) return;
    const unsub = db.entities.Order.subscribe((event) => {
      if (event.new?.id === orderId) setOrder(event.new);
    });
    return unsub;
  }, [orderId]);

  // كشف تغير الحالة
  useEffect(() => {
    if (!order?.status) return;
    const prev = prevStatusRef.current;
    if (prev && prev !== order.status) {
      playStatusSound(order.status);
      haptic(order.status);
      speak(STATUS_SPEECH[order.status] || "");
      if (order.status === "delivered" && !celebratedRef.current) {
        celebratedRef.current = true;
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 6000);
      }
    }
    prevStatusRef.current = order.status;
  }, [order?.status]);

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <p className="text-gray-500">لا يوجد طلب لتتبعه</p>
      </div>
    );
  }

  if (isLoading || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-amber-50" dir="rtl">
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
          className="text-6xl">☕</motion.div>
        <p className="text-amber-700 font-bold text-lg">جاري تحميل طلبك...</p>
      </div>
    );
  }

  const items      = (() => { try { return JSON.parse(order.items); } catch { return []; } })();
  const currentIdx = STEPS.findIndex(s => s.key === order.status);
  const stepColor  = brandColor || STEP_COLORS[order.status] || "#e8820c";
  const bg         = BG[order.status] || BG.received;
  const currency   = biz?.currency || "ر.س";
  const isDelivered = order.status === "delivered";

  const menuHref = order.table_number
    ? `/menu?${order.table_type === "room" ? "room" : "table"}=${order.table_number}&name=${encodeURIComponent(order.table_name || "")}${order.business_id ? `&bid=${order.business_id}` : ""}`
    : "/menu";

  return (
    <div dir="rtl" className="min-h-screen transition-colors duration-1000"
      style={{ background: `linear-gradient(160deg, ${bg.from} 0%, ${bg.to} 100%)` }}>

      {/* ====== احتفال ====== */}
      <Confetti active={showCelebration} />
      <FloatingEmojis active={showCelebration} />
      <CelebrationOverlay
        show={showCelebration}
        cafeName={biz?.name || ""}
        onDismiss={() => setShowCelebration(false)}
      />

      <div className="max-w-sm mx-auto px-4 pt-12 pb-12 space-y-5">

        {/* ====== هيدر ====== */}
        <motion.div
          initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220 }}
          className="text-center"
        >
          {/* لوغو أو إيموجي */}
          <motion.div
            animate={isDelivered ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.15, 1] } : { scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: isDelivered ? 3 : 4, repeatDelay: 1 }}
            className="inline-block mb-4"
          >
            {biz?.logo_url ? (
              <img src={biz.logo_url} alt={biz.name}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-xl mx-auto"
                onError={e => e.target.style.display = "none"} />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-5xl shadow-xl mx-auto"
                style={{ backgroundColor: `${stepColor}20`, border: `3px solid ${stepColor}30` }}>
                ☕
              </div>
            )}
          </motion.div>

          {biz?.name && (
            <p className="text-gray-500 text-sm font-medium mb-1">{biz.name}</p>
          )}
          <h1 className="font-black text-2xl text-gray-900 mb-1">تتبّع طلبك</h1>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {order.order_number && (
              <span className="text-xs text-gray-400 font-mono bg-white/60 px-2.5 py-1 rounded-full border border-white/50">
                #{order.order_number?.slice(-8).toUpperCase()}
              </span>
            )}
            {order.table_name && (
              <span className="text-xs text-gray-500 font-medium bg-white/60 px-2.5 py-1 rounded-full border border-white/50">
                {order.table_type === "room" ? "🎮" : "🍽️"} {order.table_name}
              </span>
            )}
          </div>
        </motion.div>

        {/* ====== الحالة كبيرة ====== */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="text-center py-5 px-4 rounded-3xl border-2 border-white/60 shadow-lg"
          style={{ backgroundColor: `${stepColor}12`, borderColor: `${stepColor}30` }}
        >
          <motion.div
            key={order.status}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="text-6xl mb-2"
          >
            {STEPS[currentIdx]?.emoji || "⏳"}
          </motion.div>
          <motion.p key={order.status + "_lbl"}
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="font-black text-xl" style={{ color: stepColor }}>
            {STEPS[currentIdx]?.label}
          </motion.p>
          <p className="text-gray-500 text-sm mt-1">{STEPS[currentIdx]?.sub}</p>

          {!isDelivered && (
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="flex items-center justify-center gap-1.5 mt-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stepColor }} />
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stepColor, opacity: 0.6 }} />
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stepColor, opacity: 0.3 }} />
            </motion.div>
          )}
        </motion.div>

        {/* ====== Timeline ====== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/60 shadow-lg"
        >
          {STEPS.map((step, idx) => (
            <StatusStep
              key={step.key}
              step={step} idx={idx}
              currentIdx={currentIdx}
              isLast={idx === STEPS.length - 1}
              color={stepColor}
            />
          ))}
        </motion.div>

        {/* ====== تفاصيل الطلب ====== */}
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-lg overflow-hidden"
          >
            <button
              onClick={() => setShowDetails(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <span className="font-black text-gray-800">تفاصيل الطلب</span>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg" style={{ color: stepColor }}>
                  {order.total?.toFixed(2)} {currency}
                </span>
                {showDetails ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="px-5 pb-4 border-t border-gray-100 space-y-3 pt-3">
                    {items.map((item, i) => {
                      const variantParts = item.variants
                        ? Object.entries(item.variants).filter(([,v]) => v && (Array.isArray(v) ? v.length : true))
                        : [];
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ backgroundColor: stepColor }} />
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <span className="font-bold text-sm text-gray-800">{item.name} × {item.quantity}</span>
                              <span className="font-black text-sm" style={{ color: stepColor }}>
                                {(item.price * item.quantity).toFixed(2)} {currency}
                              </span>
                            </div>
                            {variantParts.length > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                {variantParts.map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join("+") : v}`).join(" · ")}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div className="border-t border-gray-100 pt-3 flex justify-between font-black">
                      <span className="text-gray-600">الإجمالي</span>
                      <span style={{ color: stepColor }}>{order.total?.toFixed(2)} {currency}</span>
                    </div>
                    {order.notes && (
                      <div className="bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-100">
                        <span className="text-xs text-amber-700 font-bold">📝 {order.notes}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ====== أزرار ====== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: "spring" }}
          className="space-y-3"
        >
          {isDelivered && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280 }}
              className="text-center py-4 rounded-2xl border-2 font-black text-lg"
              style={{ borderColor: stepColor, color: stepColor, backgroundColor: `${stepColor}10` }}
            >
              شكراً لزيارتك! 🙏
            </motion.div>
          )}

          <Link to={menuHref}>
            <motion.button whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2.5 shadow-lg"
              style={{ backgroundColor: stepColor, boxShadow: `0 8px 24px ${stepColor}50` }}>
              <RotateCcw className="w-5 h-5" />
              {isDelivered ? "طلب مرة أخرى" : "إضافة منتجات"}
            </motion.button>
          </Link>
        </motion.div>

        {/* رقم الطلب الكامل */}
        <p className="text-center text-xs text-gray-300 font-mono">{order.id?.slice(0, 16)}...</p>
      </div>
    </div>
  );
}

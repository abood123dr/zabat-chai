import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/supabaseClient";
import { useBusiness } from "@/lib/BusinessContext";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronUp, AlertCircle, Receipt } from "lucide-react";
import { Input } from "@/components/ui/input";
import moment from "moment";
import "moment/locale/ar";
moment.locale("ar");

const STATUS = {
  received:  { label: "جديد",        cls: "bg-blue-100 text-blue-700" },
  preparing: { label: "قيد التحضير", cls: "bg-amber-100 text-amber-700" },
  ready:     { label: "جاهز",        cls: "bg-green-100 text-green-700" },
  delivered: { label: "مسلّم",       cls: "bg-gray-100 text-gray-500" },
};

const PRESETS = [
  { key: "today",     label: "اليوم" },
  { key: "yesterday", label: "أمس" },
  { key: "week",      label: "7 أيام" },
  { key: "month",     label: "الشهر" },
];

function getRange(preset) {
  const now = moment();
  switch (preset) {
    case "yesterday": return { from: now.clone().subtract(1,"day").startOf("day"), to: now.clone().subtract(1,"day").endOf("day") };
    case "week":      return { from: now.clone().subtract(6,"days").startOf("day"), to: now.clone().endOf("day") };
    case "month":     return { from: now.clone().startOf("month"), to: now.clone().endOf("day") };
    default:          return { from: now.clone().startOf("day"), to: now.clone().endOf("day") };
  }
}

export default function OrderHistory() {
  const { activeBid, isSuperAdmin } = useBusiness();
  const [preset, setPreset]         = useState("today");
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const { from, to } = useMemo(() => getRange(preset), [preset]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["order-history", activeBid, preset],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("business_id", activeBid)
        .gte("created_date", from.toISOString())
        .lte("created_date", to.toISOString())
        .order("created_date", { ascending: false })
        .limit(500);
      return data || [];
    },
    enabled: !!activeBid,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    let list = orders;
    if (filterStatus !== "all") list = list.filter(o => o.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.table_name?.toLowerCase().includes(q) ||
        o.order_number?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, filterStatus, search]);

  const summary = useMemo(() => ({
    count:    filtered.length,
    revenue:  filtered.reduce((s, o) => s + (o.total || 0), 0),
    delivered: filtered.filter(o => o.status === "delivered").length,
  }), [filtered]);

  if (isSuperAdmin && !activeBid) {
    return (
      <div dir="rtl" className="flex flex-col items-center justify-center py-32 gap-4 text-center">
        <div className="text-6xl">📋</div>
        <p className="text-xl font-black text-gray-700">اختر كافيه من القائمة الجانبية</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-4">

      {/* الهيدر */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" /> تاريخ الطلبات
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading ? "جاري التحميل..." : `${summary.count} طلب · ${summary.revenue.toFixed(0)} ر.س`}
          </p>
        </div>
      </div>

      {/* فلاتر */}
      <div className="space-y-3">
        {/* البريسيت */}
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => setPreset(p.key)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all border ${
                preset === p.key
                  ? "bg-primary text-white border-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* بحث + فلتر الحالة */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ابحث باسم الطاولة أو رقم الطلب..." className="pr-9 rounded-xl" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {[["all","الكل"], ...Object.entries(STATUS).map(([k,v]) => [k, v.label])].map(([k, l]) => (
              <button key={k} onClick={() => setFilterStatus(k)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  filterStatus === k ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground"
                }`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ملخص */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "إجمالي الطلبات",  value: summary.count },
            { label: "الإيرادات",        value: `${summary.revenue.toFixed(0)} ر.س` },
            { label: "تم التسليم",       value: summary.delivered },
          ].map(c => (
            <div key={c.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="font-black text-lg text-primary">{c.value}</p>
              <p className="text-[10px] text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* القائمة */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="flex justify-between mb-2">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-4 bg-muted rounded w-16" />
              </div>
              <div className="h-3 bg-muted rounded w-32" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">لا توجد طلبات</p>
          <p className="text-xs mt-1">{search ? "جرّب بحثاً مختلفاً" : "لا توجد طلبات في هذه الفترة"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filtered.map((order, idx) => {
              const items = (() => { try { return JSON.parse(order.items || "[]"); } catch { return []; } })();
              const s = STATUS[order.status] || { label: order.status, cls: "bg-gray-100 text-gray-500" };
              const isExpanded = expandedId === order.id;
              const hasDiscount = order.original_total && order.original_total !== order.total;

              return (
                <motion.div key={order.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                  className="bg-card border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-right hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-sm">{order.table_name}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${s.cls}`}>{s.label}</span>
                        {hasDiscount && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold shrink-0">خصم</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">#{(order.order_number || order.id)?.slice(-6).toUpperCase()}</span>
                        <span>{moment(order.created_date).format("HH:mm")}</span>
                        <span>{items.length} منتج</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-left">
                        {hasDiscount && <p className="text-xs text-muted-foreground line-through leading-none">{order.original_total} ر.س</p>}
                        <p className="font-black text-base text-primary">{(order.total || 0).toFixed(0)} ر.س</p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border">
                        <div className="px-4 py-3 space-y-2">
                          {items.map((item, i) => {
                            const variantParts = item.variants
                              ? Object.entries(item.variants).flatMap(([, v]) => Array.isArray(v) ? v : v ? [v] : [])
                              : [];
                            return (
                              <div key={i} className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">{item.name}</p>
                                  {variantParts.length > 0 && (
                                    <p className="text-xs text-muted-foreground">{variantParts.join(" · ")}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm shrink-0">
                                  <span className="text-muted-foreground">×{item.quantity}</span>
                                  <span className="font-bold">{((item.price || 0) * item.quantity).toFixed(0)} ر.س</span>
                                </div>
                              </div>
                            );
                          })}
                          {order.notes && (
                            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800 font-medium flex items-start gap-1.5 mt-2">
                              <span>📝</span> {order.notes}
                            </div>
                          )}
                          {hasDiscount && (
                            <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 text-xs text-purple-800 font-medium">
                              🏷️ خصم: {order.discount_amount}{order.discount_type === "percent" ? "%" : " ر.س"} ·
                              وفّر {((order.original_total || 0) - (order.total || 0)).toFixed(0)} ر.س
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

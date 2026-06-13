import { useQuery } from "@tanstack/react-query";
import db from "@/api/supabaseClient";

import { Clock, Gamepad2, Coffee } from "lucide-react";
import { useState, useEffect } from "react";

// Live clock updated every 30 seconds
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function getTimeColor(mins) {
  if (mins < 30)  return { bar: "bg-green-400",  ring: "border-green-300",  bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-400",  label: "متاحة وقت كافي" };
  if (mins < 60)  return { bar: "bg-amber-400",  ring: "border-amber-300",  bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400",  label: "جلسة طويلة" };
  return           { bar: "bg-red-400",    ring: "border-red-400",    bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-400",    label: "تجاوز الوقت!" };
}

function formatMins(mins) {
  if (mins < 60) return `${mins} د`;
  return `${Math.floor(mins / 60)}س ${mins % 60}د`;
}

function TableCard({ table, activeOrder, now }) {
  const Icon = table.type === "room" ? Gamepad2 : Coffee;

  if (!activeOrder) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-3 text-center">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-1.5">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
        <p className="font-heading font-semibold text-xs text-gray-600 truncate">{table.name}</p>
        <span className="inline-flex items-center gap-1 text-[10px] text-green-600 font-medium mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          متاحة
        </span>
      </div>
    );
  }

  const startMs = new Date(activeOrder.created_date).getTime();
  const elapsedMins = Math.floor((now - startMs) / 60000);
  const colors = getTimeColor(elapsedMins);
  // progress bar: cap at 90 min = 100%
  const progressPct = Math.min(100, (elapsedMins / 90) * 100);
  const isOvertime = elapsedMins >= 60;

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${colors.ring} ${colors.bg} ${isOvertime ? "shadow-md shadow-red-100" : ""}`}>
      {/* Time bar */}
      <div className="h-1.5 bg-white/50">
        <div
          className={`h-1.5 transition-all duration-1000 ${colors.bar} ${isOvertime ? "animate-pulse" : ""}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="p-2.5">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isOvertime ? "bg-red-100" : "bg-white/60"}`}>
              <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
            </div>
            <p className="font-heading font-bold text-xs text-gray-800 truncate max-w-[70px]">{table.name}</p>
          </div>
          <span className={`flex items-center gap-0.5 text-[10px] font-bold ${colors.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${isOvertime ? "animate-ping" : ""} inline-block`} />
            {isOvertime ? "!" : ""}
          </span>
        </div>

        <div className={`flex items-center gap-1 text-xs font-bold ${colors.text}`}>
          <Clock className="w-3 h-3" />
          {formatMins(elapsedMins)}
        </div>
        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{activeOrder.total} ر.س</p>
        {isOvertime && (
          <p className={`text-[10px] font-bold mt-1 ${colors.text}`}>⚠ {colors.label}</p>
        )}
      </div>
    </div>
  );
}

export default function TableStatusGrid({ orders }) {
  const now = useNow();

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: () => db.entities.DiningTable.list("number"),
    refetchInterval: 60000,
  });

  // Map oldest active order per table
  const activeOrderMap = {};
  (orders || []).filter(o => o.status !== "delivered").forEach(o => {
    const key = `${o.table_type}-${o.table_number}`;
    if (!activeOrderMap[key] || o.created_date < activeOrderMap[key].created_date) {
      activeOrderMap[key] = o;
    }
  });

  const cafeTables = tables.filter(t => t.type === "table");
  const rooms = tables.filter(t => t.type === "room");

  const occupiedCount = (list) =>
    list.filter(t => activeOrderMap[`${t.type}-${t.number}`]).length;

  return (
    <div className="space-y-5">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />أقل من 30 دقيقة</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />30–60 دقيقة</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />أكثر من 60 دقيقة</span>
      </div>

      {/* Café Tables */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Coffee className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">طاولات الكافيه</span>
          <span className="text-xs text-muted-foreground">({occupiedCount(cafeTables)}/{cafeTables.length} مشغولة)</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2">
          {cafeTables.map(t => (
            <TableCard
              key={t.id}
              table={t}
              activeOrder={activeOrderMap[`table-${t.number}`]}
              now={now}
            />
          ))}
        </div>
      </div>

      {/* Sony Rooms */}
      {rooms.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Gamepad2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">غرف السوني</span>
            <span className="text-xs text-muted-foreground">({occupiedCount(rooms)}/{rooms.length} مشغولة)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {rooms.map(t => (
              <TableCard
                key={t.id}
                table={t}
                activeOrder={activeOrderMap[`room-${t.number}`]}
                now={now}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
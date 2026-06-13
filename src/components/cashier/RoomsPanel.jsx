import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import db from "@/api/supabaseClient";

import { Play, Square, Gamepad2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function formatDuration(ms) {
  if (ms < 0) return "00:00";
  const totalMins = Math.floor(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function SessionCard({ session, room, onEnd, now }) {
  const start = new Date(session.start_time).getTime();
  const elapsedMs = now - start;
  const totalAllowedMs = (session.hours_booked + (session.free_hours || 0)) * 3600000;
  const remainingMs = totalAllowedMs - elapsedMs;
  const isOvertime = remainingMs < 0;
  const progressPct = Math.min(100, (elapsedMs / totalAllowedMs) * 100);
  
  const hourlyCharge = session.session_type === "hourly"
    ? (elapsedMs / 3600000) * (session.hourly_rate || 0)
    : (isOvertime ? (Math.abs(remainingMs) / 3600000) * (session.hourly_rate || 0) : 0);

  return (
    <div className={`rounded-2xl border-2 overflow-hidden bg-white shadow-sm ${isOvertime ? "border-red-400" : "border-green-300"}`}>
      <div className={`px-4 py-3 flex items-center justify-between ${isOvertime ? "bg-red-500" : "bg-green-600"}`}>
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-white" />
          <div>
            <p className="text-white font-heading font-bold text-base">{session.table_name}</p>
            <p className="text-white/80 text-xs">{room?.device_type || ""}</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-2xl font-mono">{formatDuration(Math.abs(elapsedMs))}</p>
          <p className="text-white/80 text-xs">{isOvertime ? "⚠ تجاوز الوقت" : `متبقي: ${formatDuration(remainingMs)}`}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-100">
        <div
          className={`h-2 transition-all ${isOvertime ? "bg-red-400" : progressPct > 80 ? "bg-amber-400" : "bg-green-400"}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="px-4 py-3 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-xs text-gray-500">نوع الجلسة</p>
            <p className="font-bold text-gray-800">{session.session_type === "hourly" ? "⏱ بالساعة" : "🎮 بالطلب"}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-xs text-gray-500">المبلغ الحالي</p>
            <p className="font-bold text-primary">{hourlyCharge.toFixed(1)} ر.س</p>
          </div>
        </div>
        {session.session_type === "order_based" && session.free_hours > 0 && (
          <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5 text-center">
            🎁 {session.free_hours} ساعة مجانية من الطلب ({session.order_total_threshold} ر.س+)
          </p>
        )}
        {session.notes && <p className="text-xs text-gray-500 text-center">📝 {session.notes}</p>}
        <button
          onClick={() => onEnd(session, hourlyCharge)}
          className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors"
        >
          <Square className="w-5 h-5" />
          إنهاء الجلسة
        </button>
      </div>
    </div>
  );
}

export default function RoomsPanel() {
  const [startDialog, setStartDialog] = useState(null); // room object
  const [form, setForm] = useState({ session_type: "hourly", hours_booked: 1, hourly_rate: 25, order_total: 0, notes: "" });
  const queryClient = useQueryClient();
  const now = useNow();

  // Smart free hours config: per SAR spent -> free hours
  const FREE_HOURS_RULES = [
    { minOrder: 100, freeHours: 3 },
    { minOrder: 75,  freeHours: 2 },
    { minOrder: 50,  freeHours: 1 },
  ];

  const { data: rooms = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: () => db.entities.DiningTable.filter({ type: "room" }, "number"),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["room-sessions"],
    queryFn: () => db.entities.RoomSession.filter({ status: "active" }),
    refetchInterval: 30000,
  });

  const startSession = useMutation({
    mutationFn: (data) => db.entities.RoomSession.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["room-sessions"] }); setStartDialog(null); },
  });

  const endSession = useMutation({
    mutationFn: ({ id, total }) => db.entities.RoomSession.update(id, { status: "ended", end_time: new Date().toISOString(), total_charged: total }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["room-sessions"] }),
  });

  const activeSessionByRoom = {};
  sessions.forEach(s => { activeSessionByRoom[s.table_id] = s; });

  const getFreeHours = (orderTotal) => {
    for (const rule of FREE_HOURS_RULES) {
      if (orderTotal >= rule.minOrder) return { freeHours: rule.freeHours, threshold: rule.minOrder };
    }
    return { freeHours: 0, threshold: 0 };
  };

  const handleStart = () => {
    if (!startDialog) return;
    const { freeHours, threshold } = form.session_type === "order_based"
      ? getFreeHours(parseFloat(form.order_total) || 0)
      : { freeHours: 0, threshold: 0 };

    startSession.mutate({
      table_id: startDialog.id,
      table_name: startDialog.name,
      table_number: startDialog.number,
      start_time: new Date().toISOString(),
      session_type: form.session_type,
      hours_booked: form.session_type === "hourly" ? parseInt(form.hours_booked) : 0,
      free_hours: freeHours,
      order_total_threshold: threshold,
      hourly_rate: parseFloat(form.hourly_rate) || startDialog.hourly_rate || 25,
      status: "active",
      notes: form.notes,
    });
  };

  const orderBasedHours = form.session_type === "order_based"
    ? getFreeHours(parseFloat(form.order_total) || 0)
    : null;

  return (
    <div>
      <p className="text-muted-foreground text-sm mb-4">اضغط على غرفة فارغة لبدء جلسة جديدة</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map(room => {
          const session = activeSessionByRoom[room.id];
          if (session) {
            return (
              <SessionCard
                key={room.id}
                session={session}
                room={room}
                now={now}
                onEnd={(s, charge) => endSession.mutate({ id: s.id, total: charge })}
              />
            );
          }
          return (
            <button
              key={room.id}
              onClick={() => { setForm({ session_type: "hourly", hours_booked: 1, hourly_rate: room.hourly_rate || 25, order_total: 0, notes: "" }); setStartDialog(room); }}
              className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-green-50 hover:border-green-300 p-6 text-center transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-200 group-hover:bg-green-100 flex items-center justify-center mx-auto mb-3 transition-colors">
                <Gamepad2 className="w-6 h-6 text-gray-400 group-hover:text-green-600" />
              </div>
              <p className="font-heading font-bold text-gray-700">{room.name}</p>
              <p className="text-sm text-gray-400 mt-1">{room.device_type}</p>
              <p className="text-xs text-gray-400 mt-1">{room.hourly_rate} ر.س/ساعة</p>
              <p className="text-xs text-green-600 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">+ بدء جلسة</p>
            </button>
          );
        })}
      </div>

      {/* Start Session Dialog */}
      <Dialog open={!!startDialog} onOpenChange={() => setStartDialog(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-primary" />
              بدء جلسة - {startDialog?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">نوع الجلسة</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setForm(p => ({ ...p, session_type: "hourly" }))}
                  className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${form.session_type === "hourly" ? "border-primary bg-primary/10 text-primary" : "border-gray-200 text-gray-500"}`}
                >
                  ⏱ بالساعة
                </button>
                <button
                  onClick={() => setForm(p => ({ ...p, session_type: "order_based" }))}
                  className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${form.session_type === "order_based" ? "border-primary bg-primary/10 text-primary" : "border-gray-200 text-gray-500"}`}
                >
                  🎮 بالطلب
                </button>
              </div>
            </div>

            {form.session_type === "hourly" && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">عدد الساعات</Label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setForm(p => ({ ...p, hours_booked: Math.max(1, p.hours_booked - 1) }))} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-lg hover:bg-gray-200">-</button>
                  <span className="flex-1 text-center text-2xl font-heading font-bold">{form.hours_booked}</span>
                  <button onClick={() => setForm(p => ({ ...p, hours_booked: p.hours_booked + 1 }))} className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-lg text-primary hover:bg-primary/20">+</button>
                </div>
                <p className="text-center text-sm text-primary font-bold mt-2">
                  الإجمالي: {(form.hours_booked * (parseFloat(form.hourly_rate) || 0)).toFixed(0)} ر.س
                </p>
              </div>
            )}

            {form.session_type === "order_based" && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">قيمة الطلب (ر.س)</Label>
                <Input
                  type="number"
                  value={form.order_total}
                  onChange={e => setForm(p => ({ ...p, order_total: e.target.value }))}
                  placeholder="أدخل قيمة الطلب"
                  className="text-lg text-center font-bold h-12 rounded-xl"
                />
                {orderBasedHours && (
                  <div className={`mt-2 p-3 rounded-xl text-sm text-center font-medium ${orderBasedHours.freeHours > 0 ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"}`}>
                    {orderBasedHours.freeHours > 0
                      ? `🎁 يستحق ${orderBasedHours.freeHours} ساعة مجانية!`
                      : `أضف ${50 - (parseFloat(form.order_total) || 0)} ر.س للحصول على ساعة مجانية`}
                  </div>
                )}
                <div className="mt-2 bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
                  <p className="font-bold">نظام الساعات المجانية:</p>
                  {FREE_HOURS_RULES.map(r => <p key={r.minOrder}>• طلب {r.minOrder} ر.س أو أكثر → {r.freeHours} ساعة مجانية</p>)}
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm font-semibold mb-2 block">سعر الساعة (للوقت الإضافي)</Label>
              <Input type="number" value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} className="rounded-xl" />
            </div>
            <div>
              <Label className="text-sm font-semibold mb-2 block">ملاحظات (اختياري)</Label>
              <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="أي ملاحظات..." className="rounded-xl" />
            </div>

            <button
              onClick={handleStart}
              disabled={startSession.isPending}
              className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-5 h-5" />
              {startSession.isPending ? "جاري البدء..." : "ابدأ الجلسة"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
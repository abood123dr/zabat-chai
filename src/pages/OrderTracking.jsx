import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import db from "@/api/supabaseClient";

import { CheckCircle2, Clock, ChefHat, UtensilsCrossed, Coffee, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const STATUS_STEPS = [
  { key: "received", label: "تم استلام الطلب", icon: Clock, color: "text-blue-500" },
  { key: "preparing", label: "جاري التحضير", icon: ChefHat, color: "text-amber-500" },
  { key: "ready", label: "جاهز للتقديم", icon: UtensilsCrossed, color: "text-green-500" },
  { key: "delivered", label: "تم التسليم", icon: CheckCircle2, color: "text-emerald-600" },
];

export default function OrderTracking() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");
  const [order, setOrder] = useState(null);

  const { data: fetchedOrder, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => db.entities.Order.get(orderId),
    enabled: !!orderId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (fetchedOrder) setOrder(fetchedOrder);
  }, [fetchedOrder]);

  useEffect(() => {
    if (!orderId) return;
    const unsub = db.entities.Order.subscribe((event) => {
      if (event.id === orderId) setOrder(event.data);
    });
    return unsub;
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
        <p className="text-muted-foreground">لا يوجد طلب لتتبعه</p>
      </div>
    );
  }

  if (isLoading || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const items = (() => { try { return JSON.parse(order.items); } catch { return []; } })();
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === order.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 to-orange-50/40 p-4" dir="rtl">
      <div className="max-w-md mx-auto pt-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Coffee className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold">تتبع طلبك</h1>
          <p className="text-muted-foreground text-sm mt-1">رقم الطلب: {order.order_number}</p>
          <p className="text-muted-foreground text-sm">{order.table_name}</p>
        </div>

        {/* Status Timeline */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/40 shadow-sm mb-6">
          <div className="space-y-6">
            {STATUS_STEPS.map((step, idx) => {
              const isActive = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'} ${isCurrent ? 'ring-4 ring-primary/20 scale-110' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`font-medium text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                    {isCurrent && <p className="text-xs text-primary font-medium mt-0.5">الحالة الحالية</p>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Order Details */}
        {items.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/40 shadow-sm mb-6">
            <h3 className="font-heading font-bold mb-3">تفاصيل الطلب</h3>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="font-medium">{(item.price * item.quantity).toFixed(2)} ر.س</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold">
                <span>الإجمالي</span>
                <span className="text-primary">{order.total.toFixed(2)} ر.س</span>
              </div>
            </div>
            {order.notes && (
              <div className="mt-3 p-2 bg-muted rounded-lg text-xs text-muted-foreground">
                <span className="font-medium">ملاحظات:</span> {order.notes}
              </div>
            )}
          </div>
        )}

        <Link to={`/menu?${order.table_type === 'room' ? 'room' : 'table'}=${order.table_number}&name=${encodeURIComponent(order.table_name)}`}>
          <Button variant="outline" className="w-full rounded-xl gap-2">
            <ArrowRight className="w-4 h-4" />
            طلب جديد
          </Button>
        </Link>
      </div>
    </div>
  );
}
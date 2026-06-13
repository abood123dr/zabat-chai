import { Clock, ChefHat, UtensilsCrossed, CheckCircle2, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment";

const STATUS_CONFIG = {
  received:  { label: "جديد",            bgCard: "border-r-4 border-r-blue-400",  badge: "bg-blue-100 text-blue-700",   icon: Clock,           nextLabel: "بدء التحضير" },
  preparing: { label: "جاري التحضير",   bgCard: "border-r-4 border-r-amber-400", badge: "bg-amber-100 text-amber-700", icon: ChefHat,         nextLabel: "جاهز للتقديم" },
  ready:     { label: "جاهز",            bgCard: "border-r-4 border-r-green-400", badge: "bg-green-100 text-green-700", icon: UtensilsCrossed, nextLabel: "تسليم" },
  delivered: { label: "تم التسليم",      bgCard: "border-r-4 border-r-gray-300",  badge: "bg-gray-100 text-gray-500",   icon: CheckCircle2,    nextLabel: null },
};

const ACTION_MAP = {
  call_waiter:  { label: "استدعاء موظف 🔔", cls: "bg-red-50 text-red-600 border border-red-200" },
  request_bill: { label: "طلب الحساب 🧾",   cls: "bg-purple-50 text-purple-600 border border-purple-200" },
};

const NEXT_STATUS = { received: "preparing", preparing: "ready", ready: "delivered" };

export default function OrderCard({ order, onUpdateStatus }) {
  const items = (() => { try { return JSON.parse(order.items); } catch { return []; } })();
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.received;
  const StatusIcon = cfg.icon;
  const next = NEXT_STATUS[order.status];
  const action = order.customer_action && order.customer_action !== "none" ? ACTION_MAP[order.customer_action] : null;
  const age = moment().diff(moment(order.created_date), 'minutes');
  const isUrgent = order.status === "received" && age >= 5;

  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md ${cfg.bgCard} ${isUrgent ? 'ring-2 ring-red-300' : ''}`}>
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-heading font-bold text-sm">{order.table_name}</span>
            {action && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${action.cls}`}>{action.label}</span>
            )}
            {isUrgent && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium animate-pulse">⚠ متأخر</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{order.order_number}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />{moment(order.created_date).fromNow()}
            </span>
          </div>
        </div>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 ${cfg.badge}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {cfg.label}
        </span>
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div className="px-4 py-2 bg-gray-50/60 border-y border-gray-100 space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-700">{item.quantity}× {item.name}</span>
              <span className="font-medium text-gray-900">{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="px-4 py-2 flex items-start gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-2 py-1 flex-1">{order.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-primary text-sm">{order.total.toFixed(2)} ر.س</span>
        {next && (
          <Button
            size="sm"
            className="rounded-lg text-xs gap-1.5 h-8"
            onClick={() => onUpdateStatus(order.id, next)}
          >
            {cfg.nextLabel}
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
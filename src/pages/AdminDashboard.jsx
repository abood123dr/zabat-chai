import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import db from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import {
  TrendingUp, TrendingDown, ShoppingCart, DollarSign,
  Clock, Package, ArrowLeft, RefreshCw, BarChart3, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import moment from "moment";
import "moment/locale/ar";
moment.locale("ar");

// ===== مكونات مساعدة =====
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-left">
      <p className="text-2xl font-bold font-heading tabular-nums">
        {now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
      </p>
      <p className="text-xs text-muted-foreground">{moment().format("dddd، D MMMM YYYY")}</p>
    </div>
  );
}

function StatCard({ title, value, sub, icon: Icon, color, trend, trendVal }) {
  const up = trend === "up";
  return (
    <Card className="overflow-hidden border-border/50 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          {trendVal !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
              {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trendVal)}%
            </div>
          )}
        </div>
        <p className="text-2xl font-bold font-heading">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
        {sub && <p className="text-xs text-primary font-medium mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function OrderStatusBadge({ status }) {
  const map = {
    received:  { label: "جديد",    cls: "bg-blue-100 text-blue-700" },
    preparing: { label: "تحضير",   cls: "bg-amber-100 text-amber-700" },
    ready:     { label: "جاهز",    cls: "bg-green-100 text-green-700" },
    delivered: { label: "مسلّم",   cls: "bg-gray-100 text-gray-500" },
  };
  const s = map[status] || { label: status, cls: "bg-gray-100 text-gray-500" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

// ===== الصفحة الرئيسية =====
export default function AdminDashboard() {
  const { user } = useAuth();
  const [refetchKey, setRefetchKey] = useState(0);

  const { data: orders = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["orders", refetchKey],
    queryFn: () => db.entities.Order.list("-created_date", 500),
    refetchInterval: 30000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products-count"],
    queryFn: () => db.entities.Product.list(),
  });

  const stats = useMemo(() => {
    const now     = moment();
    const today   = now.clone().startOf("day");
    const yest    = now.clone().subtract(1, "day").startOf("day");
    const month   = now.clone().startOf("month");

    const todayOrders = orders.filter(o => moment(o.created_date).isSameOrAfter(today));
    const yesterdayOrders = orders.filter(o =>
      moment(o.created_date).isSameOrAfter(yest) &&
      moment(o.created_date).isBefore(today)
    );
    const monthOrders = orders.filter(o => moment(o.created_date).isSameOrAfter(month));
    const activeOrders = orders.filter(o => o.status !== "delivered");

    const todayRev  = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
    const yesterRev = yesterdayOrders.reduce((s, o) => s + (o.total || 0), 0);
    const monthRev  = monthOrders.reduce((s, o) => s + (o.total || 0), 0);
    const avgOrder  = todayOrders.length > 0 ? todayRev / todayOrders.length : 0;

    const revTrend = yesterRev > 0 ? Math.round(((todayRev - yesterRev) / yesterRev) * 100) : null;

    // أفضل المنتجات
    const productMap = {};
    orders.forEach(o => {
      try {
        JSON.parse(o.items).forEach(item => {
          if (!productMap[item.name]) productMap[item.name] = { name: item.name, qty: 0, rev: 0 };
          productMap[item.name].qty += item.quantity;
          productMap[item.name].rev += item.price * item.quantity;
        });
      } catch {}
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // مبيعات آخر 7 أيام
    const dailySales = Array.from({ length: 7 }, (_, i) => {
      const day = moment().subtract(6 - i, "days");
      const dayOrders = orders.filter(o => moment(o.created_date).isSame(day, "day"));
      return {
        day: day.format("ddd"),
        rev: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
        cnt: dayOrders.length,
      };
    });

    // ساعات الذروة
    const hourMap = Array(24).fill(0);
    todayOrders.forEach(o => {
      hourMap[moment(o.created_date).hour()]++;
    });
    const peakHours = hourMap
      .map((cnt, h) => ({ hour: `${h}:00`, cnt }))
      .filter(h => h.cnt > 0)
      .sort((a, b) => b.cnt - a.cnt)
      .slice(0, 3);

    return { todayOrders, activeOrders, todayRev, monthRev, avgOrder, revTrend, topProducts, dailySales, peakHours, monthOrders };
  }, [orders]);

  const recentOrders = orders.filter(o => o.status !== "delivered").slice(0, 8);

  return (
    <div dir="rtl" className="space-y-5">

      {/* الهيدر */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-xl font-bold">
            {user?.role === "super_admin" ? "لوحة التحكم" : `مرحباً، ${user?.full_name?.split(" ")[0] || "مدير"} 👋`}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading ? "جاري التحميل..." : `آخر تحديث: ${moment(dataUpdatedAt).format("HH:mm:ss")}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveClock />
          <Button variant="ghost" size="icon" onClick={() => setRefetchKey(k => k + 1)} className="text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="مبيعات اليوم" icon={DollarSign} color="bg-primary/10 text-primary"
          value={`${stats.todayRev.toFixed(0)} ر.س`}
          sub={`${stats.todayOrders.length} طلب`}
          trend={stats.revTrend !== null ? (stats.revTrend >= 0 ? "up" : "down") : undefined}
          trendVal={stats.revTrend}
        />
        <StatCard
          title="مبيعات الشهر" icon={TrendingUp} color="bg-green-100 text-green-700"
          value={`${stats.monthRev.toFixed(0)} ر.س`}
          sub={`${stats.monthOrders.length} طلب`}
        />
        <StatCard
          title="طلبات نشطة" icon={Activity} color="bg-blue-100 text-blue-700"
          value={stats.activeOrders.length}
          sub={stats.activeOrders.length > 0 ? "تحتاج متابعة" : "لا توجد طلبات"}
        />
        <StatCard
          title="متوسط الطلب" icon={ShoppingCart} color="bg-purple-100 text-purple-700"
          value={`${stats.avgOrder.toFixed(0)} ر.س`}
          sub={`${products.length} منتج`}
        />
      </div>

      {/* الطلبات النشطة + الرسم البياني */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* الطلبات النشطة */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> الطلبات النشطة
              {stats.activeOrders.length > 0 && (
                <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">{stats.activeOrders.length}</span>
              )}
            </CardTitle>
            <Link to="/cashier">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
                الكاشير <ArrowLeft className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                لا توجد طلبات نشطة
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map(o => {
                  const mins = Math.floor((Date.now() - new Date(o.created_date)) / 60000);
                  const isLate = o.status === "received" && mins >= 5;
                  return (
                    <div key={o.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${isLate ? "border-red-200 bg-red-50" : "border-border bg-muted/30"}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isLate ? "bg-red-500 text-white" : "bg-primary/10 text-primary"}`}>
                        {o.order_number?.slice(-3) || "#"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{o.table_name}</p>
                        <p className="text-[10px] text-muted-foreground">{mins} دقيقة {isLate && "⚠ متأخر"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-primary">{o.total} ر.س</span>
                        <OrderStatusBadge status={o.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* مبيعات آخر 7 أيام */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> المبيعات (آخر 7 أيام)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.dailySales}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(32,85%,48%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(32,85%,48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(35,20%,92%)" />
                <XAxis dataKey="day" fontSize={11} tick={{ fill: "#888" }} />
                <YAxis fontSize={10} width={40} tick={{ fill: "#888" }} />
                <Tooltip
                  formatter={(v) => [`${v} ر.س`, "المبيعات"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="rev" stroke="hsl(32,85%,48%)" strokeWidth={2.5}
                  fill="url(#revGrad)" dot={{ r: 4, fill: "hsl(32,85%,48%)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* أفضل المنتجات + ساعات الذروة */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* أفضل المنتجات */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> أفضل المنتجات مبيعاً
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {stats.topProducts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">لا توجد بيانات كافية</p>
            ) : (
              <div className="space-y-3">
                {stats.topProducts.map((p, i) => {
                  const maxQty = stats.topProducts[0].qty;
                  const pct = Math.round((p.qty / maxQty) * 100);
                  return (
                    <div key={p.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i === 0 ? "bg-yellow-400 text-white" : i === 1 ? "bg-gray-300 text-gray-700" : i === 2 ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}`}>
                            {i + 1}
                          </span>
                          <p className="text-sm font-medium truncate max-w-[140px]">{p.name}</p>
                        </div>
                        <div className="text-left shrink-0">
                          <p className="text-xs font-bold text-primary">{p.qty} قطعة</p>
                          <p className="text-[10px] text-muted-foreground">{p.rev.toFixed(0)} ر.س</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* طلبات اليوم حسب الساعة */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> نشاط اليوم بالساعة
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4">
            {stats.todayOrders.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">لا توجد طلبات اليوم</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={(() => {
                    const h = Array(24).fill(0);
                    stats.todayOrders.forEach(o => h[moment(o.created_date).hour()]++);
                    return h.map((cnt, i) => ({ h: `${i}`, cnt })).filter((_, i) => {
                      const now = moment().hour();
                      return i <= now;
                    });
                  })()}>
                    <XAxis dataKey="h" fontSize={9} tick={{ fill: "#aaa" }} tickFormatter={v => `${v}ص`} />
                    <YAxis fontSize={10} width={20} tick={{ fill: "#aaa" }} allowDecimals={false} />
                    <Tooltip formatter={v => [v, "طلبات"]} contentStyle={{ borderRadius: 10, fontSize: 11 }} />
                    <Bar dataKey="cnt" fill="hsl(32,85%,48%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                {stats.peakHours.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {stats.peakHours.map((h, i) => (
                      <span key={h.hour} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        {i === 0 ? "🔥" : "⏰"} {h.hour} ({h.cnt} طلب)
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* روابط سريعة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: "/cashier",  label: "الكاشير",   emoji: "☕", color: "bg-primary/10 hover:bg-primary/20 text-primary" },
          { to: "/products", label: "المنتجات",  emoji: "🍽️", color: "bg-green-50 hover:bg-green-100 text-green-700" },
          { to: "/tables",   label: "الطاولات",  emoji: "🪑", color: "bg-blue-50 hover:bg-blue-100 text-blue-700" },
          { to: "/settings", label: "الإعدادات", emoji: "⚙️", color: "bg-purple-50 hover:bg-purple-100 text-purple-700" },
        ].map(item => (
          <Link key={item.to} to={item.to}>
            <div className={`${item.color} rounded-xl p-4 text-center transition-colors cursor-pointer`}>
              <p className="text-2xl mb-1">{item.emoji}</p>
              <p className="text-sm font-semibold">{item.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

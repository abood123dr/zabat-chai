import { useQuery } from "@tanstack/react-query";
import db from "@/api/supabaseClient";

import { DollarSign, ShoppingCart, TrendingUp, Users, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import moment from "moment";

const COLORS = ["hsl(32,85%,48%)", "hsl(160,50%,42%)", "hsl(25,60%,35%)", "hsl(45,80%,55%)", "hsl(200,60%,50%)"];

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-xl font-heading font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: () => db.entities.Order.list("-created_date", 500),
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: () => db.entities.DiningTable.list(),
  });

  const today = moment().startOf("day");
  const thisMonth = moment().startOf("month");

  const todayOrders = orders.filter(o => moment(o.created_date).isAfter(today));
  const monthOrders = orders.filter(o => moment(o.created_date).isAfter(thisMonth));

  const todaySales = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
  const monthSales = monthOrders.reduce((s, o) => s + (o.total || 0), 0);
  const avgOrder = orders.length > 0 ? (orders.reduce((s, o) => s + (o.total || 0), 0) / orders.length) : 0;
  const occupiedRooms = tables.filter(t => t.type === "room" && t.status === "occupied").length;

  // Top products
  const productCounts = {};
  orders.forEach(o => {
    try {
      const items = JSON.parse(o.items);
      items.forEach(item => {
        if (!productCounts[item.name]) productCounts[item.name] = { name: item.name, count: 0, revenue: 0 };
        productCounts[item.name].count += item.quantity;
        productCounts[item.name].revenue += item.price * item.quantity;
      });
    } catch {}
  });
  const topProducts = Object.values(productCounts).sort((a, b) => b.count - a.count).slice(0, 6);

  // Daily sales (last 7 days)
  const dailySales = [];
  for (let i = 6; i >= 0; i--) {
    const day = moment().subtract(i, "days").startOf("day");
    const dayOrders = orders.filter(o => moment(o.created_date).isSame(day, "day"));
    dailySales.push({
      day: day.format("ddd"),
      sales: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
      count: dayOrders.length,
    });
  }

  // Status distribution
  const statusDist = [
    { name: "مستلم", value: orders.filter(o => o.status === "received").length },
    { name: "تحضير", value: orders.filter(o => o.status === "preparing").length },
    { name: "جاهز", value: orders.filter(o => o.status === "ready").length },
    { name: "مسلّم", value: orders.filter(o => o.status === "delivered").length },
  ].filter(d => d.value > 0);

  return (
    <div dir="rtl">
      <div className="mb-5">
        <h1 className="font-heading text-xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground text-xs">نظرة عامة على أداء الكافيه</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard title="مبيعات اليوم" value={`${todaySales.toFixed(0)} ر.س`} icon={DollarSign} color="bg-primary/10 text-primary" />
        <StatCard title="مبيعات الشهر" value={`${monthSales.toFixed(0)} ر.س`} icon={TrendingUp} color="bg-green-100 text-green-700" />
        <StatCard title="عدد الطلبات" value={orders.length} icon={ShoppingCart} color="bg-blue-100 text-blue-700" />
        <StatCard title="متوسط الطلب" value={`${avgOrder.toFixed(0)} ر.س`} icon={Users} color="bg-purple-100 text-purple-700" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-5">
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-heading">المبيعات اليومية (آخر 7 أيام)</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(35,20%,88%)" />
                <XAxis dataKey="day" fontSize={11} />
                <YAxis fontSize={11} width={40} />
                <Tooltip formatter={(v) => [`${v} ر.س`, "المبيعات"]} />
                <Line type="monotone" dataKey="sales" stroke="hsl(32,85%,48%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-heading">حالة الطلبات</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center px-2 pb-3">
            {statusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" nameKey="name" label={({ name, value }) => `${name} (${value})`} fontSize={10}>
                    {statusDist.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm py-10">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <Package className="w-4 h-4" />
            أفضل المنتجات مبيعاً
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical">
                <XAxis type="number" fontSize={11} />
                <YAxis dataKey="name" type="category" fontSize={10} width={90} />
                <Tooltip formatter={(v) => [v, "الكمية"]} />
                <Bar dataKey="count" fill="hsl(32,85%,48%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-10">لا توجد بيانات كافية</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
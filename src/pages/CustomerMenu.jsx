import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import db, { setCurrentBusinessId, supabase } from "@/api/supabaseClient";
import { Search, ShoppingCart, Coffee, Bell, Receipt, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ProductCard from "../components/customer/ProductCard";
import CartSheet from "../components/customer/CartSheet";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_HERO = "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&q=80";

export default function CustomerMenu() {
  const urlParams = new URLSearchParams(window.location.search);
  const tableNumber = urlParams.get("table") || urlParams.get("room") || "1";
  const tableType   = urlParams.get("room") ? "room" : "table";
  const tableName   = urlParams.get("name") || (tableType === "room" ? `غرفة ${tableNumber}` : `طاولة ${tableNumber}`);
  const bid         = urlParams.get("bid");

  // ضبط business_id مبكراً لعزل بيانات الكافيه
  setCurrentBusinessId(bid || null);
  useEffect(() => {
    setCurrentBusinessId(bid || null);
    return () => setCurrentBusinessId(null);
  }, [bid]);

  // تطبيق لون النظام من إعدادات الكافيه
  const { data: bizSettings } = useQuery({
    queryKey: ["biz-settings-public", bid],
    queryFn: async () => {
      if (!bid) return null;
      const { data } = await supabase.from("businesses").select("name,hero_image,menu_tagline,primary_color,logo_url").eq("id", bid).single();
      return data;
    },
    enabled: !!bid,
  });

  useEffect(() => {
    const color = bizSettings?.primary_color || "32 85% 48%";
    document.documentElement.style.setProperty("--primary", color);
    return () => {
      document.documentElement.style.setProperty("--primary", "32 85% 48%");
    };
  }, [bizSettings?.primary_color]);

  const cafeName  = bizSettings?.name || "المنيو";
  const heroImg   = bizSettings?.hero_image || DEFAULT_HERO;
  const tagline   = bizSettings?.menu_tagline || tableName;

  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [cartOpen, setCartOpen] = useState(false);
  const [notifSent, setNotifSent] = useState(null); // 'waiter' | 'bill'
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", bid],
    queryFn: () => db.entities.Category.filter({ is_active: true }, "sort_order"),
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", bid],
    queryFn: () => db.entities.Product.filter({ is_available: true }),
  });

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchCat    = activeCategory === "all" || p.category === activeCategory;
    const matchSearch = !search || p.name.includes(search) || (p.name_en && p.name_en.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  }), [products, activeCategory, search]);

  const featuredProducts = useMemo(() => products.filter(p => p.is_featured), [products]);
  const offerProducts    = useMemo(() => products.filter(p => p.is_offer),    [products]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  // إرسال تنبيه (بدون طلب) عبر service_requests
  const sendNotif = useMutation({
    mutationFn: (type) => db.entities.ServiceRequest.create({
      table_number: parseInt(tableNumber),
      table_name:   tableName,
      table_type:   tableType,
      type,
      status: "pending",
    }),
    onSuccess: (_, type) => {
      setNotifSent(type);
      setTimeout(() => setNotifSent(null), 4000);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 to-orange-50/40" dir="rtl">

      {/* Hero */}
      <div className="relative h-52 sm:h-60 overflow-hidden">
        <img src={heroImg} alt={cafeName} className="w-full h-full object-cover" onError={e => { e.target.src = DEFAULT_HERO; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 right-0 left-0 p-6">
          <div className="flex items-center gap-3">
            {bizSettings?.logo_url
              ? <img src={bizSettings.logo_url} alt={cafeName} className="w-12 h-12 rounded-2xl object-cover border-2 border-white/30 shrink-0" onError={e => e.target.style.display='none'} />
              : <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                  <Coffee className="w-6 h-6 text-white" />
                </div>
            }
            <div>
              <h1 className="text-2xl font-heading font-bold text-white">{cafeName}</h1>
              <p className="text-white/80 text-sm">{tagline}</p>
            </div>
          </div>
        </div>
      </div>

      {/* أزرار الخدمة (تنبيهات فقط) */}
      <div className="flex gap-2 px-4 -mt-5 relative z-10">
        <Button
          variant="outline" size="sm"
          className="rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-xs gap-1 flex-1"
          onClick={() => sendNotif.mutate("call_waiter")}
          disabled={sendNotif.isPending || notifSent === "call_waiter"}
        >
          <Bell className="w-3.5 h-3.5" />
          {notifSent === "call_waiter" ? "✓ تم الإرسال" : "استدعاء موظف"}
        </Button>
        <Button
          variant="outline" size="sm"
          className="rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-xs gap-1 flex-1"
          onClick={() => sendNotif.mutate("request_bill")}
          disabled={sendNotif.isPending || notifSent === "request_bill"}
        >
          <Receipt className="w-3.5 h-3.5" />
          {notifSent === "request_bill" ? "✓ تم الإرسال" : "طلب الحساب"}
        </Button>
      </div>

      {/* تأكيد إرسال التنبيه */}
      <AnimatePresence>
        {notifSent && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center font-medium"
          >
            {notifSent === "call_waiter" ? "🔔 تم إرسال طلب استدعاء الموظف" : "🧾 تم إرسال طلب الحساب"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* البحث */}
      <div className="px-4 mt-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن مشروب أو وجبة..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="pr-10 rounded-xl bg-white/70 backdrop-blur-sm border-white/40 h-11"
          />
        </div>
      </div>

      {/* الأقسام */}
      <div className="px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button variant={activeCategory === "all" ? "default" : "outline"} size="sm"
            className="rounded-full whitespace-nowrap text-xs shrink-0"
            onClick={() => setActiveCategory("all")}>الكل</Button>
          {categories.map(cat => (
            <Button key={cat.id} variant={activeCategory === cat.name ? "default" : "outline"} size="sm"
              className="rounded-full whitespace-nowrap text-xs shrink-0 bg-white/60"
              onClick={() => setActiveCategory(cat.name)}>
              {cat.icon} {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* العروض */}
      {offerProducts.length > 0 && activeCategory === "all" && !search && (
        <div className="px-4 mt-5">
          <h2 className="font-heading font-bold text-base mb-3">🔥 عروض اليوم</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {offerProducts.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}
          </div>
        </div>
      )}

      {/* المميزة */}
      {featuredProducts.length > 0 && activeCategory === "all" && !search && (
        <div className="px-4 mt-5">
          <h2 className="font-heading font-bold text-base mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" /> الأكثر طلباً
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {featuredProducts.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}
          </div>
        </div>
      )}

      {/* جميع المنتجات */}
      <div className="px-4 mt-5 pb-28">
        <h2 className="font-heading font-bold text-base mb-3">
          {activeCategory === "all" ? "جميع المنتجات" : activeCategory}
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">لا توجد منتجات</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}
          </div>
        )}
      </div>

      {/* زر السلة */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-30">
            <Button className="w-full h-14 rounded-2xl text-base font-bold gap-3 shadow-xl" onClick={() => setCartOpen(true)}>
              <ShoppingCart className="w-5 h-5" />
              عرض السلة
              <Badge className="bg-white text-primary mr-auto rounded-full px-2">{cartCount}</Badge>
              <span>{cart.reduce((s, i) => {
                const p = i.product.is_offer && i.product.offer_price ? i.product.offer_price : i.product.price;
                return s + p * i.quantity;
              }, 0).toFixed(2)} ر.س</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <CartSheet
        open={cartOpen} onOpenChange={setCartOpen}
        cart={cart} setCart={setCart}
        tableNumber={tableNumber} tableType={tableType} tableName={tableName}
      />
    </div>
  );
}

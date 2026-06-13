import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import db, { setCurrentBusinessId } from "@/api/supabaseClient";

import { Search, ShoppingCart, Coffee, Bell, Receipt, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ProductCard from "../components/customer/ProductCard";
import CartSheet from "../components/customer/CartSheet";
import { motion, AnimatePresence } from "framer-motion";

const HERO_IMG = "https://media.db.com/images/public/6a1c4ef5f3c8e8b653dd323f/5315d9984_generated_image.png";

export default function CustomerMenu() {
  const urlParams = new URLSearchParams(window.location.search);
  const tableNumber = urlParams.get("table") || urlParams.get("room") || "1";
  const tableType = urlParams.get("room") ? "room" : "table";
  const tableName = urlParams.get("name") || (tableType === "room" ? `غرفة ${tableNumber}` : `طاولة ${tableNumber}`);
  const bid = urlParams.get("bid");

  // ضبط business_id مبكراً لعزل بيانات الكافيه
  setCurrentBusinessId(bid || null);

  useEffect(() => {
    setCurrentBusinessId(bid || null);
    return () => setCurrentBusinessId(null);
  }, [bid]);

  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [cartOpen, setCartOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", bid],
    queryFn: () => db.entities.Category.filter({ is_active: true }, "sort_order"),
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", bid],
    queryFn: () => db.entities.Product.filter({ is_available: true }),
  });

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = activeCategory === "all" || p.category === activeCategory;
      const matchSearch = !search || p.name.includes(search) || (p.name_en && p.name_en.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, search]);

  const featuredProducts = useMemo(() => products.filter(p => p.is_featured), [products]);
  const offerProducts = useMemo(() => products.filter(p => p.is_offer), [products]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const callWaiter = useMutation({
    mutationFn: () => db.entities.Order.create({
      order_number: "SVC-" + Date.now().toString(36).toUpperCase(),
      table_number: parseInt(tableNumber),
      table_name: tableName,
      table_type: tableType,
      items: "[]",
      status: "received",
      total: 0,
      customer_action: "call_waiter",
    }),
  });

  const requestBill = useMutation({
    mutationFn: () => db.entities.Order.create({
      order_number: "BILL-" + Date.now().toString(36).toUpperCase(),
      table_number: parseInt(tableNumber),
      table_name: tableName,
      table_type: tableType,
      items: "[]",
      status: "received",
      total: 0,
      customer_action: "request_bill",
    }),
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 to-orange-50/40" dir="rtl">
      {/* Hero */}
      <div className="relative h-48 sm:h-56 overflow-hidden">
        <img src={HERO_IMG} alt="ظبط شاي" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 right-0 left-0 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-white">ظبط شاي</h1>
              <p className="text-white/80 text-sm">{tableName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 -mt-5 relative z-10">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full bg-white/80 backdrop-blur-sm shadow-sm text-xs gap-1"
          onClick={() => callWaiter.mutate()}
          disabled={callWaiter.isPending}
        >
          <Bell className="w-3.5 h-3.5" /> استدعاء موظف
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full bg-white/80 backdrop-blur-sm shadow-sm text-xs gap-1"
          onClick={() => requestBill.mutate()}
          disabled={requestBill.isPending}
        >
          <Receipt className="w-3.5 h-3.5" /> طلب الحساب
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 mt-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن مشروب أو وجبة..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-10 rounded-xl bg-white/70 backdrop-blur-sm border-white/40 h-11"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button
            variant={activeCategory === "all" ? "default" : "outline"}
            size="sm"
            className="rounded-full whitespace-nowrap text-xs shrink-0"
            onClick={() => setActiveCategory("all")}
          >
            الكل
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={activeCategory === cat.name ? "default" : "outline"}
              size="sm"
              className="rounded-full whitespace-nowrap text-xs shrink-0 bg-white/60"
              onClick={() => setActiveCategory(cat.name)}
            >
              {cat.icon} {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Offers */}
      {offerProducts.length > 0 && activeCategory === "all" && !search && (
        <div className="px-4 mt-5">
          <h2 className="font-heading font-bold text-base mb-3 flex items-center gap-2">
            🔥 عروض اليوم
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {offerProducts.map(p => (
              <ProductCard key={p.id} product={p} onAdd={addToCart} />
            ))}
          </div>
        </div>
      )}

      {/* Featured */}
      {featuredProducts.length > 0 && activeCategory === "all" && !search && (
        <div className="px-4 mt-5">
          <h2 className="font-heading font-bold text-base mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" /> الأكثر طلباً
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {featuredProducts.map(p => (
              <ProductCard key={p.id} product={p} onAdd={addToCart} />
            ))}
          </div>
        </div>
      )}

      {/* All Products */}
      <div className="px-4 mt-5 pb-24">
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
            {filteredProducts.map(p => (
              <ProductCard key={p.id} product={p} onAdd={addToCart} />
            ))}
          </div>
        )}
      </div>

      {/* Cart FAB */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-30"
          >
            <Button
              className="w-full h-14 rounded-2xl text-base font-bold gap-3 shadow-xl"
              onClick={() => setCartOpen(true)}
            >
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
        open={cartOpen}
        onOpenChange={setCartOpen}
        cart={cart}
        setCart={setCart}
        tableNumber={tableNumber}
        tableType={tableType}
        tableName={tableName}
      />
    </div>
  );
}
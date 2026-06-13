import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, Trash2, Send, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import db from "@/api/supabaseClient";

import { useNavigate } from "react-router-dom";

export default function CartSheet({ open, onOpenChange, cart, setCart, tableNumber, tableType, tableName }) {
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();

  const total = cart.reduce((sum, item) => {
    const price = item.product.is_offer && item.product.offer_price ? item.product.offer_price : item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const updateQty = (productId, delta) => {
    setCart(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
        : item
    ).filter(item => item.quantity > 0));
  };

  const removeItem = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const placeOrder = useMutation({
    mutationFn: async () => {
      const orderNumber = "ORD-" + Date.now().toString(36).toUpperCase();
      const itemsData = cart.map(item => ({
        name: item.product.name,
        price: item.product.is_offer && item.product.offer_price ? item.product.offer_price : item.product.price,
        quantity: item.quantity,
        product_id: item.product.id,
      }));
      const order = await db.entities.Order.create({
        order_number: orderNumber,
        table_number: parseInt(tableNumber) || 1,
        table_name: tableName || `طاولة ${tableNumber}`,
        table_type: tableType || "table",
        items: JSON.stringify(itemsData),
        notes: notes,
        status: "received",
        total: total,
        customer_action: "none",
      });
      return order;
    },
    onSuccess: (order) => {
      setCart([]);
      setNotes("");
      onOpenChange(false);
      navigate(`/order-tracking?id=${order.id}`);
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col" dir="rtl">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 font-heading">
            <ShoppingBag className="w-5 h-5 text-primary" />
            سلة الطلبات
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">سلتك فارغة</p>
              <p className="text-xs text-muted-foreground/60 mt-1">أضف منتجات من المنيو</p>
            </div>
          ) : (
            cart.map(item => {
              const price = item.product.is_offer && item.product.offer_price ? item.product.offer_price : item.product.price;
              return (
                <div key={item.product.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border">
                  <img
                    src={item.product.image || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=100"}
                    alt={item.product.name}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                    <p className="text-primary font-bold text-sm">{(price * item.quantity).toFixed(2)} ر.س</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQty(item.product.id, -1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQty(item.product.id, 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.product.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-border p-4 space-y-3">
            <Textarea
              placeholder="أضف ملاحظات على طلبك (بدون سكر، حار، إلخ)..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="resize-none text-sm"
              rows={2}
            />
            <div className="flex items-center justify-between font-heading">
              <span className="font-bold">الإجمالي</span>
              <span className="text-xl font-bold text-primary">{total.toFixed(2)} ر.س</span>
            </div>
            <Button
              className="w-full h-12 rounded-xl text-base font-bold gap-2"
              onClick={() => placeOrder.mutate()}
              disabled={placeOrder.isPending}
            >
              {placeOrder.isPending ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  أرسل الطلب
                </>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
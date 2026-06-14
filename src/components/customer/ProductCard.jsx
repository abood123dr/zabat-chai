import { useState } from "react";
import { Plus, Star, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_IMG = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80";

export default function ProductCard({ product, onAdd, currency = "ر.س", color = "#e8820c" }) {
  const hasOffer = product.is_offer && product.offer_price;
  const price = hasOffer ? product.offer_price : product.price;
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (!product.is_available) return;
    onAdd(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={product.image || DEFAULT_IMG}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={e => { e.target.src = DEFAULT_IMG; }}
        />
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {hasOffer && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">عرض</span>
          )}
          {product.is_featured && !hasOffer && (
            <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow flex items-center gap-0.5"
              style={{ backgroundColor: color }}>
              <Star className="w-2.5 h-2.5 fill-white" /> مميز
            </span>
          )}
        </div>
        {!product.is_available && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-white/90 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full">غير متوفر</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-1 mb-0.5">{product.name}</p>
        {product.description && (
          <p className="text-gray-400 text-[11px] line-clamp-1 mb-2">{product.description}</p>
        )}
        <div className="flex items-end justify-between mt-1">
          <div>
            <span className="font-black text-base" style={{ color }}>{price}</span>
            <span className="text-gray-400 text-[10px] mr-0.5">{currency}</span>
            {hasOffer && (
              <p className="text-gray-400 text-[10px] line-through">{product.price} {currency}</p>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleAdd}
            disabled={!product.is_available}
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors disabled:opacity-40"
            style={{ backgroundColor: added ? "#22c55e" : color }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {added ? (
                <motion.span key="c" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.18 }}>
                  <Check className="w-4 h-4 text-white" />
                </motion.span>
              ) : (
                <motion.span key="p" initial={{ scale: 0, rotate: 90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.18 }}>
                  <Plus className="w-4 h-4 text-white" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

import { Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function ProductCard({ product, onAdd }) {
  const hasOffer = product.is_offer && product.offer_price;
  const displayPrice = hasOffer ? product.offer_price : product.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-white/70 backdrop-blur-sm border border-white/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.image || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400"}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {hasOffer && (
          <Badge className="absolute top-2 right-2 bg-red-500 text-white border-0 text-xs">
            عرض خاص
          </Badge>
        )}
        {product.is_featured && !hasOffer && (
          <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground border-0 text-xs">
            <Star className="w-3 h-3 ml-1" />
            مميز
          </Badge>
        )}
        {!product.is_available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-bold text-sm">غير متوفر</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-heading font-semibold text-sm text-foreground line-clamp-1">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-primary text-sm">{displayPrice} ر.س</span>
            {hasOffer && (
              <span className="text-xs text-muted-foreground line-through">{product.price} ر.س</span>
            )}
          </div>
          <Button
            size="icon"
            className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 shadow-md"
            onClick={() => onAdd(product)}
            disabled={!product.is_available}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
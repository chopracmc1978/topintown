import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MenuItem } from '@/types/menu';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';

interface MenuCardProps {
  item: MenuItem;
}

const MenuCard = ({ item }: MenuCardProps) => {
  const [selectedSize, setSelectedSize] = useState(item.sizes?.[1]?.name || item.sizes?.[0]?.name);
  const [isAdded, setIsAdded] = useState(false);
  const { addToCart } = useCart();

  const currentPrice = item.sizes
    ? item.sizes.find((s) => s.name === selectedSize)?.price || item.price
    : item.price;

  const handleAddToCart = () => {
    addToCart(item, selectedSize);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  return (
    <Card className="group overflow-hidden border-0 shadow-card hover:shadow-warm transition-all duration-300 bg-card">
      <div className="relative aspect-square overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {item.popular && (
          <div className="absolute top-3 left-3 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full">
            Popular
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-serif text-lg font-semibold text-foreground">{item.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
          </div>
        </div>

        {item.sizes && (
          <div className="flex gap-2">
            {item.sizes.map((size) => (
              <button
                key={size.name}
                onClick={() => setSelectedSize(size.name)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full transition-all border",
                  selectedSize === size.name
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-secondary-foreground border-border hover:border-primary"
                )}
              >
                {size.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="text-xl font-bold text-primary">${currentPrice.toFixed(2)}</span>
          <Button
            variant={isAdded ? "accent" : "pizza"}
            size="sm"
            onClick={handleAddToCart}
            className="gap-1"
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4" /> Added
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuCard;

import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import type { MenuItem } from '@/hooks/useMenuItems';
import PizzaCustomizationModal from '@/components/pizza/PizzaCustomizationModal';

interface MenuCardDBProps {
  item: MenuItem;
}

const MenuCardDB = ({ item }: MenuCardDBProps) => {
  const defaultSize = item.sizes?.[1]?.name || item.sizes?.[0]?.name;
  const [selectedSize, setSelectedSize] = useState(defaultSize);
  const [isAdded, setIsAdded] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const { addToCart } = useCart();

  const currentPrice = item.sizes && selectedSize
    ? item.sizes.find((s) => s.name === selectedSize)?.price || item.base_price
    : item.base_price;

  const isPizza = item.category === 'pizza';

  const handleAddToCart = () => {
    if (isPizza) {
      setIsCustomizing(true);
      return;
    }

    // Non-pizza items go directly to cart
    const cartItem = {
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.base_price,
      image: item.image_url || '/placeholder.svg',
      category: item.category as 'pizza' | 'sides' | 'drinks' | 'desserts',
      sizes: item.sizes?.map(s => ({ name: s.name, price: s.price })),
      popular: item.is_popular,
    };
    
    addToCart(cartItem, selectedSize);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  return (
    <>
      <Card className="group overflow-hidden border-0 shadow-card hover:shadow-warm transition-all duration-300 bg-card">
        <div className="relative aspect-square overflow-hidden">
          <img
            src={item.image_url || '/placeholder.svg'}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {item.is_popular && (
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

          {item.default_toppings && item.default_toppings.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Includes: {item.default_toppings.map(t => t.topping?.name).filter(Boolean).join(', ')}
            </p>
          )}

          {!isPizza && item.sizes && item.sizes.length > 0 && (
            <div className="flex gap-2">
              {item.sizes.map((size) => (
                <button
                  key={size.id}
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
            <div>
              <span className="text-xl font-bold text-primary">
                {isPizza ? `From $${(item.sizes?.[0]?.price || item.base_price).toFixed(2)}` : `$${currentPrice.toFixed(2)}`}
              </span>
            </div>
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
                  <Plus className="w-4 h-4" /> {isPizza ? 'Customize' : 'Add'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isPizza && (
        <PizzaCustomizationModal
          item={item}
          isOpen={isCustomizing}
          onClose={() => setIsCustomizing(false)}
        />
      )}
    </>
  );
};

export default MenuCardDB;

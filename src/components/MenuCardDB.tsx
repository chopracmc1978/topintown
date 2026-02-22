import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import type { MenuItem } from '@/hooks/useMenuItems';
import PizzaCustomizationModal from '@/components/pizza/PizzaCustomizationModal';
import WingsCustomizationModal from '@/components/wings/WingsCustomizationModal';
import UpsellModal from '@/components/upsell/UpsellModal';
import OptimizedImage from '@/components/OptimizedImage';

interface MenuCardDBProps {
  item: MenuItem;
}

const MenuCardDB = ({ item }: MenuCardDBProps) => {
  const defaultSize = item.sizes?.[1]?.name || item.sizes?.[0]?.name;
  const [selectedSize, setSelectedSize] = useState(defaultSize);
  const [isAdded, setIsAdded] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isCustomizingWings, setIsCustomizingWings] = useState(false);
  const { addToCart } = useCart();

  // Upsell state for baked lasagna
  const [showLasagnaUpsell, setShowLasagnaUpsell] = useState(false);
  const [pendingLasagnaItem, setPendingLasagnaItem] = useState<any>(null);

  const currentPrice = item.sizes && selectedSize
    ? item.sizes.find((s) => s.name === selectedSize)?.price || item.base_price
    : item.base_price;

  const isPizza = item.category === 'pizza';
  const isWings = item.category === 'chicken_wings';
  const isLasagna = item.category === 'baked_lasagna';
  const isGarlicToast = isLasagna && (item.name.toLowerCase().includes('garlic') || item.name.toLowerCase().includes('toast'));

  const handleAddToCart = () => {
    if (isPizza) {
      setIsCustomizing(true);
      return;
    }

    if (isWings) {
      setIsCustomizingWings(true);
      return;
    }

    if (isLasagna && !isGarlicToast) {
      const cartItem = {
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.base_price,
        image: item.image_url || '/placeholder.svg',
        category: item.category as 'baked_lasagna',
        popular: item.is_popular,
      };
      setPendingLasagnaItem(cartItem);
      setShowLasagnaUpsell(true);
      return;
    }

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

  const handleLasagnaUpsellComplete = (upsellItems: { id: string; name: string; price: number; image_url?: string | null; quantity: number }[]) => {
    if (pendingLasagnaItem) {
      addToCart(pendingLasagnaItem);
    }
    
    upsellItems.forEach(upsellItem => {
      for (let i = 0; i < upsellItem.quantity; i++) {
        addToCart({
          id: upsellItem.id,
          name: upsellItem.name,
          description: '',
          price: upsellItem.price,
          image: upsellItem.image_url || '/placeholder.svg',
          category: 'sides',
        });
      }
    });
    
    setPendingLasagnaItem(null);
    setShowLasagnaUpsell(false);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const handleLasagnaUpsellClose = () => {
    setPendingLasagnaItem(null);
    setShowLasagnaUpsell(false);
  };

  return (
    <>
      <Card 
        className="group overflow-hidden border-0 shadow-card hover:shadow-warm transition-all duration-300 bg-card cursor-pointer flex flex-col h-full"
        onClick={handleAddToCart}
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <OptimizedImage
            src={item.image_url}
            alt={item.name}
            width={400}
            containerClassName="w-full h-full"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {item.is_popular && (
            <div className="absolute top-2 left-2 bg-accent text-accent-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              Popular
            </div>
          )}
        </div>
        <CardContent className="p-3 flex flex-col flex-1">
          <div className="flex-1 space-y-1.5">
            <div>
              <h3 className="font-serif text-base font-semibold text-foreground leading-tight">{item.name}</h3>
              {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
              )}
            </div>

            {item.default_toppings && item.default_toppings.length > 0 && (
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                Includes: {item.default_toppings.map(t => t.topping?.name).filter(Boolean).join(', ')}
              </p>
            )}

            {!isPizza && item.sizes && item.sizes.length > 0 && (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
          </div>

          <div className="flex items-center justify-between pt-2 mt-2 border-t border-border">
            <div>
              <span className="text-lg font-bold text-primary">
                {isPizza ? `From $${(item.sizes?.[0]?.price || item.base_price).toFixed(2)}` : `$${currentPrice.toFixed(2)}`}
              </span>
            </div>
            <Button
              variant={isAdded ? "accent" : "pizza"}
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleAddToCart(); }}
              className="gap-1"
            >
              {isAdded ? (
                <>
                  <Check className="w-4 h-4" /> Added
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> {isPizza || isWings ? 'Customize' : 'Add'}
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

      {isWings && (
        <WingsCustomizationModal
          item={item}
          isOpen={isCustomizingWings}
          onClose={() => setIsCustomizingWings(false)}
        />
      )}

      {isLasagna && !isGarlicToast && (
        <UpsellModal
          isOpen={showLasagnaUpsell}
          onClose={handleLasagnaUpsellClose}
          onComplete={handleLasagnaUpsellComplete}
          excludeSteps={['dipping_sauce', 'wings']}
        />
      )}
    </>
  );
};

export default MenuCardDB;

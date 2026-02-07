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

// Helper to get optimized Supabase image URL
const getOptimizedImageUrl = (url: string | null, width = 400): string => {
  if (!url || url === '/placeholder.svg') return '/placeholder.svg';
  // Supabase storage transform: append render/image/t_ params
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&quality=75`;
  }
  return url;
};

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
  // Check if it's a garlic toast item (exclude from upsell flow)
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

    // Baked lasagna items (except garlic toast) get upsell flow
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

    // Other items go directly to cart
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
    // First add the lasagna item
    if (pendingLasagnaItem) {
      addToCart(pendingLasagnaItem);
    }
    
    // Then add all upsell items
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
    
    // Reset and show added feedback
    setPendingLasagnaItem(null);
    setShowLasagnaUpsell(false);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const handleLasagnaUpsellClose = () => {
    // User cancelled - don't add anything
    setPendingLasagnaItem(null);
    setShowLasagnaUpsell(false);
  };

  return (
    <>
      <Card 
        className="group overflow-hidden border-0 shadow-card hover:shadow-warm transition-all duration-300 bg-card cursor-pointer flex flex-col h-full"
        onClick={handleAddToCart}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={getOptimizedImageUrl(item.image_url)}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {item.is_popular && (
            <div className="absolute top-3 left-3 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full">
              Popular
            </div>
          )}
        </div>
        <CardContent className="p-4 flex flex-col flex-1">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-foreground">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>

            {item.default_toppings && item.default_toppings.length > 0 && (
              <p className="text-xs text-muted-foreground">
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

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
            <div>
              <span className="text-xl font-bold text-primary">
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

      {/* Lasagna upsell - Drinks and Garlic Toast only */}
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

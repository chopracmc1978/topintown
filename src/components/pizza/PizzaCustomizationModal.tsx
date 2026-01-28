import { useState, useMemo, useEffect } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCart } from '@/contexts/CartContext';
import type { MenuItem } from '@/hooks/useMenuItems';
import { useSizeCrustAvailability, useCheeseOptions, useFreeToppings, useAllSauces, getCrustsForSize } from '@/hooks/usePizzaOptions';
import { useToppings } from '@/hooks/useMenuItems';
import type { PizzaCustomization, SpicyLevel, ToppingQuantity, SauceQuantity, SelectedSauce, SelectedTopping } from '@/types/pizzaCustomization';
import SizeSelector from './SizeSelector';
import CrustSelector from './CrustSelector';
import SauceSelector from './SauceSelector';
import CheeseSelector from './CheeseSelector';
import FreeToppingsSelector from './FreeToppingsSelector';
import SpicyLevelSelector from './SpicyLevelSelector';
import DefaultToppingsSelector from './DefaultToppingsSelector';
import ExtraToppingsSelector from './ExtraToppingsSelector';

interface PizzaCustomizationModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
}

const PizzaCustomizationModal = ({ item, isOpen, onClose }: PizzaCustomizationModalProps) => {
  const { addToCart } = useCart();
  const { data: sizeCrustAvailability } = useSizeCrustAvailability();
  const { data: cheeseOptions } = useCheeseOptions();
  const { data: freeToppingsData } = useFreeToppings();
  const { data: allSauces } = useAllSauces();
  const { data: allToppings } = useToppings();

  // Get default values
  const defaultSize = item.sizes?.[1] || item.sizes?.[0];
  const defaultCheese = cheeseOptions?.find(c => c.is_default);

  // State
  const [selectedSize, setSelectedSize] = useState<{ id: string; name: string; price: number } | null>(null);
  const [selectedCrust, setSelectedCrust] = useState<{ id: string; name: string; price: number } | null>(null);
  const [selectedSauces, setSelectedSauces] = useState<SelectedSauce[]>([]);
  const [selectedCheese, setSelectedCheese] = useState<{ id: string; name: string; quantity: 'regular' | 'extra'; price: number } | null>(null);
  const [selectedFreeToppings, setSelectedFreeToppings] = useState<string[]>([]);
  const [spicyLevel, setSpicyLevel] = useState<SpicyLevel>('none');
  const [defaultToppings, setDefaultToppings] = useState<SelectedTopping[]>([]);
  const [extraToppings, setExtraToppings] = useState<SelectedTopping[]>([]);

  // Initialize defaults when data loads
  useEffect(() => {
    if (defaultSize && !selectedSize) {
      setSelectedSize({ id: defaultSize.id, name: defaultSize.name, price: defaultSize.price });
    }
  }, [defaultSize, selectedSize]);

  useEffect(() => {
    if (selectedSize && sizeCrustAvailability && !selectedCrust) {
      const availableCrusts = getCrustsForSize(sizeCrustAvailability, selectedSize.name);
      if (availableCrusts.length > 0) {
        setSelectedCrust({ id: availableCrusts[0].id, name: availableCrusts[0].name, price: availableCrusts[0].price });
      }
    }
  }, [selectedSize, sizeCrustAvailability, selectedCrust]);

  useEffect(() => {
    if (defaultCheese && !selectedCheese) {
      setSelectedCheese({ id: defaultCheese.id, name: defaultCheese.name, quantity: 'regular', price: 0 });
    }
  }, [defaultCheese, selectedCheese]);

  // Initialize default toppings from the pizza
  useEffect(() => {
    if (item.default_toppings && defaultToppings.length === 0) {
      const defaults = item.default_toppings.map(dt => ({
        id: dt.topping_id,
        name: dt.topping?.name || 'Unknown',
        quantity: 'regular' as ToppingQuantity,
        price: 0,
        isDefault: true,
        isVeg: dt.topping?.is_veg,
      }));
      setDefaultToppings(defaults);
    }
  }, [item.default_toppings, defaultToppings.length]);

  // Available crusts based on selected size
  const availableCrusts = useMemo(() => {
    if (!selectedSize || !sizeCrustAvailability) return [];
    return getCrustsForSize(sizeCrustAvailability, selectedSize.name);
  }, [selectedSize, sizeCrustAvailability]);

  // Update crust when size changes
  useEffect(() => {
    if (selectedSize && availableCrusts.length > 0) {
      const currentCrustAvailable = availableCrusts.find(c => c.id === selectedCrust?.id);
      if (!currentCrustAvailable) {
        setSelectedCrust({ id: availableCrusts[0].id, name: availableCrusts[0].name, price: availableCrusts[0].price });
      }
    }
  }, [selectedSize, availableCrusts, selectedCrust?.id]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    let total = selectedSize?.price || 0;
    total += selectedCrust?.price || 0;
    
    // Sauce prices
    selectedSauces.forEach(sauce => {
      if (!sauce.isDefault) {
        total += sauce.price;
      }
      if (sauce.quantity === 'extra') {
        total += sauce.price;
      }
    });

    // Cheese price
    if (selectedCheese?.quantity === 'extra') {
      const cheese = cheeseOptions?.find(c => c.id === selectedCheese.id);
      total += cheese?.price_extra || 0;
    }

    // Extra toppings
    extraToppings.forEach(topping => {
      if (topping.quantity !== 'none') {
        const toppingData = allToppings?.find(t => t.id === topping.id);
        if (toppingData) {
          let price = toppingData.price;
          if (selectedSize?.name.includes('Small')) {
            price = toppingData.price_small || toppingData.price;
          } else if (selectedSize?.name.includes('Medium')) {
            price = toppingData.price_medium || toppingData.price;
          } else if (selectedSize?.name.includes('Large')) {
            price = toppingData.price_large || toppingData.price;
          }
          if (topping.quantity === 'extra') {
            price *= 1.5;
          }
          total += price;
        }
      }
    });

    return total;
  }, [selectedSize, selectedCrust, selectedSauces, selectedCheese, extraToppings, cheeseOptions, allToppings]);

  const handleAddToCart = () => {
    if (!selectedSize || !selectedCrust || !selectedCheese) return;

    // Create a cart-compatible item
    const cartItem = {
      id: `${item.id}-${Date.now()}`, // Unique ID for customized pizza
      name: `${item.name} (Customized)`,
      description: `${selectedSize.name}, ${selectedCrust.name} crust`,
      price: totalPrice,
      image: item.image_url || '/placeholder.svg',
      category: 'pizza' as const,
      popular: item.is_popular,
    };

    addToCart(cartItem);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 bg-card">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <img
                src={item.image_url || '/placeholder.svg'}
                alt={item.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div>
                <DialogTitle className="font-serif text-xl">{item.name}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-6 py-4">
            {/* Size Selection */}
            <SizeSelector
              sizes={item.sizes || []}
              selectedSize={selectedSize}
              onSelectSize={setSelectedSize}
            />

            {/* Crust Selection */}
            <CrustSelector
              crusts={availableCrusts}
              selectedCrust={selectedCrust}
              onSelectCrust={setSelectedCrust}
            />

            {/* Sauce Selection */}
            <SauceSelector
              sauces={allSauces || []}
              selectedSauces={selectedSauces}
              onUpdateSauces={setSelectedSauces}
            />

            {/* Cheese Selection */}
            <CheeseSelector
              cheeses={cheeseOptions || []}
              selectedCheese={selectedCheese}
              onSelectCheese={setSelectedCheese}
            />

            {/* Free Toppings */}
            <FreeToppingsSelector
              freeToppings={freeToppingsData || []}
              selectedFreeToppings={selectedFreeToppings}
              onToggleFreeTopping={(id) => {
                setSelectedFreeToppings(prev => 
                  prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
                );
              }}
            />

            {/* Spicy Level */}
            <SpicyLevelSelector
              spicyLevel={spicyLevel}
              onSelectSpicyLevel={setSpicyLevel}
            />

            {/* Default Toppings */}
            <DefaultToppingsSelector
              defaultToppings={defaultToppings}
              onUpdateTopping={(id, quantity) => {
                setDefaultToppings(prev => 
                  prev.map(t => t.id === id ? { ...t, quantity } : t)
                );
              }}
            />

            {/* Extra Toppings */}
            <ExtraToppingsSelector
              allToppings={allToppings || []}
              extraToppings={extraToppings}
              defaultToppingIds={defaultToppings.map(t => t.id)}
              selectedSize={selectedSize?.name || 'Medium'}
              onAddTopping={(topping) => {
                setExtraToppings(prev => [...prev, topping]);
              }}
              onUpdateTopping={(id, quantity) => {
                if (quantity === 'none') {
                  setExtraToppings(prev => prev.filter(t => t.id !== id));
                } else {
                  setExtraToppings(prev => 
                    prev.map(t => t.id === id ? { ...t, quantity } : t)
                  );
                }
              }}
              onRemoveTopping={(id) => {
                setExtraToppings(prev => prev.filter(t => t.id !== id));
              }}
            />
          </div>
        </ScrollArea>

        <div className="p-6 pt-0 border-t border-border mt-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-muted-foreground">Total</span>
              <p className="text-2xl font-bold text-primary">${totalPrice.toFixed(2)}</p>
            </div>
            <Button variant="pizza" size="lg" onClick={handleAddToCart}>
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PizzaCustomizationModal;

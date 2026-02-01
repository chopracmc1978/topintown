import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { MenuItem } from '@/hooks/useMenuItems';
import { useSizeCrustAvailability, useFreeToppings, getCrustsForSize } from '@/hooks/usePizzaOptions';
import { useToppings } from '@/hooks/useMenuItems';
import { useGlobalSauces } from '@/hooks/useGlobalSauces';
import type { CartItem } from '@/types/menu';
import type { SelectedTopping, ToppingQuantity, PizzaSide } from '@/types/pizzaCustomization';
import { cn } from '@/lib/utils';

interface POSPizzaModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToOrder: (item: CartItem) => void;
  editingItem?: CartItem | null;
}

const GLUTEN_FREE_PRICE = 2.5;
type SpicyLevel = 'none' | 'medium' | 'hot';
type Side = 'left' | 'whole' | 'right';

const QUANTITY_OPTIONS: { value: ToppingQuantity; label: string }[] = [
  { value: 'less', label: 'Less' },
  { value: 'regular', label: 'Reg' },
  { value: 'extra', label: 'Extra' },
];

const SIDE_OPTIONS: { value: Side; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'whole', label: 'Whole' },
  { value: 'right', label: 'Right' },
];

const getExtraToppingPrice = (sizeName: string): number => {
  if (sizeName.includes('Small')) return 2;
  if (sizeName.includes('Medium') || sizeName.toLowerCase().includes('gluten')) return 2.5;
  return 3; // Large
};

// Free topping with side selection
interface FreeToppingSelection {
  name: string;
  side: Side;
}

export const POSPizzaModal = ({ item, isOpen, onClose, onAddToOrder, editingItem }: POSPizzaModalProps) => {
  const { data: sizeCrustAvailability } = useSizeCrustAvailability();
  const { data: freeToppingsData } = useFreeToppings();
  const { data: allSauces } = useGlobalSauces();
  const { data: allToppings } = useToppings();

  const defaultSauceIds = useMemo(
    () => item.default_global_sauces?.map(ds => ds.global_sauce_id) || [],
    [item.default_global_sauces]
  );
  const defaultSize = item.sizes?.[1] || item.sizes?.[0];
  const editCustomization = editingItem?.pizzaCustomization;

  // State
  const [selectedSize, setSelectedSize] = useState<{ id: string; name: string; price: number } | null>(
    editCustomization?.size || null
  );
  const [selectedCrust, setSelectedCrust] = useState<{ id: string; name: string; price: number } | null>(
    editCustomization?.crust || null
  );
  const [selectedCheese, setSelectedCheese] = useState<string>(editCustomization?.cheeseType || 'Mozzarella');
  const [cheeseQuantity, setCheeseQuantity] = useState<'less' | 'normal' | 'extra'>('normal');
  const [selectedSauceId, setSelectedSauceId] = useState<string | null>(editCustomization?.sauceId || null);
  const [sauceQuantity, setSauceQuantity] = useState<'less' | 'normal' | 'extra'>(
    editCustomization?.sauceQuantity === 'extra' ? 'extra' : 'normal'
  );
  const [note, setNote] = useState<string>(editCustomization?.note || '');
  const [extraAmount, setExtraAmount] = useState<number>(editCustomization?.extraAmount || 0);
  
  // Spicy state - supports side-specific levels for large pizzas
  const [leftSpicy, setLeftSpicy] = useState<SpicyLevel>('none');
  const [rightSpicy, setRightSpicy] = useState<SpicyLevel>('none');
  
  // Default toppings state (from pizza's default_toppings)
  const [defaultToppings, setDefaultToppings] = useState<SelectedTopping[]>(editCustomization?.defaultToppings || []);
  
  // Extra toppings state
  const [extraToppings, setExtraToppings] = useState<SelectedTopping[]>(editCustomization?.extraToppings || []);
  
  // Free toppings with side selection
  const [freeToppingSelections, setFreeToppingSelections] = useState<FreeToppingSelection[]>([]);

  // Is large pizza (allows side selection)
  const isLargePizza = selectedSize?.name?.includes('Large') || selectedSize?.name?.includes('14"');

  // Get pizza's default toppings from menu item
  const pizzaDefaultToppings = useMemo(() => {
    return item.default_toppings?.map(dt => ({
      id: dt.topping_id,
      name: dt.topping?.name || '',
      isRemovable: dt.is_removable,
      isVeg: dt.topping?.is_veg,
    })) || [];
  }, [item.default_toppings]);

  // Initialize defaults
  useEffect(() => {
    if (isOpen && !editCustomization) {
      if (defaultSize) {
        setSelectedSize({ id: defaultSize.id, name: defaultSize.name, price: defaultSize.price });
      }
      if (defaultSauceIds.length > 0) {
        setSelectedSauceId(defaultSauceIds[0]);
      }
      setSelectedCheese('Mozzarella');
      setCheeseQuantity('normal');
      setNote('');
      setExtraAmount(0);
      setLeftSpicy('none');
      setRightSpicy('none');
      setSauceQuantity('normal');
      setExtraToppings([]);
      setFreeToppingSelections([]);
      
      // Initialize default toppings with 'regular' quantity
      const initialDefaults: SelectedTopping[] = pizzaDefaultToppings.map(t => ({
        id: t.id,
        name: t.name,
        quantity: 'regular' as ToppingQuantity,
        price: 0,
        isDefault: true,
        isVeg: t.isVeg,
        side: 'whole' as PizzaSide,
      }));
      setDefaultToppings(initialDefaults);
    }
  }, [isOpen, editCustomization, defaultSize, defaultSauceIds, pizzaDefaultToppings]);

  // Get available crusts for selected size
  const availableCrusts = useMemo(() => {
    if (!selectedSize || !sizeCrustAvailability) return [];
    return getCrustsForSize(sizeCrustAvailability, selectedSize.name);
  }, [selectedSize, sizeCrustAvailability]);

  // Auto-select first crust when size changes
  useEffect(() => {
    if (availableCrusts.length > 0 && !editCustomization) {
      const regularCrust = availableCrusts.find(c => c.name.toLowerCase().includes('regular'));
      setSelectedCrust(regularCrust || availableCrusts[0]);
    }
  }, [availableCrusts, editCustomization]);

  // Reset sides when size changes (only large allows L/W/R)
  useEffect(() => {
    if (!isLargePizza) {
      // Reset spicy to whole (both sides same)
      setLeftSpicy('none');
      setRightSpicy('none');
      // Reset all topping sides to whole
      setDefaultToppings(prev => prev.map(t => ({ ...t, side: 'whole' as PizzaSide })));
      setExtraToppings(prev => prev.map(t => ({ ...t, side: 'whole' as PizzaSide })));
      setFreeToppingSelections(prev => prev.map(t => ({ ...t, side: 'whole' as Side })));
    }
  }, [isLargePizza]);

  // Available sauces
  const availableSauces = allSauces?.filter(s => s.is_available) || [];
  
  // Available extra toppings (sorted: veg first, then non-veg, excluding Cheese)
  const availableExtraToppings = useMemo(() => {
    const toppings = allToppings?.filter(t => 
      t.is_available && t.name.toLowerCase() !== 'cheese'
    ) || [];
    return [...toppings].sort((a, b) => {
      if (a.is_veg === b.is_veg) return a.sort_order - b.sort_order;
      return a.is_veg ? -1 : 1;
    });
  }, [allToppings]);

  const freeToppings = freeToppingsData?.filter(t => t.is_available) || [];

  // Update default topping quantity
  const updateDefaultToppingQuantity = (toppingId: string, quantity: ToppingQuantity) => {
    setDefaultToppings(prev => prev.map(t => 
      t.id === toppingId ? { ...t, quantity } : t
    ));
  };

  // Update default topping side
  const updateDefaultToppingSide = (toppingId: string, side: PizzaSide) => {
    setDefaultToppings(prev => prev.map(t => 
      t.id === toppingId ? { ...t, side } : t
    ));
  };

  // Toggle extra topping
  const toggleExtraTopping = (topping: typeof availableExtraToppings[0]) => {
    setExtraToppings(prev => {
      const existing = prev.find(t => t.id === topping.id);
      if (existing) {
        return prev.filter(t => t.id !== topping.id);
      }
      const toppingPrice = getExtraToppingPrice(selectedSize?.name || '');
      return [...prev, {
        id: topping.id,
        name: topping.name,
        quantity: 'regular' as ToppingQuantity,
        side: 'whole' as PizzaSide,
        isVeg: topping.is_veg,
        price: toppingPrice,
      }];
    });
  };

  // Update extra topping side
  const updateExtraToppingSide = (toppingId: string, side: PizzaSide) => {
    setExtraToppings(prev => prev.map(t => 
      t.id === toppingId ? { ...t, side } : t
    ));
  };

  // Toggle free topping
  const toggleFreeTopping = (name: string) => {
    setFreeToppingSelections(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        return prev.filter(t => t.name !== name);
      }
      return [...prev, { name, side: 'whole' as Side }];
    });
  };

  // Update free topping side
  const updateFreeToppingSide = (name: string, side: Side) => {
    setFreeToppingSelections(prev => prev.map(t => 
      t.name === name ? { ...t, side } : t
    ));
  };

  // Calculate price
  const calculatePrice = () => {
    let price = selectedSize?.price || 0;
    
    // Crust price (gluten free)
    if (selectedCrust?.name.toLowerCase().includes('gluten')) {
      price += GLUTEN_FREE_PRICE;
    }
    
    // Cheese extra price
    if (selectedCheese === 'Dairy Free') {
      price += selectedSize?.name === 'Small 10"' ? 2 : 3;
    }
    
    // Extra cheese price (Mozzarella Extra)
    if (selectedCheese === 'Mozzarella' && cheeseQuantity === 'extra') {
      if (selectedSize?.name?.includes('Small')) {
        price += 2;
      } else if (selectedSize?.name?.includes('Medium')) {
        price += 2.5;
      } else {
        price += 3; // Large
      }
    }
    
    // Extra default toppings (extra quantity costs extra)
    const toppingPrice = getExtraToppingPrice(selectedSize?.name || '');
    defaultToppings.forEach(t => {
      if (t.quantity === 'extra') {
        price += toppingPrice;
      }
    });
    
    // Extra toppings price
    price += extraToppings.length * toppingPrice;
    
    // Extra amount for special requests
    price += extraAmount;
    
    return price;
  };

  const totalPrice = calculatePrice();

  const handleAddToOrder = () => {
    if (!selectedSize || !selectedCrust) return;

    const sauceName = allSauces?.find(s => s.id === selectedSauceId)?.name || 'No Sauce';

    // Build spicy level object from left/right state
    const spicyLevelObj = {
      left: leftSpicy,
      right: rightSpicy,
    };

    const cartItem: CartItem = {
      id: `${item.id}-${Date.now()}`,
      name: item.name,
      description: item.description || '',
      price: totalPrice,
      image: item.image_url || '',
      category: 'pizza',
      quantity: 1,
      selectedSize: selectedSize.name,
      totalPrice: totalPrice,
      pizzaCustomization: {
        size: selectedSize,
        crust: selectedCrust,
        cheeseType: selectedCheese,
        cheeseSides: [{ side: 'whole', quantity: 'normal' }],
        sauceId: selectedSauceId,
        sauceName,
        sauceQuantity: sauceQuantity === 'extra' ? 'extra' : 'normal',
        freeToppings: freeToppingSelections.map(f => `${f.name}${isLargePizza && f.side !== 'whole' ? ` (${f.side})` : ''}`),
        spicyLevel: spicyLevelObj,
        defaultToppings,
        extraToppings,
        note,
        extraAmount: extraAmount > 0 ? extraAmount : undefined,
        originalItemId: item.id,
      },
    };

    onAddToOrder(cartItem);
    onClose();
  };

  const extraToppingPrice = getExtraToppingPrice(selectedSize?.name || '');

  // Compact button style
  const btnSmall = "px-2 py-1 text-xs rounded border font-medium transition-colors";
  const btnActive = "border-primary bg-primary/10 text-primary";
  const btnInactive = "border-border hover:bg-secondary";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl overflow-hidden p-4">
        {/* Header Row: Pizza Name + Size + Crust inline */}
        <div className="flex items-center gap-4 pb-2 border-b pr-6">
          <h2 className="font-serif text-base font-semibold text-primary whitespace-nowrap">{item.name}</h2>
          
          {/* Size */}
          <span className="text-xs text-muted-foreground">Size</span>
          <div className="flex gap-1">
            {item.sizes?.map(size => (
              <button
                key={size.id}
                onClick={() => setSelectedSize({ id: size.id, name: size.name, price: size.price })}
                className={cn(btnSmall, "py-1.5 px-3", selectedSize?.id === size.id ? btnActive : btnInactive)}
              >
                <div className="text-[10px]">{size.name}</div>
                <div className="text-primary text-[10px]">${size.price.toFixed(2)}</div>
              </button>
            ))}
          </div>

          {/* Crust - inline on same row */}
          {availableCrusts.length > 0 && (
            <>
              <span className="text-xs text-muted-foreground">Crust</span>
              <div className="flex gap-1 flex-1">
                {availableCrusts.map(crust => (
                  <button
                    key={crust.id}
                    onClick={() => setSelectedCrust(crust)}
                    className={cn(btnSmall, "flex-1 py-1.5 px-4", selectedCrust?.id === crust.id ? btnActive : btnInactive)}
                  >
                    {crust.name}
                    {crust.name.toLowerCase().includes('gluten') && (
                      <span className="text-primary ml-1">+${GLUTEN_FREE_PRICE}</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="space-y-2 mt-2">
          {/* Row 1: Cheese (all inline: type + quantity) + Free Add-ons */}
          <div className="flex items-start gap-6">
            <div>
              <h3 className="font-medium text-xs mb-1">Cheese</h3>
              <div className="flex gap-1 items-center">
                {/* Cheese type options */}
                {['No Cheese', 'Mozzarella', 'Dairy Free'].map(cheese => (
                  <button
                    key={cheese}
                    onClick={() => {
                      setSelectedCheese(cheese);
                      if (cheese !== 'Mozzarella') setCheeseQuantity('normal');
                    }}
                    className={cn(btnSmall, selectedCheese === cheese ? btnActive : btnInactive)}
                  >
                    {cheese === 'No Cheese' ? 'None' : cheese === 'Mozzarella' ? 'Mozz' : 'Dairy Free'}
                    {cheese === 'Dairy Free' && (
                      <span className="text-primary ml-0.5">+${selectedSize?.name === 'Small 10"' ? 2 : 3}</span>
                    )}
                  </button>
                ))}
                {/* Quantity options - always visible */}
                {(['less', 'normal', 'extra'] as const).map(qty => {
                  const extraPrice = selectedSize?.name?.includes('Small') ? 2 : 
                                     selectedSize?.name?.includes('Medium') ? 2.5 : 3;
                  const isDisabled = selectedCheese === 'No Cheese';
                  return (
                    <button
                      key={qty}
                      onClick={() => !isDisabled && setCheeseQuantity(qty)}
                      disabled={isDisabled}
                      className={cn(
                        "px-3 py-1 text-xs rounded border font-medium transition-colors",
                        isDisabled ? "opacity-40 cursor-not-allowed" :
                        cheeseQuantity === qty ? btnActive : btnInactive
                      )}
                    >
                      {qty === 'less' ? 'Less' : qty === 'normal' ? 'Normal' : 'Extra'}
                      {qty === 'extra' && <span className="text-primary ml-1">+${extraPrice}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Free Add-ons - inline on same row */}
            {freeToppings.length > 0 && (
              <div className="flex-1">
                <h3 className="font-medium text-xs mb-1">Free Add-ons</h3>
                <div className="flex gap-3">
                  {freeToppings.map(topping => {
                    const selection = freeToppingSelections.find(f => f.name === topping.name);
                    const isSelected = !!selection;
                    return (
                      <div key={topping.id} className="flex items-center gap-1">
                        <button
                          onClick={() => toggleFreeTopping(topping.name)}
                          className={cn(btnSmall, isSelected ? btnActive : btnInactive)}
                        >
                          {topping.name}
                        </button>
                        {isLargePizza ? (
                          <div className="flex gap-0.5">
                            {(['left', 'whole', 'right'] as const).map(side => (
                              <button
                                key={side}
                                onClick={() => {
                                  if (!isSelected) toggleFreeTopping(topping.name);
                                  updateFreeToppingSide(topping.name, side);
                                }}
                                className={cn(
                                  "px-1.5 py-1 text-[10px] rounded border font-medium transition-colors",
                                  isSelected && selection?.side === side ? btnActive : btnInactive
                                )}
                              >
                                {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (!isSelected) toggleFreeTopping(topping.name);
                            }}
                            className={cn(
                              "px-2 py-1 text-[10px] rounded border font-medium transition-colors",
                              isSelected ? btnActive : btnInactive
                            )}
                          >
                            Whole
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Spicy Level */}
          <div>
            <h3 className="font-medium text-xs mb-1">Spicy Level</h3>
            <div className="flex items-center gap-2">
              {/* None button - always enabled so user can reset */}
              <button
                onClick={() => {
                  setLeftSpicy('none');
                  setRightSpicy('none');
                }}
                className={cn(
                  "px-3 py-1.5 text-xs rounded border font-medium transition-colors min-w-[50px]",
                  leftSpicy === 'none' && rightSpicy === 'none' ? btnActive : btnInactive
                )}
              >
                None
              </button>

              {/* Medium button with L/W/R for large pizza */}
              {isLargePizza ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-foreground min-w-[70px]">Medium Hot</span>
                  <div className="flex gap-0.5">
                  {(['left', 'whole', 'right'] as Side[]).map(side => {
                      // Active states - show only the selected button
                      const isWholeSelected = leftSpicy === 'medium' && rightSpicy === 'medium';
                      const isActive = side === 'whole' 
                        ? isWholeSelected
                        : side === 'left' 
                          ? leftSpicy === 'medium' && !isWholeSelected
                          : rightSpicy === 'medium' && !isWholeSelected;
                      
                      // Disable logic:
                      // - If whole Medium is active, disable L/R for Medium
                      // - If Hot is on same side, disable Medium for that side
                      // - If Hot Whole is active, disable all Medium
                      const hotWhole = leftSpicy === 'hot' && rightSpicy === 'hot';
                      const medWhole = leftSpicy === 'medium' && rightSpicy === 'medium';
                      
                      let isDisabled = false;
                      if (hotWhole) isDisabled = true;
                      if (side === 'left' && leftSpicy === 'hot') isDisabled = true;
                      if (side === 'right' && rightSpicy === 'hot') isDisabled = true;
                      if (side === 'whole' && (leftSpicy === 'hot' || rightSpicy === 'hot')) isDisabled = true;
                      
                      return (
                        <button
                          key={side}
                          disabled={isDisabled}
                          onClick={() => {
                            if (side === 'whole') {
                              setLeftSpicy('medium');
                              setRightSpicy('medium');
                            } else if (side === 'left') {
                              setLeftSpicy('medium');
                              if (rightSpicy !== 'hot') setRightSpicy('none');
                            } else {
                              setRightSpicy('medium');
                              if (leftSpicy !== 'hot') setLeftSpicy('none');
                            }
                          }}
                          className={cn(
                            "px-2.5 py-1.5 text-xs rounded border font-medium transition-colors min-w-[45px]",
                            isActive ? btnActive : btnInactive,
                            isDisabled && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setLeftSpicy('medium');
                    setRightSpicy('medium');
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded border font-medium transition-colors min-w-[70px]",
                    leftSpicy === 'medium' ? btnActive : btnInactive
                  )}
                >
                  Medium
                </button>
              )}

              {/* Hot button with L/W/R for large pizza */}
              {isLargePizza ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-foreground min-w-[30px]">Hot</span>
                  <div className="flex gap-0.5">
                  {(['left', 'whole', 'right'] as Side[]).map(side => {
                      // Active states - show only the selected button
                      const isWholeSelected = leftSpicy === 'hot' && rightSpicy === 'hot';
                      const isActive = side === 'whole' 
                        ? isWholeSelected
                        : side === 'left' 
                          ? leftSpicy === 'hot' && !isWholeSelected
                          : rightSpicy === 'hot' && !isWholeSelected;
                      
                      // Disable logic:
                      // - If whole Hot is active, disable L/R for Hot
                      // - If Medium is on same side, disable Hot for that side
                      // - If Medium Whole is active, disable all Hot
                      const medWhole = leftSpicy === 'medium' && rightSpicy === 'medium';
                      const hotWhole = leftSpicy === 'hot' && rightSpicy === 'hot';
                      
                      let isDisabled = false;
                      if (medWhole) isDisabled = true;
                      if (side === 'left' && leftSpicy === 'medium') isDisabled = true;
                      if (side === 'right' && rightSpicy === 'medium') isDisabled = true;
                      if (side === 'whole' && (leftSpicy === 'medium' || rightSpicy === 'medium')) isDisabled = true;
                      
                      return (
                        <button
                          key={side}
                          disabled={isDisabled}
                          onClick={() => {
                            if (side === 'whole') {
                              setLeftSpicy('hot');
                              setRightSpicy('hot');
                            } else if (side === 'left') {
                              setLeftSpicy('hot');
                              if (rightSpicy !== 'medium') setRightSpicy('none');
                            } else {
                              setRightSpicy('hot');
                              if (leftSpicy !== 'medium') setLeftSpicy('none');
                            }
                          }}
                          className={cn(
                            "px-2.5 py-1.5 text-xs rounded border font-medium transition-colors min-w-[45px]",
                            isActive ? btnActive : btnInactive,
                            isDisabled && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setLeftSpicy('hot');
                    setRightSpicy('hot');
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded border font-medium transition-colors min-w-[50px]",
                    leftSpicy === 'hot' ? btnActive : btnInactive
                  )}
                >
                  Hot
                </button>
              )}
            </div>
          </div>

          {/* Sauce Selection - 2 rows with 5 columns */}
          <div>
            <h3 className="font-medium text-xs mb-1">Sauce</h3>
            <div className="grid grid-cols-5 gap-1">
              <button
                onClick={() => setSelectedSauceId(null)}
                className={cn(btnSmall, selectedSauceId === null ? btnActive : btnInactive)}
              >
                No Sauce
              </button>
              {availableSauces.map(sauce => (
                <button
                  key={sauce.id}
                  onClick={() => setSelectedSauceId(sauce.id)}
                  className={cn(btnSmall, selectedSauceId === sauce.id ? btnActive : btnInactive)}
                >
                  {sauce.name}
                </button>
              ))}
              {/* Quantity buttons inline */}
              <div className="flex gap-1 items-center">
                {(['less', 'normal', 'extra'] as const).map(qty => (
                  <button
                    key={qty}
                    onClick={() => selectedSauceId && setSauceQuantity(qty)}
                    disabled={!selectedSauceId}
                    className={cn(
                      "flex-1 px-2 py-1 text-xs rounded border font-medium transition-colors",
                      !selectedSauceId 
                        ? "opacity-50 cursor-not-allowed border-border text-muted-foreground"
                        : sauceQuantity === qty ? btnActive : btnInactive
                    )}
                  >
                    {qty === 'less' ? 'Less' : qty === 'normal' ? 'Normal' : 'Extra'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Default Toppings - 5 column grid */}
          {pizzaDefaultToppings.length > 0 && (
            <div>
              <h3 className="font-medium text-xs mb-1">Default Toppings</h3>
              <div className="grid grid-cols-5 gap-1">
                {defaultToppings.map(topping => {
                  const isRemoved = topping.quantity === 'none';
                  return (
                    <div key={topping.id} className={cn(
                      "rounded p-1 border",
                      isRemoved ? "border-destructive/30 bg-destructive/5" : "border-border"
                    )}>
                      {/* Name row - entire row is clickable to toggle */}
                      <button
                        onClick={() => updateDefaultToppingQuantity(
                          topping.id, 
                          isRemoved ? 'regular' : 'none'
                        )}
                        className="flex items-center gap-1 mb-1 w-full text-left"
                      >
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          topping.isVeg ? "bg-green-500" : "bg-red-500"
                        )} />
                        <span className={cn(
                          "text-[10px] font-medium truncate",
                          isRemoved && "line-through text-muted-foreground"
                        )}>
                          {topping.name}
                        </span>
                      </button>
                      {/* Quantity: Less/Reg/Extra */}
                      {!isRemoved && (
                        <div className="flex gap-0.5 mb-0.5">
                          {QUANTITY_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => updateDefaultToppingQuantity(topping.id, opt.value)}
                              className={cn(
                                "flex-1 px-1 py-0.5 text-[10px] rounded border font-medium transition-colors",
                                topping.quantity === opt.value ? btnActive : btnInactive
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Side: L/W/R (Large only) */}
                      {!isRemoved && isLargePizza && (
                        <div className="flex gap-0.5">
                          {SIDE_OPTIONS.map(side => (
                            <button
                              key={side.value}
                              onClick={() => updateDefaultToppingSide(topping.id, side.value as PizzaSide)}
                              className={cn(
                                "flex-1 px-1 py-0.5 text-[10px] rounded border font-medium transition-colors",
                                topping.side === side.value ? btnActive : btnInactive
                              )}
                            >
                              {side.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extra Toppings - inline L/W/R layout */}
          {availableExtraToppings.length > 0 && (
            <div>
              <h3 className="font-medium text-xs mb-1">
                Extra <span className="text-muted-foreground font-normal">(+${extraToppingPrice.toFixed(2)})</span>
              </h3>
              <div className="grid grid-cols-3 gap-1">
                {availableExtraToppings.map(topping => {
                  const selected = extraToppings.find(t => t.id === topping.id);
                  const isSelected = !!selected;
                  return (
                    <div 
                      key={topping.id} 
                      className={cn(
                        "flex items-center gap-2 px-2 py-1 rounded border transition-colors",
                        isSelected 
                          ? "border-primary bg-primary/10" 
                          : "border-border"
                      )}
                    >
                      {/* Topping name with veg indicator */}
                      <button
                        onClick={() => toggleExtraTopping(topping)}
                        className="flex items-center gap-1.5 flex-1 text-left"
                      >
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          topping.is_veg ? "bg-green-500" : "bg-red-500"
                        )} />
                        <span className="text-xs truncate">{topping.name}</span>
                      </button>

                      {/* Side selection - Large pizza shows L/W/R, others show just W */}
                      {isLargePizza ? (
                        <div className="flex gap-0.5 flex-shrink-0">
                          {SIDE_OPTIONS.map(side => {
                            // Only highlight the selected side when topping is selected
                            const isThisSideActive = isSelected && (selected?.side || 'whole') === side.value;
                            return (
                              <button
                                key={side.value}
                                type="button"
                                onClick={() => {
                                  if (!isSelected) {
                                    // Add topping with this side
                                    toggleExtraTopping(topping);
                                    setTimeout(() => updateExtraToppingSide(topping.id, side.value as PizzaSide), 0);
                                  } else {
                                    // Just update the side
                                    updateExtraToppingSide(topping.id, side.value as PizzaSide);
                                  }
                                }}
                                className={cn(
                                  "px-2 py-1 text-[10px] rounded border font-medium transition-colors",
                                  isThisSideActive ? btnActive : btnInactive
                                )}
                              >
                                {side.label}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleExtraTopping(topping)}
                          className={cn(
                            "px-2 py-1 text-[10px] rounded border font-medium transition-colors flex-shrink-0",
                            isSelected ? btnActive : btnInactive
                          )}
                        >
                          Whole
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes + Extra Amount + Price + Buttons - Bottom row */}
          <div className="flex items-center justify-between pt-2 border-t mt-1">
          <div className="flex items-center gap-2 flex-1 mr-4">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Notes:</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Special requests..."
              className="flex-1 px-2 py-1.5 text-xs border rounded bg-background"
            />
          </div>
          <div className="flex items-center gap-1 mr-4">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Extra $</span>
            <input
              type="text"
              inputMode="decimal"
              value={extraAmount || ''}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                setExtraAmount(parseFloat(val) || 0);
              }}
              placeholder="0"
              className="w-14 px-2 py-1.5 text-xs border rounded bg-background text-center"
            />
          </div>
          <span className="text-base font-bold text-primary mr-4">
            ${totalPrice.toFixed(2)}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button 
              variant="pizza" 
              size="sm"
              onClick={handleAddToOrder}
              disabled={!selectedSize || !selectedCrust}
            >
              {editingItem ? 'Update' : 'Add to Order'}
            </Button>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

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

  // Ultra-compact button style for no-scroll layout - with proper gap padding
  const btnSmall = "px-3 py-2 text-xs rounded border font-medium transition-colors mx-0.5 my-0.5 text-foreground";
  const btnActive = "border-slate-800 bg-slate-800 text-white";
  const btnInactive = "border-slate-300 bg-white hover:bg-slate-50 text-slate-700";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl p-3 pt-2 gap-1 overflow-hidden max-h-[calc(100vh-24px)] bg-white text-slate-900" style={{ backgroundColor: 'white' }}>
        {/* Header Row: Pizza Name + Size + Crust inline */}
        <div className="flex items-center gap-3 pb-1 border-b border-slate-200 pr-6">
          <h2 className="font-serif text-sm font-bold text-slate-900 whitespace-nowrap uppercase">{item.name}</h2>
          
          {/* Size */}
          <span className="text-[10px] text-slate-500">Size</span>
          <div className="flex gap-1">
            {item.sizes?.map(size => (
              <button
                key={size.id}
                onClick={() => setSelectedSize({ id: size.id, name: size.name, price: size.price })}
                className={cn(btnSmall, "py-1 px-2", selectedSize?.id === size.id ? btnActive : btnInactive)}
              >
                <div className="text-[10px] font-medium">{size.name}</div>
                <div className="text-[10px]">${size.price.toFixed(2)}</div>
              </button>
            ))}
          </div>

          {/* Crust - inline on same row */}
          {availableCrusts.length > 0 && (
            <>
              <span className="text-[10px] text-slate-500">Crust</span>
              <div className="flex gap-1 flex-1">
                {availableCrusts.map(crust => (
                  <button
                    key={crust.id}
                    onClick={() => setSelectedCrust(crust)}
                    className={cn(btnSmall, "flex-1 py-1 px-2", selectedCrust?.id === crust.id ? btnActive : btnInactive)}
                  >
                    {crust.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="space-y-1">
          {/* Row 1: Cheese + Spicy Level on same row */}
          <div className="flex items-start gap-8">
            {/* Cheese section */}
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded",
                selectedCheese === 'No Cheese' ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
              )}>Cheese</span>
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
                    <span className="ml-1">+${selectedSize?.name === 'Small 10"' ? 2 : 3}</span>
                  )}
                </button>
              ))}
              {/* Quantity options inline */}
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
                      btnSmall,
                      isDisabled ? "opacity-40 cursor-not-allowed" :
                      cheeseQuantity === qty ? btnActive : btnInactive
                    )}
                  >
                    {qty === 'less' ? 'Less' : qty === 'normal' ? 'Norm' : 'Extra'}
                    {qty === 'extra' && <span className="ml-0.5">+${extraPrice}</span>}
                  </button>
                );
              })}
            </div>
            
            {/* Spicy Level section - on same row */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-700">Spicy Level</span>
              {/* None button */}
              <button
                onClick={() => {
                  setLeftSpicy('none');
                  setRightSpicy('none');
                }}
                className={cn(
                  btnSmall,
                  leftSpicy === 'none' && rightSpicy === 'none' ? btnActive : btnInactive
                )}
              >
                None
              </button>

              {/* Medium button with Left/Whole/Right for large pizza */}
              {(() => {
                const hasMedium = leftSpicy === 'medium' || rightSpicy === 'medium';
                return (
                  <span className="text-xs font-medium text-slate-700">
                    Med Hot
                  </span>
                );
              })()}
              {isLargePizza ? (
                <div className="flex gap-0.5">
                  {(['left', 'whole', 'right'] as Side[]).map(side => {
                    const isWholeSelected = leftSpicy === 'medium' && rightSpicy === 'medium';
                    const isActive = side === 'whole' 
                      ? isWholeSelected
                      : side === 'left' 
                        ? leftSpicy === 'medium' && !isWholeSelected
                        : rightSpicy === 'medium' && !isWholeSelected;
                    
                    const hotWhole = leftSpicy === 'hot' && rightSpicy === 'hot';
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
                          "px-1.5 py-1 text-xs rounded border font-medium transition-colors",
                          isActive ? btnActive : btnInactive,
                          isDisabled && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setLeftSpicy('medium');
                    setRightSpicy('medium');
                  }}
                  className={cn(btnSmall, leftSpicy === 'medium' ? btnActive : btnInactive)}
                >
                  Whole
                </button>
              )}

              {/* Hot button with Left/Whole/Right for large pizza */}
              {(() => {
                const hasHot = leftSpicy === 'hot' || rightSpicy === 'hot';
                return (
                  <span className="text-xs font-medium text-slate-700">
                    Hot
                  </span>
                );
              })()}
              {isLargePizza ? (
                <div className="flex gap-0.5">
                  {(['left', 'whole', 'right'] as Side[]).map(side => {
                    const isWholeSelected = leftSpicy === 'hot' && rightSpicy === 'hot';
                    const isActive = side === 'whole' 
                      ? isWholeSelected
                      : side === 'left' 
                        ? leftSpicy === 'hot' && !isWholeSelected
                        : rightSpicy === 'hot' && !isWholeSelected;
                    
                    const medWhole = leftSpicy === 'medium' && rightSpicy === 'medium';
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
                          "px-1.5 py-1 text-xs rounded border font-medium transition-colors",
                          isActive ? btnActive : btnInactive,
                          isDisabled && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setLeftSpicy('hot');
                    setRightSpicy('hot');
                  }}
                  className={cn(btnSmall, leftSpicy === 'hot' ? btnActive : btnInactive)}
                >
                  Whole
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Free Add-ons */}
          {freeToppings.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-700">Free Add-ons</span>
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
                              "px-1.5 py-1 text-xs rounded border font-medium transition-colors",
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
                          "px-2 py-1 text-xs rounded border font-medium transition-colors",
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
          )}


          {/* Sauce Selection - inline with quantity */}
          <div>
            <h3 className="font-medium text-[10px] mb-0.5 text-slate-700">Sauce</h3>
            <div className="flex flex-wrap gap-1.5 items-center">
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
              <div className="border-l border-slate-300 pl-2 ml-1 flex gap-1">
                {(['less', 'normal', 'extra'] as const).map(qty => (
                  <button
                    key={qty}
                    onClick={() => selectedSauceId && setSauceQuantity(qty)}
                    disabled={!selectedSauceId}
                    className={cn(
                      btnSmall,
                      !selectedSauceId
                        ? "opacity-50 cursor-not-allowed border-slate-200 text-slate-400"
                        : sauceQuantity === qty ? btnActive : btnInactive
                    )}
                  >
                    {qty === 'less' ? 'Less' : qty === 'normal' ? 'Reg' : 'Extra'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Default Toppings - 5 column grid for compactness */}
          {pizzaDefaultToppings.length > 0 && (
            <div>
              <h3 className="font-medium text-[10px] mb-0.5 text-slate-700">Default Toppings</h3>
              <div className="grid grid-cols-5 gap-1">
                {defaultToppings.map(topping => {
                  const isRemoved = topping.quantity === 'none';
                  return (
                    <div key={topping.id} className={cn(
                      "rounded p-1.5 border bg-white",
                      isRemoved ? "border-red-300 bg-red-50/50" : "border-slate-200"
                    )}>
                      {/* Name row - clickable to toggle */}
                      <button
                        onClick={() => updateDefaultToppingQuantity(
                          topping.id, 
                          isRemoved ? 'regular' : 'none'
                        )}
                        className="flex items-center gap-1.5 mb-1 w-full text-left"
                      >
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          topping.isVeg ? "bg-green-500" : "bg-red-500"
                        )} />
                        <span className={cn(
                          "text-xs font-medium truncate",
                          isRemoved ? "line-through text-slate-400" : "text-slate-800"
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
                      {/* Side: Left/Whole/Right (Large only) */}
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

          {/* Extra Toppings - 4 column grid */}
          {availableExtraToppings.length > 0 && (
            <div>
              <h3 className="font-medium text-[10px] mb-0.5 text-slate-700">
                Extra <span className="text-slate-500 font-normal">(+${extraToppingPrice.toFixed(2)})</span>
              </h3>
              <div className="grid grid-cols-4 gap-1">
                {availableExtraToppings.map(topping => {
                  const selected = extraToppings.find(t => t.id === topping.id);
                  const isSelected = !!selected;
                  return (
                    <div 
                      key={topping.id} 
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded border transition-colors bg-white",
                        isSelected 
                          ? "border-slate-800 bg-slate-50" 
                          : "border-slate-200"
                      )}
                    >
                      {/* Topping name with veg indicator */}
                      <button
                        onClick={() => toggleExtraTopping(topping)}
                        className="flex items-center gap-1.5 flex-1 text-left min-w-0"
                      >
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          topping.is_veg ? "bg-green-500" : "bg-red-500"
                        )} />
                        <span className="text-xs truncate text-slate-800">{topping.name}</span>
                      </button>

                      {/* Side selection - Large pizza shows Left/Whole/Right, others show just Whole */}
                      {isLargePizza ? (
                        <div className="flex gap-0.5 flex-shrink-0">
                          {SIDE_OPTIONS.map(side => {
                            const isThisSideActive = isSelected && (selected?.side || 'whole') === side.value;
                            return (
                              <button
                                key={side.value}
                                type="button"
                                onClick={() => {
                                  if (!isSelected) {
                                    toggleExtraTopping(topping);
                                    setTimeout(() => updateExtraToppingSide(topping.id, side.value as PizzaSide), 0);
                                  } else {
                                    updateExtraToppingSide(topping.id, side.value as PizzaSide);
                                  }
                                }}
                                className={cn(
                                  "px-1.5 py-0.5 text-[10px] rounded border font-medium transition-colors",
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
                            "px-2 py-0.5 text-[10px] rounded border font-medium transition-colors flex-shrink-0",
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
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 mt-0.5">
          <div className="flex items-center gap-2 flex-1 mr-4">
            <span className="text-xs text-slate-500 whitespace-nowrap">Notes:</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Special requests..."
              className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-1.5 mr-4">
            <span className="text-xs text-slate-500 whitespace-nowrap">Extra $</span>
            <input
              type="text"
              inputMode="decimal"
              value={extraAmount || ''}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                setExtraAmount(parseFloat(val) || 0);
              }}
              placeholder="0"
              className="w-14 px-2 py-1.5 text-xs border border-slate-300 rounded bg-white text-center text-slate-800"
            />
          </div>
          <span className="text-lg font-bold text-slate-900 mr-4">
            ${totalPrice.toFixed(2)}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="text-sm px-4 py-1.5 h-auto border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</Button>
            <Button 
              variant="default" 
              onClick={handleAddToOrder}
              disabled={!selectedSize || !selectedCrust}
              className="text-sm px-4 py-1.5 h-auto bg-slate-800 text-white hover:bg-slate-700"
            >
              {editingItem ? 'Update' : 'Add'}
            </Button>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

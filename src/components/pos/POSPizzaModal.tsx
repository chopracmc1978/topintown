import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

const getExtraToppingPrice = (sizeName: string): number => {
  if (sizeName.includes('Small')) return 2;
  if (sizeName.includes('Medium') || sizeName.toLowerCase().includes('gluten')) return 2.5;
  return 3;
};

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
  
  const [leftSpicy, setLeftSpicy] = useState<SpicyLevel>('none');
  const [rightSpicy, setRightSpicy] = useState<SpicyLevel>('none');
  const [defaultToppings, setDefaultToppings] = useState<SelectedTopping[]>(editCustomization?.defaultToppings || []);
  const [extraToppings, setExtraToppings] = useState<SelectedTopping[]>(editCustomization?.extraToppings || []);
  const [freeToppingSelections, setFreeToppingSelections] = useState<FreeToppingSelection[]>([]);

  const isLargePizza = selectedSize?.name?.includes('Large') || selectedSize?.name?.includes('14"');

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

  const availableCrusts = useMemo(() => {
    if (!selectedSize || !sizeCrustAvailability) return [];
    return getCrustsForSize(sizeCrustAvailability, selectedSize.name);
  }, [selectedSize, sizeCrustAvailability]);

  useEffect(() => {
    if (availableCrusts.length > 0 && !editCustomization) {
      const regularCrust = availableCrusts.find(c => c.name.toLowerCase().includes('regular'));
      setSelectedCrust(regularCrust || availableCrusts[0]);
    }
  }, [availableCrusts, editCustomization]);

  useEffect(() => {
    if (!isLargePizza) {
      setLeftSpicy('none');
      setRightSpicy('none');
      setDefaultToppings(prev => prev.map(t => ({ ...t, side: 'whole' as PizzaSide })));
      setExtraToppings(prev => prev.map(t => ({ ...t, side: 'whole' as PizzaSide })));
      setFreeToppingSelections(prev => prev.map(t => ({ ...t, side: 'whole' as Side })));
    }
  }, [isLargePizza]);

  const availableSauces = allSauces?.filter(s => s.is_available) || [];
  
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

  const updateDefaultToppingQuantity = (toppingId: string, quantity: ToppingQuantity) => {
    setDefaultToppings(prev => prev.map(t => 
      t.id === toppingId ? { ...t, quantity } : t
    ));
  };

  const updateDefaultToppingSide = (toppingId: string, side: PizzaSide) => {
    setDefaultToppings(prev => prev.map(t => 
      t.id === toppingId ? { ...t, side } : t
    ));
  };

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

  const updateExtraToppingSide = (toppingId: string, side: PizzaSide) => {
    setExtraToppings(prev => prev.map(t => 
      t.id === toppingId ? { ...t, side } : t
    ));
  };

  const toggleFreeTopping = (name: string) => {
    setFreeToppingSelections(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        return prev.filter(t => t.name !== name);
      }
      return [...prev, { name, side: 'whole' as Side }];
    });
  };

  const updateFreeToppingSide = (name: string, side: Side) => {
    setFreeToppingSelections(prev => prev.map(t => 
      t.name === name ? { ...t, side } : t
    ));
  };

  // Calculate price
  const calculatePrice = () => {
    let price = selectedSize?.price || 0;
    
    if (selectedCrust?.name.toLowerCase().includes('gluten')) {
      price += GLUTEN_FREE_PRICE;
    }
    
    if (selectedCheese === 'Dairy Free') {
      price += selectedSize?.name === 'Small 10"' ? 2 : 3;
    }
    
    if (selectedCheese === 'Mozzarella' && cheeseQuantity === 'extra') {
      if (selectedSize?.name?.includes('Small')) {
        price += 2;
      } else if (selectedSize?.name?.includes('Medium')) {
        price += 2.5;
      } else {
        price += 3;
      }
    }
    
    const toppingPrice = getExtraToppingPrice(selectedSize?.name || '');
    defaultToppings.forEach(t => {
      if (t.quantity === 'extra') {
        price += toppingPrice;
      }
    });
    
    price += extraToppings.length * toppingPrice;
    price += extraAmount;
    
    return price;
  };

  const totalPrice = calculatePrice();

  const handleAddToOrder = () => {
    if (!selectedSize || !selectedCrust) return;

    const sauceName = allSauces?.find(s => s.id === selectedSauceId)?.name || 'No Sauce';

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

  // Ultra-compact styles with explicit hex colors for Android WebView
  const btn = "px-2 py-1 text-[11px] rounded border font-medium transition-colors";
  const btnActive = "border-[#1a8ccc] bg-[#1a8ccc]/10 text-[#1a8ccc]";
  const btnInactive = "border-gray-300 hover:bg-gray-100";

  // Spicy side button helper
  const SpicySideBtn = ({ side, level, isActive, isDisabled, onClick }: { 
    side: Side; level: SpicyLevel; isActive: boolean; isDisabled: boolean; onClick: () => void 
  }) => (
    <button
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        "px-1 py-0.5 text-[10px] rounded border font-medium",
        isActive ? btnActive : btnInactive,
        isDisabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {side === 'left' ? 'L' : side === 'whole' ? 'W' : 'R'}
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] p-3 gap-0 overflow-hidden">
        {/* Row 1: Name + Size + Crust */}
        <div className="flex items-center gap-4 pb-2 border-b">
          <h2 className="font-serif text-sm font-bold whitespace-nowrap" style={{ color: '#1a8ccc' }}>{item.name}</h2>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">Size:</span>
            {item.sizes?.map(size => (
              <button
                key={size.id}
                onClick={() => setSelectedSize({ id: size.id, name: size.name, price: size.price })}
                className={cn(btn, selectedSize?.id === size.id ? btnActive : btnInactive)}
              >
                {size.name.replace('Small ', 'S').replace('Medium ', 'M').replace('Large ', 'L')} ${size.price}
              </button>
            ))}
          </div>

          {availableCrusts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">Crust:</span>
              {availableCrusts.map(crust => (
                <button
                  key={crust.id}
                  onClick={() => setSelectedCrust(crust)}
                  className={cn(btn, selectedCrust?.id === crust.id ? btnActive : btnInactive)}
                >
                  {crust.name}{crust.name.toLowerCase().includes('gluten') && ` +$${GLUTEN_FREE_PRICE}`}
                </button>
              ))}
            </div>
          )}

          {/* Price + Buttons at end */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-lg font-bold" style={{ color: '#1a8ccc' }}>${totalPrice.toFixed(2)}</span>
            <Button variant="outline" onClick={onClose} className="h-7 px-3 text-xs">Cancel</Button>
            <Button 
              onClick={handleAddToOrder}
              disabled={!selectedSize || !selectedCrust}
              className="h-7 px-4 text-xs text-white font-semibold"
              style={{ background: 'linear-gradient(to right, #1a8ccc, #8b2500)' }}
            >
              {editingItem ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>

        {/* Row 2: Cheese + Spicy + Free Toppings + Sauce */}
        <div className="flex items-center gap-6 py-2 border-b flex-wrap">
          {/* Cheese */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 mr-1">Cheese:</span>
            {['None', 'Mozz', 'Dairy Free'].map((cheese, idx) => {
              const val = idx === 0 ? 'No Cheese' : idx === 1 ? 'Mozzarella' : 'Dairy Free';
              return (
                <button
                  key={val}
                  onClick={() => { setSelectedCheese(val); if (val !== 'Mozzarella') setCheeseQuantity('normal'); }}
                  className={cn(btn, selectedCheese === val ? btnActive : btnInactive)}
                >
                  {cheese}{val === 'Dairy Free' && ` +$${selectedSize?.name === 'Small 10"' ? 2 : 3}`}
                </button>
              );
            })}
            {['less', 'normal', 'extra'].map(qty => (
              <button
                key={qty}
                onClick={() => selectedCheese !== 'No Cheese' && setCheeseQuantity(qty as any)}
                disabled={selectedCheese === 'No Cheese'}
                className={cn(btn, selectedCheese === 'No Cheese' ? "opacity-40" : cheeseQuantity === qty ? btnActive : btnInactive)}
              >
                {qty === 'less' ? 'Less' : qty === 'normal' ? 'Reg' : 'Xtra'}
              </button>
            ))}
          </div>

          {/* Spicy Level */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 mr-1">Spicy:</span>
            <button
              onClick={() => { setLeftSpicy('none'); setRightSpicy('none'); }}
              className={cn(btn, leftSpicy === 'none' && rightSpicy === 'none' ? btnActive : btnInactive)}
            >
              None
            </button>
            
            {/* Medium Hot */}
            <span className={cn("text-[10px] font-medium px-1", (leftSpicy === 'medium' || rightSpicy === 'medium') && "text-[#1a8ccc]")}>Med</span>
            {isLargePizza ? (
              <div className="flex gap-0.5">
                {(['left', 'whole', 'right'] as Side[]).map(side => {
                  const isWholeM = leftSpicy === 'medium' && rightSpicy === 'medium';
                  const isActiveM = side === 'whole' ? isWholeM : side === 'left' ? leftSpicy === 'medium' && !isWholeM : rightSpicy === 'medium' && !isWholeM;
                  const hotWhole = leftSpicy === 'hot' && rightSpicy === 'hot';
                  const isDisabledM = hotWhole || (side === 'left' && leftSpicy === 'hot') || (side === 'right' && rightSpicy === 'hot') || (side === 'whole' && (leftSpicy === 'hot' || rightSpicy === 'hot'));
                  return (
                    <SpicySideBtn
                      key={side}
                      side={side}
                      level="medium"
                      isActive={isActiveM}
                      isDisabled={isDisabledM}
                      onClick={() => {
                        if (side === 'whole') { setLeftSpicy('medium'); setRightSpicy('medium'); }
                        else if (side === 'left') { setLeftSpicy('medium'); if (rightSpicy !== 'hot') setRightSpicy('none'); }
                        else { setRightSpicy('medium'); if (leftSpicy !== 'hot') setLeftSpicy('none'); }
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <button onClick={() => { setLeftSpicy('medium'); setRightSpicy('medium'); }} className={cn(btn, leftSpicy === 'medium' ? btnActive : btnInactive)}>W</button>
            )}
            
            {/* Hot */}
            <span className={cn("text-[10px] font-medium px-1", (leftSpicy === 'hot' || rightSpicy === 'hot') && "text-[#1a8ccc]")}>Hot</span>
            {isLargePizza ? (
              <div className="flex gap-0.5">
                {(['left', 'whole', 'right'] as Side[]).map(side => {
                  const isWholeH = leftSpicy === 'hot' && rightSpicy === 'hot';
                  const isActiveH = side === 'whole' ? isWholeH : side === 'left' ? leftSpicy === 'hot' && !isWholeH : rightSpicy === 'hot' && !isWholeH;
                  const medWhole = leftSpicy === 'medium' && rightSpicy === 'medium';
                  const isDisabledH = medWhole || (side === 'left' && leftSpicy === 'medium') || (side === 'right' && rightSpicy === 'medium') || (side === 'whole' && (leftSpicy === 'medium' || rightSpicy === 'medium'));
                  return (
                    <SpicySideBtn
                      key={side}
                      side={side}
                      level="hot"
                      isActive={isActiveH}
                      isDisabled={isDisabledH}
                      onClick={() => {
                        if (side === 'whole') { setLeftSpicy('hot'); setRightSpicy('hot'); }
                        else if (side === 'left') { setLeftSpicy('hot'); if (rightSpicy !== 'medium') setRightSpicy('none'); }
                        else { setRightSpicy('hot'); if (leftSpicy !== 'medium') setLeftSpicy('none'); }
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <button onClick={() => { setLeftSpicy('hot'); setRightSpicy('hot'); }} className={cn(btn, leftSpicy === 'hot' ? btnActive : btnInactive)}>W</button>
            )}
          </div>

          {/* Free Toppings */}
          {freeToppings.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500 mr-1">Free:</span>
              {freeToppings.map(topping => {
                const sel = freeToppingSelections.find(f => f.name === topping.name);
                const isSel = !!sel;
                return (
                  <div key={topping.id} className="flex items-center gap-0.5">
                    <button onClick={() => toggleFreeTopping(topping.name)} className={cn(btn, isSel ? btnActive : btnInactive)}>
                      {topping.name}
                    </button>
                    {isLargePizza && isSel && (
                      <div className="flex gap-0.5">
                        {(['left', 'whole', 'right'] as Side[]).map(side => (
                          <button
                            key={side}
                            onClick={() => updateFreeToppingSide(topping.name, side)}
                            className={cn("px-1 py-0.5 text-[10px] rounded border", sel?.side === side ? btnActive : btnInactive)}
                          >
                            {side === 'left' ? 'L' : side === 'whole' ? 'W' : 'R'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Row 3: Sauce */}
        <div className="flex items-center gap-1 py-1.5 border-b flex-wrap">
          <span className="text-[10px] text-gray-500 mr-1">Sauce:</span>
          <button onClick={() => setSelectedSauceId(null)} className={cn(btn, !selectedSauceId ? btnActive : btnInactive)}>None</button>
          {availableSauces.map(sauce => (
            <button key={sauce.id} onClick={() => setSelectedSauceId(sauce.id)} className={cn(btn, selectedSauceId === sauce.id ? btnActive : btnInactive)}>
              {sauce.name}
            </button>
          ))}
          <span className="text-[10px] text-gray-400 ml-2">Qty:</span>
          {(['less', 'normal', 'extra'] as const).map(qty => (
            <button
              key={qty}
              onClick={() => selectedSauceId && setSauceQuantity(qty)}
              disabled={!selectedSauceId}
              className={cn(btn, !selectedSauceId ? "opacity-40" : sauceQuantity === qty ? btnActive : btnInactive)}
            >
              {qty === 'less' ? 'Less' : qty === 'normal' ? 'Reg' : 'Xtra'}
            </button>
          ))}
        </div>

        {/* Row 4: Two columns - Default Toppings | Extra Toppings */}
        <div className="flex gap-4 pt-2 flex-1 min-h-0">
          {/* Default Toppings - 6 columns */}
          {pizzaDefaultToppings.length > 0 && (
            <div className="flex-1">
              <h3 className="text-[10px] font-semibold text-gray-600 mb-1">DEFAULT TOPPINGS</h3>
              <div className="grid grid-cols-6 gap-1">
                {defaultToppings.map(topping => {
                  const isRemoved = topping.quantity === 'none';
                  return (
                    <div key={topping.id} className={cn("rounded p-1 border text-center", isRemoved ? "border-red-300 bg-red-50" : "border-gray-200")}>
                      <button
                        onClick={() => updateDefaultToppingQuantity(topping.id, isRemoved ? 'regular' : 'none')}
                        className="w-full"
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full inline-block mr-1", topping.isVeg ? "bg-green-500" : "bg-red-500")} />
                        <span className={cn("text-[10px] font-medium", isRemoved && "line-through text-gray-400")}>{topping.name}</span>
                      </button>
                      {!isRemoved && (
                        <div className="flex gap-0.5 mt-1 justify-center">
                          {(['less', 'regular', 'extra'] as ToppingQuantity[]).map(q => (
                            <button
                              key={q}
                              onClick={() => updateDefaultToppingQuantity(topping.id, q)}
                              className={cn("px-1 py-0.5 text-[9px] rounded border", topping.quantity === q ? btnActive : btnInactive)}
                            >
                              {q === 'less' ? 'L' : q === 'regular' ? 'R' : 'X'}
                            </button>
                          ))}
                          {isLargePizza && (
                            <>
                              {(['left', 'whole', 'right'] as PizzaSide[]).map(s => (
                                <button
                                  key={s}
                                  onClick={() => updateDefaultToppingSide(topping.id, s)}
                                  className={cn("px-1 py-0.5 text-[9px] rounded border", topping.side === s ? btnActive : btnInactive)}
                                >
                                  {s === 'left' ? 'L' : s === 'whole' ? 'W' : 'R'}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extra Toppings - 5 columns */}
          {availableExtraToppings.length > 0 && (
            <div className="flex-1">
              <h3 className="text-[10px] font-semibold text-gray-600 mb-1">EXTRA (+${extraToppingPrice.toFixed(2)})</h3>
              <div className="grid grid-cols-5 gap-1">
                {availableExtraToppings.map(topping => {
                  const sel = extraToppings.find(t => t.id === topping.id);
                  const isSel = !!sel;
                  return (
                    <div 
                      key={topping.id} 
                      className={cn("flex items-center gap-1 p-1 rounded border", isSel ? "border-[#1a8ccc] bg-[#1a8ccc]/10" : "border-gray-200")}
                    >
                      <button onClick={() => toggleExtraTopping(topping)} className="flex items-center gap-1 flex-1 min-w-0">
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", topping.is_veg ? "bg-green-500" : "bg-red-500")} />
                        <span className="text-[10px] truncate">{topping.name}</span>
                      </button>
                      {isLargePizza && isSel && (
                        <div className="flex gap-0.5 flex-shrink-0">
                          {(['left', 'whole', 'right'] as PizzaSide[]).map(s => (
                            <button
                              key={s}
                              onClick={() => updateExtraToppingSide(topping.id, s)}
                              className={cn("px-1 py-0.5 text-[9px] rounded border", sel?.side === s ? btnActive : btnInactive)}
                            >
                              {s === 'left' ? 'L' : s === 'whole' ? 'W' : 'R'}
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
        </div>

        {/* Row 5: Notes + Extra Amount */}
        <div className="flex items-center gap-3 pt-2 border-t mt-2">
          <span className="text-[10px] text-gray-500">Notes:</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Special requests..."
            className="flex-1 px-2 py-1 text-xs border rounded"
          />
          <span className="text-[10px] text-gray-500">Extra $:</span>
          <input
            type="text"
            inputMode="decimal"
            value={extraAmount || ''}
            onChange={(e) => setExtraAmount(parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
            placeholder="0"
            className="w-16 px-2 py-1 text-xs border rounded text-center"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
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
    () => item.default_global_sauces?.map((ds) => ds.global_sauce_id) || [],
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
    return (
      item.default_toppings?.map((dt) => ({
        id: dt.topping_id,
        name: dt.topping?.name || '',
        isRemovable: dt.is_removable,
        isVeg: dt.topping?.is_veg,
      })) || []
    );
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

      const initialDefaults: SelectedTopping[] = pizzaDefaultToppings.map((t) => ({
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
      const regularCrust = availableCrusts.find((c) => c.name.toLowerCase().includes('regular'));
      setSelectedCrust(regularCrust || availableCrusts[0]);
    }
  }, [availableCrusts, editCustomization]);

  useEffect(() => {
    if (!isLargePizza) {
      setLeftSpicy('none');
      setRightSpicy('none');
      setDefaultToppings((prev) => prev.map((t) => ({ ...t, side: 'whole' as PizzaSide })));
      setExtraToppings((prev) => prev.map((t) => ({ ...t, side: 'whole' as PizzaSide })));
      setFreeToppingSelections((prev) => prev.map((t) => ({ ...t, side: 'whole' as Side })));
    }
  }, [isLargePizza]);

  const availableSauces = allSauces?.filter((s) => s.is_available) || [];

  const availableExtraToppings = useMemo(() => {
    const toppings =
      allToppings?.filter((t) => t.is_available && t.name.toLowerCase() !== 'cheese') || [];
    return [...toppings].sort((a, b) => {
      if (a.is_veg === b.is_veg) return a.sort_order - b.sort_order;
      return a.is_veg ? -1 : 1;
    });
  }, [allToppings]);

  const freeToppings = freeToppingsData?.filter((t) => t.is_available) || [];

  const updateDefaultToppingQuantity = (toppingId: string, quantity: ToppingQuantity) => {
    setDefaultToppings((prev) => prev.map((t) => (t.id === toppingId ? { ...t, quantity } : t)));
  };

  const updateDefaultToppingSide = (toppingId: string, side: PizzaSide) => {
    setDefaultToppings((prev) => prev.map((t) => (t.id === toppingId ? { ...t, side } : t)));
  };

  const toggleExtraTopping = (topping: (typeof availableExtraToppings)[0], side: PizzaSide) => {
    setExtraToppings((prev) => {
      const existing = prev.find((t) => t.id === topping.id);
      if (existing) {
        // If clicking same side, remove it
        if (existing.side === side) {
          return prev.filter((t) => t.id !== topping.id);
        }
        // Otherwise update side
        return prev.map((t) => (t.id === topping.id ? { ...t, side } : t));
      }
      const toppingPrice = getExtraToppingPrice(selectedSize?.name || '');
      return [
        ...prev,
        {
          id: topping.id,
          name: topping.name,
          quantity: 'regular' as ToppingQuantity,
          side,
          isVeg: topping.is_veg,
          price: toppingPrice,
        },
      ];
    });
  };

  const toggleFreeTopping = (name: string, side: Side) => {
    setFreeToppingSelections((prev) => {
      const existing = prev.find((t) => t.name === name);
      if (existing) {
        if (existing.side === side) {
          return prev.filter((t) => t.name !== name);
        }
        return prev.map((t) => (t.name === name ? { ...t, side } : t));
      }
      return [...prev, { name, side }];
    });
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
    defaultToppings.forEach((t) => {
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

    const sauceName = allSauces?.find((s) => s.id === selectedSauceId)?.name || 'No Sauce';

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
        freeToppings: freeToppingSelections.map(
          (f) => `${f.name}${isLargePizza && f.side !== 'whole' ? ` (${f.side})` : ''}`
        ),
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

  // Button styles with explicit hex colors for Android WebView
  const btn = 'px-2 py-0.5 text-[11px] rounded border font-medium transition-colors cursor-pointer';
  const btnActive = 'border-[#1a8ccc] bg-[#1a8ccc] text-white';
  const btnInactive = 'border-gray-300 bg-white hover:bg-gray-50 text-gray-700';
  const btnSmall = 'px-1.5 py-0.5 text-[10px] rounded border font-medium cursor-pointer';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] p-0 gap-0 overflow-hidden [&>button]:hidden">
        <div className="flex flex-col h-full max-h-[95vh]">
          {/* Row 1: Pizza Name + Size + Crust + Close */}
          <div className="flex items-center gap-4 px-4 py-2 border-b bg-white">
            <h2 className="font-serif text-base font-bold whitespace-nowrap" style={{ color: '#1a8ccc' }}>
              {item.name}
            </h2>
            <span className="text-xs text-gray-500">Size</span>
            <div className="flex gap-1">
              {item.sizes?.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize({ id: size.id, name: size.name, price: size.price })}
                  className={cn(btn, selectedSize?.id === size.id ? btnActive : btnInactive)}
                >
                  <div className="text-center">
                    <div>{size.name}</div>
                    <div className="text-[10px]">${size.price.toFixed(2)}</div>
                  </div>
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500">Crust</span>
            <div className="flex-1 border rounded px-3 py-1 text-sm bg-white">
              {selectedCrust?.name || 'Regular'}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Row 2: Cheese + Spicy Level */}
          <div className="flex items-center gap-4 px-4 py-1.5 border-b bg-white flex-wrap">
            <span className="text-xs text-gray-600">Cheese</span>
            <div className="flex gap-1">
              {['None', 'Mozz', 'Dairy Free +$3'].map((label, idx) => {
                const val = idx === 0 ? 'No Cheese' : idx === 1 ? 'Mozzarella' : 'Dairy Free';
                return (
                  <button
                    key={val}
                    onClick={() => {
                      setSelectedCheese(val);
                      if (val !== 'Mozzarella') setCheeseQuantity('normal');
                    }}
                    className={cn(btn, selectedCheese === val ? btnActive : btnInactive)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1">
              {['Less', 'Norm', 'Extra +$3'].map((label) => {
                const qty = label.startsWith('Less') ? 'less' : label.startsWith('Norm') ? 'normal' : 'extra';
                return (
                  <button
                    key={label}
                    onClick={() => selectedCheese !== 'No Cheese' && setCheeseQuantity(qty as any)}
                    disabled={selectedCheese === 'No Cheese'}
                    className={cn(
                      btn,
                      selectedCheese === 'No Cheese' ? 'opacity-40' : cheeseQuantity === qty ? btnActive : btnInactive
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <span className="text-xs text-gray-600 ml-4">Spicy Level</span>
            <button
              onClick={() => { setLeftSpicy('none'); setRightSpicy('none'); }}
              className={cn(btn, leftSpicy === 'none' && rightSpicy === 'none' ? btnActive : btnInactive)}
            >
              None
            </button>
            <span className="text-xs text-gray-600">Med Hot</span>
            <div className="flex gap-0.5">
              {(['left', 'whole', 'right'] as Side[]).map((side) => {
                const isWholeM = leftSpicy === 'medium' && rightSpicy === 'medium';
                const isActiveM = side === 'whole' ? isWholeM : side === 'left' ? leftSpicy === 'medium' && !isWholeM : rightSpicy === 'medium' && !isWholeM;
                return (
                  <button
                    key={side}
                    onClick={() => {
                      if (side === 'whole') { setLeftSpicy('medium'); setRightSpicy('medium'); }
                      else if (side === 'left') { setLeftSpicy('medium'); if (rightSpicy !== 'hot') setRightSpicy('none'); }
                      else { setRightSpicy('medium'); if (leftSpicy !== 'hot') setLeftSpicy('none'); }
                    }}
                    className={cn(btnSmall, isActiveM ? btnActive : btnInactive)}
                  >
                    {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-gray-600">Hot</span>
            <div className="flex gap-0.5">
              {(['left', 'whole', 'right'] as Side[]).map((side) => {
                const isWholeH = leftSpicy === 'hot' && rightSpicy === 'hot';
                const isActiveH = side === 'whole' ? isWholeH : side === 'left' ? leftSpicy === 'hot' && !isWholeH : rightSpicy === 'hot' && !isWholeH;
                return (
                  <button
                    key={side}
                    onClick={() => {
                      if (side === 'whole') { setLeftSpicy('hot'); setRightSpicy('hot'); }
                      else if (side === 'left') { setLeftSpicy('hot'); if (rightSpicy !== 'medium') setRightSpicy('none'); }
                      else { setRightSpicy('hot'); if (leftSpicy !== 'medium') setLeftSpicy('none'); }
                    }}
                    className={cn(btnSmall, isActiveH ? btnActive : btnInactive)}
                  >
                    {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Free Add-ons */}
          {freeToppings.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-1.5 border-b bg-white flex-wrap">
              <span className="text-xs text-gray-600">Free Add-ons</span>
              {freeToppings.map((topping) => {
                const sel = freeToppingSelections.find((f) => f.name === topping.name);
                return (
                  <div key={topping.id} className="flex items-center gap-0.5">
                    <span className={cn('text-xs font-medium', sel ? 'text-[#1a8ccc]' : 'text-gray-700')}>
                      {topping.name}
                    </span>
                    <div className="flex gap-0.5">
                      {(['left', 'whole', 'right'] as Side[]).map((side) => (
                        <button
                          key={side}
                          onClick={() => toggleFreeTopping(topping.name, side)}
                          className={cn(btnSmall, sel?.side === side ? btnActive : btnInactive)}
                        >
                          {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Row 4: Sauce */}
          <div className="flex items-center gap-2 px-4 py-1.5 border-b bg-white flex-wrap">
            <span className="text-xs text-gray-600">Sauce</span>
            <button
              onClick={() => setSelectedSauceId(null)}
              className={cn(btn, !selectedSauceId ? 'text-[#1a8ccc] font-semibold border-[#1a8ccc]' : btnInactive)}
            >
              No Sauce
            </button>
            {availableSauces.map((sauce) => (
              <button
                key={sauce.id}
                onClick={() => setSelectedSauceId(sauce.id)}
                className={cn(btn, selectedSauceId === sauce.id ? 'text-[#1a8ccc] font-semibold border-[#1a8ccc]' : btnInactive)}
              >
                {sauce.name}
              </button>
            ))}
            <div className="flex gap-1 ml-4">
              {['Less', 'Reg', 'Extra'].map((label) => {
                const qty = label === 'Less' ? 'less' : label === 'Reg' ? 'normal' : 'extra';
                return (
                  <button
                    key={label}
                    onClick={() => selectedSauceId && setSauceQuantity(qty as any)}
                    disabled={!selectedSauceId}
                    className={cn(btn, !selectedSauceId ? 'opacity-40' : sauceQuantity === qty ? btnActive : btnInactive)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default Toppings Section */}
          {pizzaDefaultToppings.length > 0 && (
            <div className="px-4 py-2 border-b bg-white">
              <h3 className="text-xs text-gray-600 mb-2">Default Toppings</h3>
              <div className="grid grid-cols-5 gap-3">
                {defaultToppings.map((topping) => (
                  <div key={topping.id} className="border rounded-md p-2 bg-white">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={cn('w-2 h-2 rounded-full', topping.isVeg ? 'bg-green-500' : 'bg-red-500')} />
                      <span className="text-sm font-medium text-gray-800">{topping.name}</span>
                    </div>
                    <div className="flex">
                      {(['less', 'regular', 'extra'] as ToppingQuantity[]).map((qty) => (
                        <button
                          key={qty}
                          onClick={() => updateDefaultToppingQuantity(topping.id, qty)}
                          className={cn(
                            'flex-1 py-1 text-xs border font-medium transition-colors',
                            qty === 'less' && 'rounded-l-md border-r-0',
                            qty === 'extra' && 'rounded-r-md border-l-0',
                            qty === 'regular' && 'border-x',
                            topping.quantity === qty 
                              ? 'border-[#1a8ccc] bg-[#1a8ccc]/10 text-[#1a8ccc]' 
                              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                          )}
                        >
                          {qty === 'less' ? 'Less' : qty === 'regular' ? 'Reg' : 'Extra'}
                        </button>
                      ))}
                    </div>
                    {isLargePizza && (
                      <div className="flex mt-1">
                        {(['left', 'whole', 'right'] as PizzaSide[]).map((side) => (
                          <button
                            key={side}
                            onClick={() => updateDefaultToppingSide(topping.id, side)}
                            className={cn(
                              'flex-1 py-1 text-xs border font-medium transition-colors',
                              side === 'left' && 'rounded-l-md border-r-0',
                              side === 'right' && 'rounded-r-md border-l-0',
                              side === 'whole' && 'border-x',
                              topping.side === side 
                                ? 'border-[#1a8ccc] bg-[#1a8ccc]/10 text-[#1a8ccc]' 
                                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                            )}
                          >
                            {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extra Toppings Section */}
          <div className="px-4 py-2 flex-1 overflow-auto bg-white">
            <h3 className="text-xs font-semibold text-gray-700 mb-2">
              Extra <span className="text-gray-500">(+${extraToppingPrice.toFixed(2)})</span>
            </h3>
            <div className="grid grid-cols-4 gap-x-4 gap-y-1">
              {availableExtraToppings.map((topping) => {
                const sel = extraToppings.find((t) => t.id === topping.id);
                return (
                  <div key={topping.id} className="flex items-center gap-2 py-0.5">
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', topping.is_veg ? 'bg-green-500' : 'bg-red-500')} />
                    <span className={cn('text-xs flex-1 min-w-0', sel ? 'font-medium text-gray-900' : 'text-gray-700')}>
                      {topping.name}
                    </span>
                    <div className="flex gap-0.5 flex-shrink-0">
                      {(['left', 'whole', 'right'] as PizzaSide[]).map((side) => (
                        <button
                          key={side}
                          onClick={() => toggleExtraTopping(topping, side)}
                          className={cn(btnSmall, sel?.side === side ? btnActive : btnInactive)}
                        >
                          {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer: Notes + Extra $ + Price + Buttons */}
          <div className="flex items-center gap-4 px-4 py-2 border-t bg-gray-50">
            <span className="text-xs text-gray-600">Notes:</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Special requests..."
              className="flex-1 px-3 py-1.5 text-sm border rounded bg-white"
            />
            <span className="text-xs text-gray-600">Extra $</span>
            <input
              type="text"
              inputMode="decimal"
              value={extraAmount || ''}
              onChange={(e) => setExtraAmount(parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
              placeholder="0"
              className="w-16 px-2 py-1.5 text-sm border rounded text-center bg-white"
            />
            <span className="text-xl font-bold" style={{ color: '#1a8ccc' }}>
              ${totalPrice.toFixed(2)}
            </span>
            <Button variant="outline" onClick={onClose} className="px-6">
              Cancel
            </Button>
            <Button
              onClick={handleAddToOrder}
              disabled={!selectedSize || !selectedCrust}
              className="px-6 text-white font-semibold"
              style={{ backgroundColor: '#1a8ccc' }}
            >
              {editingItem ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

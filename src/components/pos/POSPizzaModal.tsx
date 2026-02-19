import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { MenuItem } from '@/hooks/useMenuItems';
import { useSizeCrustAvailability, useFreeToppings, getCrustsForSize } from '@/hooks/usePizzaOptions';
import { useToppings } from '@/hooks/useMenuItems';
import { useGlobalSauces } from '@/hooks/useGlobalSauces';
import { useNoteShortcuts } from '@/hooks/useNoteShortcuts';
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

const SIDE_OPTIONS: { value: Side; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'whole', label: 'Whole' },
  { value: 'right', label: 'Right' },
];

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

  const posLocationId = (() => { try { return localStorage.getItem('pos_location_id') || 'calgary'; } catch { return 'calgary'; } })();
  const { shortcutMap, shortcuts } = useNoteShortcuts(posLocationId);
  const shortcutPlaceholder = useMemo(() => {
    if (shortcuts.length === 0) return 'Special requests...';
    const hints = shortcuts.map(s => `${s.shortcut_key}=${s.replacement_text}`).join(', ');
    return `Special requests... (${hints})`;
  }, [shortcuts]);

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
  const [sauceQuantity, setSauceQuantity] = useState<'normal' | 'extra'>(
    editCustomization?.sauceQuantity === 'extra' ? 'extra' : 'normal'
  );
  const [note, setNote] = useState<string>(editCustomization?.note || '');
  const [extraAmount, setExtraAmount] = useState<number>(editCustomization?.extraAmount || 0);

  // Spicy state - mediumHot/hot selection approach (matches RN)
  const [mediumHotSelection, setMediumHotSelection] = useState<'none' | 'left' | 'whole' | 'right'>('none');
  const [hotSelection, setHotSelection] = useState<'none' | 'left' | 'whole' | 'right'>('none');

  const [defaultToppings, setDefaultToppings] = useState<SelectedTopping[]>(editCustomization?.defaultToppings || []);
  const [extraToppings, setExtraToppings] = useState<SelectedTopping[]>(editCustomization?.extraToppings || []);
  const [freeToppingSelections, setFreeToppingSelections] = useState<FreeToppingSelection[]>([]);

  const isLargePizza = selectedSize?.name?.includes('Large') || selectedSize?.name?.includes('14"');
  const isMediumPizza = selectedSize?.name?.includes('Medium') || selectedSize?.name?.includes('12"');

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
      setMediumHotSelection('none');
      setHotSelection('none');
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

  // Available crusts for selected size
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

  // Reset sides when not large
  useEffect(() => {
    if (!isLargePizza) {
      if (mediumHotSelection === 'left' || mediumHotSelection === 'right') setMediumHotSelection('none');
      if (hotSelection === 'left' || hotSelection === 'right') setHotSelection('none');
      setDefaultToppings(prev => prev.map(t => ({ ...t, side: 'whole' as PizzaSide })));
      setExtraToppings(prev => prev.map(t => ({ ...t, side: 'whole' as PizzaSide })));
      setFreeToppingSelections(prev => prev.map(t => ({ ...t, side: 'whole' as Side })));
    }
  }, [isLargePizza]);

  // Force regular crust for non-medium sizes
  useEffect(() => {
    if (selectedSize && !isMediumPizza && availableCrusts.length > 0) {
      const regularCrust = availableCrusts.find(c => c.name.toLowerCase().includes('regular'));
      if (regularCrust) setSelectedCrust(regularCrust);
    }
  }, [selectedSize, isMediumPizza, availableCrusts]);

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

  // Toggle default topping on/off
  const toggleDefaultTopping = (id: string) => {
    setDefaultToppings(prev => prev.map(t =>
      t.id === id ? { ...t, quantity: t.quantity === 'none' ? 'regular' : 'none' } : t
    ));
  };

  const updateDefaultToppingSide = (toppingId: string, side: PizzaSide) => {
    if (!isLargePizza && side !== 'whole') return;
    setDefaultToppings(prev => prev.map(t =>
      t.id === toppingId ? { ...t, side } : t
    ));
  };

  const toggleExtraTopping = (topping: typeof availableExtraToppings[0]) => {
    setExtraToppings(prev => {
      const existing = prev.find(t => t.id === topping.id);
      if (existing) return prev.filter(t => t.id !== topping.id);
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
    if (!isLargePizza && side !== 'whole') return;
    setExtraToppings(prev => prev.map(t =>
      t.id === toppingId ? { ...t, side } : t
    ));
  };

  const toggleFreeTopping = (name: string) => {
    setFreeToppingSelections(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) return prev.filter(t => t.name !== name);
      return [...prev, { name, side: 'whole' as Side }];
    });
  };

  const updateFreeToppingSide = (name: string, side: Side) => {
    if (!isLargePizza && side !== 'whole') return;
    setFreeToppingSelections(prev => prev.map(t =>
      t.name === name ? { ...t, side } : t
    ));
  };

  // Compute effective spicy levels from mediumHot/hot selections
  const getEffectiveSpicy = (): { left: SpicyLevel; right: SpicyLevel } => {
    let leftSpicy: SpicyLevel = 'none';
    let rightSpicy: SpicyLevel = 'none';

    if (mediumHotSelection === 'whole') { leftSpicy = 'medium'; rightSpicy = 'medium'; }
    else if (mediumHotSelection === 'left') { leftSpicy = 'medium'; }
    else if (mediumHotSelection === 'right') { rightSpicy = 'medium'; }

    if (hotSelection === 'whole') { leftSpicy = 'hot'; rightSpicy = 'hot'; }
    else if (hotSelection === 'left') { leftSpicy = 'hot'; }
    else if (hotSelection === 'right') { rightSpicy = 'hot'; }

    return { left: leftSpicy, right: rightSpicy };
  };

  // Compute disabled states for spicy level buttons
  const getSpicyButtonStates = () => {
    if (!isLargePizza) {
      return {
        mediumHot: { left: true, whole: false, right: true },
        hot: { left: true, whole: false, right: true },
      };
    }
    if (mediumHotSelection === 'whole') {
      return {
        mediumHot: { left: true, whole: false, right: true },
        hot: { left: true, whole: true, right: true },
      };
    }
    if (hotSelection === 'whole') {
      return {
        mediumHot: { left: true, whole: true, right: true },
        hot: { left: true, whole: false, right: true },
      };
    }
    if (mediumHotSelection === 'left') {
      return {
        mediumHot: { left: false, whole: true, right: true },
        hot: { left: true, whole: true, right: false },
      };
    }
    if (mediumHotSelection === 'right') {
      return {
        mediumHot: { left: true, whole: true, right: false },
        hot: { left: false, whole: true, right: true },
      };
    }
    if (hotSelection === 'left') {
      return {
        mediumHot: { left: true, whole: true, right: false },
        hot: { left: false, whole: true, right: true },
      };
    }
    if (hotSelection === 'right') {
      return {
        mediumHot: { left: false, whole: true, right: true },
        hot: { left: true, whole: true, right: false },
      };
    }
    return {
      mediumHot: { left: false, whole: false, right: false },
      hot: { left: false, whole: false, right: false },
    };
  };

  const spicyBtnStates = getSpicyButtonStates();
  const effectiveSpicy = getEffectiveSpicy();

  // Calculate price
  const calculatePrice = () => {
    let price = selectedSize?.price || 0;
    if (selectedCrust?.name.toLowerCase().includes('gluten')) price += GLUTEN_FREE_PRICE;
    if (selectedCheese === 'Dairy Free') price += selectedSize?.name === 'Small 10"' ? 2 : 3;
    if (selectedCheese === 'Mozzarella' && cheeseQuantity === 'extra') {
      if (selectedSize?.name?.includes('Small')) price += 2;
      else if (selectedSize?.name?.includes('Medium')) price += 2.5;
      else price += 3;
    }
    const tp = getExtraToppingPrice(selectedSize?.name || '');
    defaultToppings.forEach(t => { if (t.quantity === 'extra') price += tp; });
    price += extraToppings.length * tp;
    price += extraAmount;
    return price;
  };

  const totalPrice = calculatePrice();
  const cheeseExtraPrice = selectedSize?.name?.includes('Small') ? 2 : selectedSize?.name?.includes('Medium') ? 2.5 : 3;

  const handleAddToOrder = () => {
    if (!selectedSize || !selectedCrust) return;
    const sauceName = allSauces?.find(s => s.id === selectedSauceId)?.name || 'No Sauce';

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
        cheeseSides: [{ side: 'whole', quantity: cheeseQuantity }],
        sauceId: selectedSauceId,
        sauceName,
        sauceQuantity: sauceQuantity === 'extra' ? 'extra' : 'normal',
        freeToppings: freeToppingSelections.map(f => `${f.name}${isLargePizza && f.side !== 'whole' ? ` (${f.side})` : ''}`),
        spicyLevel: effectiveSpicy,
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

  // Styles
  const antiBlur: React.CSSProperties = { WebkitFontSmoothing: 'antialiased' as any };
  const btnSmall = "h-6 lg:h-7 px-2 lg:px-2.5 text-[10px] lg:text-xs rounded border font-medium transition-colors mx-px my-px text-foreground inline-flex items-center justify-center text-center leading-tight whitespace-nowrap min-w-0";
  const labelBox = "h-6 lg:h-7 px-1.5 lg:px-2 text-[10px] lg:text-xs font-medium rounded grid place-items-center text-center leading-tight whitespace-normal min-w-0";

  const blueStyle: React.CSSProperties = { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur };
  const darkStyle: React.CSSProperties = { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur };
  const disabledStyle: React.CSSProperties = { opacity: 0.4, cursor: 'not-allowed', backgroundColor: '#94a3b8', borderColor: '#94a3b8', color: '#cbd5e1', ...antiBlur };
  const isGlutenFreeAllowed = isMediumPizza;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1020px] w-[95vw] p-1.5 lg:p-2.5 pt-1 lg:pt-2 overflow-y-auto max-h-[96vh] text-slate-900" style={{ backgroundColor: '#c5dbe8', background: '#c5dbe8', textRendering: 'optimizeLegibility', WebkitFontSmoothing: 'antialiased' as any, display: 'block', height: 'auto', maxHeight: '96vh' }}>

        {/* ROW 1: Pizza Name | Sizes | Crust */}
        <div className="flex flex-wrap items-center gap-1 lg:gap-1.5 pb-0.5 lg:pb-1 border-b border-slate-200 pr-10 lg:pr-12" style={{ marginBottom: 5 }}>
          <span className="font-serif text-[10px] lg:text-xs font-bold px-3 lg:px-4 py-1 lg:py-1.5 rounded whitespace-nowrap uppercase" style={{ ...blueStyle, minWidth: 160 }}>{item.name}</span>
          {item.sizes?.map(size => (
            <button key={size.id} onClick={() => setSelectedSize({ id: size.id, name: size.name, price: size.price })} className={cn(btnSmall, "px-2")} style={selectedSize?.id === size.id ? blueStyle : darkStyle}>
              <span className="text-[9px] lg:text-[11px] font-medium whitespace-nowrap">{size.name} {size.price.toFixed(2)}</span>
            </button>
          ))}
          {availableCrusts.map(crust => {
            const isGluten = crust.name.toLowerCase().includes('gluten');
            const disabled = isGluten && !isGlutenFreeAllowed;
            return (
              <button key={crust.id} onClick={() => !disabled && setSelectedCrust(crust)} disabled={disabled} className={cn(btnSmall, "px-2")} style={disabled ? { ...darkStyle, opacity: 0.4 } : selectedCrust?.id === crust.id ? blueStyle : darkStyle}>
                {isGluten ? 'Gluten' : 'Regular'}
              </button>
            );
          })}
        </div>

        <div className="space-y-px lg:space-y-0.5" style={{ flex: '0 0 auto' }}>

          {/* ROW 2: Cheese */}
          <div className="flex items-center gap-1 lg:gap-1.5">
            <span className={cn(labelBox, "px-3 whitespace-nowrap")} style={selectedCheese !== 'No Cheese' ? blueStyle : darkStyle}>Cheese</span>
            <button onClick={() => { setSelectedCheese('No Cheese'); setCheeseQuantity('normal'); }} className={cn(btnSmall)} style={selectedCheese === 'No Cheese' ? blueStyle : darkStyle}>None</button>
            <button onClick={() => setSelectedCheese('Mozzarella')} className={cn(btnSmall)} style={selectedCheese === 'Mozzarella' ? blueStyle : darkStyle}>Mozzarella</button>
            <button onClick={() => { setSelectedCheese('Dairy Free'); setCheeseQuantity('normal'); }} className={cn(btnSmall, "whitespace-nowrap")} style={selectedCheese === 'Dairy Free' ? blueStyle : darkStyle}>Dairy Free +{cheeseExtraPrice}</button>
            <span className="w-10 lg:w-16" />
            {(['less', 'normal', 'extra'] as const).map(qty => {
              const isDisabled = selectedCheese === 'No Cheese';
              return (
                <button key={qty} onClick={() => !isDisabled && setCheeseQuantity(qty)} disabled={isDisabled} className={cn(btnSmall, "whitespace-nowrap")} style={isDisabled ? disabledStyle : cheeseQuantity === qty ? blueStyle : darkStyle}>
                  {qty === 'less' ? 'Less' : qty === 'normal' ? 'Normal' : `Extra +${cheeseExtraPrice}`}
                </button>
              );
            })}
          </div>

          {/* ROW 3: Spicy Level */}
          <div className="flex items-center gap-1 lg:gap-1.5">
            <span className={cn(labelBox, "px-3")} style={(mediumHotSelection !== 'none' || hotSelection !== 'none') ? blueStyle : darkStyle}>Spicy Level</span>
            <button onClick={() => { setMediumHotSelection('none'); setHotSelection('none'); }} className={cn(btnSmall)} style={(mediumHotSelection === 'none' && hotSelection === 'none') ? blueStyle : darkStyle}>None</button>

            <span className="text-[10px] lg:text-xs font-semibold text-slate-800 mx-1 lg:mx-2">Medium Hot</span>
            <div className="flex gap-0.5">
              {(['left', 'whole', 'right'] as const).map(side => {
                const isActive = mediumHotSelection === side;
                const isDisabled = spicyBtnStates.mediumHot[side];
                return (
                  <button key={side} disabled={isDisabled} onClick={() => setMediumHotSelection(mediumHotSelection === side ? 'none' : side)} className={cn(btnSmall)} style={isDisabled ? { ...darkStyle, opacity: 0.4, cursor: 'not-allowed' } : isActive ? blueStyle : darkStyle}>
                    {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                  </button>
                );
              })}
            </div>

            <span className="text-[10px] lg:text-xs font-semibold text-slate-800 mx-1 lg:mx-2">Hot</span>
            <div className="flex gap-0.5">
              {(['left', 'whole', 'right'] as const).map(side => {
                const isActive = hotSelection === side;
                const isDisabled = spicyBtnStates.hot[side];
                return (
                  <button key={side} disabled={isDisabled} onClick={() => setHotSelection(hotSelection === side ? 'none' : side)} className={cn(btnSmall)} style={isDisabled ? { ...darkStyle, opacity: 0.4, cursor: 'not-allowed' } : isActive ? blueStyle : darkStyle}>
                    {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ROW 4: Free Toppings */}
          {freeToppings.length > 0 && (
            <div className="flex items-center gap-1 lg:gap-1.5 flex-wrap">
              {freeToppings.map(topping => {
                const sel = freeToppingSelections.find(f => f.name === topping.name);
                const isSelected = !!sel;
                return (
                  <div key={topping.id} className="flex items-center gap-0.5 lg:gap-1">
                    <button onClick={() => toggleFreeTopping(topping.name)} className={cn(btnSmall)} style={isSelected ? blueStyle : darkStyle}>{topping.name}</button>
                    <div className="flex gap-0.5">
                      {(['left', 'whole', 'right'] as const).map(side => {
                        const isSideDisabled = !isLargePizza && side !== 'whole';
                        const isSideActive = isSelected && sel?.side === side;
                        return (
                          <button key={side} disabled={isSideDisabled} onClick={() => { if (!isSelected) toggleFreeTopping(topping.name); updateFreeToppingSide(topping.name, side); }} className={cn(btnSmall)} style={isSideDisabled ? disabledStyle : isSideActive ? blueStyle : darkStyle}>
                            {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ROW 5: Sauces */}
          <div className="flex gap-1 lg:gap-1.5 items-center">
            <button onClick={() => setSelectedSauceId(null)} className={cn(btnSmall)} style={selectedSauceId === null ? blueStyle : darkStyle}>No Sauce</button>
            {availableSauces.map(sauce => (
              <button key={sauce.id} onClick={() => setSelectedSauceId(sauce.id)} className={cn(btnSmall)} style={selectedSauceId === sauce.id ? blueStyle : darkStyle}>
                {sauce.name.replace(/ Sauce$/i, '')}
              </button>
            ))}
          </div>

          {/* ROW 6: Sauce Quantity */}
          <div className="flex gap-1 lg:gap-1.5 items-center">
            {(['less', 'normal', 'extra'] as const).map(qty => {
              const isDisabled = !selectedSauceId;
              const isSelected = sauceQuantity === qty;
              return (
                <button key={qty} onClick={() => selectedSauceId && setSauceQuantity(qty === 'less' ? 'normal' : qty)} disabled={isDisabled} className={cn(btnSmall)} style={isDisabled ? disabledStyle : isSelected ? blueStyle : darkStyle}>
                  {qty === 'less' ? 'Less' : qty === 'normal' ? 'Normal' : 'Extra'}
                </button>
              );
            })}
          </div>

          {/* DEFAULT TOPPINGS - Name on top, L/W/R below */}
          {pizzaDefaultToppings.length > 0 && (
            <div className="flex flex-wrap gap-x-10 lg:gap-x-14 gap-y-3 lg:gap-y-4">
              {defaultToppings.map(topping => {
                const isRemoved = topping.quantity === 'none';
                return (
                  <div key={topping.id} className="flex flex-col items-stretch">
                    <button onClick={() => toggleDefaultTopping(topping.id)} className={cn(btnSmall, "rounded-b-none text-center justify-center")} style={isRemoved ? { backgroundColor: '#fca5a5', borderColor: '#fca5a5', color: '#ffffff', ...antiBlur } : blueStyle}>
                      <span className={isRemoved ? "line-through" : ""}>{topping.name}</span>
                    </button>
                    <div className="flex">
                      {SIDE_OPTIONS.map((side, idx) => {
                        const isSideDisabled = !isLargePizza && side.value !== 'whole';
                        const isSideActive = !isRemoved && (topping.side === side.value || (!isLargePizza && side.value === 'whole'));
                        return (
                          <button key={side.value} onClick={() => { if (isRemoved) toggleDefaultTopping(topping.id); updateDefaultToppingSide(topping.id, side.value as PizzaSide); }} disabled={isRemoved || isSideDisabled} className={cn(btnSmall, "flex-1 rounded-t-none justify-center")} style={(isRemoved || isSideDisabled) ? disabledStyle : isSideActive ? blueStyle : darkStyle}>
                            {side.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* EXTRA TOPPINGS - 3 column grid */}
          {availableExtraToppings.length > 0 && (
            <div className="!mt-0" style={{ marginTop: 0 }}>
              <div className="grid gap-1 lg:gap-1.5 grid-cols-3">
                {availableExtraToppings.map(topping => {
                  const selected = extraToppings.find(t => t.id === topping.id);
                  const isSelected = !!selected;
                  return (
                    <div key={topping.id} className="flex items-center gap-1 lg:gap-1.5">
                      <button onClick={() => toggleExtraTopping(topping)} className="flex items-center justify-start px-1.5 lg:px-2 py-1 lg:py-1.5 rounded border font-medium truncate" style={{ ...(isSelected ? blueStyle : darkStyle), flex: '1 1 0%', minWidth: 0 }}>
                        <span className="text-[10px] lg:text-xs truncate">{topping.name}</span>
                      </button>
                      {isLargePizza ? (
                        SIDE_OPTIONS.map(side => {
                          const isThisSideActive = isSelected && ((selected?.side || 'whole') === side.value);
                          return (
                            <button key={side.value} type="button" onClick={() => {
                              if (isThisSideActive) { toggleExtraTopping(topping); }
                              else if (!isSelected) { toggleExtraTopping(topping); setTimeout(() => updateExtraToppingSide(topping.id, side.value as PizzaSide), 0); }
                              else { updateExtraToppingSide(topping.id, side.value as PizzaSide); }
                            }} className="py-1 lg:py-1.5 px-1 lg:px-2 text-[9px] lg:text-[11px] rounded border font-medium text-center whitespace-nowrap" style={isThisSideActive ? blueStyle : darkStyle}>
                              {side.label}
                            </button>
                          );
                        })
                      ) : (
                        <button type="button" onClick={() => toggleExtraTopping(topping)} className="py-1 lg:py-1.5 px-1.5 lg:px-3 text-[9px] lg:text-[11px] rounded border font-medium text-center whitespace-nowrap" style={isSelected ? blueStyle : darkStyle}>
                          Whole
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FOOTER - single row */}
          <div className="flex items-center gap-1 lg:gap-1.5" style={{ marginTop: '2px', borderTop: '1px solid #9ab8c8', paddingTop: 6 }}>
            <input type="text" value={note} onChange={(e) => { const val = e.target.value; if (shortcutMap[val]) { setNote(shortcutMap[val]); } else { setNote(val); } }} placeholder={shortcutPlaceholder} className="flex-[2] px-2 lg:px-2.5 py-1.5 lg:py-2 text-[10px] lg:text-xs border border-slate-800 rounded bg-white text-slate-800 placeholder:text-slate-400" />
            <input type="text" inputMode="decimal" value={extraAmount || ''} onChange={(e) => { const val = e.target.value.replace(/[^0-9.]/g, ''); setExtraAmount(parseFloat(val) || 0); }} placeholder="0.00" className="w-[90px] px-2 py-1.5 lg:py-2 text-[10px] lg:text-xs border border-slate-800 rounded bg-white text-center text-slate-800" />
            <span className="text-sm lg:text-lg font-bold text-slate-900 whitespace-nowrap min-w-[70px] text-center">${totalPrice.toFixed(2)}</span>
            <Button variant="outline" onClick={onClose} className="text-[10px] lg:text-sm px-3 lg:px-4 py-1.5 lg:py-2 h-auto font-semibold" style={{ backgroundColor: '#f4a27a', borderColor: '#f4a27a', color: '#1a1a1a' }}>Cancel</Button>
            <Button variant="default" onClick={handleAddToOrder} disabled={!selectedSize || !selectedCrust} className="text-[10px] lg:text-sm px-4 lg:px-6 py-1.5 lg:py-2 h-auto font-bold bg-slate-900 text-white hover:bg-slate-800">
              {editingItem ? 'Update' : 'ADD'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

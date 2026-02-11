import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { MenuItem } from '@/hooks/useMenuItems';
import { useSizeCrustAvailability, useFreeToppings, getCrustsForSize } from '@/hooks/usePizzaOptions';
import { useToppings } from '@/hooks/useMenuItems';
import { useGlobalSauces } from '@/hooks/useGlobalSauces';
import { useNoteShortcuts } from '@/hooks/useNoteShortcuts';
import type { CartItem } from '@/types/menu';
import type { SelectedTopping, ToppingQuantity, PizzaSide } from '@/types/pizzaCustomization';
import { cn } from '@/lib/utils';

// Interfaces, constants, types, getExtraToppingPrice, FreeToppingSelection
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

  // Dynamic note shortcuts from database
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
      setLeftSpicy('none');
      setRightSpicy('none');
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

  // Responsive button styles: compact on small tablets, normal on large screens (≥1024px)
  // Anti-blur: 12px minimum font (Android WebView blurs sub-12px text at high DPI),
  // GPU layer promotion, and contain:content to isolate compositor layers
  const btnSmall = "h-7 lg:h-9 px-2 lg:px-3 text-xs lg:text-sm rounded border font-medium transition-colors mx-px my-px text-foreground inline-flex items-center justify-center text-center leading-tight whitespace-nowrap min-w-0";
  const btnActive = "border-slate-800 bg-slate-800 text-white";
  const btnInactive = "border-slate-300 bg-white hover:bg-slate-50 text-slate-700";
  const labelBox = "h-7 lg:h-9 px-1.5 lg:px-2 text-xs lg:text-sm font-medium rounded grid place-items-center text-center leading-tight whitespace-normal min-w-0";

  // POS color constants – very light red for unselected state
  const redOff = "border-red-300 bg-red-300 text-white";
  const redOffBg = "border-red-300 bg-red-300";
  // Inline styles for legacy Android WebView compatibility (prevents grey/transparent backgrounds)
  // NOTE: GPU layer promotion (translateZ, will-change) REMOVED – it causes
  // sub-pixel rendering → blurry text on Android WebViews.
  const antiBlur: React.CSSProperties = {
    WebkitFontSmoothing: 'antialiased' as any,
  };
  const redOffInline: React.CSSProperties = { backgroundColor: '#fca5a5', borderColor: '#fca5a5', ...antiBlur };
  const greenOnInline: React.CSSProperties = { backgroundColor: '#10b981', borderColor: '#10b981', ...antiBlur };
  // Extra toppings: black bg (unselected) → green bg (selected), white text always
  const extraOffInline: React.CSSProperties = { backgroundColor: '#1e293b', borderColor: '#1e293b', ...antiBlur };
  const extraOnInline: React.CSSProperties = { backgroundColor: '#10b981', borderColor: '#10b981', ...antiBlur };
  // Row-level containment only (no GPU promotion)
  const rowStyle: React.CSSProperties = { contain: 'layout style paint' };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[98vw] w-[98vw] p-2 lg:p-4 pt-1.5 lg:pt-3 gap-0.5 lg:gap-1.5 overflow-hidden max-h-[98vh] text-slate-900" style={{ backgroundColor: '#dbeafe', background: '#dbeafe', textRendering: 'geometricPrecision', WebkitFontSmoothing: 'antialiased' as any, contain: 'layout style' }}>
        {/* Header Row: Pizza Name + Size + Crust inline */}
        <div className="flex flex-wrap items-center gap-10 pb-0.5 lg:pb-1 border-b border-slate-200 pr-10 lg:pr-12">
          <h2 className="font-serif text-[10px] lg:text-sm font-bold px-1.5 lg:px-3 py-1 lg:py-1.5 rounded whitespace-nowrap uppercase" style={{ backgroundColor: '#3b82f6', color: '#ffffff', ...antiBlur }}>{item.name}</h2>
          
          {/* Sizes - single line "Name Price" */}
          <div className="flex flex-wrap gap-1 lg:gap-1.5">
            {item.sizes?.map(size => {
              const isSelected = selectedSize?.id === size.id;
              return (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize({ id: size.id, name: size.name, price: size.price })}
                  className={cn(btnSmall, "px-2")}
                  style={isSelected
                    ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                    : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                  }
                >
                  <span className="text-[9px] lg:text-xs font-medium whitespace-nowrap">{size.name} {size.price.toFixed(2)}</span>
                </button>
              );
            })}
          </div>

          {/* Crust - inline, no label */}
          {availableCrusts.length > 0 && (
            <div className="flex flex-wrap gap-1 lg:gap-1.5">
              {availableCrusts.map(crust => {
                const isSelected = selectedCrust?.id === crust.id;
                const alwaysGreen = availableCrusts.length === 1;
                return (
                  <button
                    key={crust.id}
                    onClick={() => setSelectedCrust(crust)}
                    className={cn(btnSmall, "px-2")}
                    style={(alwaysGreen || isSelected)
                      ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                      : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                    }
                  >
                    {crust.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-px lg:space-y-1.5">
          {/* Row 1: Cheese */}
          <div className="flex items-center gap-1 lg:gap-2">
            {/* Cheese section */}
            <div className="flex items-center gap-1 lg:gap-1.5 min-w-0">
              <span className={cn(labelBox, "px-3 whitespace-nowrap")}
                style={selectedCheese !== 'No Cheese'
                  ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                  : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                }
              >Cheese</span>
              {['No Cheese', 'Mozzarella', 'Dairy Free'].map(cheese => {
                const isSelected = selectedCheese === cheese;
                return (
                  <button
                    key={cheese}
                    onClick={() => {
                      setSelectedCheese(cheese);
                      if (cheese !== 'Mozzarella') setCheeseQuantity('normal');
                    }}
                    className={cn(btnSmall, "whitespace-nowrap")}
                    style={isSelected 
                      ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                      : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                    }
                  >
                    {cheese === 'No Cheese' ? 'None' : cheese === 'Mozzarella' ? 'Mozzarella' : 'Dairy Free'}
                    {cheese === 'Dairy Free' && (
                      <span className="ml-1">+{selectedSize?.name === 'Small 10"' ? 2 : 3}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Gap between cheese types and quantity */}
            <span className="w-10 lg:w-16" />
            {/* Quantity options inline */}
            <div className="flex items-center gap-1 lg:gap-1.5">
              {(['less', 'normal', 'extra'] as const).map(qty => {
                const extraPrice = selectedSize?.name?.includes('Small') ? 2 : 
                                   selectedSize?.name?.includes('Medium') ? 2.5 : 3;
                const isDisabled = selectedCheese === 'No Cheese';
                const isSelected = cheeseQuantity === qty;
                return (
                  <button
                    key={qty}
                    onClick={() => !isDisabled && setCheeseQuantity(qty)}
                    disabled={isDisabled}
                    className={cn(btnSmall, "whitespace-nowrap")}
                    style={isDisabled 
                      ? { opacity: 0.4, cursor: 'not-allowed', backgroundColor: '#94a3b8', borderColor: '#94a3b8', color: '#cbd5e1', ...antiBlur }
                      : isSelected 
                        ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                        : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                    }
                  >
                    {qty === 'less' ? 'Less' : qty === 'normal' ? 'Normal' : 'Extra'}
                    {qty === 'extra' && <span className="ml-0.5">+{extraPrice}</span>}
                  </button>
                );
              })}
            </div>
          </div>
            
          {/* Row 2: Spicy Level */}
          <div className="flex items-center gap-10">
            {/* Group 1: Spicy Level + None */}
            <div className="flex items-center gap-1 lg:gap-1.5">
              <span className={cn(labelBox, "px-3")}
                style={(leftSpicy !== 'none' || rightSpicy !== 'none') 
                  ? { backgroundColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                  : { backgroundColor: '#1e293b', color: '#ffffff', ...antiBlur }
                }
              >Spicy Level</span>
              {(() => {
                const isNoneSelected = leftSpicy === 'none' && rightSpicy === 'none';
                return (
                  <button
                    onClick={() => { setLeftSpicy('none'); setRightSpicy('none'); }}
                    className={cn(btnSmall)}
                    style={isNoneSelected 
                      ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                      : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                    }
                  >None</button>
                );
              })()}
            </div>

            {/* Group 2: Medium Hot + L/W/R */}
            <div className="flex items-center gap-1 lg:gap-1.5">
              {(() => {
                const hasMedium = leftSpicy === 'medium' || rightSpicy === 'medium';
                return (
                  <span className={cn(labelBox)}
                    style={hasMedium 
                      ? { backgroundColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                      : { backgroundColor: '#1e293b', color: '#ffffff', ...antiBlur }
                    }
                  >Medium Hot</span>
                );
              })()}
              {(['left', 'whole', 'right'] as Side[]).map(side => {
                const isSideDisabled = !isLargePizza && side !== 'whole';
                const isWholeSelected = leftSpicy === 'medium' && rightSpicy === 'medium';
                const isActive = side === 'whole' 
                  ? isWholeSelected || (!isLargePizza && leftSpicy === 'medium')
                  : side === 'left' 
                    ? leftSpicy === 'medium' && !isWholeSelected
                    : rightSpicy === 'medium' && !isWholeSelected;
                const hotWhole = leftSpicy === 'hot' && rightSpicy === 'hot';
                let isDisabled = isSideDisabled;
                if (!isSideDisabled) {
                  if (hotWhole) isDisabled = true;
                  if (side === 'left' && leftSpicy === 'hot') isDisabled = true;
                  if (side === 'right' && rightSpicy === 'hot') isDisabled = true;
                  if (side === 'whole' && (leftSpicy === 'hot' || rightSpicy === 'hot')) isDisabled = true;
                }
                return (
                  <button
                    key={side}
                    disabled={isDisabled}
                    onClick={() => {
                      if (isActive) {
                        if (side === 'whole') { setLeftSpicy('none'); setRightSpicy('none'); }
                        else if (side === 'left') { setLeftSpicy('none'); }
                        else { setRightSpicy('none'); }
                      } else {
                        if (side === 'whole') { setLeftSpicy('medium'); setRightSpicy('medium'); }
                        else if (side === 'left') { setLeftSpicy('medium'); if (rightSpicy !== 'hot') setRightSpicy('none'); }
                        else { setRightSpicy('medium'); if (leftSpicy !== 'hot') setLeftSpicy('none'); }
                      }
                    }}
                    className={cn(btnSmall)}
                    style={isDisabled 
                      ? { opacity: 0.7, cursor: 'not-allowed', backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#94a3b8', ...antiBlur }
                      : isActive 
                        ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                        : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                    }
                  >
                    {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                  </button>
                );
              })}
            </div>

            {/* Group 3: Hot + L/W/R */}
            <div className="flex items-center gap-1 lg:gap-1.5">
              {(() => {
                const hasHot = leftSpicy === 'hot' || rightSpicy === 'hot';
                return (
                  <span className={cn(labelBox)}
                    style={hasHot 
                      ? { backgroundColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                      : { backgroundColor: '#1e293b', color: '#ffffff', ...antiBlur }
                    }
                  >Hot</span>
                );
              })()}
              {(['left', 'whole', 'right'] as Side[]).map(side => {
                const isSideDisabled = !isLargePizza && side !== 'whole';
                const isWholeSelected = leftSpicy === 'hot' && rightSpicy === 'hot';
                const isActive = side === 'whole' 
                  ? isWholeSelected || (!isLargePizza && leftSpicy === 'hot')
                  : side === 'left' 
                    ? leftSpicy === 'hot' && !isWholeSelected
                    : rightSpicy === 'hot' && !isWholeSelected;
                const medWhole = leftSpicy === 'medium' && rightSpicy === 'medium';
                let isDisabled = isSideDisabled;
                if (!isSideDisabled) {
                  if (medWhole) isDisabled = true;
                  if (side === 'left' && leftSpicy === 'medium') isDisabled = true;
                  if (side === 'right' && rightSpicy === 'medium') isDisabled = true;
                  if (side === 'whole' && (leftSpicy === 'medium' || rightSpicy === 'medium')) isDisabled = true;
                }
                return (
                  <button
                    key={side}
                    disabled={isDisabled}
                    onClick={() => {
                      if (isActive) {
                        if (side === 'whole') { setLeftSpicy('none'); setRightSpicy('none'); }
                        else if (side === 'left') { setLeftSpicy('none'); }
                        else { setRightSpicy('none'); }
                      } else {
                        if (side === 'whole') { setLeftSpicy('hot'); setRightSpicy('hot'); }
                        else if (side === 'left') { setLeftSpicy('hot'); if (rightSpicy !== 'medium') setRightSpicy('none'); }
                        else { setRightSpicy('hot'); if (leftSpicy !== 'medium') setLeftSpicy('none'); }
                      }
                    }}
                    className={cn(btnSmall)}
                    style={isDisabled 
                      ? { opacity: 0.7, cursor: 'not-allowed', backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#94a3b8', ...antiBlur }
                      : isActive 
                        ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                        : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                    }
                  >
                    {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Free Add-ons */}
          {freeToppings.length > 0 && (
            <div className="flex items-center gap-10">
              {freeToppings.map(topping => {
                const selection = freeToppingSelections.find(f => f.name === topping.name);
                const isSelected = !!selection;
                return (
                  <div key={topping.id} className="flex items-center gap-1 lg:gap-1.5">
                    {/* Name button */}
                    <button
                      onClick={() => toggleFreeTopping(topping.name)}
                      className={cn(btnSmall)}
                      style={isSelected 
                        ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                        : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                      }
                    >
                      {topping.name}
                    </button>
                    <div className="flex gap-1 lg:gap-1.5">
                      {(['left', 'whole', 'right'] as const).map(side => {
                        const isSideDisabled = !isLargePizza && side !== 'whole';
                        const isSideSelected = isSelected && selection?.side === side;
                        const isWholeActive = !isLargePizza && isSelected && side === 'whole';
                        return (
                          <button
                            key={side}
                            disabled={isSideDisabled}
                            onClick={() => {
                              if (isSideSelected || isWholeActive) {
                                toggleFreeTopping(topping.name);
                              } else if (!isSelected) {
                                toggleFreeTopping(topping.name);
                                setTimeout(() => updateFreeToppingSide(topping.name, side), 0);
                              } else {
                                updateFreeToppingSide(topping.name, side);
                              }
                            }}
                            className={cn(btnSmall)}
                            style={isSideDisabled
                              ? { opacity: 0.4, cursor: 'not-allowed', backgroundColor: '#94a3b8', borderColor: '#94a3b8', color: '#cbd5e1', ...antiBlur }
                              : (isSideSelected || isWholeActive)
                                ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                                : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                            }
                          >
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


          {/* Sauce Selection - all inline on one row */}
          <div className="flex gap-1 lg:gap-1.5 items-center">
            <button
              onClick={() => setSelectedSauceId(null)}
              className={cn(btnSmall)}
              style={selectedSauceId === null 
                ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
              }
            >
              No Sauce
            </button>
            {availableSauces.map(sauce => (
              <button
                key={sauce.id}
                onClick={() => setSelectedSauceId(sauce.id)}
                className={cn(btnSmall)}
                style={selectedSauceId === sauce.id 
                  ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                  : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                }
              >
                {sauce.name.replace(/ Sauce$/i, '')}
              </button>
            ))}
            {(['less', 'normal', 'extra'] as const).map(qty => {
              const isSelected = sauceQuantity === qty;
              return (
                <button
                  key={qty}
                  onClick={() => selectedSauceId && setSauceQuantity(qty)}
                  disabled={!selectedSauceId}
                  className={cn(btnSmall)}
                  style={!selectedSauceId
                    ? { opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#94a3b8', borderColor: '#94a3b8', color: '#cbd5e1', ...antiBlur }
                    : isSelected 
                      ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                      : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                  }
                >
                  {qty === 'less' ? 'Less' : qty === 'normal' ? 'Normal' : 'Extra'}
                </button>
              );
            })}
          </div>

          {/* Default Toppings - vertical stacks: name on top, L/W/R below */}
          {pizzaDefaultToppings.length > 0 && (
            <div>
              <div className="grid grid-cols-4 lg:grid-cols-5 gap-2 lg:gap-3">
                {defaultToppings.map(topping => {
                  const isRemoved = topping.quantity === 'none';
                  return (
                    <div key={topping.id} className="flex flex-col items-stretch">
                      {/* Name bar */}
                      <button
                        onClick={() => updateDefaultToppingQuantity(
                          topping.id, 
                          isRemoved ? 'regular' : 'none'
                        )}
                        className={cn(btnSmall, "rounded-b-none text-center justify-center")}
                        style={isRemoved 
                          ? { backgroundColor: '#fca5a5', borderColor: '#fca5a5', color: '#ffffff', ...antiBlur }
                          : { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                        }
                      >
                        <span className={isRemoved ? "line-through" : ""}>
                          {topping.name}
                        </span>
                      </button>
                      {/* L/W/R buttons below */}
                      <div className="flex">
                        {SIDE_OPTIONS.map((side, idx) => {
                          const isSideDisabled = !isLargePizza && side.value !== 'whole';
                          const isSideActive = !isRemoved && (topping.side === side.value || (!isLargePizza && side.value === 'whole'));
                          return (
                            <button
                              key={side.value}
                              onClick={() => {
                                if (isRemoved) {
                                  updateDefaultToppingQuantity(topping.id, 'regular');
                                }
                                updateDefaultToppingSide(topping.id, side.value as PizzaSide);
                              }}
                              disabled={isRemoved || isSideDisabled}
                              className={cn(btnSmall, "flex-1 rounded-t-none justify-center", idx === 0 && "rounded-tl-none", idx === SIDE_OPTIONS.length - 1 && "rounded-tr-none")}
                              style={(isRemoved || isSideDisabled)
                                ? { opacity: 0.4, cursor: 'not-allowed', backgroundColor: '#94a3b8', borderColor: '#94a3b8', color: '#cbd5e1', ...antiBlur }
                                : isSideActive 
                                  ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                                  : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                              }
                            >
                              {side.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extra Toppings - 3 column grid matching reference */}
          {availableExtraToppings.length > 0 && (
            <div>
              <div className="grid gap-1 lg:gap-1.5 grid-cols-3">
                {availableExtraToppings.map(topping => {
                  const selected = extraToppings.find(t => t.id === topping.id);
                  const isSelected = !!selected;
                  return (
                    <div 
                      key={topping.id} 
                      className="flex items-center gap-1 lg:gap-1.5"
                    >
                      {/* Topping name button - wide */}
                      <button
                        onClick={() => toggleExtraTopping(topping)}
                        className="flex items-center justify-start px-2 lg:px-3 py-1.5 lg:py-2 rounded border font-medium truncate"
                        style={{
                          ...(isSelected
                            ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff' }
                            : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff' }),
                          flex: '1 1 0%',
                          minWidth: 0,
                          ...antiBlur,
                        }}
                      >
                        <span className="text-xs lg:text-sm truncate">{topping.name}</span>
                      </button>

                      {/* Show L/W/R for large pizza, single Whole for others */}
                      {isLargePizza ? (
                        SIDE_OPTIONS.map(side => {
                          const isThisSideActive = isSelected && ((selected?.side || 'whole') === side.value);
                          return (
                            <button
                              key={side.value}
                              type="button"
                              onClick={() => {
                                if (isThisSideActive) {
                                  toggleExtraTopping(topping);
                                } else if (!isSelected) {
                                  toggleExtraTopping(topping);
                                  setTimeout(() => updateExtraToppingSide(topping.id, side.value as PizzaSide), 0);
                                } else {
                                  updateExtraToppingSide(topping.id, side.value as PizzaSide);
                                }
                              }}
                              className="py-1.5 lg:py-2 px-1.5 lg:px-3 text-[10px] lg:text-xs rounded border font-medium text-center whitespace-nowrap"
                              style={isThisSideActive 
                                ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                                : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                              }
                            >
                              {side.label}
                            </button>
                          );
                        })
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleExtraTopping(topping)}
                          className="py-1.5 lg:py-2 px-2 lg:px-4 text-[10px] lg:text-xs rounded border font-medium text-center whitespace-nowrap"
                          style={isSelected 
                            ? { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur }
                            : { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur }
                          }
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

          {/* Bottom footer: Notes spans col 1+2, controls in col 3 */}
          <div className="grid grid-cols-3 gap-1 lg:gap-1.5">
            {/* Notes input spanning col 1+2, 2 rows tall */}
            <div className="col-span-2 row-span-2">
              <input
                type="text"
                value={note}
                onChange={(e) => {
                  const val = e.target.value;
                  if (shortcutMap[val]) {
                    setNote(shortcutMap[val]);
                  } else {
                    setNote(val);
                  }
                }}
                placeholder={shortcutPlaceholder}
                className="w-full h-full px-2 lg:px-3 py-2 lg:py-3 text-[10px] lg:text-sm border border-slate-800 rounded bg-white text-slate-800 placeholder:text-slate-400"
              />
            </div>
            {/* Col 3 row 1: Extra amount + price */}
            <div className="flex items-center gap-1 lg:gap-1.5">
              <input
                type="text"
                inputMode="decimal"
                value={extraAmount || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setExtraAmount(parseFloat(val) || 0);
                }}
                placeholder="0"
                className="flex-1 min-w-0 px-1.5 lg:px-2 py-1 lg:py-1.5 text-[10px] lg:text-sm border border-slate-800 rounded bg-white text-center text-slate-800"
              />
              <span className="text-sm lg:text-xl font-bold text-slate-900 whitespace-nowrap">
                ${totalPrice.toFixed(2)}
              </span>
            </div>
            {/* Col 3 row 2: Cancel + ADD */}
            <div className="flex gap-1 lg:gap-1.5">
              <Button variant="outline" onClick={onClose} className="flex-1 text-xs lg:text-base px-2 lg:px-4 py-1.5 lg:py-2.5 h-auto font-semibold" style={{ backgroundColor: '#fdba74', borderColor: '#fdba74', color: '#1e293b' }}>Cancel</Button>
              <Button 
                variant="default" 
                onClick={handleAddToOrder}
                disabled={!selectedSize || !selectedCrust}
                className="flex-[1.5] text-xs lg:text-base px-2 lg:px-4 py-1.5 lg:py-2.5 h-auto font-bold bg-slate-900 text-white hover:bg-slate-800"
              >
                {editingItem ? 'Update' : 'ADD'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

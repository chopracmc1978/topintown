import { useState, useMemo, useEffect } from 'react';
import type { MenuItem } from '@/hooks/useMenuItems';
import { useSizeCrustAvailability, useFreeToppings, getCrustsForSize } from '@/hooks/usePizzaOptions';
import { useToppings } from '@/hooks/useMenuItems';
import { useGlobalSauces } from '@/hooks/useGlobalSauces';
import { useNoteShortcuts } from '@/hooks/useNoteShortcuts';
import type { CartItem } from '@/types/menu';
import type { SelectedTopping, ToppingQuantity, PizzaSide } from '@/types/pizzaCustomization';
import React from 'react';

export interface POSPizzaModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToOrder: (item: CartItem) => void;
  editingItem?: CartItem | null;
}

export const GLUTEN_FREE_PRICE = 2.5;
export type SpicyLevel = 'none' | 'medium' | 'hot';
export type Side = 'left' | 'whole' | 'right';

export const SIDE_OPTIONS: { value: Side; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'whole', label: 'Whole' },
  { value: 'right', label: 'Right' },
];

export const getExtraToppingPrice = (sizeName: string): number => {
  if (sizeName.includes('Small')) return 2;
  if (sizeName.includes('Medium') || sizeName.toLowerCase().includes('gluten')) return 2.5;
  return 3;
};

// Get per-topping price from DB (falls back to generic size price)
export const getToppingDbPrice = (topping: { price_small?: number; price_medium?: number; price_large?: number; price?: number }, sizeName: string): number => {
  if (sizeName.includes('Small')) return topping.price_small ?? topping.price ?? 2;
  if (sizeName.includes('Medium') || sizeName.toLowerCase().includes('gluten')) return topping.price_medium ?? topping.price ?? 2.5;
  return topping.price_large ?? topping.price ?? 3;
};

export interface FreeToppingSelection {
  name: string;
  side: Side;
}

// Shared styles
const antiBlur: React.CSSProperties = { WebkitFontSmoothing: 'antialiased' as any };
export const blueStyle: React.CSSProperties = { backgroundColor: '#3b82f6', borderColor: '#3b82f6', color: '#ffffff', ...antiBlur };
export const darkStyle: React.CSSProperties = { backgroundColor: '#1e293b', borderColor: '#1e293b', color: '#ffffff', ...antiBlur };
export const disabledStyle: React.CSSProperties = { opacity: 0.4, cursor: 'not-allowed', backgroundColor: '#94a3b8', borderColor: '#94a3b8', color: '#cbd5e1', ...antiBlur };
export const removedStyle: React.CSSProperties = { backgroundColor: '#fca5a5', borderColor: '#fca5a5', color: '#ffffff', ...antiBlur };

export function usePOSPizzaModal({ item, isOpen, onClose, onAddToOrder, editingItem }: POSPizzaModalProps) {
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

  useEffect(() => {
    if (isOpen && !editCustomization) {
      if (defaultSize) setSelectedSize({ id: defaultSize.id, name: defaultSize.name, price: defaultSize.price });
      if (defaultSauceIds.length > 0) setSelectedSauceId(defaultSauceIds[0]);
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
        id: t.id, name: t.name, quantity: 'regular' as ToppingQuantity,
        price: 0, isDefault: true, isVeg: t.isVeg, side: 'whole' as PizzaSide,
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
      if (mediumHotSelection === 'left' || mediumHotSelection === 'right') setMediumHotSelection('none');
      if (hotSelection === 'left' || hotSelection === 'right') setHotSelection('none');
      setDefaultToppings(prev => prev.map(t => ({ ...t, side: 'whole' as PizzaSide })));
      setExtraToppings(prev => prev.map(t => ({ ...t, side: 'whole' as PizzaSide })));
      setFreeToppingSelections(prev => prev.map(t => ({ ...t, side: 'whole' as Side })));
    }
  }, [isLargePizza]);

  useEffect(() => {
    if (selectedSize && !isMediumPizza && availableCrusts.length > 0) {
      const regularCrust = availableCrusts.find(c => c.name.toLowerCase().includes('regular'));
      if (regularCrust) setSelectedCrust(regularCrust);
    }
  }, [selectedSize, isMediumPizza, availableCrusts]);

  const availableSauces = allSauces?.filter(s => s.is_available) || [];

  const availableExtraToppings = useMemo(() => {
    const toppings = allToppings?.filter(t => t.is_available && t.name.toLowerCase() !== 'cheese') || [];
    return [...toppings].sort((a, b) => {
      if (a.is_veg === b.is_veg) return a.sort_order - b.sort_order;
      return a.is_veg ? -1 : 1;
    });
  }, [allToppings]);

  const freeToppings = freeToppingsData?.filter(t => t.is_available) || [];

  const toggleDefaultTopping = (id: string) => {
    setDefaultToppings(prev => prev.map(t =>
      t.id === id ? { ...t, quantity: t.quantity === 'none' ? 'regular' : 'none' } : t
    ));
  };

  const updateDefaultToppingSide = (toppingId: string, side: PizzaSide) => {
    if (!isLargePizza && side !== 'whole') return;
    setDefaultToppings(prev => prev.map(t => t.id === toppingId ? { ...t, side } : t));
  };

  const toggleExtraTopping = (topping: typeof availableExtraToppings[0]) => {
    setExtraToppings(prev => {
      const existing = prev.find(t => t.id === topping.id);
      if (existing) return prev.filter(t => t.id !== topping.id);
      const toppingPrice = getToppingDbPrice(topping, selectedSize?.name || '');
      return [...prev, {
        id: topping.id, name: topping.name, quantity: 'regular' as ToppingQuantity,
        side: 'whole' as PizzaSide, isVeg: topping.is_veg, price: toppingPrice,
      }];
    });
  };

  const updateExtraToppingSide = (toppingId: string, side: PizzaSide) => {
    if (!isLargePizza && side !== 'whole') return;
    setExtraToppings(prev => prev.map(t => t.id === toppingId ? { ...t, side } : t));
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
    setFreeToppingSelections(prev => prev.map(t => t.name === name ? { ...t, side } : t));
  };

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

  const getSpicyButtonStates = () => {
    if (!isLargePizza) {
      return {
        mediumHot: { left: true, whole: false, right: true },
        hot: { left: true, whole: false, right: true },
      };
    }
    if (mediumHotSelection === 'whole') return { mediumHot: { left: true, whole: false, right: true }, hot: { left: true, whole: true, right: true } };
    if (hotSelection === 'whole') return { mediumHot: { left: true, whole: true, right: true }, hot: { left: true, whole: false, right: true } };
    if (mediumHotSelection === 'left') return { mediumHot: { left: false, whole: true, right: true }, hot: { left: true, whole: true, right: false } };
    if (mediumHotSelection === 'right') return { mediumHot: { left: true, whole: true, right: false }, hot: { left: false, whole: true, right: true } };
    if (hotSelection === 'left') return { mediumHot: { left: true, whole: true, right: false }, hot: { left: false, whole: true, right: true } };
    if (hotSelection === 'right') return { mediumHot: { left: false, whole: true, right: true }, hot: { left: true, whole: true, right: false } };
    return { mediumHot: { left: false, whole: false, right: false }, hot: { left: false, whole: false, right: false } };
  };

  const spicyBtnStates = getSpicyButtonStates();
  const effectiveSpicy = getEffectiveSpicy();

  const calculatePrice = () => {
    let price = selectedSize?.price || 0;
    if (selectedCrust?.name.toLowerCase().includes('gluten')) price += GLUTEN_FREE_PRICE;
    if (selectedCheese === 'Dairy Free') price += selectedSize?.name === 'Small 10"' ? 2 : 3;
    if (selectedCheese === 'Mozzarella' && cheeseQuantity === 'extra') {
      if (selectedSize?.name?.includes('Small')) price += 2;
      else if (selectedSize?.name?.includes('Medium')) price += 2.5;
      else price += 3;
    }
    if (selectedSauceId && allSauces) {
      const sauce = allSauces.find(s => s.id === selectedSauceId);
      if (sauce && !defaultSauceIds.includes(sauce.id)) price += sauce.price;
      if (sauceQuantity === 'extra' && sauce) price += sauce.price;
    }
    const tp = getExtraToppingPrice(selectedSize?.name || '');
    defaultToppings.forEach(t => { if (t.quantity === 'extra') price += tp; });
    extraToppings.forEach(t => price += t.price);
    price += extraAmount;
    return price;
  };

  const totalPrice = calculatePrice();
  const cheeseExtraPrice = selectedSize?.name?.includes('Small') ? 2 : selectedSize?.name?.includes('Medium') ? 2.5 : 3;
  const isGlutenFreeAllowed = isMediumPizza;

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
        size: selectedSize, crust: selectedCrust, cheeseType: selectedCheese,
        cheeseSides: [{ side: 'whole', quantity: cheeseQuantity }],
        sauceId: selectedSauceId, sauceName,
        sauceQuantity: sauceQuantity === 'extra' ? 'extra' : 'normal',
        isDefaultSauce: !!(selectedSauceId && defaultSauceIds.includes(selectedSauceId)),
        freeToppings: freeToppingSelections.map(f => `${f.name}${isLargePizza && f.side !== 'whole' ? ` (${f.side})` : ''}`),
        spicyLevel: effectiveSpicy, defaultToppings, extraToppings, note,
        extraAmount: extraAmount > 0 ? extraAmount : undefined,
        originalItemId: item.id,
      },
    };
    onAddToOrder(cartItem);
    onClose();
  };

  const handleNoteChange = (val: string) => {
    if (shortcutMap[val]) setNote(shortcutMap[val]);
    else setNote(val);
  };

  const handleExtraAmountChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.]/g, '');
    setExtraAmount(parseFloat(cleaned) || 0);
  };

  return {
    // State
    selectedSize, setSelectedSize,
    selectedCrust, setSelectedCrust,
    selectedCheese, setSelectedCheese,
    cheeseQuantity, setCheeseQuantity,
    selectedSauceId, setSelectedSauceId,
    sauceQuantity, setSauceQuantity,
    note, extraAmount,
    mediumHotSelection, setMediumHotSelection,
    hotSelection, setHotSelection,
    defaultToppings, extraToppings, freeToppingSelections,
    // Computed
    isLargePizza, isMediumPizza, isGlutenFreeAllowed,
    availableCrusts, availableSauces, availableExtraToppings,
    freeToppings, pizzaDefaultToppings,
    spicyBtnStates, totalPrice, cheeseExtraPrice,
    shortcutPlaceholder, effectiveSpicy,
    // Handlers
    toggleDefaultTopping, updateDefaultToppingSide,
    toggleExtraTopping, updateExtraToppingSide,
    toggleFreeTopping, updateFreeToppingSide,
    handleAddToOrder, handleNoteChange, handleExtraAmountChange,
  };
}

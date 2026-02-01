import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCart } from '@/contexts/CartContext';
import type { MenuItem } from '@/hooks/useMenuItems';
import { useSizeCrustAvailability, useCheeseOptions, useFreeToppings, getCrustsForSize } from '@/hooks/usePizzaOptions';
import { useToppings } from '@/hooks/useMenuItems';
import { useGlobalSauces } from '@/hooks/useGlobalSauces';
import type { SideSpicyLevel, ToppingQuantity, SelectedTopping, PizzaSide } from '@/types/pizzaCustomization';
import type { CartItem } from '@/types/menu';
import { cn } from '@/lib/utils';
import { Flame, ArrowRight } from 'lucide-react';
import UpsellModal from '@/components/upsell/UpsellModal';

interface PizzaCustomizationModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  editingCartItem?: CartItem;
}

type CheeseQuantity = 'none' | 'light' | 'normal' | 'extra';

interface CheeseSideSelection {
  side: PizzaSide;
  quantity: CheeseQuantity;
}

const GLUTEN_FREE_PRICE = 2.5;

const PizzaCustomizationModal = ({ item, isOpen, onClose, editingCartItem }: PizzaCustomizationModalProps) => {
  const { addCustomizedPizza, updateCustomizedPizza, addToCart } = useCart();
  const { data: sizeCrustAvailability } = useSizeCrustAvailability();
  const { data: cheeseOptions } = useCheeseOptions();
  const { data: freeToppingsData } = useFreeToppings();
  const { data: allSauces } = useGlobalSauces();
  const { data: allToppings } = useToppings();
  
  // Upsell modal state
  const [showUpsell, setShowUpsell] = useState(false);
  const [pendingPizzaData, setPendingPizzaData] = useState<{
    menuItem: any;
    customization: any;
    totalPrice: number;
  } | null>(null);

  const defaultSauceIds = useMemo(
    () => item.default_global_sauces?.map(ds => ds.global_sauce_id) || [],
    [item.default_global_sauces]
  );
  const defaultSize = item.sizes?.[1] || item.sizes?.[0];

  // Get initial values from editingCartItem if in edit mode
  const editCustomization = editingCartItem?.pizzaCustomization;

  const [selectedSize, setSelectedSize] = useState<{ id: string; name: string; price: number } | null>(
    editCustomization?.size || null
  );
  const [selectedCrust, setSelectedCrust] = useState<{ id: string; name: string; price: number } | null>(
    editCustomization?.crust || null
  );
  const [selectedCheeseType, setSelectedCheeseType] = useState<string>(
    editCustomization?.cheeseType || 'mozzarella'
  );
  const [cheeseSides, setCheeseSides] = useState<CheeseSideSelection[]>(
    editCustomization?.cheeseSides?.map(cs => ({ side: cs.side as PizzaSide, quantity: cs.quantity as CheeseQuantity })) || [{ side: 'whole', quantity: 'normal' }]
  );
  const [selectedSauceId, setSelectedSauceId] = useState<string | null>(
    editCustomization?.sauceId || null
  );
  const [sauceQuantity, setSauceQuantity] = useState<'normal' | 'extra'>(
    editCustomization?.sauceQuantity || 'normal'
  );
  // Prevent default sauce auto-selection from overriding an explicit user choice (e.g. "No Sauce")
  const [hasTouchedSauce, setHasTouchedSauce] = useState(false);
  const [selectedFreeToppings, setSelectedFreeToppings] = useState<string[]>(
    editCustomization?.freeToppings || []
  );
  const [spicyLevel, setSpicyLevel] = useState<SideSpicyLevel>(
    editCustomization?.spicyLevel || { left: 'none', right: 'none' }
  );
  const [defaultToppings, setDefaultToppings] = useState<SelectedTopping[]>(
    editCustomization?.defaultToppings || []
  );
  const [extraToppings, setExtraToppings] = useState<SelectedTopping[]>(
    editCustomization?.extraToppings || []
  );
  const [note, setNote] = useState(editCustomization?.note || '');

  const isLarge = selectedSize?.name.includes('Large');
  const isGlutenFree = selectedCrust?.name.toLowerCase().includes('gluten free') || false;

  // Initialize size
  useEffect(() => {
    if (defaultSize && !selectedSize) setSelectedSize({ id: defaultSize.id, name: defaultSize.name, price: defaultSize.price });
  }, [defaultSize, selectedSize]);

  // Initialize crust based on size
  useEffect(() => {
    if (selectedSize && sizeCrustAvailability && !selectedCrust) {
      const crusts = getCrustsForSize(sizeCrustAvailability, selectedSize.name);
      if (crusts.length > 0) {
        const reg = crusts.find(c => c.name.toLowerCase() === 'regular') || crusts[0];
        setSelectedCrust({ id: reg.id, name: reg.name, price: 0 });
      }
    }
  }, [selectedSize, sizeCrustAvailability, selectedCrust]);

  // Initialize default toppings
  useEffect(() => {
    if (item.default_toppings && defaultToppings.length === 0) {
      setDefaultToppings(item.default_toppings.map(dt => ({
        id: dt.topping_id, name: dt.topping?.name || '', quantity: 'regular' as ToppingQuantity,
        price: 0, isDefault: true, isVeg: dt.topping?.is_veg, side: 'whole' as PizzaSide,
      })));
    }
  }, [item.default_toppings, defaultToppings.length]);

  // Initialize default sauce
  useEffect(() => {
    // In edit mode we keep the user's previous choice (including "No Sauce").
    if (editingCartItem) return;
    if (!isOpen || !allSauces || defaultSauceIds.length === 0) return;
    // Once the user interacts with the sauce section, don't auto-apply defaults again.
    if (hasTouchedSauce) return;
    if (selectedSauceId !== null) return;
    const sauce = allSauces.find(s => defaultSauceIds.includes(s.id));
    if (sauce) setSelectedSauceId(sauce.id);
  }, [isOpen, item.id, allSauces, defaultSauceIds, editingCartItem, selectedSauceId, hasTouchedSauce]);

  // Reset "touched" state each time the modal opens (so defaults can apply for a fresh customization)
  useEffect(() => {
    if (!isOpen) return;
    setHasTouchedSauce(false);
  }, [isOpen, item.id, editingCartItem?.id]);

  // Update crust when size changes
  const availableCrusts = useMemo(() => {
    if (!selectedSize || !sizeCrustAvailability) return [];
    return getCrustsForSize(sizeCrustAvailability, selectedSize.name);
  }, [selectedSize, sizeCrustAvailability]);

  useEffect(() => {
    if (selectedSize && availableCrusts.length > 0 && !availableCrusts.find(c => c.id === selectedCrust?.id)) {
      const reg = availableCrusts.find(c => c.name.toLowerCase() === 'regular') || availableCrusts[0];
      setSelectedCrust({ id: reg.id, name: reg.name, price: 0 });
    }
  }, [selectedSize, availableCrusts, selectedCrust?.id]);

  // Reset cheese sides when size changes (only large supports sides)
  useEffect(() => {
    if (!isLarge) {
      setCheeseSides([{ side: 'whole', quantity: 'normal' }]);
    }
  }, [isLarge]);

  const toppingPrice = selectedSize?.name.includes('Small') ? 2 : selectedSize?.name.includes('Large') ? 3 : 2.5;

  // Dairy Free cheese pricing: Small/Medium/GlutenFree = $2, Large = $3
  const dairyFreePrice = isLarge ? 3 : 2;

  // Calculate total price
  const totalPrice = useMemo(() => {
    let t = (selectedSize?.price || 0) + (selectedCrust?.price || 0);
    
    // Cheese pricing
    // Dairy Free cheese adds extra charge
    if (selectedCheeseType === 'dairy-free') {
      t += dairyFreePrice;
    }
    // Extra cheese quantity
    cheeseSides.forEach(cs => {
      if (cs.quantity === 'extra') t += toppingPrice;
    });

    // Sauce pricing
    if (selectedSauceId && allSauces) {
      const sauce = allSauces.find(s => s.id === selectedSauceId);
      if (sauce && !defaultSauceIds.includes(sauce.id)) t += sauce.price;
      if (sauceQuantity === 'extra' && sauce) t += sauce.price;
    }

    // Topping pricing
    defaultToppings.forEach(tp => { if (tp.quantity === 'extra') t += toppingPrice; });
    extraToppings.forEach(tp => t += tp.price);
    
    return t;
  }, [selectedSize, selectedCrust, selectedCheeseType, dairyFreePrice, cheeseSides, selectedSauceId, sauceQuantity, allSauces, defaultSauceIds, defaultToppings, extraToppings, toppingPrice]);

  const handleNext = () => {
    if (!selectedSize || !selectedCrust) return;
    
    const sauceName = selectedSauceId && allSauces 
      ? allSauces.find(s => s.id === selectedSauceId)?.name || ''
      : '';
    
    const customization = {
      size: selectedSize,
      crust: selectedCrust,
      cheeseType: selectedCheeseType,
      cheeseSides: cheeseSides.map(cs => ({ side: cs.side, quantity: cs.quantity })),
      sauceId: selectedSauceId,
      sauceName,
      sauceQuantity,
      freeToppings: freeToppingsData?.filter(f => selectedFreeToppings.includes(f.id)).map(f => f.name) || [],
      spicyLevel,
      defaultToppings,
      extraToppings,
      note,
      originalItemId: item.id,
    };
    
    const menuItem = {
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: totalPrice,
      image: item.image_url || '/placeholder.svg',
      category: 'pizza' as const,
      popular: item.is_popular,
    };
    
    if (editingCartItem) {
      // For editing, update directly without upsell
      updateCustomizedPizza(editingCartItem.id, menuItem, customization, totalPrice);
      onClose();
    } else {
      // For new pizza, show upsell flow
      setPendingPizzaData({ menuItem, customization, totalPrice });
      setShowUpsell(true);
    }
  };

  const handleUpsellComplete = (upsellItems: { id: string; name: string; price: number; image_url?: string | null; quantity: number }[]) => {
    // First add the pizza
    if (pendingPizzaData) {
      addCustomizedPizza(pendingPizzaData.menuItem, pendingPizzaData.customization, pendingPizzaData.totalPrice);
    }
    
    // Then add all upsell items
    upsellItems.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        addToCart({
          id: item.id,
          name: item.name,
          description: '',
          price: item.price,
          image: item.image_url || '/placeholder.svg',
          category: 'sides',
        });
      }
    });
    
    // Reset and close
    setPendingPizzaData(null);
    setShowUpsell(false);
    onClose();
  };

  const handleUpsellClose = () => {
    // If upsell is closed via X button, do NOT add the pizza - user cancelled
    setPendingPizzaData(null);
    setShowUpsell(false);
    onClose();
  };

  // Cheese side selection helpers
  const handleCheeseSideSelect = (index: number, side: PizzaSide) => {
    setCheeseSides(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], side };
      
      if (side === 'whole') {
        return [updated[index]]; // Only one row for whole
      } else if (prev.length === 1) {
        // Add second row for left/right selection
        const otherSide: PizzaSide = side === 'left' ? 'right' : 'left';
        return [updated[index], { side: otherSide, quantity: 'none' }];
      }
      return updated;
    });
  };

  const getAvailableSidesForRow = (rowIndex: number): PizzaSide[] => {
    if (cheeseSides.length === 1) return ['left', 'whole', 'right'];
    const otherRow = cheeseSides[rowIndex === 0 ? 1 : 0];
    if (!otherRow) return ['left', 'whole', 'right'];
    if (otherRow.side === 'left') return ['right'];
    if (otherRow.side === 'right') return ['left'];
    return ['left', 'right'];
  };

  // Topping side helpers
  const canShowSides = isLarge;

  const updateTopping = (id: string, q: ToppingQuantity, s: PizzaSide, p: number, isExtra: boolean) => {
    if (isExtra) {
      setExtraToppings(prev => prev.map(t => t.id === id ? { ...t, quantity: q, side: s, price: p } : t));
    } else {
      setDefaultToppings(prev => prev.map(t => t.id === id ? { ...t, quantity: q, side: s, price: p } : t));
    }
  };

  const addExtraTopping = (t: { id: string; name: string; is_veg: boolean }) => {
    setExtraToppings(p => [...p, { 
      id: t.id, name: t.name, quantity: 'regular', price: toppingPrice, 
      isDefault: false, isVeg: t.is_veg, side: 'whole' 
    }]);
  };

  // Filter out "Cheese" from extra toppings (keep in settings but hide from customer modal)
  const vegTops = (allToppings || []).filter(t => t.is_veg && t.name.toLowerCase() !== 'cheese' && !defaultToppings.some(d => d.id === t.id) && !extraToppings.some(e => e.id === t.id));
  const nonVegTops = (allToppings || []).filter(t => !t.is_veg && t.name.toLowerCase() !== 'cheese' && !defaultToppings.some(d => d.id === t.id) && !extraToppings.some(e => e.id === t.id));

  // Pizza side icon component - circular with half/full fill
  const PizzaSideIcon = ({ side, selected, onClick, disabled, size = 'md' }: { side: PizzaSide; selected: boolean; onClick: () => void; disabled?: boolean; size?: 'sm' | 'md' }) => {
    const sizeClasses = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
    const innerSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
    
    return (
      <button 
        onClick={onClick} 
        disabled={disabled}
        className={cn(
          "rounded-full border-2 flex items-center justify-center transition-all",
          sizeClasses,
          selected ? "border-destructive" : "border-muted-foreground/30",
          disabled && "opacity-30 cursor-not-allowed"
        )}
      >
        <div className={cn("rounded-full overflow-hidden bg-amber-50", innerSize)}>
          {side === 'left' && <div className="w-1/2 h-full bg-destructive" />}
          {side === 'right' && <div className="w-1/2 h-full bg-destructive ml-auto" />}
          {side === 'whole' && <div className="w-full h-full bg-destructive" />}
        </div>
      </button>
    );
  };

  return (
    <>
    <Dialog open={isOpen && !showUpsell} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 bg-card overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <img src={item.image_url || '/placeholder.svg'} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
            <h2 className="font-serif text-lg font-bold">{item.name}</h2>
          </div>
          {editingCartItem ? (
            <Button variant="pizza" onClick={handleNext}>
              Update Cart - ${totalPrice.toFixed(2)}
            </Button>
          ) : (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-bold text-lg text-primary">${totalPrice.toFixed(2)}</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 space-y-4">
          {/* 1. SIZE & CRUST */}
          <div className="bg-primary/10 rounded-lg overflow-hidden">
            <div className="bg-primary text-primary-foreground px-4 py-2 font-bold">1. SIZE & CRUST</div>
            <div className="p-4">
              <div className="flex justify-center gap-8 mb-4">
                {(item.sizes || []).map(s => {
                  const sizeNum = s.name.includes('Small') ? '10"' : s.name.includes('Medium') ? '12"' : '14"';
                  const sizeName = s.name.includes('Small') ? 'Small' : s.name.includes('Medium') ? 'Medium' : 'Large';
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSize({ id: s.id, name: s.name, price: s.price })}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className={cn(
                        "rounded-full flex items-center justify-center font-bold text-lg transition-all",
                        s.name.includes('Small') && "w-16 h-16",
                        s.name.includes('Medium') && "w-20 h-20",
                        s.name.includes('Large') && "w-24 h-24",
                        selectedSize?.id === s.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-primary/20 text-primary border-2 border-primary"
                      )}>
                        {sizeNum}
                      </div>
                      <span className="text-sm font-medium">{sizeName}</span>
                      <span className="text-xs text-muted-foreground">${s.price}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* Crust - Only show Gluten Free for Medium */}
              {availableCrusts.length > 1 && (
                <div className="flex justify-center gap-4 pt-2 border-t">
                  {availableCrusts.map(c => {
                    const gf = c.name.toLowerCase().includes('gluten');
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCrust({ id: c.id, name: c.name, price: gf ? GLUTEN_FREE_PRICE : 0 })}
                        className={cn(
                          "px-4 py-2 rounded-lg border-2 transition-all",
                          selectedCrust?.id === c.id 
                            ? "border-primary bg-primary text-primary-foreground" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        {c.name} {gf && `+$${GLUTEN_FREE_PRICE}`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 2. CHEESE */}
          <div className="bg-primary/10 rounded-lg overflow-hidden">
            <div className="bg-primary text-primary-foreground px-4 py-2 font-bold">2. CHEESE</div>
            <div className="p-4 space-y-3">
              {/* Cheese type selection */}
              <div className="flex gap-4">
                {['no-cheese', 'mozzarella', 'dairy-free'].map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cheese-type"
                      checked={selectedCheeseType === type}
                      onChange={() => setSelectedCheeseType(type)}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="capitalize">
                      {type.replace('-', ' ')}
                      {type === 'dairy-free' && <span className="text-sm ml-1">+${dairyFreePrice}</span>}
                    </span>
                  </label>
                ))}
              </div>

              {/* Side selection - Only for Large pizza and if cheese is selected */}
              {selectedCheeseType !== 'no-cheese' && isLarge && (
                <div className="border rounded-lg p-3 bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                    <strong>Attention!</strong> You can adjust cheese on portions of your pizza.
                  </p>
                  
                  {cheeseSides.map((cs, idx) => (
                    <div key={idx} className="flex items-center gap-3 mb-2">
                      <div className="flex gap-1">
                        {(['left', 'whole', 'right'] as PizzaSide[]).map(side => {
                          const available = getAvailableSidesForRow(idx);
                          const isAvailable = available.includes(side);
                          return (
                            <PizzaSideIcon
                              key={side}
                              side={side}
                              selected={cs.side === side}
                              onClick={() => isAvailable && handleCheeseSideSelect(idx, side)}
                              disabled={!isAvailable}
                            />
                          );
                        })}
                      </div>
                      <Select
                        value={cs.quantity}
                        onValueChange={(v) => setCheeseSides(prev => {
                          const updated = [...prev];
                          updated[idx] = { ...updated[idx], quantity: v as CheeseQuantity };
                          return updated;
                        })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="extra">Extra +${toppingPrice}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              {/* Simple quantity for non-large */}
              {selectedCheeseType !== 'no-cheese' && !isLarge && (
                <Select
                  value={cheeseSides[0]?.quantity || 'normal'}
                  onValueChange={(v) => setCheeseSides([{ side: 'whole', quantity: v as CheeseQuantity }])}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="extra">Extra +${toppingPrice}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* 3. SAUCE */}
          <div className="bg-primary/10 rounded-lg overflow-hidden">
            <div className="bg-primary text-primary-foreground px-4 py-2 font-bold">
              3. SAUCE <span className="font-normal text-sm">(* Other sauces may have additional fee)</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {/* No Sauce */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="sauce"
                    checked={selectedSauceId === null}
                    onChange={() => {
                      setHasTouchedSauce(true);
                      setSelectedSauceId(null);
                      setSauceQuantity('normal');
                    }}
                    className="w-4 h-4 text-primary"
                  />
                  <span>No Sauce</span>
                </label>

                {(allSauces || []).map(sauce => {
                  const isDefault = defaultSauceIds.includes(sauce.id);
                  const isSelected = selectedSauceId === sauce.id;
                  return (
                    <label key={sauce.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="sauce"
                        checked={isSelected}
                        onChange={() => {
                          setHasTouchedSauce(true);
                          setSelectedSauceId(sauce.id);
                        }}
                        className="w-4 h-4 text-primary"
                      />
                      <span>{sauce.name}{!isDefault && '*'}</span>
                    </label>
                  );
                })}
              </div>

              {/* Sauce quantity - only show when a sauce is selected */}
              {selectedSauceId && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <Select value={sauceQuantity} onValueChange={(v) => setSauceQuantity(v as 'normal' | 'extra')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="extra">Extra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* 4. SPICY LEVEL (Optional) */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              SPICY LEVEL (Optional)
            </p>
            
            {!isLarge ? (
              // Non-large pizzas: simple radio buttons for whole pizza
              <div className="flex gap-4">
                {(['none', 'medium', 'hot'] as const).map(level => (
                  <label key={level} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="spicy"
                      checked={spicyLevel.left === level && spicyLevel.right === level}
                      onChange={() => setSpicyLevel({ left: level, right: level })}
                      className="w-4 h-4"
                    />
                    <span className="capitalize">{level === 'none' ? 'No Spicy' : level}</span>
                  </label>
                ))}
              </div>
            ) : (
              // Large pizzas: side-based spicy level selection - stacked vertically for mobile
              <div className="space-y-3">
                {/* No Spicy option */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="spicy-whole"
                    checked={spicyLevel.left === 'none' && spicyLevel.right === 'none'}
                    onChange={() => setSpicyLevel({ left: 'none', right: 'none' })}
                    className="w-4 h-4"
                  />
                  <span>No Spicy</span>
                </label>
                
                {/* Medium with side selection */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-orange-600 font-medium w-16">Medium:</span>
                  <div className="flex gap-1">
                    {(['left', 'whole', 'right'] as PizzaSide[]).map(side => {
                      const isSelected = side === 'whole' 
                        ? (spicyLevel.left === 'medium' && spicyLevel.right === 'medium')
                        : side === 'left' 
                          ? spicyLevel.left === 'medium'
                          : spicyLevel.right === 'medium';
                      
                      return (
                        <PizzaSideIcon
                          key={`medium-${side}`}
                          side={side}
                          selected={isSelected}
                          onClick={() => {
                            if (side === 'whole') {
                              setSpicyLevel({ left: 'medium', right: 'medium' });
                            } else if (side === 'left') {
                              const rightLevel = spicyLevel.right === 'hot' ? 'hot' : 'none';
                              setSpicyLevel({ left: 'medium', right: rightLevel });
                            } else {
                              const leftLevel = spicyLevel.left === 'hot' ? 'hot' : 'none';
                              setSpicyLevel({ left: leftLevel, right: 'medium' });
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
                
                {/* Hot with side selection */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 font-medium w-16">Hot:</span>
                  <div className="flex gap-1">
                    {(['left', 'whole', 'right'] as PizzaSide[]).map(side => {
                      const isSelected = side === 'whole' 
                        ? (spicyLevel.left === 'hot' && spicyLevel.right === 'hot')
                        : side === 'left' 
                          ? spicyLevel.left === 'hot'
                          : spicyLevel.right === 'hot';
                      
                      return (
                        <PizzaSideIcon
                          key={`hot-${side}`}
                          side={side}
                          selected={isSelected}
                          onClick={() => {
                            if (side === 'whole') {
                              setSpicyLevel({ left: 'hot', right: 'hot' });
                            } else if (side === 'left') {
                              const rightLevel = spicyLevel.right === 'medium' ? 'medium' : 'none';
                              setSpicyLevel({ left: 'hot', right: rightLevel });
                            } else {
                              const leftLevel = spicyLevel.left === 'medium' ? 'medium' : 'none';
                              setSpicyLevel({ left: leftLevel, right: 'hot' });
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
                
                {/* Show current selection summary */}
                {(spicyLevel.left !== 'none' || spicyLevel.right !== 'none') && (
                  <p className="text-xs text-muted-foreground">
                    Current: Left - {spicyLevel.left === 'none' ? 'No Spicy' : spicyLevel.left} | Right - {spicyLevel.right === 'none' ? 'No Spicy' : spicyLevel.right}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 5. FREE ADD-ONS (Optional) */}
          {freeToppingsData && freeToppingsData.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-bold text-muted-foreground mb-2">FREE ADD-ONS (Optional)</p>
              <div className="flex gap-4">
                {freeToppingsData.map(f => (
                  <label key={f.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedFreeToppings.includes(f.id)}
                      onCheckedChange={(checked) => {
                        setSelectedFreeToppings(prev => 
                          checked ? [...prev, f.id] : prev.filter(x => x !== f.id)
                        );
                      }}
                    />
                    <span>{f.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 6. TOPPINGS */}
          <div className="bg-primary/10 rounded-lg overflow-hidden">
            <div className="bg-primary text-primary-foreground px-4 py-2 font-bold">4. TOPPINGS</div>
            <div className="p-4 space-y-4">
              {/* Default Toppings - Meats */}
              {defaultToppings.filter(t => !t.isVeg).length > 0 && (
                <div>
                  <p className="text-sm font-bold text-destructive mb-2">Choose Meats</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {defaultToppings.filter(t => !t.isVeg).map(t => (
                      <ToppingRow
                        key={t.id}
                        topping={t}
                        canShowSides={canShowSides}
                        toppingPrice={toppingPrice}
                        onUpdate={(q, s, p) => updateTopping(t.id, q, s, p, false)}
                        onRemove={() => updateTopping(t.id, 'none', 'whole', 0, false)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Default Toppings - Non-Meats */}
              {defaultToppings.filter(t => t.isVeg).length > 0 && (
                <div>
                  <p className="text-sm font-bold text-green-600 mb-2">Choose Non-meats</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {defaultToppings.filter(t => t.isVeg).map(t => (
                      <ToppingRow
                        key={t.id}
                        topping={t}
                        canShowSides={canShowSides}
                        toppingPrice={toppingPrice}
                        onUpdate={(q, s, p) => updateTopping(t.id, q, s, p, false)}
                        onRemove={() => updateTopping(t.id, 'none', 'whole', 0, false)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Extra Toppings Section */}
              {extraToppings.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-sm font-bold text-primary mb-2">Added Toppings</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {extraToppings.map(t => (
                      <ToppingRow
                        key={t.id}
                        topping={t}
                        canShowSides={canShowSides}
                        toppingPrice={toppingPrice}
                        onUpdate={(q, s, p) => updateTopping(t.id, q, s, p, true)}
                        onRemove={() => setExtraToppings(prev => prev.filter(x => x.id !== t.id))}
                        showRemove
                        isExtraTopping
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Add Extra Toppings */}
              <div className="border-t pt-3">
                <p className="text-sm font-bold text-muted-foreground mb-2">
                  Add Extra Toppings <span className="text-primary">+${toppingPrice} each</span>
                </p>
                
                {/* Veg Extras (Non-meats first) */}
                {vegTops.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-green-600 font-medium mb-1">Non-meats</p>
                    <div className="flex flex-wrap gap-2">
                      {vegTops.map(t => (
                        <button
                          key={t.id}
                          onClick={() => addExtraTopping(t)}
                          className="text-xs px-2 py-1 border rounded hover:border-primary hover:bg-primary/5"
                        >
                          + {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Non-Veg Extras (Meats second) */}
                {nonVegTops.length > 0 && (
                  <div>
                    <p className="text-xs text-destructive font-medium mb-1">Meats</p>
                    <div className="flex flex-wrap gap-2">
                      {nonVegTops.map(t => (
                        <button
                          key={t.id}
                          onClick={() => addExtraTopping(t)}
                          className="text-xs px-2 py-1 border rounded hover:border-primary hover:bg-primary/5"
                        >
                          + {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <p className="text-sm font-bold text-muted-foreground mb-2">Special Instructions</p>
            <Textarea 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              placeholder="Any special requests? (e.g., extra crispy, well done...)"
              className="h-16 text-sm resize-none"
            />
          </div>

          {/* Next Button at Bottom - Only for new pizza */}
          {!editingCartItem && (
            <div className="sticky bottom-0 bg-card border-t pt-4 pb-2 -mx-4 px-4">
              <Button 
                variant="pizza" 
                size="lg" 
                className="w-full gap-2"
                onClick={handleNext}
              >
                Next <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Upsell Modal */}
    <UpsellModal 
      isOpen={showUpsell} 
      onClose={handleUpsellClose}
      onComplete={handleUpsellComplete}
    />
    </>
  );
};

// Topping Row Component Types
interface ToppingRowProps {
  topping: SelectedTopping;
  canShowSides: boolean;
  toppingPrice: number;
  onUpdate: (quantity: ToppingQuantity, side: PizzaSide, price: number) => void;
  onRemove: () => void;
  showRemove?: boolean;
  isExtraTopping?: boolean;
}

// Pizza Side Icon for ToppingRow (standalone)
const ToppingSideIcon = ({ side, selected, onClick }: { side: PizzaSide; selected: boolean; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
      selected ? "border-destructive" : "border-muted-foreground/30"
    )}
  >
    <div className="w-4 h-4 rounded-full overflow-hidden bg-amber-50">
      {side === 'left' && <div className="w-1/2 h-full bg-destructive" />}
      {side === 'right' && <div className="w-1/2 h-full bg-destructive ml-auto" />}
      {side === 'whole' && <div className="w-full h-full bg-destructive" />}
    </div>
  </button>
);

const ToppingRow = ({ topping, canShowSides, toppingPrice, onUpdate, onRemove, showRemove, isExtraTopping }: ToppingRowProps) => {
  const isActive = topping.quantity !== 'none';

  return (
    <div className={cn(
      "flex flex-col gap-1 p-2 rounded border md:flex-row md:items-center md:gap-2",
      !isActive && "opacity-50 bg-muted/30"
    )}>
      {/* Row 1: Checkbox + Name */}
      <div className="flex items-center gap-2 min-w-0">
        <Checkbox
          checked={isActive}
          onCheckedChange={(checked) => {
            if (checked) {
              onUpdate('regular', 'whole', isExtraTopping ? toppingPrice : 0);
            } else {
              onRemove();
            }
          }}
        />
        <span className={cn("text-sm truncate flex-1", !isActive && "line-through")}>{topping.name}</span>
        {showRemove && (
          <button onClick={onRemove} className="text-destructive text-sm font-bold md:hidden">×</button>
        )}
      </div>
      
      {isActive && (
        <div className="flex items-center gap-2 pl-6 md:pl-0 md:ml-auto">
          {/* Side selection icons - only for large pizzas */}
          {canShowSides && (
            <div className="flex gap-1">
              {(['left', 'whole', 'right'] as PizzaSide[]).map(side => (
                <ToppingSideIcon
                  key={side}
                  side={side}
                  selected={topping.side === side}
                  onClick={() => onUpdate(topping.quantity, side, topping.quantity === 'extra' ? toppingPrice : (isExtraTopping ? toppingPrice : 0))}
                />
              ))}
            </div>
          )}
          
          {/* Quantity dropdown - only for default toppings, NOT for extra toppings */}
          {!isExtraTopping && (
            <Select
              value={topping.quantity}
              onValueChange={(v) => onUpdate(v as ToppingQuantity, topping.side || 'whole', v === 'extra' ? toppingPrice : 0)}
            >
              <SelectTrigger className="w-24 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="regular">Normal</SelectItem>
                <SelectItem value="extra">Extra +${toppingPrice}</SelectItem>
              </SelectContent>
            </Select>
          )}
          
          {/* For extra toppings, just show the price */}
          {isExtraTopping && (
            <span className="text-xs text-primary font-medium">+${toppingPrice}</span>
          )}
        </div>
      )}

      {showRemove && (
        <button onClick={onRemove} className="text-destructive text-sm font-bold hidden md:block">×</button>
      )}
    </div>
  );
};

export default PizzaCustomizationModal;

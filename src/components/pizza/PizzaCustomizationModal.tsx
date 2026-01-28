import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import type { MenuItem } from '@/hooks/useMenuItems';
import { useSizeCrustAvailability, useCheeseOptions, useFreeToppings, getCrustsForSize } from '@/hooks/usePizzaOptions';
import { useToppings, useSauceOptions } from '@/hooks/useMenuItems';
import type { SideSpicyLevel, ToppingQuantity, SelectedSauce, SelectedTopping, PizzaSide } from '@/types/pizzaCustomization';
import { cn } from '@/lib/utils';
import { Check, Flame, Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PizzaCustomizationModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
}

const GLUTEN_FREE_PRICE = 2.5;

const SIDE_OPTIONS: { value: PizzaSide; label: string }[] = [
  { value: 'left', label: 'L' },
  { value: 'right', label: 'R' },
  { value: 'whole', label: 'W' },
];

const PizzaCustomizationModal = ({ item, isOpen, onClose }: PizzaCustomizationModalProps) => {
  const { addToCart } = useCart();
  const { data: sizeCrustAvailability } = useSizeCrustAvailability();
  const { data: cheeseOptions } = useCheeseOptions();
  const { data: freeToppingsData } = useFreeToppings();
  const { data: allSauces } = useSauceOptions();
  const { data: allToppings } = useToppings();

  const defaultSauceIds = useMemo(() => item.default_sauces?.map(ds => ds.sauce_option_id) || [], [item.default_sauces]);
  const defaultSize = item.sizes?.[1] || item.sizes?.[0];
  const defaultCheese = cheeseOptions?.find(c => c.is_default);

  const [selectedSize, setSelectedSize] = useState<{ id: string; name: string; price: number } | null>(null);
  const [selectedCrust, setSelectedCrust] = useState<{ id: string; name: string; price: number } | null>(null);
  const [selectedSauces, setSelectedSauces] = useState<SelectedSauce[]>([]);
  const [selectedCheese, setSelectedCheese] = useState<{ id: string; name: string; quantity: 'regular' | 'extra'; price: number } | null>(null);
  const [selectedFreeToppings, setSelectedFreeToppings] = useState<string[]>([]);
  const [spicyLevel, setSpicyLevel] = useState<SideSpicyLevel>({ left: 'none', right: 'none' });
  const [defaultToppings, setDefaultToppings] = useState<SelectedTopping[]>([]);
  const [extraToppings, setExtraToppings] = useState<SelectedTopping[]>([]);

  const isGlutenFree = selectedCrust?.name.toLowerCase().includes('gluten free') || false;

  // Initialize defaults
  useEffect(() => {
    if (defaultSize && !selectedSize) {
      setSelectedSize({ id: defaultSize.id, name: defaultSize.name, price: defaultSize.price });
    }
  }, [defaultSize, selectedSize]);

  useEffect(() => {
    if (selectedSize && sizeCrustAvailability && !selectedCrust) {
      const availableCrusts = getCrustsForSize(sizeCrustAvailability, selectedSize.name);
      if (availableCrusts.length > 0) {
        const regularCrust = availableCrusts.find(c => c.name.toLowerCase() === 'regular') || availableCrusts[0];
        setSelectedCrust({ id: regularCrust.id, name: regularCrust.name, price: 0 });
      }
    }
  }, [selectedSize, sizeCrustAvailability, selectedCrust]);

  useEffect(() => {
    if (defaultCheese && !selectedCheese) {
      setSelectedCheese({ id: defaultCheese.id, name: defaultCheese.name, quantity: 'regular', price: 0 });
    }
  }, [defaultCheese, selectedCheese]);

  useEffect(() => {
    if (item.default_toppings && defaultToppings.length === 0) {
      const defaults = item.default_toppings.map(dt => ({
        id: dt.topping_id,
        name: dt.topping?.name || 'Unknown',
        quantity: 'regular' as ToppingQuantity,
        price: 0,
        isDefault: true,
        isVeg: dt.topping?.is_veg,
        side: 'whole' as PizzaSide,
      }));
      setDefaultToppings(defaults);
    }
  }, [item.default_toppings, defaultToppings.length]);

  useEffect(() => {
    if (!isOpen) return;
    if (!allSauces || defaultSauceIds.length === 0) return;
    const firstDefaultSauce = allSauces.find((sauce) => defaultSauceIds.includes(sauce.id));
    if (firstDefaultSauce) {
      setSelectedSauces([{
        id: firstDefaultSauce.id,
        name: firstDefaultSauce.name,
        quantity: 'regular' as const,
        price: firstDefaultSauce.price,
        isDefault: true,
      }]);
    }
  }, [isOpen, item.id, allSauces, defaultSauceIds]);

  const availableCrusts = useMemo(() => {
    if (!selectedSize || !sizeCrustAvailability) return [];
    return getCrustsForSize(sizeCrustAvailability, selectedSize.name);
  }, [selectedSize, sizeCrustAvailability]);

  useEffect(() => {
    if (selectedSize && availableCrusts.length > 0) {
      const currentCrustAvailable = availableCrusts.find(c => c.id === selectedCrust?.id);
      if (!currentCrustAvailable) {
        const regularCrust = availableCrusts.find(c => c.name.toLowerCase() === 'regular') || availableCrusts[0];
        setSelectedCrust({ id: regularCrust.id, name: regularCrust.name, price: 0 });
      }
    }
  }, [selectedSize, availableCrusts, selectedCrust?.id]);

  const getToppingPrice = (size: string) => {
    if (size.includes('Small')) return 2;
    if (size.includes('Medium') || isGlutenFree) return 2.5;
    if (size.includes('Large')) return 3;
    return 2;
  };

  const toppingPrice = getToppingPrice(selectedSize?.name || 'Medium');

  const totalPrice = useMemo(() => {
    let total = selectedSize?.price || 0;
    total += selectedCrust?.price || 0;
    selectedSauces.forEach(sauce => {
      if (!sauce.isDefault) total += sauce.price;
      if (sauce.quantity === 'extra') total += sauce.price;
    });
    total += selectedCheese?.price || 0;
    defaultToppings.forEach(t => { if (t.quantity === 'extra') total += t.price; });
    extraToppings.forEach(t => total += t.price);
    return total;
  }, [selectedSize, selectedCrust, selectedSauces, selectedCheese, defaultToppings, extraToppings]);

  const handleAddToCart = () => {
    if (!selectedSize || !selectedCrust || !selectedCheese) return;
    const cartItem = {
      id: `${item.id}-${Date.now()}`,
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

  // Spicy level helpers
  const isNoSpicySelected = spicyLevel.left === 'none' && spicyLevel.right === 'none';
  const isWholeMedium = spicyLevel.left === 'medium' && spicyLevel.right === 'medium';
  const isWholeHot = spicyLevel.left === 'hot' && spicyLevel.right === 'hot';

  const getMediumSide = (): PizzaSide | null => {
    if (spicyLevel.left === 'medium' && spicyLevel.right !== 'medium') return 'left';
    if (spicyLevel.right === 'medium' && spicyLevel.left !== 'medium') return 'right';
    if (spicyLevel.left === 'medium' && spicyLevel.right === 'medium') return 'whole';
    return null;
  };

  const getHotSide = (): PizzaSide | null => {
    if (spicyLevel.left === 'hot' && spicyLevel.right !== 'hot') return 'left';
    if (spicyLevel.right === 'hot' && spicyLevel.left !== 'hot') return 'right';
    if (spicyLevel.left === 'hot' && spicyLevel.right === 'hot') return 'whole';
    return null;
  };

  const mediumSide = getMediumSide();
  const hotSide = getHotSide();

  const selectMediumSide = (side: PizzaSide) => {
    if (side === 'whole') setSpicyLevel({ left: 'medium', right: 'medium' });
    else if (side === 'left') setSpicyLevel({ left: 'medium', right: hotSide === 'right' ? 'hot' : 'none' });
    else setSpicyLevel({ left: hotSide === 'left' ? 'hot' : 'none', right: 'medium' });
  };

  const selectHotSide = (side: PizzaSide) => {
    if (side === 'whole') setSpicyLevel({ left: 'hot', right: 'hot' });
    else if (side === 'left') setSpicyLevel({ left: 'hot', right: mediumSide === 'right' ? 'medium' : 'none' });
    else setSpicyLevel({ left: mediumSide === 'left' ? 'medium' : 'none', right: 'hot' });
  };

  // Available toppings for adding
  const availableVegToppings = (allToppings || []).filter(t => t.is_veg && !defaultToppings.some(d => d.id === t.id) && !extraToppings.some(e => e.id === t.id));
  const availableNonVegToppings = (allToppings || []).filter(t => !t.is_veg && !defaultToppings.some(d => d.id === t.id) && !extraToppings.some(e => e.id === t.id));

  const CompactButton = ({ selected, onClick, children, variant = 'default', disabled = false }: { selected?: boolean; onClick: () => void; children: React.ReactNode; variant?: 'default' | 'destructive' | 'success'; disabled?: boolean }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-2 py-0.5 rounded text-xs border transition-all",
        disabled && "opacity-40 cursor-not-allowed",
        selected
          ? variant === 'destructive'
            ? "border-destructive bg-destructive text-destructive-foreground"
            : variant === 'success'
            ? "border-green-500 bg-green-500 text-white"
            : "border-primary bg-primary text-primary-foreground"
          : "border-border hover:border-primary/50"
      )}
    >
      {children}
    </button>
  );

  const ToppingRow = ({ topping, isExtra = false }: { topping: SelectedTopping; isExtra?: boolean }) => (
    <div className={cn("flex items-center gap-1 py-1 border-b border-border/50 last:border-0", topping.quantity === 'none' && "opacity-50")}>
      <div className="flex items-center gap-1 min-w-[100px]">
        <span className={cn("text-xs truncate", topping.quantity === 'none' && "line-through")}>{topping.name}</span>
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", topping.isVeg ? "bg-green-500" : "bg-red-500")} />
      </div>
      <div className="flex gap-0.5">
        {!isExtra && <CompactButton selected={topping.quantity === 'none'} onClick={() => updateTopping(topping.id, 'none', 'whole', 0, isExtra)} variant="destructive">✕</CompactButton>}
        <CompactButton selected={topping.quantity === 'less'} onClick={() => updateTopping(topping.id, 'less', topping.side || 'whole', 0, isExtra)}>-</CompactButton>
        <CompactButton selected={topping.quantity === 'regular'} onClick={() => updateTopping(topping.id, 'regular', topping.side || 'whole', isExtra ? toppingPrice : 0, isExtra)}>○</CompactButton>
        <CompactButton selected={topping.quantity === 'extra'} onClick={() => updateTopping(topping.id, 'extra', topping.side || 'whole', toppingPrice * (isExtra ? 1.5 : 1), isExtra)}>+</CompactButton>
      </div>
      {topping.quantity !== 'none' && (
        <div className="flex gap-0.5">
          {SIDE_OPTIONS.map(s => (
            <CompactButton key={s.value} selected={(topping.side || 'whole') === s.value} onClick={() => updateTopping(topping.id, topping.quantity, s.value, topping.price, isExtra)}>{s.label}</CompactButton>
          ))}
        </div>
      )}
      {isExtra && (
        <button onClick={() => setExtraToppings(prev => prev.filter(t => t.id !== topping.id))} className="ml-auto text-destructive hover:bg-destructive/10 rounded p-0.5">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );

  const updateTopping = (id: string, quantity: ToppingQuantity, side: PizzaSide, price: number, isExtra: boolean) => {
    if (isExtra) {
      setExtraToppings(prev => prev.map(t => t.id === id ? { ...t, quantity, side, price } : t));
    } else {
      setDefaultToppings(prev => prev.map(t => t.id === id ? { ...t, quantity, side, price } : t));
    }
  };

  const addExtraTopping = (topping: { id: string; name: string; is_veg: boolean }) => {
    setExtraToppings(prev => [...prev, {
      id: topping.id,
      name: topping.name,
      quantity: 'regular' as ToppingQuantity,
      price: toppingPrice,
      isDefault: false,
      isVeg: topping.is_veg,
      side: 'whole' as PizzaSide,
    }]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 bg-card flex flex-col">
        {/* Header */}
        <DialogHeader className="p-3 pb-2 border-b flex-shrink-0">
          <div className="flex gap-3 items-center">
            <img src={item.image_url || '/placeholder.svg'} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
            <div className="flex-1">
              <DialogTitle className="font-serif text-lg">{item.name}</DialogTitle>
              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">${totalPrice.toFixed(2)}</p>
              <Button variant="pizza" size="sm" onClick={handleAddToCart}>Add to Cart</Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content - 2 columns */}
        <div className="flex-1 grid grid-cols-2 gap-3 p-3 overflow-hidden">
          {/* Left Column - Base Options */}
          <div className="space-y-3 overflow-y-auto">
            {/* Size & Crust Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-semibold mb-1">Size</p>
                <div className="flex flex-wrap gap-1">
                  {(item.sizes || []).map(size => (
                    <CompactButton key={size.id} selected={selectedSize?.id === size.id} onClick={() => setSelectedSize({ id: size.id, name: size.name, price: size.price })}>
                      {size.name.replace('"', '')} ${size.price}
                    </CompactButton>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1">Crust</p>
                <div className="flex flex-wrap gap-1">
                  {availableCrusts.map(crust => {
                    const isGF = crust.name.toLowerCase().includes('gluten free');
                    return (
                      <CompactButton key={crust.id} selected={selectedCrust?.id === crust.id} onClick={() => setSelectedCrust({ id: crust.id, name: crust.name, price: isGF ? GLUTEN_FREE_PRICE : 0 })}>
                        {crust.name}{isGF && ` +$${GLUTEN_FREE_PRICE}`}
                      </CompactButton>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sauce */}
            <div>
              <p className="text-xs font-semibold mb-1">Sauce (select one)</p>
              <Select value={selectedSauces[0]?.id || ''} onValueChange={(id) => {
                const sauce = allSauces?.find(s => s.id === id);
                if (sauce) {
                  setSelectedSauces([{ id: sauce.id, name: sauce.name, quantity: 'regular', price: sauce.price, isDefault: defaultSauceIds.includes(sauce.id) }]);
                }
              }}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Select sauce" />
                </SelectTrigger>
                <SelectContent>
                  {(allSauces || []).map(sauce => (
                    <SelectItem key={sauce.id} value={sauce.id} className="text-xs">
                      {sauce.name} {defaultSauceIds.includes(sauce.id) ? '(Free)' : `+$${sauce.price}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSauces[0] && (
                <div className="flex gap-1 mt-1">
                  <CompactButton selected={selectedSauces[0].quantity === 'regular'} onClick={() => setSelectedSauces([{ ...selectedSauces[0], quantity: 'regular' }])}>Regular</CompactButton>
                  <CompactButton selected={selectedSauces[0].quantity === 'extra'} onClick={() => setSelectedSauces([{ ...selectedSauces[0], quantity: 'extra' }])}>Extra +${selectedSauces[0].price}</CompactButton>
                </div>
              )}
            </div>

            {/* Cheese */}
            <div>
              <p className="text-xs font-semibold mb-1">Cheese</p>
              <div className="flex flex-wrap gap-1">
                {(cheeseOptions || []).map(cheese => (
                  <CompactButton key={cheese.id} selected={selectedCheese?.id === cheese.id} onClick={() => setSelectedCheese({ id: cheese.id, name: cheese.name, quantity: 'regular', price: 0 })}>
                    {cheese.name}
                  </CompactButton>
                ))}
                {selectedCheese && (
                  <>
                    <span className="text-xs text-muted-foreground mx-1">|</span>
                    <CompactButton selected={selectedCheese.quantity === 'regular'} onClick={() => setSelectedCheese({ ...selectedCheese, quantity: 'regular', price: 0 })}>Reg</CompactButton>
                    <CompactButton selected={selectedCheese.quantity === 'extra'} onClick={() => {
                      const cheese = cheeseOptions?.find(c => c.id === selectedCheese.id);
                      setSelectedCheese({ ...selectedCheese, quantity: 'extra', price: cheese?.price_extra || 2 });
                    }}>Extra +$2</CompactButton>
                  </>
                )}
              </div>
            </div>

            {/* Free Toppings */}
            <div>
              <p className="text-xs font-semibold mb-1">Free Add-ons</p>
              <div className="flex flex-wrap gap-1">
                {(freeToppingsData || []).map(ft => (
                  <CompactButton key={ft.id} selected={selectedFreeToppings.includes(ft.id)} variant="success" onClick={() => setSelectedFreeToppings(prev => prev.includes(ft.id) ? prev.filter(id => id !== ft.id) : [...prev, ft.id])}>
                    {selectedFreeToppings.includes(ft.id) && <Check className="w-3 h-3 mr-0.5" />}
                    {ft.name}
                  </CompactButton>
                ))}
              </div>
            </div>

            {/* Spicy Level */}
            <div>
              <p className="text-xs font-semibold mb-1">Spicy Level</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CompactButton selected={isNoSpicySelected} onClick={() => setSpicyLevel({ left: 'none', right: 'none' })}>No Spicy</CompactButton>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs w-12 flex items-center"><Flame className="w-3 h-3 text-orange-400" /><Flame className="w-3 h-3 text-orange-400 -ml-1" />Med</span>
                  {SIDE_OPTIONS.map(s => (
                    <CompactButton key={s.value} selected={mediumSide === s.value} disabled={isWholeHot} onClick={() => selectMediumSide(s.value)}>{s.label}</CompactButton>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs w-12 flex items-center"><Flame className="w-3 h-3 text-red-500" /><Flame className="w-3 h-3 text-red-500 -ml-1" /><Flame className="w-3 h-3 text-red-500 -ml-1" />Hot</span>
                  {SIDE_OPTIONS.map(s => (
                    <CompactButton key={s.value} selected={hotSide === s.value} disabled={isWholeMedium || isNoSpicySelected} onClick={() => selectHotSide(s.value)}>{s.label}</CompactButton>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Toppings */}
          <div className="space-y-2 overflow-y-auto">
            {/* Default Toppings */}
            <div>
              <p className="text-xs font-semibold mb-1">Default Toppings <span className="font-normal text-muted-foreground">(✕=Remove -=Less ○=Reg +=Extra | L/R/W=Side)</span></p>
              <div className="border rounded p-1 max-h-[120px] overflow-y-auto">
                {defaultToppings.map(t => <ToppingRow key={t.id} topping={t} />)}
              </div>
            </div>

            {/* Extra Toppings */}
            <div>
              <p className="text-xs font-semibold mb-1">Extra Toppings <span className="font-normal text-primary">+${toppingPrice}/each</span></p>
              {extraToppings.length > 0 && (
                <div className="border rounded p-1 mb-1 max-h-[80px] overflow-y-auto">
                  {extraToppings.map(t => <ToppingRow key={t.id} topping={t} isExtra />)}
                </div>
              )}
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <p className="text-xs text-green-600 font-medium mb-0.5 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Veg</p>
                  <div className="flex flex-wrap gap-0.5 max-h-[60px] overflow-y-auto">
                    {availableVegToppings.map(t => (
                      <button key={t.id} onClick={() => addExtraTopping(t)} className="text-xs px-1.5 py-0.5 border border-border rounded hover:border-green-500 hover:bg-green-500/10 flex items-center gap-0.5">
                        <Plus className="w-2 h-2" />{t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-red-600 font-medium mb-0.5 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Non-Veg</p>
                  <div className="flex flex-wrap gap-0.5 max-h-[60px] overflow-y-auto">
                    {availableNonVegToppings.map(t => (
                      <button key={t.id} onClick={() => addExtraTopping(t)} className="text-xs px-1.5 py-0.5 border border-border rounded hover:border-red-500 hover:bg-red-500/10 flex items-center gap-0.5">
                        <Plus className="w-2 h-2" />{t.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PizzaCustomizationModal;

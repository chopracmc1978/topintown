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
  { value: 'none', label: 'None' },
  { value: 'less', label: 'Less' },
  { value: 'regular', label: 'Reg' },
  { value: 'extra', label: 'Extra' },
];

const SIDE_OPTIONS: { value: Side; label: string }[] = [
  { value: 'left', label: 'L' },
  { value: 'whole', label: 'W' },
  { value: 'right', label: 'R' },
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
  const [selectedSauceId, setSelectedSauceId] = useState<string | null>(editCustomization?.sauceId || null);
  const [sauceQuantity, setSauceQuantity] = useState<'less' | 'normal' | 'extra'>(
    editCustomization?.sauceQuantity === 'extra' ? 'extra' : 'normal'
  );
  const [note, setNote] = useState<string>(editCustomization?.note || '');
  
  // Spicy state
  const [spicyLevel, setSpicyLevel] = useState<SpicyLevel>('none');
  const [spicySide, setSpicySide] = useState<Side>('whole');
  
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
      setNote('');
      setSpicyLevel('none');
      setSpicySide('whole');
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
      setSpicySide('whole');
      // Reset all topping sides to whole
      setDefaultToppings(prev => prev.map(t => ({ ...t, side: 'whole' as PizzaSide })));
      setExtraToppings(prev => prev.map(t => ({ ...t, side: 'whole' as PizzaSide })));
      setFreeToppingSelections(prev => prev.map(t => ({ ...t, side: 'whole' as Side })));
    }
  }, [isLargePizza]);

  // Available sauces
  const availableSauces = allSauces?.filter(s => s.is_available) || [];
  
  // Available extra toppings (sorted: veg first, then non-veg)
  const availableExtraToppings = useMemo(() => {
    const toppings = allToppings?.filter(t => t.is_available) || [];
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
    
    // Extra default toppings (extra quantity costs extra)
    const toppingPrice = getExtraToppingPrice(selectedSize?.name || '');
    defaultToppings.forEach(t => {
      if (t.quantity === 'extra') {
        price += toppingPrice;
      }
    });
    
    // Extra toppings price
    price += extraToppings.length * toppingPrice;
    
    return price;
  };

  const totalPrice = calculatePrice();

  const handleAddToOrder = () => {
    if (!selectedSize || !selectedCrust) return;

    const sauceName = allSauces?.find(s => s.id === selectedSauceId)?.name || 'No Sauce';

    // Build spicy level object
    const spicyLevelObj = {
      left: (spicySide === 'left' || spicySide === 'whole') ? spicyLevel : 'none' as SpicyLevel,
      right: (spicySide === 'right' || spicySide === 'whole') ? spicyLevel : 'none' as SpicyLevel,
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">{item.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Row 1: Size & Crust */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-xs mb-1.5">Size</h3>
              <div className="flex gap-1">
                {item.sizes?.map(size => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize({ id: size.id, name: size.name, price: size.price })}
                    className={cn(btnSmall, "flex-1 py-1.5", selectedSize?.id === size.id ? btnActive : btnInactive)}
                  >
                    <div className="text-[10px]">{size.name}</div>
                    <div className="text-primary text-[10px]">${size.price.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {availableCrusts.length > 0 && (
              <div>
                <h3 className="font-medium text-xs mb-1.5">Crust</h3>
                <div className="flex gap-1">
                  {availableCrusts.map(crust => (
                    <button
                      key={crust.id}
                      onClick={() => setSelectedCrust(crust)}
                      className={cn(btnSmall, "flex-1 py-1.5", selectedCrust?.id === crust.id ? btnActive : btnInactive)}
                    >
                      {crust.name}
                      {crust.name.toLowerCase().includes('gluten') && (
                        <span className="text-primary ml-0.5">+${GLUTEN_FREE_PRICE}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Cheese & Spicy */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-xs mb-1.5">Cheese</h3>
              <div className="flex gap-1">
                {['No Cheese', 'Mozzarella', 'Dairy Free'].map(cheese => (
                  <button
                    key={cheese}
                    onClick={() => setSelectedCheese(cheese)}
                    className={cn(btnSmall, "flex-1", selectedCheese === cheese ? btnActive : btnInactive)}
                  >
                    {cheese === 'No Cheese' ? 'None' : cheese === 'Mozzarella' ? 'Mozz' : 'Dairy Free'}
                    {cheese === 'Dairy Free' && (
                      <span className="text-primary ml-0.5">+${selectedSize?.name === 'Small 10"' ? 2 : 3}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-xs mb-1.5">Spicy Level</h3>
              <div className="flex gap-1">
                {(['none', 'medium', 'hot'] as SpicyLevel[]).map(level => (
                  <button
                    key={level}
                    onClick={() => setSpicyLevel(level)}
                    className={cn(btnSmall, "flex-1", spicyLevel === level ? btnActive : btnInactive)}
                  >
                    {level === 'none' ? 'None' : level === 'medium' ? 'Med' : 'Hot'}
                  </button>
                ))}
                {isLargePizza && spicyLevel !== 'none' && (
                  <>
                    <div className="w-px bg-border" />
                    {SIDE_OPTIONS.map(side => (
                      <button
                        key={side.value}
                        onClick={() => setSpicySide(side.value)}
                        className={cn(btnSmall, "w-7", spicySide === side.value ? btnActive : btnInactive)}
                      >
                        {side.label}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Free Add-ons - moved here after Spicy Level */}
          {freeToppings.length > 0 && (
            <div>
              <h3 className="font-medium text-xs mb-1.5">Free Add-ons</h3>
              <div className="flex flex-wrap gap-1">
                {freeToppings.map(topping => {
                  const selection = freeToppingSelections.find(f => f.name === topping.name);
                  const isSelected = !!selection;
                  return (
                    <div key={topping.id} className="flex items-center gap-0.5">
                      <button
                        onClick={() => toggleFreeTopping(topping.name)}
                        className={cn(btnSmall, isSelected ? btnActive : btnInactive)}
                      >
                        {topping.name}
                      </button>
                      {isLargePizza && isSelected && (
                        <div className="flex gap-0.5">
                          {SIDE_OPTIONS.map(side => (
                            <button
                              key={side.value}
                              onClick={() => updateFreeToppingSide(topping.name, side.value)}
                              className={cn(
                                "w-5 h-5 text-[10px] rounded border font-medium transition-colors",
                                selection?.side === side.value ? btnActive : btnInactive
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

          {/* Sauce Selection - Grid 3 columns */}
          <div>
            <h3 className="font-medium text-xs mb-1.5">Sauce</h3>
            <div className="grid grid-cols-3 gap-1">
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
              {/* Sauce Quantity - fills the empty space */}
              <div className="flex gap-0.5 items-center justify-end">
                {(['less', 'normal', 'extra'] as const).map(qty => (
                  <button
                    key={qty}
                    onClick={() => setSauceQuantity(qty)}
                    className={cn(
                      "px-1.5 py-0.5 text-[10px] rounded border font-medium transition-colors",
                      sauceQuantity === qty ? btnActive : btnInactive
                    )}
                  >
                    {qty === 'less' ? 'Less' : qty === 'normal' ? 'Normal' : 'Extra'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Default Toppings */}
          {pizzaDefaultToppings.length > 0 && (
            <div>
              <h3 className="font-medium text-xs mb-1.5">Default Toppings</h3>
              <div className="space-y-1">
                {defaultToppings.map(topping => (
                  <div key={topping.id} className="flex items-center gap-2 bg-secondary/30 rounded px-2 py-1">
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      topping.isVeg ? "bg-green-500" : "bg-red-500"
                    )} />
                    <span className="text-xs flex-1 truncate">{topping.name}</span>
                    <div className="flex gap-0.5">
                      {QUANTITY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updateDefaultToppingQuantity(topping.id, opt.value)}
                          className={cn(
                            "px-1.5 py-0.5 text-[10px] rounded border font-medium transition-colors",
                            topping.quantity === opt.value ? btnActive : btnInactive
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {isLargePizza && topping.quantity !== 'none' && (
                      <div className="flex gap-0.5 ml-1">
                        {SIDE_OPTIONS.map(side => (
                          <button
                            key={side.value}
                            onClick={() => updateDefaultToppingSide(topping.id, side.value as PizzaSide)}
                            className={cn(
                              "w-5 h-5 text-[10px] rounded border font-medium transition-colors",
                              topping.side === side.value ? btnActive : btnInactive
                            )}
                          >
                            {side.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extra Toppings */}
          {availableExtraToppings.length > 0 && (
            <div>
              <h3 className="font-medium text-xs mb-1.5">
                Extra Toppings <span className="text-muted-foreground font-normal">(+${extraToppingPrice.toFixed(2)} each)</span>
              </h3>
              <div className="grid grid-cols-3 gap-1">
                {availableExtraToppings.map(topping => {
                  const selected = extraToppings.find(t => t.id === topping.id);
                  const isSelected = !!selected;
                  return (
                    <div key={topping.id} className="flex items-center gap-0.5">
                      <button
                        onClick={() => toggleExtraTopping(topping)}
                        className={cn(
                          btnSmall, "flex-1 flex items-center gap-1 text-left",
                          isSelected ? btnActive : btnInactive
                        )}
                      >
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          topping.is_veg ? "bg-green-500" : "bg-red-500"
                        )} />
                        <span className="truncate">{topping.name}</span>
                      </button>
                      {isLargePizza && isSelected && (
                        <div className="flex gap-0.5">
                          {SIDE_OPTIONS.map(side => (
                            <button
                              key={side.value}
                              onClick={() => updateExtraToppingSide(topping.id, side.value as PizzaSide)}
                              className={cn(
                                "w-5 h-5 text-[10px] rounded border font-medium transition-colors",
                                selected?.side === side.value ? btnActive : btnInactive
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

          {/* Notes */}
          <div>
            <h3 className="font-medium text-xs mb-1.5">Special Instructions</h3>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any special requests..."
              className="h-14 text-xs"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-lg font-bold text-primary">
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

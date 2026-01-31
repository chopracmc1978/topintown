import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import type { MenuItem } from '@/hooks/useMenuItems';
import { useSizeCrustAvailability, useFreeToppings, getCrustsForSize } from '@/hooks/usePizzaOptions';
import { useToppings } from '@/hooks/useMenuItems';
import { useGlobalSauces } from '@/hooks/useGlobalSauces';
import type { CartItem, CartPizzaCustomization } from '@/types/menu';
import type { SelectedTopping } from '@/types/pizzaCustomization';
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
  return 3; // Large
};

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
  const [selectedFreeToppings, setSelectedFreeToppings] = useState<string[]>(editCustomization?.freeToppings || []);
  const [note, setNote] = useState<string>(editCustomization?.note || '');
  
  // Spicy state
  const [spicyLevel, setSpicyLevel] = useState<SpicyLevel>(
    editCustomization?.spicyLevel?.left !== 'none' ? editCustomization?.spicyLevel?.left as SpicyLevel : 
    editCustomization?.spicyLevel?.right !== 'none' ? editCustomization?.spicyLevel?.right as SpicyLevel : 'none'
  );
  const [spicySide, setSpicySide] = useState<Side>('whole');
  
  // Extra toppings state
  const [extraToppings, setExtraToppings] = useState<SelectedTopping[]>(editCustomization?.extraToppings || []);

  // Is large pizza (allows side selection)
  const isLargePizza = selectedSize?.name?.includes('Large') || selectedSize?.name?.includes('14"');

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
      setSelectedFreeToppings([]);
      setNote('');
      setSpicyLevel('none');
      setSpicySide('whole');
      setExtraToppings([]);
    }
  }, [isOpen, editCustomization, defaultSize, defaultSauceIds]);

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

  // Reset spicy side when size changes (only large allows L/W/R)
  useEffect(() => {
    if (!isLargePizza) {
      setSpicySide('whole');
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
        quantity: 'regular' as const,
        side: 'whole' as const,
        isVeg: topping.is_veg,
        price: toppingPrice,
      }];
    });
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
    
    // Extra toppings price
    const toppingPrice = getExtraToppingPrice(selectedSize?.name || '');
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
        sauceQuantity: 'normal',
        freeToppings: selectedFreeToppings,
        spicyLevel: spicyLevelObj,
        defaultToppings: [],
        extraToppings,
        note,
        originalItemId: item.id,
      },
    };

    onAddToOrder(cartItem);
    onClose();
  };

  const extraToppingPrice = getExtraToppingPrice(selectedSize?.name || '');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{item.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Size Selection */}
          <div>
            <h3 className="font-medium text-sm mb-2">Size</h3>
            <div className="flex gap-2">
              {item.sizes?.map(size => (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize({ id: size.id, name: size.name, price: size.price })}
                  className={cn(
                    "flex-1 p-3 rounded-lg border text-sm font-medium transition-colors",
                    selectedSize?.id === size.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-secondary"
                  )}
                >
                  <div>{size.name}</div>
                  <div className="text-primary">${size.price.toFixed(2)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Crust Selection */}
          {availableCrusts.length > 0 && (
            <div>
              <h3 className="font-medium text-sm mb-2">Crust</h3>
              <div className="flex gap-2">
                {availableCrusts.map(crust => (
                  <button
                    key={crust.id}
                    onClick={() => setSelectedCrust(crust)}
                    className={cn(
                      "flex-1 p-3 rounded-lg border text-sm font-medium transition-colors",
                      selectedCrust?.id === crust.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-secondary"
                    )}
                  >
                    {crust.name}
                    {crust.name.toLowerCase().includes('gluten') && (
                      <span className="text-xs text-primary ml-1">+${GLUTEN_FREE_PRICE}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cheese Selection */}
          <div>
            <h3 className="font-medium text-sm mb-2">Cheese</h3>
            <div className="flex gap-2">
              {['No Cheese', 'Mozzarella', 'Dairy Free'].map(cheese => (
                <button
                  key={cheese}
                  onClick={() => setSelectedCheese(cheese)}
                  className={cn(
                    "flex-1 p-3 rounded-lg border text-sm font-medium transition-colors",
                    selectedCheese === cheese
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-secondary"
                  )}
                >
                  {cheese}
                  {cheese === 'Dairy Free' && (
                    <span className="text-xs text-primary ml-1">+${selectedSize?.name === 'Small 10"' ? 2 : 3}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sauce Selection - Grid 2 columns */}
          <div>
            <h3 className="font-medium text-sm mb-2">Sauce</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedSauceId(null)}
                className={cn(
                  "p-2 rounded-lg border text-sm font-medium transition-colors text-left",
                  selectedSauceId === null
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-secondary"
                )}
              >
                No Sauce
              </button>
              {availableSauces.map(sauce => (
                <button
                  key={sauce.id}
                  onClick={() => setSelectedSauceId(sauce.id)}
                  className={cn(
                    "p-2 rounded-lg border text-sm font-medium transition-colors text-left",
                    selectedSauceId === sauce.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-secondary"
                  )}
                >
                  {sauce.name}
                </button>
              ))}
            </div>
          </div>

          {/* Spicy Level Selection */}
          <div>
            <h3 className="font-medium text-sm mb-2">Spicy Level</h3>
            <div className="flex gap-2 mb-2">
              {(['none', 'medium', 'hot'] as SpicyLevel[]).map(level => (
                <button
                  key={level}
                  onClick={() => setSpicyLevel(level)}
                  className={cn(
                    "flex-1 p-2 rounded-lg border text-sm font-medium transition-colors",
                    spicyLevel === level
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-secondary"
                  )}
                >
                  {level === 'none' ? 'No Spicy' : level === 'medium' ? 'Medium' : 'Hot'}
                </button>
              ))}
            </div>
            
            {/* Side selection - only show for Large pizza when spicy is selected */}
            {isLargePizza && spicyLevel !== 'none' && (
              <div className="flex gap-2">
                {(['left', 'whole', 'right'] as Side[]).map(side => (
                  <button
                    key={side}
                    onClick={() => setSpicySide(side)}
                    className={cn(
                      "flex-1 p-2 rounded-lg border text-xs font-medium transition-colors",
                      spicySide === side
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-secondary"
                    )}
                  >
                    {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Free Toppings */}
          {freeToppings.length > 0 && (
            <div>
              <h3 className="font-medium text-sm mb-2">Free Add-ons</h3>
              <div className="flex flex-wrap gap-2">
                {freeToppings.map(topping => (
                  <label
                    key={topping.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors",
                      selectedFreeToppings.includes(topping.name)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-secondary"
                    )}
                  >
                    <Checkbox
                      checked={selectedFreeToppings.includes(topping.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedFreeToppings(prev => [...prev, topping.name]);
                        } else {
                          setSelectedFreeToppings(prev => prev.filter(t => t !== topping.name));
                        }
                      }}
                    />
                    <span className="text-sm">{topping.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Extra Toppings */}
          {availableExtraToppings.length > 0 && (
            <div>
              <h3 className="font-medium text-sm mb-2">
                Extra Toppings <span className="text-muted-foreground font-normal">(+${extraToppingPrice.toFixed(2)} each)</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {availableExtraToppings.map(topping => {
                  const isSelected = extraToppings.some(t => t.id === topping.id);
                  return (
                    <button
                      key={topping.id}
                      onClick={() => toggleExtraTopping(topping)}
                      className={cn(
                        "p-2 rounded-lg border text-sm text-left transition-colors flex items-center gap-2",
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-secondary"
                      )}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        topping.is_veg ? "bg-green-500" : "bg-red-500"
                      )} />
                      <span className="truncate">{topping.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <h3 className="font-medium text-sm mb-2">Special Instructions</h3>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any special requests..."
              className="h-20"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-xl font-bold text-primary">
              ${totalPrice.toFixed(2)}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button 
                variant="pizza" 
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

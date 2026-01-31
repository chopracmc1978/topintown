import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import type { MenuItem } from '@/hooks/useMenuItems';
import { useSizeCrustAvailability, useCheeseOptions, useFreeToppings, getCrustsForSize } from '@/hooks/usePizzaOptions';
import { useToppings } from '@/hooks/useMenuItems';
import { useGlobalSauces } from '@/hooks/useGlobalSauces';
import type { CartItem } from '@/types/menu';
import { cn } from '@/lib/utils';

interface POSPizzaModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToOrder: (item: CartItem) => void;
  editingItem?: CartItem | null;
}

const GLUTEN_FREE_PRICE = 2.5;

export const POSPizzaModal = ({ item, isOpen, onClose, onAddToOrder, editingItem }: POSPizzaModalProps) => {
  const { data: sizeCrustAvailability } = useSizeCrustAvailability();
  const { data: cheeseOptions } = useCheeseOptions();
  const { data: freeToppingsData } = useFreeToppings();
  const { data: allSauces } = useGlobalSauces();
  const { data: allToppings } = useToppings();

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
  const [selectedSauceId, setSelectedSauceId] = useState<string | null>(editCustomization?.sauceId || null);
  const [selectedFreeToppings, setSelectedFreeToppings] = useState<string[]>(editCustomization?.freeToppings || []);
  const [note, setNote] = useState<string>(editCustomization?.note || '');

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
    
    return price;
  };

  const totalPrice = calculatePrice();

  const handleAddToOrder = () => {
    if (!selectedSize || !selectedCrust) return;

    const sauceName = allSauces?.find(s => s.id === selectedSauceId)?.name || 'Marinara';

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
        spicyLevel: { left: 'none', right: 'none' },
        defaultToppings: [],
        extraToppings: [],
        note,
        originalItemId: item.id,
      },
    };

    onAddToOrder(cartItem);
    onClose();
  };

  const freeToppings = freeToppingsData?.filter(t => t.is_available) || [];

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

          {/* Sauce Selection */}
          <div>
            <h3 className="font-medium text-sm mb-2">Sauce</h3>
            <Select value={selectedSauceId || ''} onValueChange={setSelectedSauceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select sauce" />
              </SelectTrigger>
              <SelectContent>
                {allSauces?.filter(s => s.is_available).map(sauce => (
                  <SelectItem key={sauce.id} value={sauce.id}>
                    {sauce.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

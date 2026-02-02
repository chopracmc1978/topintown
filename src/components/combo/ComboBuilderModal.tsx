import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, ChevronRight, Pizza, Drumstick, GlassWater, Droplet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMenuItems, MenuItem } from '@/hooks/useMenuItems';
import { Combo, ComboItem } from '@/hooks/useCombos';
import { useCart } from '@/contexts/CartContext';
import { CartItem, CartPizzaCustomization, CartComboCustomization, ComboSelectionItem } from '@/types/menu';
import PizzaCustomizationModal from '@/components/pizza/PizzaCustomizationModal';
import { toast } from 'sonner';

interface ComboBuilderModalProps {
  combo: Combo;
  isOpen: boolean;
  onClose: () => void;
}

interface SelectedComboItem {
  comboItemId: string;
  itemType: string;
  menuItem?: MenuItem;
  cartItem?: CartItem; // For pizzas with customization
  flavor?: string; // For wings
  extraCharge: number;
}

const ITEM_ICONS: Record<string, React.ReactNode> = {
  pizza: <Pizza className="h-5 w-5" />,
  wings: <Drumstick className="h-5 w-5" />,
  drinks: <GlassWater className="h-5 w-5" />,
  dipping_sauce: <Droplet className="h-5 w-5" />,
};

const ITEM_LABELS: Record<string, string> = {
  pizza: 'Pizza',
  wings: 'Wings',
  drinks: 'Drinks',
  dipping_sauce: 'Dipping Sauce',
};

const WING_FLAVORS = [
  { id: 'hot', name: 'Hot' },
  { id: 'honey-garlic', name: 'Honey Garlic' },
  { id: 'bbq', name: 'BBQ' },
  { id: 'salt-pepper', name: 'Salt & Pepper' },
  { id: 'plain', name: 'Plain' },
];

const PIZZA_SUBCATEGORIES = ['Vegetarian', 'Paneer', 'Chicken', 'Meat Pizza', 'Hawaiian'];

export const ComboBuilderModal = ({ combo, isOpen, onClose }: ComboBuilderModalProps) => {
  const { data: menuItems } = useMenuItems();
  const { addToCart } = useCart();
  
  // Get sorted combo items as steps
  const steps = useMemo(() => {
    if (!combo.combo_items) return [];
    return [...combo.combo_items].sort((a, b) => a.sort_order - b.sort_order);
  }, [combo.combo_items]);

  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<SelectedComboItem[]>([]);
  const [pizzaModalItem, setPizzaModalItem] = useState<MenuItem | null>(null);
  const [wingsModalItem, setWingsModalItem] = useState<MenuItem | null>(null);
  const [editingSelectionIndex, setEditingSelectionIndex] = useState<number | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setSelections([]);
      setSelectedSubcategory(null);
    }
  }, [isOpen]);

  // Reset subcategory filter when step changes
  useEffect(() => {
    setSelectedSubcategory(null);
  }, [currentStep]);

  const currentComboItem = steps[currentStep];
  
  // Filter menu items based on current step's item type and size restriction
  const availableItems = useMemo(() => {
    if (!menuItems || !currentComboItem) return [];
    
    let filtered = menuItems.filter(item => {
      // Map combo item_type to menu category
      if (currentComboItem.item_type === 'pizza') return item.category === 'pizza';
      if (currentComboItem.item_type === 'wings') return item.category === 'chicken_wings';
      if (currentComboItem.item_type === 'drinks') return item.category === 'drinks';
      if (currentComboItem.item_type === 'dipping_sauce') return item.category === 'dipping_sauce';
      return false;
    });

    // For pizzas, filter by size if restricted (only show pizzas that have the required size)
    if (currentComboItem.item_type === 'pizza' && currentComboItem.size_restriction) {
      const sizeRestriction = currentComboItem.size_restriction.toLowerCase();
      filtered = filtered.filter(item => {
        return item.sizes?.some(s => s.name.toLowerCase() === sizeRestriction);
      });
    }

    // For drinks, filter by size if restricted
    if (currentComboItem.item_type === 'drinks' && currentComboItem.size_restriction) {
      filtered = filtered.filter(item => {
        const sizeName = currentComboItem.size_restriction?.toLowerCase() || '';
        return item.sizes?.some(s => s.name.toLowerCase().includes(sizeName.split(' ')[0]));
      });
    }

    // Apply subcategory filter for pizzas
    if (currentComboItem.item_type === 'pizza' && selectedSubcategory) {
      filtered = filtered.filter(item => 
        item.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase()
      );
    }

    return filtered;
  }, [menuItems, currentComboItem, selectedSubcategory]);

  // Count how many items have been selected for the current step
  const currentStepSelections = selections.filter(s => s.comboItemId === currentComboItem?.id);
  const requiredCount = currentComboItem?.quantity || 1;
  const isStepComplete = currentStepSelections.length >= requiredCount;

  // Calculate total extra charges
  const totalExtraCharge = selections.reduce((sum, s) => sum + s.extraCharge, 0);

  // Handle pizza selection - opens customization modal
  const handlePizzaSelect = (item: MenuItem) => {
    setPizzaModalItem(item);
  };

  // Handle pizza customization complete
  const handlePizzaCustomized = (customization: CartPizzaCustomization, totalPrice: number) => {
    if (!pizzaModalItem || !currentComboItem) return;

    // Calculate extra charge (anything beyond size base price)
    const sizeBasePrice = customization.size.price;
    const extraCharge = totalPrice - sizeBasePrice;

    const cartItem: CartItem = {
      id: `combo-pizza-${Date.now()}`,
      name: pizzaModalItem.name,
      description: `${customization.size.name}, ${customization.crust.name}`,
      price: totalPrice,
      image: pizzaModalItem.image_url || '',
      category: 'pizza',
      quantity: 1,
      totalPrice: totalPrice,
      pizzaCustomization: customization,
    };

    setSelections(prev => [
      ...prev,
      {
        comboItemId: currentComboItem.id,
        itemType: 'pizza',
        menuItem: pizzaModalItem,
        cartItem,
        extraCharge: Math.max(0, extraCharge),
      },
    ]);

    setPizzaModalItem(null);
  };

  // Handle wings selection - opens flavor modal
  const handleWingsSelect = (item: MenuItem) => {
    setWingsModalItem(item);
  };

  // Handle wings flavor selected
  const handleWingsCustomized = (flavor: string) => {
    if (!wingsModalItem || !currentComboItem) return;

    setSelections(prev => [
      ...prev,
      {
        comboItemId: currentComboItem.id,
        itemType: 'wings',
        menuItem: wingsModalItem,
        flavor,
        extraCharge: 0,
      },
    ]);

    setWingsModalItem(null);
  };

  // Handle drink/dipping sauce selection (no customization needed)
  const handleSimpleSelect = (item: MenuItem) => {
    if (!currentComboItem) return;

    // For drinks with size restriction, find the matching size
    let selectedSize = item.sizes?.[0];
    if (currentComboItem.size_restriction && item.sizes) {
      const sizeName = currentComboItem.size_restriction.toLowerCase();
      selectedSize = item.sizes.find(s => s.name.toLowerCase().includes(sizeName.split(' ')[0])) || item.sizes[0];
    }

    // Calculate price - if chargeable, add the item price
    const itemPrice = currentComboItem.is_chargeable ? (selectedSize?.price || item.base_price) : 0;

    setSelections(prev => [
      ...prev,
      {
        comboItemId: currentComboItem.id,
        itemType: currentComboItem.item_type,
        menuItem: item,
        extraCharge: itemPrice,
      },
    ]);
  };

  // Remove a selection
  const removeSelection = (index: number) => {
    const selection = selections[index];
    if (selection.comboItemId === currentComboItem?.id) {
      setSelections(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Navigate to next step
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Navigate to previous step
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Complete the combo and add to cart
  const handleComplete = () => {
    // Build combo selections for storage
    const comboSelections: ComboSelectionItem[] = selections.map(s => ({
      itemType: s.itemType,
      itemName: s.menuItem?.name || s.cartItem?.name || '',
      flavor: s.flavor,
      pizzaCustomization: s.cartItem?.pizzaCustomization,
      extraCharge: s.extraCharge,
    }));

    const comboCustomization: CartComboCustomization = {
      comboId: combo.id,
      comboName: combo.name,
      comboBasePrice: combo.price,
      selections: comboSelections,
      totalExtraCharge,
    };

    // Create a combo cart item
    const comboCartItem: CartItem = {
      id: `combo-${combo.id}-${Date.now()}`,
      name: combo.name,
      description: combo.description || '',
      price: combo.price + totalExtraCharge,
      image: combo.image_url || '',
      category: 'pizza', // Use pizza as base category
      quantity: 1,
      totalPrice: combo.price + totalExtraCharge,
      comboCustomization,
    };

    addToCart(comboCartItem as any);
    toast.success(`${combo.name} added to cart!`);
    onClose();
  };

  // Check if all required steps are complete
  const allStepsComplete = steps.every(step => {
    if (!step.is_required) return true;
    const stepSelections = selections.filter(s => s.comboItemId === step.id);
    return stepSelections.length >= step.quantity;
  });

  // Can we skip this step? (optional items)
  const canSkipStep = !currentComboItem?.is_required;

  return (
    <>
      <Dialog open={isOpen && !pizzaModalItem && !wingsModalItem} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{combo.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">{combo.description}</p>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 py-4">
            {steps.map((step, index) => {
              const stepSelections = selections.filter(s => s.comboItemId === step.id);
              const isComplete = stepSelections.length >= step.quantity;
              const isCurrent = index === currentStep;

              return (
                <div key={step.id} className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStep(index)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                      isCurrent && "border-primary bg-primary text-primary-foreground",
                      isComplete && !isCurrent && "border-green-500 bg-green-500 text-white",
                      !isCurrent && !isComplete && "border-muted-foreground/30"
                    )}
                  >
                    {isComplete ? <Check className="h-5 w-5" /> : index + 1}
                  </button>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "w-8 h-0.5",
                      isComplete ? "bg-green-500" : "bg-muted-foreground/30"
                    )} />
                  )}
                </div>
              );
            })}
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-muted-foreground/30" />
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                allStepsComplete ? "border-green-500 bg-green-500 text-white" : "border-muted-foreground/30"
              )}>
                <Check className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Current Step Label */}
          {currentComboItem && (
            <div className="text-center pb-2">
              <div className="flex items-center justify-center gap-2 text-lg font-semibold">
                {ITEM_ICONS[currentComboItem.item_type]}
                <span>
                  Select {currentComboItem.quantity} {ITEM_LABELS[currentComboItem.item_type]}
                  {currentComboItem.quantity > 1 ? 's' : ''}
                  {currentComboItem.size_restriction && ` (${currentComboItem.size_restriction})`}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentStepSelections.length} of {requiredCount} selected
                {currentComboItem.is_chargeable && ' • Extra charges apply'}
                {!currentComboItem.is_required && ' • Optional'}
              </p>
            </div>
          )}

          {/* Subcategory Filter for Pizzas */}
          {currentComboItem?.item_type === 'pizza' && (
            <div className="flex flex-wrap justify-center gap-2 pb-3">
              <Button
                variant={selectedSubcategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSubcategory(null)}
                className="rounded-full"
              >
                All
              </Button>
              {PIZZA_SUBCATEGORIES.map(subcategory => (
                <Button
                  key={subcategory}
                  variant={selectedSubcategory === subcategory ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSubcategory(subcategory)}
                  className="rounded-full"
                >
                  {subcategory}
                </Button>
              ))}
            </div>
          )}

          {/* Items Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-2">
              {availableItems.map((item) => {
                const isSelected = currentStepSelections.some(
                  s => s.menuItem?.id === item.id || s.cartItem?.pizzaCustomization?.originalItemId === item.id
                );
                const canSelect = currentStepSelections.length < requiredCount;

                return (
                  <button
                    key={item.id}
                    disabled={!canSelect && !isSelected}
                    onClick={() => {
                      if (currentComboItem?.item_type === 'pizza') {
                        handlePizzaSelect(item);
                      } else if (currentComboItem?.item_type === 'wings') {
                        handleWingsSelect(item);
                      } else {
                        handleSimpleSelect(item);
                      }
                    }}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      "hover:border-primary/50",
                      !canSelect && !isSelected && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-20 object-cover rounded mb-2"
                      />
                    )}
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    {currentComboItem?.is_chargeable && (
                      <p className="text-xs text-primary">+${item.base_price.toFixed(2)}</p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Items for Current Step */}
            {currentStepSelections.length > 0 && (
              <div className="border-t mt-4 pt-4 px-2">
                <p className="text-sm font-medium mb-2">Your Selections:</p>
                <div className="flex flex-wrap gap-2">
                  {currentStepSelections.map((selection, globalIndex) => {
                    const index = selections.indexOf(selection);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full text-sm"
                      >
                        <span>
                          {selection.cartItem?.name || selection.menuItem?.name}
                          {selection.flavor && ` (${selection.flavor})`}
                          {selection.extraCharge > 0 && ` +$${selection.extraCharge.toFixed(2)}`}
                        </span>
                        <button
                          onClick={() => removeSelection(index)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t pt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xl font-bold text-primary">
                ${(combo.price + totalExtraCharge).toFixed(2)}
              </p>
              {totalExtraCharge > 0 && (
                <p className="text-xs text-muted-foreground">
                  Base: ${combo.price.toFixed(2)} + Extras: ${totalExtraCharge.toFixed(2)}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {currentStep < steps.length - 1 ? (
                <>
                  {canSkipStep && (
                    <Button variant="ghost" onClick={nextStep}>
                      Skip
                    </Button>
                  )}
                  <Button
                    onClick={nextStep}
                    disabled={!isStepComplete && !canSkipStep}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="pizza"
                  onClick={handleComplete}
                  disabled={!allStepsComplete}
                >
                  Add to Cart
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pizza Customization Modal */}
      {pizzaModalItem && (
        <PizzaCustomizationModal
          item={pizzaModalItem}
          isOpen={!!pizzaModalItem}
          onClose={() => setPizzaModalItem(null)}
          onCustomizationComplete={(customization, totalPrice) => {
            handlePizzaCustomized(customization, totalPrice);
          }}
          sizeRestriction={currentComboItem?.size_restriction || undefined}
        />
      )}
      <Dialog open={!!wingsModalItem} onOpenChange={(open) => !open && setWingsModalItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">{wingsModalItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose your flavor:</p>
            <div className="grid grid-cols-1 gap-2">
              {WING_FLAVORS.map((flavor) => (
                <Button
                  key={flavor.id}
                  variant="outline"
                  className="justify-start"
                  onClick={() => handleWingsCustomized(flavor.name)}
                >
                  {flavor.name}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

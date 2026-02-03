import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, ChevronRight, Pizza, Drumstick, GlassWater, Droplet, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMenuItems, MenuItem } from '@/hooks/useMenuItems';
import { Combo, ComboItem } from '@/hooks/useCombos';
import { CartItem, CartPizzaCustomization, CartComboCustomization, ComboSelectionItem } from '@/types/menu';
import { POSPizzaModal } from '@/components/pos/POSPizzaModal';
import { POSWingsModal } from '@/components/pos/POSWingsModal';
import { toast } from 'sonner';

interface POSComboBuilderModalProps {
  combo: Combo;
  isOpen: boolean;
  onClose: () => void;
  onComboAdded: (comboItem: CartItem) => void;
}

interface SelectedComboItem {
  comboItemId: string;
  itemType: string;
  menuItem?: MenuItem;
  cartItem?: CartItem;
  flavor?: string;
  extraCharge: number;
}

const ITEM_ICONS: Record<string, React.ReactNode> = {
  pizza: <Pizza className="h-4 w-4" />,
  wings: <Drumstick className="h-4 w-4" />,
  drinks: <GlassWater className="h-4 w-4" />,
  dipping_sauce: <Droplet className="h-4 w-4" />,
};

const ITEM_LABELS: Record<string, string> = {
  pizza: 'Pizza',
  wings: 'Wings',
  drinks: 'Drinks',
  dipping_sauce: 'Sauce',
};

const WING_FLAVORS = [
  { id: 'hot', name: 'Hot' },
  { id: 'honey-garlic', name: 'Honey Garlic' },
  { id: 'bbq', name: 'BBQ' },
  { id: 'salt-pepper', name: 'Salt & Pepper' },
  { id: 'plain', name: 'Plain' },
];

const PIZZA_SUBCATEGORIES = [
  { label: 'Veg', value: 'vegetarian' },
  { label: 'Paneer', value: 'paneer' },
  { label: 'Chicken', value: 'chicken' },
  { label: 'Meat', value: 'meat' },
  { label: 'Hawaiian', value: 'hawaiian' },
];

export const POSComboBuilderModal = ({ combo, isOpen, onClose, onComboAdded }: POSComboBuilderModalProps) => {
  const { data: menuItems } = useMenuItems();
  
  const steps = useMemo(() => {
    if (!combo.combo_items) return [];
    return [...combo.combo_items].sort((a, b) => a.sort_order - b.sort_order);
  }, [combo.combo_items]);

  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<SelectedComboItem[]>([]);
  const [pizzaModalItem, setPizzaModalItem] = useState<MenuItem | null>(null);
  const [wingsModalItem, setWingsModalItem] = useState<MenuItem | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setSelections([]);
      setSelectedSubcategory(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedSubcategory(null);
  }, [currentStep]);

  const currentComboItem = steps[currentStep];
  
  const availableItems = useMemo(() => {
    if (!menuItems || !currentComboItem) return [];
    
    let filtered = menuItems.filter(item => {
      if (currentComboItem.item_type === 'pizza') return item.category === 'pizza';
      if (currentComboItem.item_type === 'wings') {
        return item.category === 'chicken_wings' && item.name.toLowerCase().includes('wings');
      }
      if (currentComboItem.item_type === 'drinks') return item.category === 'drinks';
      if (currentComboItem.item_type === 'dipping_sauce') return item.category === 'dipping_sauce';
      return false;
    });

    if (currentComboItem.item_type === 'pizza' && currentComboItem.size_restriction) {
      const sizeRestriction = currentComboItem.size_restriction.toLowerCase();
      filtered = filtered.filter(item => 
        item.sizes?.some(s => s.name.toLowerCase().includes(sizeRestriction.split(' ')[0]))
      );
    }

    if (currentComboItem.item_type === 'drinks' && currentComboItem.size_restriction) {
      const restriction = currentComboItem.size_restriction.toLowerCase();
      filtered = filtered.filter(item => {
        const itemName = item.name.toLowerCase();
        if (restriction.includes('2 litre') || restriction.includes('2l')) return itemName.includes('2l');
        if (restriction.includes('can')) return itemName.includes('can');
        if (restriction.includes('500ml') || restriction.includes('bottle')) {
          return itemName.includes('500ml') || (itemName.includes('bottle') && !itemName.includes('2l'));
        }
        return true;
      });
    }

    if (currentComboItem.item_type === 'pizza' && selectedSubcategory) {
      filtered = filtered.filter(item => 
        item.subcategory?.toLowerCase() === selectedSubcategory.toLowerCase()
      );
    }

    return filtered;
  }, [menuItems, currentComboItem, selectedSubcategory]);

  const currentStepSelections = selections.filter(s => s.comboItemId === currentComboItem?.id);
  
  const requiredCount = useMemo(() => {
    if (!currentComboItem) return 1;
    if (currentComboItem.item_type === 'wings' && currentComboItem.size_restriction) {
      const piecesMatch = currentComboItem.size_restriction.toLowerCase().match(/(\d+)\s*pieces?/i);
      if (piecesMatch) {
        const totalPieces = parseInt(piecesMatch[1], 10);
        return Math.ceil(totalPieces / 12);
      }
    }
    return currentComboItem.quantity || 1;
  }, [currentComboItem]);

  const isStepComplete = currentStepSelections.length >= requiredCount;
  const totalExtraCharge = selections.reduce((sum, s) => sum + s.extraCharge, 0);

  const handlePizzaSelect = (item: MenuItem) => {
    setPizzaModalItem(item);
  };

  const handlePizzaCustomized = (customization: CartPizzaCustomization, totalPrice: number) => {
    if (!pizzaModalItem || !currentComboItem) return;

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

  const handleWingsSelect = (item: MenuItem) => {
    setWingsModalItem(item);
  };

  const handleWingsCustomized = (wingsItem: CartItem) => {
    if (!wingsModalItem || !currentComboItem) return;

    setSelections(prev => [
      ...prev,
      {
        comboItemId: currentComboItem.id,
        itemType: 'wings',
        menuItem: wingsModalItem,
        flavor: wingsItem.wingsCustomization?.flavor,
        extraCharge: 0,
      },
    ]);

    setWingsModalItem(null);
  };

  const handleSimpleSelect = (item: MenuItem) => {
    if (!currentComboItem) return;

    let selectedSize = item.sizes?.[0];
    if (currentComboItem.size_restriction && item.sizes) {
      const sizeName = currentComboItem.size_restriction.toLowerCase();
      selectedSize = item.sizes.find(s => s.name.toLowerCase().includes(sizeName.split(' ')[0])) || item.sizes[0];
    }

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

  const removeSelection = (index: number) => {
    setSelections(prev => prev.filter((_, i) => i !== index));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const getRequiredCountForStep = (step: ComboItem) => {
    if (step.item_type === 'wings' && step.size_restriction) {
      const piecesMatch = step.size_restriction.toLowerCase().match(/(\d+)\s*pieces?/i);
      if (piecesMatch) return Math.ceil(parseInt(piecesMatch[1], 10) / 12);
    }
    return step.quantity || 1;
  };

  const allStepsComplete = steps.every(step => {
    if (!step.is_required) return true;
    const stepSelections = selections.filter(s => s.comboItemId === step.id);
    return stepSelections.length >= getRequiredCountForStep(step);
  });

  const handleComplete = () => {
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

    const comboCartItem: CartItem = {
      id: `combo-${combo.id}-${Date.now()}`,
      name: combo.name,
      description: combo.description || '',
      price: combo.price + totalExtraCharge,
      image: combo.image_url || '',
      category: 'pizza',
      quantity: 1,
      totalPrice: combo.price + totalExtraCharge,
      comboCustomization,
    };

    onComboAdded(comboCartItem);
    toast.success(`${combo.name} added to order!`);
    onClose();
  };

  const canSkipStep = !currentComboItem?.is_required;

  return (
    <>
      <Dialog open={isOpen && !pizzaModalItem && !wingsModalItem} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          {/* Header - Compact */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-secondary/30">
            <div>
              <h2 className="text-base font-bold">{combo.name}</h2>
              <p className="text-xs text-muted-foreground">
                ${combo.price.toFixed(2)} {totalExtraCharge > 0 && `+ $${totalExtraCharge.toFixed(2)} extras`}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Step Indicator - Ultra Compact */}
          <div className="flex items-center justify-center gap-1 py-1.5 border-b bg-secondary/20">
            {steps.map((step, index) => {
              const stepSelections = selections.filter(s => s.comboItemId === step.id);
              const stepRequiredCount = getRequiredCountForStep(step);
              const isComplete = stepSelections.length >= stepRequiredCount;
              const isCurrent = index === currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all text-xs",
                    isCurrent && "border-primary bg-primary text-primary-foreground",
                    isComplete && !isCurrent && "border-green-500 bg-green-500 text-white",
                    !isCurrent && !isComplete && "border-muted-foreground/30"
                  )}
                >
                  {isComplete ? <Check className="h-3 w-3" /> : ITEM_ICONS[step.item_type]}
                </button>
              );
            })}
          </div>

          {/* Current Step Label - Compact */}
          {currentComboItem && (
            <div className="text-center py-1.5 px-3 bg-secondary/10 border-b">
              <div className="flex items-center justify-center gap-1.5 text-sm font-semibold">
                {ITEM_ICONS[currentComboItem.item_type]}
                <span>
                  Select {requiredCount} {ITEM_LABELS[currentComboItem.item_type]}
                  {requiredCount > 1 ? 's' : ''}
                  {currentComboItem.size_restriction && ` (${currentComboItem.size_restriction})`}
                </span>
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  ({currentStepSelections.length}/{requiredCount})
                </span>
              </div>
            </div>
          )}

          {/* Subcategory Filter for Pizzas - Inline */}
          {currentComboItem?.item_type === 'pizza' && (
            <div className="flex flex-wrap justify-center gap-1 py-1.5 px-3 border-b">
              {PIZZA_SUBCATEGORIES.map(({ label, value }) => (
                <Button
                  key={value}
                  variant={selectedSubcategory === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSubcategory(selectedSubcategory === value ? null : value)}
                  className="h-6 text-xs px-2.5 rounded-full"
                >
                  {label}
                </Button>
              ))}
            </div>
          )}

          {/* Items Grid - Fill remaining space */}
          <div className="flex-1 overflow-y-auto p-2">
            {currentComboItem?.item_type === 'pizza' && !selectedSubcategory ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Pizza className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Select a pizza category above
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-1.5">
                {availableItems.map((item) => {
                  const canSelect = currentStepSelections.length < requiredCount;
                  return (
                    <button
                      key={item.id}
                      disabled={!canSelect}
                      onClick={() => {
                        if (!canSelect) return;
                        if (currentComboItem?.item_type === 'pizza') handlePizzaSelect(item);
                        else if (currentComboItem?.item_type === 'wings') handleWingsSelect(item);
                        else handleSimpleSelect(item);
                      }}
                      className={cn(
                        "p-2 rounded border text-left transition-all bg-secondary/30 min-h-[65px] flex flex-col justify-between",
                        canSelect && "hover:border-primary/50 hover:bg-secondary",
                        !canSelect && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <p className="font-medium text-xs uppercase leading-tight">{item.name}</p>
                      <p className="text-sm text-primary font-bold mt-1">${(item.sizes?.[0]?.price ?? item.base_price).toFixed(2)}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Current Step Selections - Compact inline */}
          {currentStepSelections.length > 0 && (
            <div className="px-3 py-1.5 border-t bg-secondary/20 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-medium text-muted-foreground">Selected:</span>
              {currentStepSelections.map((sel, idx) => {
                const globalIdx = selections.findIndex(s => s === sel);
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px]"
                  >
                    {sel.menuItem?.name || sel.cartItem?.name}
                    {sel.flavor && ` (${sel.flavor})`}
                    {sel.extraCharge > 0 && ` +$${sel.extraCharge.toFixed(2)}`}
                    <button onClick={() => removeSelection(globalIdx)} className="hover:text-destructive">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Navigation - Compact */}
          <div className="flex items-center justify-between px-3 py-2 border-t bg-card">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              size="sm"
              className="h-7 text-xs"
            >
              <ChevronLeft className="h-3 w-3 mr-1" />
              Back
            </Button>

            <div className="flex gap-2">
              {canSkipStep && !isStepComplete && (
                <Button variant="ghost" size="sm" onClick={nextStep} className="h-7 text-xs">
                  Skip
                </Button>
              )}

              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={nextStep}
                  disabled={currentComboItem?.is_required && !isStepComplete}
                  size="sm"
                  className="h-7 text-xs"
                >
                  Next
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!allStepsComplete}
                  className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                  size="sm"
                >
                  Add - ${(combo.price + totalExtraCharge).toFixed(2)}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pizza Customization Modal */}
      {pizzaModalItem && (
        <POSPizzaModal
          item={pizzaModalItem}
          isOpen={!!pizzaModalItem}
          onClose={() => setPizzaModalItem(null)}
          onAddToOrder={(item) => {
            if (item.pizzaCustomization) {
              handlePizzaCustomized(item.pizzaCustomization, item.totalPrice);
            }
          }}
        />
      )}

      {/* Wings Customization Modal */}
      {wingsModalItem && (
        <POSWingsModal
          item={wingsModalItem}
          isOpen={!!wingsModalItem}
          onClose={() => setWingsModalItem(null)}
          onAddToOrder={handleWingsCustomized}
        />
      )}
    </>
  );
};

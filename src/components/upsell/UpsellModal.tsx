import { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useMenuItems } from '@/hooks/useMenuItems';
import { cn } from '@/lib/utils';
import { Plus, Minus, ArrowRight, Check, X } from 'lucide-react';
import OptimizedImage from '@/components/OptimizedImage';

const WING_FLAVORS = [
  { id: 'hot', name: 'Hot' },
  { id: 'honey-garlic', name: 'Honey Garlic' },
  { id: 'bbq', name: 'BBQ' },
  { id: 'salt-pepper', name: 'Salt & Pepper' },
  { id: 'plain', name: 'Plain' },
];

export interface UpsellItem {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  quantity: number;
  flavor?: string;
  category?: string;
}

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (upsellItems: UpsellItem[]) => void;
  excludeSteps?: UpsellStep[];
}

type UpsellStep = 'drinks' | 'dipping_sauce' | 'wings' | 'garlic_toast';

const ALL_UPSELL_STEPS: { step: UpsellStep; title: string; subtitle: string; category: string }[] = [
  { step: 'drinks', title: 'Add a Drink?', subtitle: 'Refresh your meal with a cold beverage', category: 'drinks' },
  { step: 'dipping_sauce', title: 'Add Dipping Sauce?', subtitle: 'Perfect for dipping your pizza crust', category: 'dipping_sauce' },
  { step: 'wings', title: 'Add Wings?', subtitle: 'Crispy, juicy wings to complete your order', category: 'chicken_wings' },
  { step: 'garlic_toast', title: 'Add Garlic Toast?', subtitle: 'Fresh garlic bread on the side', category: 'baked_lasagna' },
];

const UpsellModal = ({ isOpen, onClose, onComplete, excludeSteps = [] }: UpsellModalProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedItems, setSelectedItems] = useState<UpsellItem[]>([]);
  const [flavorPickerItemId, setFlavorPickerItemId] = useState<string | null>(null);
  const { addToCart } = useCart();

  const UPSELL_STEPS = useMemo(() => 
    ALL_UPSELL_STEPS.filter(s => !excludeSteps.includes(s.step)),
    [excludeSteps]
  );

  const currentStep = UPSELL_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === UPSELL_STEPS.length - 1;

  const { data: drinks } = useMenuItems('drinks');
  const { data: dippingSauces } = useMenuItems('dipping_sauce');
  const { data: wings } = useMenuItems('chicken_wings');
  const { data: bakedLasagna } = useMenuItems('baked_lasagna');

  const currentItems = useMemo(() => {
    switch (currentStep?.category) {
      case 'drinks':
        return drinks || [];
      case 'dipping_sauce':
        return dippingSauces || [];
      case 'chicken_wings':
        return wings || [];
      case 'baked_lasagna':
        return (bakedLasagna || []).filter(item => 
          item.name.toLowerCase().includes('garlic') || 
          item.name.toLowerCase().includes('toast')
        );
      default:
        return [];
    }
  }, [currentStep?.category, drinks, dippingSauces, wings, bakedLasagna]);

  const isWingsStep = currentStep?.category === 'chicken_wings';

  const getItemQuantity = (itemId: string) => {
    return selectedItems.find(i => i.id === itemId)?.quantity || 0;
  };

  const getItemFlavor = (itemId: string) => {
    return selectedItems.find(i => i.id === itemId)?.flavor;
  };

  const handleAddWingsItem = (item: { id: string; name: string; base_price: number; image_url?: string | null }) => {
    // Show flavor picker for this item
    setFlavorPickerItemId(item.id);
  };

  const handleFlavorSelect = (item: { id: string; name: string; base_price: number; image_url?: string | null }, flavorName: string) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1, flavor: flavorName } : i);
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        price: item.base_price,
        image_url: item.image_url,
        quantity: 1,
        flavor: flavorName,
        category: 'chicken_wings',
      }];
    });
    setFlavorPickerItemId(null);
  };

  const updateItemQuantity = (item: { id: string; name: string; base_price: number; image_url?: string | null }, delta: number) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        const newQty = Math.max(0, existing.quantity + delta);
        if (newQty === 0) {
          return prev.filter(i => i.id !== item.id);
        }
        return prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i);
      } else if (delta > 0) {
        return [...prev, { 
          id: item.id, 
          name: item.name, 
          price: item.base_price, 
          image_url: item.image_url,
          quantity: 1 
        }];
      }
      return prev;
    });
  };

  const handleNext = () => {
    setFlavorPickerItemId(null);
    if (isLastStep) {
      onComplete(selectedItems);
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    setFlavorPickerItemId(null);
    if (isLastStep) {
      onComplete(selectedItems);
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleClose = () => {
    setCurrentStepIndex(0);
    setSelectedItems([]);
    setFlavorPickerItemId(null);
    onClose();
  };

  const totalUpsellPrice = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [selectedItems]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl w-full p-0 bg-card overflow-hidden max-h-[90vh] [&>button]:text-white [&>button]:hover:text-white/80 [&>button]:hover:bg-transparent">
        {/* Header */}
        <div className="bg-primary text-primary-foreground px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold">{currentStep?.title}</h2>
              <p className="text-primary-foreground/80 text-xs">{currentStep?.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="p-3 overflow-y-auto max-h-[60vh]">
          {currentItems.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No items available in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {currentItems.map((item) => {
                const qty = getItemQuantity(item.id);
                const isSelected = qty > 0;
                const flavor = getItemFlavor(item.id);
                const showFlavorPicker = isWingsStep && flavorPickerItemId === item.id;
                
                return (
                  <div 
                    key={item.id}
                    className={cn(
                      "border rounded-lg p-2 transition-all",
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    <OptimizedImage
                      src={item.image_url}
                      alt={item.name}
                      width={200}
                      containerClassName="aspect-square rounded-md mb-1.5"
                      className="w-full h-full object-cover"
                      fallback={
                        <div className="aspect-square rounded-md mb-1.5 bg-muted flex items-center justify-center text-muted-foreground">
                          <span className="text-2xl">🍕</span>
                        </div>
                      }
                    />
                    
                    <h3 className="font-medium text-xs line-clamp-2 mb-0.5 leading-tight">{item.name}</h3>
                    <p className="text-primary font-bold text-xs mb-1">${item.base_price.toFixed(2)}</p>
                    
                    {/* Show selected flavor label */}
                    {isWingsStep && isSelected && flavor && (
                      <p className="text-[10px] text-muted-foreground mb-1 truncate">🌶 {flavor}</p>
                    )}

                    {/* Flavor picker dropdown */}
                    {showFlavorPicker && (
                      <div className="space-y-0.5 mb-1.5">
                        {WING_FLAVORS.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => handleFlavorSelect(item, f.name)}
                            className="w-full text-left text-[11px] px-2 py-1 rounded hover:bg-primary/10 transition-colors border border-border"
                          >
                            {f.name}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-center gap-1">
                      {isSelected ? (
                        <>
                          <button
                            onClick={() => updateItemQuantity(item, -1)}
                            className="w-6 h-6 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold w-5 text-center text-sm">{qty}</span>
                          <button
                            onClick={() => {
                              if (isWingsStep) {
                                handleAddWingsItem(item);
                              } else {
                                updateItemQuantity(item, 1);
                              }
                            }}
                            className="w-6 h-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (isWingsStep) {
                              handleAddWingsItem(item);
                            } else {
                              updateItemQuantity(item, 1);
                            }
                          }}
                          className="w-full h-7 text-xs px-2"
                        >
                          <Plus className="w-3 h-3 mr-0.5" /> Add
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 bg-muted/30">
          {totalUpsellPrice > 0 && (
            <div className="text-center mb-2 text-sm">
              <span className="text-muted-foreground">Upsell Total: </span>
              <span className="font-bold text-primary">${totalUpsellPrice.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-1" />
              {isLastStep ? 'Skip & Finish' : 'Skip'}
            </Button>
            <Button
              variant="pizza"
              onClick={handleNext}
              className="flex-1"
            >
              {isLastStep ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Add to Cart
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpsellModal;

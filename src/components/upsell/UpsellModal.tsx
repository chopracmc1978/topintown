import { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useMenuItems } from '@/hooks/useMenuItems';
import { cn } from '@/lib/utils';
import { Plus, Minus, ArrowRight, Check, X } from 'lucide-react';

interface UpsellItem {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  quantity: number;
}

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (upsellItems: UpsellItem[]) => void;
}

type UpsellStep = 'drinks' | 'dipping_sauce' | 'wings' | 'garlic_toast';

const UPSELL_STEPS: { step: UpsellStep; title: string; subtitle: string; category: string }[] = [
  { step: 'drinks', title: 'Add a Drink?', subtitle: 'Refresh your meal with a cold beverage', category: 'drinks' },
  { step: 'dipping_sauce', title: 'Add Dipping Sauce?', subtitle: 'Perfect for dipping your pizza crust', category: 'dipping_sauce' },
  { step: 'wings', title: 'Add Wings?', subtitle: 'Crispy, juicy wings to complete your order', category: 'chicken_wings' },
  { step: 'garlic_toast', title: 'Add Garlic Toast?', subtitle: 'Fresh garlic bread on the side', category: 'sides' },
];

const UpsellModal = ({ isOpen, onClose, onComplete }: UpsellModalProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedItems, setSelectedItems] = useState<UpsellItem[]>([]);
  const { addToCart } = useCart();

  const currentStep = UPSELL_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === UPSELL_STEPS.length - 1;

  // Fetch items for current category
  const { data: drinks } = useMenuItems('drinks');
  const { data: dippingSauces } = useMenuItems('dipping_sauce');
  const { data: wings } = useMenuItems('chicken_wings');
  const { data: sides } = useMenuItems('sides');

  const currentItems = useMemo(() => {
    switch (currentStep?.category) {
      case 'drinks':
        return drinks || [];
      case 'dipping_sauce':
        return dippingSauces || [];
      case 'chicken_wings':
        return wings || [];
      case 'sides':
        // Filter for garlic toast items
        return (sides || []).filter(item => 
          item.name.toLowerCase().includes('garlic') || 
          item.name.toLowerCase().includes('toast') ||
          item.name.toLowerCase().includes('bread')
        );
      default:
        return [];
    }
  }, [currentStep?.category, drinks, dippingSauces, wings, sides]);

  const getItemQuantity = (itemId: string) => {
    return selectedItems.find(i => i.id === itemId)?.quantity || 0;
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
    if (isLastStep) {
      // Add all selected items to cart and complete
      onComplete(selectedItems);
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    if (isLastStep) {
      onComplete(selectedItems);
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleClose = () => {
    // Reset state and close
    setCurrentStepIndex(0);
    setSelectedItems([]);
    onClose();
  };

  const stepItemsTotal = useMemo(() => {
    return selectedItems
      .filter(item => {
        // Check if item belongs to current step's category
        const categoryItems = currentItems.map(i => i.id);
        return categoryItems.includes(item.id);
      })
      .reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [selectedItems, currentItems]);

  const totalUpsellPrice = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [selectedItems]);

  const hasSelectionsInCurrentStep = selectedItems.some(item => 
    currentItems.some(ci => ci.id === item.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-full p-0 bg-card overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="bg-primary text-primary-foreground px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold">{currentStep?.title}</h2>
              <p className="text-primary-foreground/80 text-sm">{currentStep?.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {UPSELL_STEPS.map((_, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    idx === currentStepIndex ? "bg-primary-foreground" : 
                    idx < currentStepIndex ? "bg-primary-foreground/60" : "bg-primary-foreground/30"
                  )} 
                />
              ))}
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {currentItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No items available in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {currentItems.map((item) => {
                const qty = getItemQuantity(item.id);
                const isSelected = qty > 0;
                
                return (
                  <div 
                    key={item.id}
                    className={cn(
                      "border rounded-lg p-3 transition-all",
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    {/* Item Image */}
                    <div className="aspect-square bg-muted rounded-lg mb-2 overflow-hidden">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <span className="text-4xl">🍕</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Item Info */}
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">{item.name}</h3>
                    <p className="text-primary font-bold text-sm mb-2">${item.base_price.toFixed(2)}</p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center justify-center gap-2">
                      {isSelected ? (
                        <>
                          <button
                            onClick={() => updateItemQuantity(item, -1)}
                            className="w-8 h-8 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold w-8 text-center">{qty}</span>
                          <button
                            onClick={() => updateItemQuantity(item, 1)}
                            className="w-8 h-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateItemQuantity(item, 1)}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add
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

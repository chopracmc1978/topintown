import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import type { MenuItem } from '@/hooks/useMenuItems';
import type { CartItem } from '@/types/menu';
import { ArrowRight } from 'lucide-react';
import UpsellModal from '@/components/upsell/UpsellModal';

interface WingsCustomizationModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  editingCartItem?: CartItem | null;
}

const FLAVOR_OPTIONS = [
  { id: 'hot', name: 'Hot' },
  { id: 'honey-garlic', name: 'Honey Garlic' },
  { id: 'bbq', name: 'BBQ' },
  { id: 'salt-pepper', name: 'Salt & Pepper' },
  { id: 'plain', name: 'Plain' },
];

const WingsCustomizationModal = ({ item, isOpen, onClose, editingCartItem }: WingsCustomizationModalProps) => {
  const [selectedFlavor, setSelectedFlavor] = useState<string>('plain');
  const { addWingsToCart, updateWingsInCart, addToCart } = useCart();
  const isEditing = !!editingCartItem;

  // Upsell modal state
  const [showUpsell, setShowUpsell] = useState(false);
  const [pendingWingsData, setPendingWingsData] = useState<{
    cartItem: any;
    flavorName: string;
  } | null>(null);

  // Initialize flavor from editing item
  useEffect(() => {
    if (isOpen && editingCartItem?.wingsCustomization) {
      const existingFlavor = FLAVOR_OPTIONS.find(
        f => f.name === editingCartItem.wingsCustomization?.flavor
      );
      setSelectedFlavor(existingFlavor?.id || 'plain');
    } else if (isOpen) {
      setSelectedFlavor('plain');
    }
  }, [isOpen, editingCartItem]);

  const handleNext = () => {
    const flavorName = FLAVOR_OPTIONS.find(f => f.id === selectedFlavor)?.name || 'Plain';
    
    // Convert DB MenuItem to cart-compatible format
    const cartItem = {
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.base_price,
      image: item.image_url || '/placeholder.svg',
      category: item.category as 'chicken_wings',
      popular: item.is_popular,
    };
    
    if (isEditing && editingCartItem) {
      // For editing, update directly without upsell
      updateWingsInCart(editingCartItem.id, cartItem, flavorName);
      onClose();
      setSelectedFlavor('plain');
    } else {
      // For new wings, show upsell flow
      setPendingWingsData({ cartItem, flavorName });
      setShowUpsell(true);
    }
  };

  const handleUpsellComplete = (upsellItems: { id: string; name: string; price: number; image_url?: string | null; quantity: number }[]) => {
    // First add the wings
    if (pendingWingsData) {
      addWingsToCart(pendingWingsData.cartItem, pendingWingsData.flavorName);
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
    setPendingWingsData(null);
    setShowUpsell(false);
    setSelectedFlavor('plain');
    onClose();
  };

  const handleUpsellClose = () => {
    // If upsell is closed via X button, do NOT add the wings - user cancelled
    setPendingWingsData(null);
    setShowUpsell(false);
    setSelectedFlavor('plain');
    onClose();
  };

  return (
    <>
    <Dialog open={isOpen && !showUpsell} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {isEditing ? `Edit ${item.name}` : item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}

          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Choose Your Flavor</h3>
            <RadioGroup value={selectedFlavor} onValueChange={setSelectedFlavor}>
              {FLAVOR_OPTIONS.map((flavor) => (
                <div key={flavor.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                  <RadioGroupItem value={flavor.id} id={`${flavor.id}-${item.id}`} />
                  <Label htmlFor={`${flavor.id}-${item.id}`} className="flex-1 cursor-pointer text-sm">
                    {flavor.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <span className="text-xl font-bold text-primary">
                ${item.base_price.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="pizza" onClick={handleNext}>
                {isEditing ? 'Update' : (
                  <>
                    Next <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
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

export default WingsCustomizationModal;

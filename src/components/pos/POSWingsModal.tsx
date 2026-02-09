import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { MenuItem } from '@/hooks/useMenuItems';
import type { CartItem } from '@/types/menu';

interface POSWingsModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToOrder: (item: CartItem) => void;
  editingItem?: CartItem | null;
}

const FLAVOR_OPTIONS = [
  { id: 'hot', name: 'Hot' },
  { id: 'honey-garlic', name: 'Honey Garlic' },
  { id: 'bbq', name: 'BBQ' },
  { id: 'salt-pepper', name: 'Salt & Pepper' },
  { id: 'plain', name: 'Plain' },
];

export const POSWingsModal = ({ item, isOpen, onClose, onAddToOrder, editingItem }: POSWingsModalProps) => {
  const [selectedFlavor, setSelectedFlavor] = useState<string>('plain');

  // Initialize flavor from editing item
  useEffect(() => {
    if (isOpen && editingItem?.wingsCustomization) {
      const existingFlavor = FLAVOR_OPTIONS.find(
        f => f.name === editingItem.wingsCustomization?.flavor
      );
      setSelectedFlavor(existingFlavor?.id || 'plain');
    } else if (isOpen) {
      setSelectedFlavor('plain');
    }
  }, [isOpen, editingItem]);

  const handleAddToOrder = () => {
    const flavorName = FLAVOR_OPTIONS.find(f => f.id === selectedFlavor)?.name || 'Plain';
    
    const cartItem: CartItem = {
      id: `${item.id}-${Date.now()}`,
      name: item.name,
      description: item.description || '',
      price: item.base_price,
      image: item.image_url || '',
      category: 'chicken_wings',
      quantity: 1,
      totalPrice: item.base_price,
      wingsCustomization: {
        flavor: flavorName,
        originalItemId: item.id,
      },
    };
    
    onAddToOrder(cartItem);
    onClose();
    setSelectedFlavor('plain');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {editingItem ? `Edit ${item.name}` : item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}

          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Choose Your Flavor</h3>
            <div className="flex flex-col gap-2">
              {FLAVOR_OPTIONS.map((flavor) => {
                const isSelected = selectedFlavor === flavor.id;
                return (
                  <button
                    key={flavor.id}
                    onClick={() => setSelectedFlavor(flavor.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                      isSelected
                        ? 'bg-emerald-500 text-white'
                        : 'bg-red-300 text-white'
                    }`}
                  >
                    {flavor.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-xl font-bold text-primary">
              ${item.base_price.toFixed(2)}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="pizza" onClick={handleAddToOrder}>
                {editingItem ? 'Update' : 'Add to Order'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

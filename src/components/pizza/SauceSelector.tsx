import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SauceOption } from '@/hooks/useMenuItems';
import type { SelectedSauce, SauceQuantity } from '@/types/pizzaCustomization';

interface SauceSelectorProps {
  sauces: SauceOption[];
  selectedSauces: SelectedSauce[];
  defaultSauceIds: string[];
  onUpdateSauces: (sauces: SelectedSauce[]) => void;
}

const SauceSelector = ({ sauces, selectedSauces, defaultSauceIds, onUpdateSauces }: SauceSelectorProps) => {
  const toggleSauce = (sauce: SauceOption) => {
    const existing = selectedSauces.find(s => s.id === sauce.id);
    const isDefault = defaultSauceIds.includes(sauce.id);
    
    if (existing) {
      onUpdateSauces(selectedSauces.filter(s => s.id !== sauce.id));
    } else {
      onUpdateSauces([...selectedSauces, {
        id: sauce.id,
        name: sauce.name,
        quantity: 'regular',
        price: sauce.price,
        isDefault: isDefault,
      }]);
    }
  };

  const updateQuantity = (id: string, quantity: SauceQuantity) => {
    onUpdateSauces(selectedSauces.map(s => 
      s.id === id ? { ...s, quantity } : s
    ));
  };

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3">
        Sauces
        <span className="text-sm font-normal text-muted-foreground ml-2">
          (Default sauces are free, others are charged)
        </span>
      </h3>
      <div className="space-y-2">
        {sauces.map((sauce) => {
          const isSelected = selectedSauces.some(s => s.id === sauce.id);
          const selectedSauce = selectedSauces.find(s => s.id === sauce.id);
          const isDefault = defaultSauceIds.includes(sauce.id);

          return (
            <div
              key={sauce.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all",
                isSelected ? "border-primary bg-primary/5" : "border-border",
                isDefault && !isSelected && "border-dashed border-green-500/50"
              )}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleSauce(sauce)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground"
                  )}
                >
                  {isSelected && <Check className="w-4 h-4" />}
                </button>
                <div>
                  <span className="font-medium">{sauce.name}</span>
                  {isDefault ? (
                    <span className="text-xs text-green-600 ml-2">Default (Free)</span>
                  ) : (
                    <span className="text-sm text-muted-foreground ml-2">
                      +${sauce.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {isSelected && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateQuantity(sauce.id, 'regular')}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs border transition-all",
                      selectedSauce?.quantity === 'regular'
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    )}
                  >
                    Regular
                  </button>
                  <button
                    onClick={() => updateQuantity(sauce.id, 'extra')}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs border transition-all",
                      selectedSauce?.quantity === 'extra'
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    )}
                  >
                    Extra +${sauce.price.toFixed(2)}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SauceSelector;
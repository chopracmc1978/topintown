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
  // Track if "No Sauce" is selected (empty array with explicit selection)
  const isNoSauceSelected = selectedSauces.length === 0;

  const selectNoSauce = () => {
    onUpdateSauces([]);
  };

  // Only one sauce can be selected at a time
  const selectSauce = (sauce: SauceOption) => {
    const isDefault = defaultSauceIds.includes(sauce.id);
    const isCurrentlySelected = selectedSauces.some(s => s.id === sauce.id);

    if (isCurrentlySelected) {
      // Clicking the same sauce deselects it - select no sauce
      onUpdateSauces([]);
    } else {
      // Replace with single sauce
      onUpdateSauces([{
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

  const selectedSauce = selectedSauces[0];

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3">
        Sauce
        <span className="text-sm font-normal text-muted-foreground ml-2">
          (Select one - default is free)
        </span>
      </h3>
      <div className="space-y-2">
        {/* No Sauce Option */}
        <div
          className={cn(
            "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
            isNoSauceSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          )}
          onClick={selectNoSauce}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                isNoSauceSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground"
              )}
            >
              {isNoSauceSelected && <Check className="w-3 h-3" />}
            </div>
            <span className="font-medium">No Sauce</span>
          </div>
        </div>

        {/* Sauce Options */}
        {sauces.map((sauce) => {
          const isSelected = selectedSauce?.id === sauce.id;
          const isDefault = defaultSauceIds.includes(sauce.id);

          return (
            <div
              key={sauce.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer",
                isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                isDefault && !isSelected && "border-dashed border-green-500/50"
              )}
              onClick={() => selectSauce(sauce)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground"
                  )}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
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
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => updateQuantity(sauce.id, 'less')}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs border transition-all",
                      selectedSauce?.quantity === 'less'
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    Less
                  </button>
                  <button
                    onClick={() => updateQuantity(sauce.id, 'regular')}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs border transition-all",
                      selectedSauce?.quantity === 'regular'
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
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
                        : "border-border hover:border-primary/50"
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

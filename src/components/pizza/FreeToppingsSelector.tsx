import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FreeTopping } from '@/hooks/usePizzaOptions';

interface FreeToppingsSelectorProps {
  freeToppings: FreeTopping[];
  selectedFreeToppings: string[];
  onToggleFreeTopping: (id: string) => void;
}

const FreeToppingsSelector = ({ freeToppings, selectedFreeToppings, onToggleFreeTopping }: FreeToppingsSelectorProps) => {
  if (freeToppings.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3">
        Free Toppings
        <span className="text-sm font-normal text-green-600 ml-2">(Optional - No Charge)</span>
      </h3>
      <div className="flex flex-wrap gap-3">
        {freeToppings.map((topping) => {
          const isSelected = selectedFreeToppings.includes(topping.id);
          return (
            <button
              key={topping.id}
              onClick={() => onToggleFreeTopping(topping.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all",
                isSelected
                  ? "border-green-500 bg-green-500/10 text-green-700"
                  : "border-border hover:border-green-500/50"
              )}
            >
              {isSelected && <Check className="w-4 h-4" />}
              {topping.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FreeToppingsSelector;

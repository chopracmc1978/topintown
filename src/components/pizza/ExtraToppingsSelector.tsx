import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Topping } from '@/hooks/useMenuItems';
import type { SelectedTopping } from '@/types/pizzaCustomization';

interface ExtraToppingsSelectorProps {
  allToppings: Topping[];
  extraToppings: SelectedTopping[];
  defaultToppingIds: string[];
  selectedSize: string;
  isGlutenFree: boolean;
  onAddTopping: (topping: SelectedTopping) => void;
  onRemoveTopping: (id: string) => void;
}

// Get topping price based on size/crust - flat pricing, no regular/extra distinction
const getToppingPrice = (size: string, isGlutenFree: boolean): number => {
  const isSmall = size.includes('Small');
  const isMedium = size.includes('Medium');
  const isLarge = size.includes('Large');

  if (isSmall) return 2;
  if (isMedium || isGlutenFree) return 2.5;
  if (isLarge) return 3;
  return 2;
};

const ExtraToppingsSelector = ({
  allToppings,
  extraToppings,
  defaultToppingIds,
  selectedSize,
  isGlutenFree,
  onAddTopping,
  onRemoveTopping,
}: ExtraToppingsSelectorProps) => {
  // Filter out default toppings and already added extras
  const availableToppings = allToppings.filter(
    t => !defaultToppingIds.includes(t.id) && !extraToppings.some(e => e.id === t.id)
  );

  const vegToppings = availableToppings.filter(t => t.is_veg);
  const nonVegToppings = availableToppings.filter(t => !t.is_veg);

  const toppingPrice = getToppingPrice(selectedSize, isGlutenFree);

  const addTopping = (topping: Topping) => {
    onAddTopping({
      id: topping.id,
      name: topping.name,
      quantity: 'regular', // Flat quantity, no extra option
      price: toppingPrice,
      isDefault: false,
      isVeg: topping.is_veg,
    });
  };

  const ToppingButton = ({ topping }: { topping: Topping }) => {
    return (
      <button
        onClick={() => addTopping(topping)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-sm"
      >
        <Plus className="w-4 h-4 text-primary" />
        <span>{topping.name}</span>
        <span className="text-primary font-medium">+${toppingPrice.toFixed(2)}</span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Selected Extra Toppings */}
      {extraToppings.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3">
            Added Extra Toppings
          </h3>
          <div className="space-y-2">
            {extraToppings.map((topping) => (
              <div
                key={topping.id}
                className="flex items-center justify-between p-3 rounded-lg border border-primary bg-primary/5"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{topping.name}</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    topping.isVeg ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {topping.isVeg ? 'Veg' : 'Non-Veg'}
                  </span>
                  <span className="text-sm text-primary font-medium">+${topping.price.toFixed(2)}</span>
                </div>

                <button
                  onClick={() => onRemoveTopping(topping.id)}
                  className="p-1 rounded-full hover:bg-destructive/10 text-destructive transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Veg Toppings */}
      {vegToppings.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            Add Veg Toppings
          </h3>
          <div className="flex flex-wrap gap-2">
            {vegToppings.map((topping) => (
              <ToppingButton key={topping.id} topping={topping} />
            ))}
          </div>
        </div>
      )}

      {/* Non-Veg Toppings */}
      {nonVegToppings.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Add Non-Veg Toppings
          </h3>
          <div className="flex flex-wrap gap-2">
            {nonVegToppings.map((topping) => (
              <ToppingButton key={topping.id} topping={topping} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtraToppingsSelector;

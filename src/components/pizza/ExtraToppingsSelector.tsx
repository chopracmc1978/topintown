import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Topping } from '@/hooks/useMenuItems';
import type { SelectedTopping, ToppingQuantity } from '@/types/pizzaCustomization';

interface ExtraToppingsSelectorProps {
  allToppings: Topping[];
  extraToppings: SelectedTopping[];
  defaultToppingIds: string[];
  selectedSize: string;
  onAddTopping: (topping: SelectedTopping) => void;
  onUpdateTopping: (id: string, quantity: ToppingQuantity) => void;
  onRemoveTopping: (id: string) => void;
}

const getToppingPrice = (topping: Topping, size: string): number => {
  if (size.includes('Small')) return topping.price_small || topping.price;
  if (size.includes('Medium')) return topping.price_medium || topping.price;
  if (size.includes('Large')) return topping.price_large || topping.price;
  return topping.price;
};

const ExtraToppingsSelector = ({
  allToppings,
  extraToppings,
  defaultToppingIds,
  selectedSize,
  onAddTopping,
  onUpdateTopping,
  onRemoveTopping,
}: ExtraToppingsSelectorProps) => {
  // Filter out default toppings and already added extras
  const availableToppings = allToppings.filter(
    t => !defaultToppingIds.includes(t.id) && !extraToppings.some(e => e.id === t.id)
  );

  const vegToppings = availableToppings.filter(t => t.is_veg);
  const nonVegToppings = availableToppings.filter(t => !t.is_veg);

  const addTopping = (topping: Topping) => {
    const price = getToppingPrice(topping, selectedSize);
    onAddTopping({
      id: topping.id,
      name: topping.name,
      quantity: 'regular',
      price,
      isDefault: false,
      isVeg: topping.is_veg,
    });
  };

  const ToppingButton = ({ topping }: { topping: Topping }) => {
    const price = getToppingPrice(topping, selectedSize);
    return (
      <button
        onClick={() => addTopping(topping)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-sm"
      >
        <Plus className="w-4 h-4 text-primary" />
        <span>{topping.name}</span>
        <span className="text-primary font-medium">+${price.toFixed(2)}</span>
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
                  <span className="text-sm text-primary">+${topping.price.toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {(['regular', 'extra'] as const).map((q) => (
                      <button
                        key={q}
                        onClick={() => onUpdateTopping(topping.id, q)}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs border transition-all",
                          topping.quantity === q
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        {q === 'regular' ? 'Regular' : 'Extra (+50%)'}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => onRemoveTopping(topping.id)}
                    className="p-1 rounded-full hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
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

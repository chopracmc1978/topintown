import { Minus, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectedTopping, ToppingQuantity } from '@/types/pizzaCustomization';

interface DefaultToppingsSelectorProps {
  defaultToppings: SelectedTopping[];
  onUpdateTopping: (id: string, quantity: ToppingQuantity) => void;
}

const QUANTITY_OPTIONS: { value: ToppingQuantity; label: string }[] = [
  { value: 'none', label: 'Remove' },
  { value: 'less', label: 'Less' },
  { value: 'regular', label: 'Regular' },
  { value: 'extra', label: 'Extra' },
];

const DefaultToppingsSelector = ({ defaultToppings, onUpdateTopping }: DefaultToppingsSelectorProps) => {
  if (defaultToppings.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3">
        Default Toppings
        <span className="text-sm font-normal text-muted-foreground ml-2">(Included with pizza)</span>
      </h3>
      <div className="space-y-2">
        {defaultToppings.map((topping) => (
          <div
            key={topping.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all",
              topping.quantity === 'none' 
                ? "border-destructive/50 bg-destructive/5 opacity-60" 
                : "border-border"
            )}
          >
            <div className="flex items-center gap-3">
              <span className={cn(
                "font-medium",
                topping.quantity === 'none' && "line-through text-muted-foreground"
              )}>
                {topping.name}
              </span>
              {topping.isVeg !== undefined && (
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  topping.isVeg ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {topping.isVeg ? 'Veg' : 'Non-Veg'}
                </span>
              )}
            </div>

            <div className="flex gap-1">
              {QUANTITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onUpdateTopping(topping.id, option.value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs border transition-all",
                    topping.quantity === option.value
                      ? option.value === 'none'
                        ? "border-destructive bg-destructive text-destructive-foreground"
                        : "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DefaultToppingsSelector;

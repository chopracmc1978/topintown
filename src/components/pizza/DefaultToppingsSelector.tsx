import { cn } from '@/lib/utils';
import type { SelectedTopping, ToppingQuantity, PizzaSide } from '@/types/pizzaCustomization';

interface DefaultToppingsSelectorProps {
  defaultToppings: SelectedTopping[];
  selectedSize: string;
  isGlutenFree: boolean;
  onUpdateTopping: (id: string, quantity: ToppingQuantity, side: PizzaSide, price: number) => void;
}

// Get extra topping price based on size/crust
const getExtraToppingPrice = (size: string, isGlutenFree: boolean): number => {
  if (!size) return 2;
  
  const isSmall = size.includes('Small');
  const isMedium = size.includes('Medium');
  const isLarge = size.includes('Large');

  if (isSmall) return 2;
  if (isMedium || isGlutenFree) return 2.5;
  if (isLarge) return 3;
  return 2;
};

const QUANTITY_OPTIONS: { value: ToppingQuantity; label: string }[] = [
  { value: 'none', label: 'Remove' },
  { value: 'less', label: 'Less' },
  { value: 'regular', label: 'Regular' },
];

const SIDE_OPTIONS: { value: PizzaSide; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'whole', label: 'Whole' },
];

const DefaultToppingsSelector = ({ 
  defaultToppings, 
  selectedSize, 
  isGlutenFree, 
  onUpdateTopping 
}: DefaultToppingsSelectorProps) => {
  if (defaultToppings.length === 0) return null;

  const extraPrice = getExtraToppingPrice(selectedSize, isGlutenFree);

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3">
        Default Toppings
        <span className="text-sm font-normal text-muted-foreground ml-2">(Included with pizza)</span>
      </h3>
      <div className="space-y-3">
        {defaultToppings.map((topping) => (
          <div
            key={topping.id}
            className={cn(
              "p-3 rounded-lg border transition-all",
              topping.quantity === 'none' 
                ? "border-destructive/50 bg-destructive/5 opacity-60" 
                : "border-border"
            )}
          >
            {/* Topping Name & Veg/Non-Veg Badge */}
            <div className="flex items-center gap-3 mb-3">
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
              {topping.quantity === 'extra' && (
                <span className="text-sm text-primary font-medium">+${extraPrice.toFixed(2)}</span>
              )}
            </div>

            {/* Quantity Options */}
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-xs text-muted-foreground w-full">Amount:</span>
              {QUANTITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onUpdateTopping(topping.id, option.value, topping.side || 'whole', 0)}
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
              {/* Extra Button with Price */}
              <button
                onClick={() => onUpdateTopping(topping.id, 'extra', topping.side || 'whole', extraPrice)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs border transition-all",
                  topping.quantity === 'extra'
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50"
                )}
              >
                Extra +${extraPrice.toFixed(2)}
              </button>
            </div>

            {/* Side Selection - only show if not removed */}
            {topping.quantity !== 'none' && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground w-full">Side:</span>
                {SIDE_OPTIONS.map((side) => (
                  <button
                    key={side.value}
                    onClick={() => {
                      const price = topping.quantity === 'extra' ? extraPrice : 0;
                      onUpdateTopping(topping.id, topping.quantity, side.value, price);
                    }}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs border transition-all",
                      (topping.side || 'whole') === side.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {side.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DefaultToppingsSelector;

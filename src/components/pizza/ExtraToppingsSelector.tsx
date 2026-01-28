import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Topping } from '@/hooks/useMenuItems';
import type { SelectedTopping, ToppingQuantity, PizzaSide } from '@/types/pizzaCustomization';

interface ExtraToppingsSelectorProps {
  allToppings: Topping[];
  extraToppings: SelectedTopping[];
  defaultToppingIds: string[];
  selectedSize: string;
  isGlutenFree: boolean;
  onAddTopping: (topping: SelectedTopping) => void;
  onRemoveTopping: (id: string) => void;
  onUpdateTopping: (id: string, quantity: ToppingQuantity, side: PizzaSide, price: number) => void;
}

// Get topping price based on size/crust
const getToppingPrice = (size: string, isGlutenFree: boolean): number => {
  if (!size) return 2;
  
  const isSmall = size.includes('Small');
  const isMedium = size.includes('Medium');
  const isLarge = size.includes('Large');

  if (isSmall) return 2;
  if (isMedium || isGlutenFree) return 2.5;
  if (isLarge) return 3;
  return 2;
};

const QUANTITY_OPTIONS: { value: Exclude<ToppingQuantity, 'none'>; label: string }[] = [
  { value: 'less', label: 'Less' },
  { value: 'regular', label: 'Regular' },
];

const SIDE_OPTIONS: { value: PizzaSide; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'whole', label: 'Whole' },
];

const ExtraToppingsSelector = ({
  allToppings,
  extraToppings,
  defaultToppingIds,
  selectedSize,
  isGlutenFree,
  onAddTopping,
  onRemoveTopping,
  onUpdateTopping,
}: ExtraToppingsSelectorProps) => {
  // Filter out default toppings and already added extras
  const availableToppings = allToppings.filter(
    t => !defaultToppingIds.includes(t.id) && !extraToppings.some(e => e.id === t.id)
  );

  const vegToppings = availableToppings.filter(t => t.is_veg);
  const nonVegToppings = availableToppings.filter(t => !t.is_veg);

  const toppingPrice = getToppingPrice(selectedSize, isGlutenFree);
  const extraPrice = toppingPrice * 1.5; // +50% for extra

  const addTopping = (topping: Topping) => {
    onAddTopping({
      id: topping.id,
      name: topping.name,
      quantity: 'regular',
      price: toppingPrice,
      isDefault: false,
      isVeg: topping.is_veg,
      side: 'whole',
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
      {/* Selected Extra Toppings with full options */}
      {extraToppings.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3">
            Added Extra Toppings
          </h3>
          <div className="space-y-3">
            {extraToppings.map((topping) => (
              <div
                key={topping.id}
                className="p-3 rounded-lg border border-primary bg-primary/5"
              >
                {/* Topping Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{topping.name}</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      topping.isVeg ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                      {topping.isVeg ? 'Veg' : 'Non-Veg'}
                    </span>
                    <span className="text-sm text-primary font-medium">
                      +${(topping.quantity === 'extra' ? extraPrice : toppingPrice).toFixed(2)}
                    </span>
                  </div>
                  <button
                    onClick={() => onRemoveTopping(topping.id)}
                    className="p-1 rounded-full hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quantity Options */}
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-xs text-muted-foreground w-full">Amount:</span>
                  {QUANTITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => onUpdateTopping(topping.id, option.value, topping.side || 'whole', toppingPrice)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs border transition-all",
                        topping.quantity === option.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                  {/* Extra Button with +50% price */}
                  <button
                    onClick={() => onUpdateTopping(topping.id, 'extra', topping.side || 'whole', extraPrice)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs border transition-all",
                      topping.quantity === 'extra'
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    Extra (+50%)
                  </button>
                </div>

                {/* Side Selection */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground w-full">Side:</span>
                  {SIDE_OPTIONS.map((side) => (
                    <button
                      key={side.value}
                      onClick={() => {
                        const price = topping.quantity === 'extra' ? extraPrice : toppingPrice;
                        onUpdateTopping(topping.id, topping.quantity as Exclude<ToppingQuantity, 'none'>, side.value, price);
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

import { cn } from '@/lib/utils';
import type { CheeseOption } from '@/hooks/usePizzaOptions';

interface CheeseSelectorProps {
  cheeses: CheeseOption[];
  selectedCheese: { id: string; name: string; quantity: 'regular' | 'extra'; price: number } | null;
  selectedSize: string;
  isGlutenFree: boolean;
  onSelectCheese: (cheese: { id: string; name: string; quantity: 'regular' | 'extra'; price: number }) => void;
}

// Get cheese price based on size and crust
const getCheesePrice = (
  cheese: CheeseOption,
  quantity: 'regular' | 'extra',
  size: string,
  isGlutenFree: boolean,
  isDefault: boolean
): number => {
  // If it's the default cheese (Mozzarella) with regular quantity, no extra charge
  if (isDefault && quantity === 'regular') {
    return 0;
  }

  // Dairy Free or Extra cheese pricing based on size/crust
  const isSmall = size.includes('Small');
  const isMedium = size.includes('Medium');
  const isLarge = size.includes('Large');

  // Medium or Gluten Free = $3, Small = $2, Large = $3
  if (isSmall) {
    return 2;
  } else if (isMedium || isGlutenFree) {
    return 3;
  } else if (isLarge) {
    return 3;
  }
  return 2;
};

const CheeseSelector = ({ cheeses, selectedCheese, selectedSize, isGlutenFree, onSelectCheese }: CheeseSelectorProps) => {
  if (cheeses.length === 0) return null;

  const updateCheeseType = (cheese: CheeseOption) => {
    const quantity = selectedCheese?.quantity || 'regular';
    const price = getCheesePrice(cheese, quantity, selectedSize, isGlutenFree, cheese.is_default);
    onSelectCheese({
      id: cheese.id,
      name: cheese.name,
      quantity,
      price,
    });
  };

  const updateQuantity = (quantity: 'regular' | 'extra') => {
    if (!selectedCheese) return;
    const cheese = cheeses.find(c => c.id === selectedCheese.id);
    if (!cheese) return;
    
    const price = getCheesePrice(cheese, quantity, selectedSize, isGlutenFree, cheese.is_default);
    onSelectCheese({
      ...selectedCheese,
      quantity,
      price,
    });
  };

  // Calculate display prices
  const getExtraPrice = () => {
    const isSmall = selectedSize.includes('Small');
    const isMedium = selectedSize.includes('Medium');
    if (isSmall) return 2;
    if (isMedium || isGlutenFree) return 3;
    return 3; // Large
  };

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3">Cheese</h3>
      
      {/* Cheese Type */}
      <div className="flex flex-wrap gap-3 mb-4">
        {cheeses.map((cheese) => {
          const currentPrice = getCheesePrice(cheese, selectedCheese?.quantity || 'regular', selectedSize, isGlutenFree, cheese.is_default);
          const showPrice = !cheese.is_default || selectedCheese?.quantity === 'extra';
          
          return (
            <button
              key={cheese.id}
              onClick={() => updateCheeseType(cheese)}
              className={cn(
                "px-4 py-2 rounded-full border-2 transition-all",
                selectedCheese?.id === cheese.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50"
              )}
            >
              {cheese.name}
              {cheese.is_default && (
                <span className="ml-1 text-xs opacity-75">(Default)</span>
              )}
              {!cheese.is_default && (
                <span className="ml-1 text-sm">+${getCheesePrice(cheese, 'regular', selectedSize, isGlutenFree, false).toFixed(2)}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quantity */}
      <div className="flex gap-3">
        <span className="text-sm text-muted-foreground self-center">Amount:</span>
        <button
          onClick={() => updateQuantity('regular')}
          className={cn(
            "px-4 py-2 rounded-full border-2 transition-all",
            selectedCheese?.quantity === 'regular'
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:border-primary/50"
          )}
        >
          Regular
        </button>
        <button
          onClick={() => updateQuantity('extra')}
          className={cn(
            "px-4 py-2 rounded-full border-2 transition-all",
            selectedCheese?.quantity === 'extra'
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:border-primary/50"
          )}
        >
          Extra
          <span className="ml-1 text-sm">+${getExtraPrice().toFixed(2)}</span>
        </button>
      </div>
    </div>
  );
};

export default CheeseSelector;

import { cn } from '@/lib/utils';
import type { CheeseOption } from '@/hooks/usePizzaOptions';

interface CheeseSelectorProps {
  cheeses: CheeseOption[];
  selectedCheese: { id: string; name: string; quantity: 'regular' | 'extra'; price: number } | null;
  onSelectCheese: (cheese: { id: string; name: string; quantity: 'regular' | 'extra'; price: number }) => void;
}

const CheeseSelector = ({ cheeses, selectedCheese, onSelectCheese }: CheeseSelectorProps) => {
  if (cheeses.length === 0) return null;

  const updateCheeseType = (cheese: CheeseOption) => {
    onSelectCheese({
      id: cheese.id,
      name: cheese.name,
      quantity: selectedCheese?.quantity || 'regular',
      price: selectedCheese?.quantity === 'extra' ? cheese.price_extra : 0,
    });
  };

  const updateQuantity = (quantity: 'regular' | 'extra') => {
    if (!selectedCheese) return;
    const cheese = cheeses.find(c => c.id === selectedCheese.id);
    onSelectCheese({
      ...selectedCheese,
      quantity,
      price: quantity === 'extra' ? (cheese?.price_extra || 0) : 0,
    });
  };

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3">Cheese</h3>
      
      {/* Cheese Type */}
      <div className="flex flex-wrap gap-3 mb-4">
        {cheeses.map((cheese) => (
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
          </button>
        ))}
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
          {selectedCheese && (
            <span className="ml-1 text-sm">
              +${cheeses.find(c => c.id === selectedCheese.id)?.price_extra.toFixed(2)}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default CheeseSelector;

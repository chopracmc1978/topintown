import { cn } from '@/lib/utils';
import type { CrustOption } from '@/hooks/usePizzaOptions';

interface CrustSelectorProps {
  crusts: CrustOption[];
  selectedCrust: { id: string; name: string; price: number } | null;
  onSelectCrust: (crust: { id: string; name: string; price: number }) => void;
  glutenFreePrice?: number;
}

const CrustSelector = ({ crusts, selectedCrust, onSelectCrust, glutenFreePrice = 2.5 }: CrustSelectorProps) => {
  if (crusts.length === 0) return null;

  const getCrustPrice = (crust: CrustOption): number => {
    if (crust.name.toLowerCase().includes('gluten free')) {
      return glutenFreePrice;
    }
    return 0;
  };

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3">Crust</h3>
      <div className="flex flex-wrap gap-3">
        {crusts.map((crust) => {
          const price = getCrustPrice(crust);
          return (
            <button
              key={crust.id}
              onClick={() => onSelectCrust({ id: crust.id, name: crust.name, price })}
              className={cn(
                "px-4 py-2 rounded-full border-2 transition-all",
                selectedCrust?.id === crust.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50"
              )}
            >
              {crust.name}
              {price > 0 && (
                <span className="ml-1 text-sm opacity-75">+${price.toFixed(2)}</span>
              )}
            </button>
          );
        })}
      </div>
      {crusts.length === 1 && (
        <p className="text-xs text-muted-foreground mt-2">
          Only Regular crust is available for this size
        </p>
      )}
    </div>
  );
};

export default CrustSelector;

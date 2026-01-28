import { cn } from '@/lib/utils';
import type { MenuItemSize } from '@/hooks/useMenuItems';

interface SizeSelectorProps {
  sizes: MenuItemSize[];
  selectedSize: { id: string; name: string; price: number } | null;
  onSelectSize: (size: { id: string; name: string; price: number }) => void;
}

const SizeSelector = ({ sizes, selectedSize, onSelectSize }: SizeSelectorProps) => {
  if (sizes.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3">Size</h3>
      <div className="grid grid-cols-3 gap-3">
        {sizes.map((size) => (
          <button
            key={size.id}
            onClick={() => onSelectSize({ id: size.id, name: size.name, price: size.price })}
            className={cn(
              "p-4 rounded-xl border-2 text-center transition-all",
              selectedSize?.id === size.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="block font-medium text-foreground">{size.name}</span>
            <span className="block text-sm text-primary font-semibold mt-1">
              ${size.price.toFixed(2)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SizeSelector;

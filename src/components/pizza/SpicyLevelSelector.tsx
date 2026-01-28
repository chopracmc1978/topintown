import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpicyLevel } from '@/types/pizzaCustomization';

interface SpicyLevelSelectorProps {
  spicyLevel: SpicyLevel;
  onSelectSpicyLevel: (level: SpicyLevel) => void;
}

const SPICY_LEVELS: { value: SpicyLevel; label: string; flames: number }[] = [
  { value: 'none', label: 'No Spicy', flames: 0 },
  { value: 'mild', label: 'Mild', flames: 1 },
  { value: 'medium', label: 'Medium', flames: 2 },
  { value: 'hot', label: 'Hot', flames: 3 },
];

const SpicyLevelSelector = ({ spicyLevel, onSelectSpicyLevel }: SpicyLevelSelectorProps) => {
  return (
    <div>
      <h3 className="font-semibold text-foreground mb-3">
        Spicy Level
        <span className="text-sm font-normal text-muted-foreground ml-2">(Optional)</span>
      </h3>
      <div className="flex flex-wrap gap-3">
        {SPICY_LEVELS.map((level) => (
          <button
            key={level.value}
            onClick={() => onSelectSpicyLevel(level.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all",
              spicyLevel === level.value
                ? "border-orange-500 bg-orange-500/10"
                : "border-border hover:border-orange-500/50"
            )}
          >
            {level.flames > 0 && (
              <div className="flex">
                {Array.from({ length: level.flames }).map((_, i) => (
                  <Flame key={i} className="w-4 h-4 text-orange-500 -ml-1 first:ml-0" />
                ))}
              </div>
            )}
            <span className={spicyLevel === level.value ? "text-orange-700 font-medium" : ""}>
              {level.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SpicyLevelSelector;

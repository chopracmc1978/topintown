import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpicyLevel, SideSpicyLevel, PizzaSide } from '@/types/pizzaCustomization';

interface SpicyLevelSelectorProps {
  spicyLevel: SideSpicyLevel;
  onUpdateSpicyLevel: (level: SideSpicyLevel) => void;
}

const SPICY_OPTIONS: { value: SpicyLevel; label: string; flames: number }[] = [
  { value: 'none', label: 'No Spicy', flames: 0 },
  { value: 'medium', label: 'Medium', flames: 2 },
  { value: 'hot', label: 'Hot', flames: 3 },
];

const SIDE_OPTIONS: { value: PizzaSide; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'whole', label: 'Whole' },
];

const SpicyLevelSelector = ({ spicyLevel, onUpdateSpicyLevel }: SpicyLevelSelectorProps) => {
  // Determine current selection mode
  const isWhole = spicyLevel.left === spicyLevel.right;
  const currentWholeLevel = isWhole ? spicyLevel.left : null;
  
  // Determine which side has medium/hot if split
  const getMediumSide = (): PizzaSide | null => {
    if (spicyLevel.left === 'medium' && spicyLevel.right !== 'medium') return 'left';
    if (spicyLevel.right === 'medium' && spicyLevel.left !== 'medium') return 'right';
    if (spicyLevel.left === 'medium' && spicyLevel.right === 'medium') return 'whole';
    return null;
  };
  
  const getHotSide = (): PizzaSide | null => {
    if (spicyLevel.left === 'hot' && spicyLevel.right !== 'hot') return 'left';
    if (spicyLevel.right === 'hot' && spicyLevel.left !== 'hot') return 'right';
    if (spicyLevel.left === 'hot' && spicyLevel.right === 'hot') return 'whole';
    return null;
  };

  const mediumSide = getMediumSide();
  const hotSide = getHotSide();

  // Handle No Spicy selection (whole pizza)
  const selectNoSpicy = () => {
    onUpdateSpicyLevel({ left: 'none', right: 'none' });
  };

  // Handle Medium side selection
  const selectMediumSide = (side: PizzaSide) => {
    if (side === 'whole') {
      // Whole medium = both sides medium, hot not selectable
      onUpdateSpicyLevel({ left: 'medium', right: 'medium' });
    } else if (side === 'left') {
      // Left medium = right becomes hot (or none if no hot selected)
      const rightLevel = hotSide === 'right' ? 'hot' : 'none';
      onUpdateSpicyLevel({ left: 'medium', right: rightLevel });
    } else {
      // Right medium = left becomes hot (or none if no hot selected)
      const leftLevel = hotSide === 'left' ? 'hot' : 'none';
      onUpdateSpicyLevel({ left: leftLevel, right: 'medium' });
    }
  };

  // Handle Hot side selection
  const selectHotSide = (side: PizzaSide) => {
    if (side === 'whole') {
      // Whole hot = both sides hot
      onUpdateSpicyLevel({ left: 'hot', right: 'hot' });
    } else if (side === 'left') {
      // Left hot = right becomes medium (or none if no medium selected)
      const rightLevel = mediumSide === 'right' ? 'medium' : 'none';
      onUpdateSpicyLevel({ left: 'hot', right: rightLevel });
    } else {
      // Right hot = left becomes medium (or none if no medium selected)
      const leftLevel = mediumSide === 'left' ? 'medium' : 'none';
      onUpdateSpicyLevel({ left: leftLevel, right: 'hot' });
    }
  };

  // Check if medium/hot should be disabled
  const isNoSpicySelected = spicyLevel.left === 'none' && spicyLevel.right === 'none';
  const isWholeMedium = spicyLevel.left === 'medium' && spicyLevel.right === 'medium';
  const isWholeHot = spicyLevel.left === 'hot' && spicyLevel.right === 'hot';

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">
        Spicy Level
        <span className="text-sm font-normal text-muted-foreground ml-2">(Optional)</span>
      </h3>

      {/* No Spicy Option */}
      <div className="space-y-2">
        <button
          onClick={selectNoSpicy}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all",
            isNoSpicySelected
              ? "border-primary bg-primary/10 text-primary font-medium"
              : "border-border hover:border-primary/50"
          )}
        >
          No Spicy
        </button>
      </div>

      {/* Medium Spicy with Side Selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <div className="flex">
            <Flame className="w-4 h-4 text-orange-400" />
            <Flame className="w-4 h-4 text-orange-400 -ml-1" />
          </div>
          <span>Medium</span>
          {isNoSpicySelected && (
            <span className="text-xs text-muted-foreground">(Select a side first)</span>
          )}
        </div>
        <div className="flex gap-2">
          {SIDE_OPTIONS.map((side) => {
            const isSelected = mediumSide === side.value;
            // Disable if whole hot is selected OR if opposite side already has medium
            const isDisabled = isWholeHot || (side.value !== 'whole' && mediumSide === (side.value === 'left' ? 'right' : 'left'));
            
            return (
              <button
                key={`medium-${side.value}`}
                onClick={() => selectMediumSide(side.value)}
                disabled={isDisabled}
                className={cn(
                  "px-4 py-2 rounded-lg border-2 transition-all text-sm",
                  isSelected
                    ? "border-orange-500 bg-orange-500/10 text-orange-700 font-medium"
                    : isDisabled
                    ? "border-border opacity-40 cursor-not-allowed"
                    : "border-border hover:border-orange-500/50"
                )}
              >
                {side.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hot Spicy with Side Selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <div className="flex">
            <Flame className="w-4 h-4 text-red-500" />
            <Flame className="w-4 h-4 text-red-500 -ml-1" />
            <Flame className="w-4 h-4 text-red-500 -ml-1" />
          </div>
          <span>Hot</span>
        </div>
        <div className="flex gap-2">
          {SIDE_OPTIONS.map((side) => {
            const isSelected = hotSide === side.value;
            // Disable if whole medium is selected OR if opposite side already has hot
            const isDisabled = isWholeMedium || isNoSpicySelected || (side.value !== 'whole' && hotSide === (side.value === 'left' ? 'right' : 'left'));
            
            return (
              <button
                key={`hot-${side.value}`}
                onClick={() => selectHotSide(side.value)}
                disabled={isDisabled}
                className={cn(
                  "px-4 py-2 rounded-lg border-2 transition-all text-sm",
                  isSelected
                    ? "border-red-500 bg-red-500/10 text-red-700 font-medium"
                    : isDisabled
                    ? "border-border opacity-40 cursor-not-allowed"
                    : "border-border hover:border-red-500/50"
                )}
              >
                {side.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Selection Summary */}
      {!isNoSpicySelected && (
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          <span className="font-medium">Current: </span>
          {isWhole ? (
            <span className={currentWholeLevel === 'medium' ? 'text-orange-600' : 'text-red-600'}>
              Whole pizza - {currentWholeLevel === 'medium' ? 'Medium' : 'Hot'}
            </span>
          ) : (
            <>
              <span className={spicyLevel.left === 'medium' ? 'text-orange-600' : spicyLevel.left === 'hot' ? 'text-red-600' : ''}>
                Left: {spicyLevel.left === 'none' ? 'No Spicy' : spicyLevel.left === 'medium' ? 'Medium' : 'Hot'}
              </span>
              <span className="mx-2">|</span>
              <span className={spicyLevel.right === 'medium' ? 'text-orange-600' : spicyLevel.right === 'hot' ? 'text-red-600' : ''}>
                Right: {spicyLevel.right === 'none' ? 'No Spicy' : spicyLevel.right === 'medium' ? 'Medium' : 'Hot'}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SpicyLevelSelector;

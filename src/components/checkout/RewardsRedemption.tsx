import { useState } from 'react';
import { Gift, Star, X, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  useRewardsByPhone, 
  MIN_POINTS_TO_REDEEM, 
  POINTS_TO_DOLLAR_RATIO,
  MIN_REDEEM_DOLLAR,
  MAX_REDEEM_DOLLAR,
  canRedeemRewards,
} from '@/hooks/useRewards';

interface RewardsRedemptionProps {
  customerPhone: string | undefined;
  orderSubtotal: number;
  onApplyRewards: (pointsUsed: number, dollarValue: number) => void;
  onRemoveRewards: () => void;
  appliedRewardsPoints: number;
  appliedRewardsDiscount: number;
  disabledByCoupon?: boolean;
}

const RewardsRedemption = ({
  customerPhone,
  orderSubtotal,
  onApplyRewards,
  onRemoveRewards,
  appliedRewardsPoints,
  appliedRewardsDiscount,
  disabledByCoupon = false,
}: RewardsRedemptionProps) => {
  const { data: rewards, isLoading } = useRewardsByPhone(customerPhone);
  const [customAmount, setCustomAmount] = useState('');

  if (isLoading || !customerPhone) {
    return null;
  }

  const currentPoints = rewards?.points || 0;
  const canRedeem = canRedeemRewards(currentPoints);
  const availableDollars = Math.floor(currentPoints / POINTS_TO_DOLLAR_RATIO);
  const maxRedeemable = Math.min(availableDollars, MAX_REDEEM_DOLLAR, Math.floor(orderSubtotal));
  const canApply = maxRedeemable >= MIN_REDEEM_DOLLAR;

  // If already applied
  if (appliedRewardsPoints > 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              {appliedRewardsPoints} points applied
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-green-700 dark:text-green-400">
              -${appliedRewardsDiscount.toFixed(2)}
            </span>
            <button
              onClick={onRemoveRewards}
              className="text-green-600 hover:text-green-800 transition-colors"
              title="Remove rewards"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If can't redeem (less than 200 points or order too small)
  if (!canRedeem || !canApply) {
    const pointsNeeded = MIN_POINTS_TO_REDEEM - currentPoints;
    return (
      <div className="bg-secondary/50 border border-border rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">
            You have <span className="font-medium text-foreground">{currentPoints} points</span>
            {currentPoints > 0 && currentPoints < MIN_POINTS_TO_REDEEM && (
              <span> • {pointsNeeded} more to unlock rewards</span>
            )}
            {currentPoints >= MIN_POINTS_TO_REDEEM && !canApply && (
              <span> • Order must be at least ${MIN_REDEEM_DOLLAR} to redeem</span>
            )}
          </span>
        </div>
      </div>
    );
  }

  // Disabled because a coupon is already applied
  if (disabledByCoupon) {
    return (
      <div className="bg-secondary/50 border border-border rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-muted-foreground">
            You have <span className="font-medium text-foreground">{currentPoints} points</span>
            <span> • Remove coupon to use rewards</span>
          </span>
        </div>
      </div>
    );
  }

  // Validate custom amount
  const parsedCustom = parseInt(customAmount) || 0;
  const isCustomValid = parsedCustom >= MIN_REDEEM_DOLLAR && parsedCustom <= maxRedeemable;

  const handleApply = () => {
    const amount = parsedCustom;
    const pointsUsed = amount * POINTS_TO_DOLLAR_RATIO;
    onApplyRewards(pointsUsed, amount);
    setCustomAmount('');
  };

  // Can redeem - show inline input with $20-$35 range
  return (
    <div className="bg-primary/5 border border-primary/30 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          Redeem (${ MIN_REDEEM_DOLLAR}-${ MAX_REDEEM_DOLLAR} range)
        </span>
        <div className="relative flex-1">
          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="number"
            min={MIN_REDEEM_DOLLAR}
            max={maxRedeemable}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder={`${MIN_REDEEM_DOLLAR}-${maxRedeemable}`}
            className="pl-7 h-9 text-sm"
          />
        </div>
        <Button
          size="sm"
          variant="pizza"
          disabled={!isCustomValid}
          onClick={handleApply}
        >
          Apply {isCustomValid ? `$${parsedCustom}` : ''} Off
        </Button>
      </div>
    </div>
  );
};

export default RewardsRedemption;

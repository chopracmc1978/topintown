import { Gift, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
}

const RewardsRedemption = ({
  customerPhone,
  orderSubtotal,
  onApplyRewards,
  onRemoveRewards,
  appliedRewardsPoints,
  appliedRewardsDiscount,
}: RewardsRedemptionProps) => {
  const { data: rewards, isLoading } = useRewardsByPhone(customerPhone);

  if (isLoading || !customerPhone) {
    return null;
  }

  const currentPoints = rewards?.points || 0;
  const canRedeem = canRedeemRewards(currentPoints);
  const availableDollars = Math.floor(currentPoints / POINTS_TO_DOLLAR_RATIO);
  const smartRedeemDollars = Math.min(availableDollars, MAX_REDEEM_DOLLAR, Math.floor(orderSubtotal));
  const canApply = smartRedeemDollars >= MIN_REDEEM_DOLLAR;

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

  // Can redeem - show button with smart amount ($20-$35, capped by order)
  const handleApply = () => {
    const pointsUsed = smartRedeemDollars * POINTS_TO_DOLLAR_RATIO;
    onApplyRewards(pointsUsed, smartRedeemDollars);
  };

  return (
    <div className="bg-primary/5 border border-primary/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            You have {currentPoints} reward points!
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Redeem for ${smartRedeemDollars} off ($20-${MAX_REDEEM_DOLLAR} range)
        </span>
        <Button size="sm" variant="pizza" onClick={handleApply}>
          Apply ${smartRedeemDollars} Off
        </Button>
      </div>
    </div>
  );
};

export default RewardsRedemption;

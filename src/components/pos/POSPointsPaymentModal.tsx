import { useState, useEffect } from 'react';
import { Star, DollarSign, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useRedeemRewardPoints, MIN_POINTS_TO_REDEEM, POINTS_TO_DOLLAR_RATIO, MIN_REDEEM_DOLLAR, MAX_REDEEM_DOLLAR } from '@/hooks/useRewards';

interface POSPointsPaymentModalProps {
  open: boolean;
  orderTotal: number;
  customerPhone: string;
  orderId: string;
  customerId?: string;
  onPointsApplied: (pointsUsed: number, dollarValue: number, remainingBalance: number) => void;
  onClose: () => void;
}

export const POSPointsPaymentModal = ({
  open,
  orderTotal,
  customerPhone,
  orderId,
  customerId,
  onPointsApplied,
  onClose,
}: POSPointsPaymentModalProps) => {
  const [points, setPoints] = useState<number>(0);
  const [lifetimePoints, setLifetimePoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [applying, setApplying] = useState(false);
  const redeemPoints = useRedeemRewardPoints();

  const cleanPhone = customerPhone?.replace(/\D/g, '') || '';

  useEffect(() => {
    if (!open || !cleanPhone) return;
    setLoading(true);
    setSelectedAmount(0);

    const fetchPoints = async () => {
      const { data } = await supabase
        .from('customer_rewards')
        .select('points, lifetime_points')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (data) {
        setPoints(data.points);
        setLifetimePoints(data.lifetime_points);
      } else {
        setPoints(0);
        setLifetimePoints(0);
      }
      setLoading(false);
    };
    fetchPoints();
  }, [open, cleanPhone]);

  if (!open) return null;

  const canRedeem = points >= MIN_POINTS_TO_REDEEM;
  const maxDollarFromPoints = Math.floor(points / POINTS_TO_DOLLAR_RATIO);
  const effectiveMax = Math.min(MAX_REDEEM_DOLLAR, maxDollarFromPoints, orderTotal);
  const effectiveMin = Math.min(MIN_REDEEM_DOLLAR, effectiveMax);

  // Generate dollar amount options in $5 increments
  const amountOptions: number[] = [];
  if (canRedeem) {
    for (let amt = MIN_REDEEM_DOLLAR; amt <= effectiveMax; amt += 5) {
      amountOptions.push(amt);
    }
    // Add max if not already included
    if (amountOptions.length > 0 && amountOptions[amountOptions.length - 1] !== effectiveMax && effectiveMax >= MIN_REDEEM_DOLLAR) {
      amountOptions.push(effectiveMax);
    }
    // If effectiveMax < MIN_REDEEM_DOLLAR but we can still redeem less than order total
    if (amountOptions.length === 0 && effectiveMax >= 1) {
      amountOptions.push(effectiveMax);
    }
  }

  const remainingAfterPoints = selectedAmount > 0 ? Math.max(0, orderTotal - selectedAmount) : orderTotal;
  const pointsNeeded = selectedAmount * POINTS_TO_DOLLAR_RATIO;

  const handleApply = async () => {
    if (selectedAmount <= 0 || applying) return;
    setApplying(true);
    try {
      await redeemPoints.mutateAsync({
        phone: cleanPhone,
        customerId,
        orderId,
        pointsToRedeem: pointsNeeded,
        dollarValue: selectedAmount,
      });
      onPointsApplied(pointsNeeded, selectedAmount, remainingAfterPoints);
    } catch (err) {
      console.error('Failed to redeem points:', err);
    } finally {
      setApplying(false);
    }
  };

  const darkBg = 'hsl(220, 25%, 18%)';
  const darkCard = 'hsl(220, 26%, 22%)';
  const textColor = '#e2e8f0';
  const mutedText = '#94a3b8';
  const accentBlue = '#0ea5e9';
  const accentAmber = '#f59e0b';
  const accentGreen = '#22c55e';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-xl border shadow-2xl" style={{ backgroundColor: darkBg, borderColor: 'hsl(220, 20%, 28%)', color: textColor }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'hsl(220, 20%, 28%)' }}>
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6" style={{ color: accentAmber }} />
            <h2 className="text-xl font-bold">Pay with Points</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-70">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {loading ? (
            <div className="text-center py-8" style={{ color: mutedText }}>Loading points...</div>
          ) : !cleanPhone ? (
            <div className="text-center py-8">
              <p className="text-lg font-semibold mb-2">No Phone Number</p>
              <p style={{ color: mutedText }}>Customer phone number is required to redeem points.</p>
            </div>
          ) : !canRedeem ? (
            <div className="text-center py-8">
              <p className="text-lg font-semibold mb-2">Not Enough Points</p>
              <p style={{ color: mutedText }}>
                Customer has <span className="font-bold" style={{ color: accentAmber }}>{points} pts</span>.
                Minimum {MIN_POINTS_TO_REDEEM} pts needed to redeem.
              </p>
            </div>
          ) : (
            <>
              {/* Points Balance */}
              <div className="rounded-lg p-4 text-center" style={{ backgroundColor: darkCard }}>
                <p style={{ color: mutedText }} className="text-sm mb-1">Available Points</p>
                <p className="text-3xl font-bold" style={{ color: accentAmber }}>{points} pts</p>
                <p className="text-sm mt-1" style={{ color: mutedText }}>
                  (worth up to ${maxDollarFromPoints})
                </p>
              </div>

              {/* Order Total */}
              <div className="flex justify-between items-center text-lg px-1">
                <span style={{ color: mutedText }}>Order Total:</span>
                <span className="font-bold text-xl">${orderTotal.toFixed(2)}</span>
              </div>

              {/* Amount Selection */}
              <div>
                <p className="text-sm font-medium mb-3" style={{ color: mutedText }}>Select Points Amount ($20-$35):</p>
                <div className="grid grid-cols-4 gap-2">
                  {amountOptions.map(amt => (
                    <button
                      key={amt}
                      className="h-14 rounded-lg text-lg font-bold transition-all border-2"
                      style={{
                        backgroundColor: selectedAmount === amt ? accentAmber : darkCard,
                        borderColor: selectedAmount === amt ? accentAmber : 'hsl(220, 20%, 28%)',
                        color: selectedAmount === amt ? '#000' : textColor,
                      }}
                      onClick={() => setSelectedAmount(amt)}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {selectedAmount > 0 && (
                <div className="rounded-lg p-4 space-y-2" style={{ backgroundColor: darkCard }}>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: mutedText }}>Points to Use:</span>
                    <span className="font-semibold" style={{ color: accentAmber }}>{pointsNeeded} pts</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: mutedText }}>Points Discount:</span>
                    <span className="font-semibold" style={{ color: accentGreen }}>-${selectedAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2" style={{ borderColor: 'hsl(220, 20%, 28%)' }}>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Remaining:</span>
                      <span style={{ color: remainingAfterPoints > 0 ? '#f87171' : accentGreen }}>
                        ${remainingAfterPoints.toFixed(2)}
                      </span>
                    </div>
                    {remainingAfterPoints > 0 && (
                      <p className="text-xs mt-1" style={{ color: mutedText }}>
                        Remaining balance can be paid with Cash or Card
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 border-t flex gap-3" style={{ borderColor: 'hsl(220, 20%, 28%)' }}>
          <button
            className="flex-1 h-12 rounded-lg font-semibold transition-all"
            style={{ backgroundColor: darkCard, color: mutedText }}
            onClick={onClose}
          >
            Cancel
          </button>
          {canRedeem && selectedAmount > 0 && (
            <button
              className="flex-1 h-12 rounded-lg font-bold transition-all"
              style={{ backgroundColor: accentAmber, color: '#000' }}
              onClick={handleApply}
              disabled={applying}
            >
              {applying ? 'Applying...' : `Apply $${selectedAmount} Points`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

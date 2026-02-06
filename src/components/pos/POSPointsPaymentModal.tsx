import { useState, useEffect } from 'react';
import { Star, X, DollarSign } from 'lucide-react';
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

const darkBg = 'hsl(220, 25%, 18%)';
const darkCard = 'hsl(220, 26%, 22%)';
const textColor = '#e2e8f0';
const mutedText = '#94a3b8';
const accentAmber = '#f59e0b';
const accentGreen = '#22c55e';
const borderColor = 'hsl(220, 20%, 28%)';

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
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [applying, setApplying] = useState(false);
  const redeemPoints = useRedeemRewardPoints();

  const cleanPhone = customerPhone?.replace(/\D/g, '') || '';

  useEffect(() => {
    if (!open || !cleanPhone) return;
    setLoading(true);
    setSelectedAmount(0);
    setCustomAmount('');
    setShowCustomInput(false);

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

  // Generate dollar amount options in $5 increments
  const amountOptions: number[] = [];
  if (canRedeem) {
    for (let amt = MIN_REDEEM_DOLLAR; amt <= effectiveMax; amt += 5) {
      amountOptions.push(amt);
    }
    if (amountOptions.length > 0 && amountOptions[amountOptions.length - 1] !== effectiveMax && effectiveMax >= MIN_REDEEM_DOLLAR) {
      amountOptions.push(effectiveMax);
    }
    if (amountOptions.length === 0 && effectiveMax >= 1) {
      amountOptions.push(effectiveMax);
    }
  }

  const activeAmount = showCustomInput && customAmount ? parseInt(customAmount) || 0 : selectedAmount;
  const remainingAfterPoints = activeAmount > 0 ? Math.max(0, orderTotal - activeAmount) : orderTotal;
  const pointsNeeded = activeAmount * POINTS_TO_DOLLAR_RATIO;

  // Validate custom amount
  const isCustomValid = showCustomInput && customAmount
    ? (parseInt(customAmount) || 0) >= MIN_REDEEM_DOLLAR &&
      (parseInt(customAmount) || 0) <= effectiveMax
    : false;

  const isApplyEnabled = activeAmount >= MIN_REDEEM_DOLLAR && activeAmount <= effectiveMax && pointsNeeded <= points;

  const handlePresetSelect = (amt: number) => {
    setSelectedAmount(amt);
    setShowCustomInput(false);
    setCustomAmount('');
  };

  const handleCustomToggle = () => {
    setShowCustomInput(true);
    setSelectedAmount(0);
    setCustomAmount('');
  };

  const handleApply = async () => {
    if (!isApplyEnabled || applying) return;
    setApplying(true);
    try {
      await redeemPoints.mutateAsync({
        phone: cleanPhone,
        customerId,
        orderId,
        pointsToRedeem: pointsNeeded,
        dollarValue: activeAmount,
      });
      onPointsApplied(pointsNeeded, activeAmount, remainingAfterPoints);
    } catch (err) {
      console.error('Failed to redeem points:', err);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-xl border shadow-2xl" style={{ backgroundColor: darkBg, borderColor, color: textColor }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor }}>
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
                <p className="text-sm font-medium mb-3" style={{ color: mutedText }}>Select Points Amount (${MIN_REDEEM_DOLLAR}-${MAX_REDEEM_DOLLAR}):</p>
                <div className="grid grid-cols-4 gap-2">
                  {amountOptions.map(amt => (
                    <button
                      key={amt}
                      className="h-14 rounded-lg text-lg font-bold transition-all border-2"
                      style={{
                        backgroundColor: selectedAmount === amt && !showCustomInput ? accentAmber : darkCard,
                        borderColor: selectedAmount === amt && !showCustomInput ? accentAmber : borderColor,
                        color: selectedAmount === amt && !showCustomInput ? '#000' : textColor,
                      }}
                      onClick={() => handlePresetSelect(amt)}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div className="mt-3">
                  {!showCustomInput ? (
                    <button
                      className="w-full h-12 rounded-lg text-sm font-semibold transition-all border-2"
                      style={{ backgroundColor: darkCard, borderColor, color: mutedText }}
                      onClick={handleCustomToggle}
                    >
                      Custom Amount
                    </button>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: accentAmber }} />
                        <input
                          type="number"
                          min={MIN_REDEEM_DOLLAR}
                          max={effectiveMax}
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          placeholder={`${MIN_REDEEM_DOLLAR}-${effectiveMax}`}
                          className="w-full h-14 pl-10 pr-4 rounded-lg text-lg font-bold border-2 outline-none"
                          style={{
                            backgroundColor: darkCard,
                            borderColor: isCustomValid ? accentAmber : borderColor,
                            color: textColor,
                          }}
                          autoFocus
                        />
                      </div>
                      <button
                        className="h-14 px-4 rounded-lg text-sm font-semibold"
                        style={{ backgroundColor: darkCard, color: mutedText }}
                        onClick={() => {
                          setShowCustomInput(false);
                          setCustomAmount('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              {activeAmount > 0 && isApplyEnabled && (
                <div className="rounded-lg p-4 space-y-2" style={{ backgroundColor: darkCard }}>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: mutedText }}>Points to Use:</span>
                    <span className="font-semibold" style={{ color: accentAmber }}>{pointsNeeded} pts</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: mutedText }}>Points Discount:</span>
                    <span className="font-semibold" style={{ color: accentGreen }}>-${activeAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2" style={{ borderColor }}>
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
        <div className="p-5 border-t flex gap-3" style={{ borderColor }}>
          <button
            className="flex-1 h-12 rounded-lg font-semibold transition-all"
            style={{ backgroundColor: darkCard, color: mutedText }}
            onClick={onClose}
          >
            Cancel
          </button>
          {canRedeem && isApplyEnabled && (
            <button
              className="flex-1 h-12 rounded-lg font-bold transition-all"
              style={{ backgroundColor: accentAmber, color: '#000' }}
              onClick={handleApply}
              disabled={applying}
            >
              {applying ? 'Applying...' : `Apply $${activeAmount}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

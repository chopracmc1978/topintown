import { useState, useEffect } from 'react';
import { Star, X, Delete, Check, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MIN_POINTS_TO_REDEEM, POINTS_TO_DOLLAR_RATIO, MIN_REDEEM_DOLLAR, MAX_REDEEM_DOLLAR } from '@/hooks/useRewards';
import { useValidateCoupon } from '@/hooks/useCoupons';
import { toast } from 'sonner';

interface POSPointsPaymentModalProps {
  open: boolean;
  orderTotal: number;
  customerPhone: string;
  orderId: string;
  customerId?: string;
  onPointsApplied: (pointsUsed: number, dollarValue: number, remainingBalance: number) => void;
  onClose: () => void;
}

const bg = 'hsl(220, 25%, 18%)';
const card = 'hsl(220, 22%, 28%)';
const border = 'hsl(220, 20%, 35%)';
const amber = '#f59e0b';
const blue = 'hsl(217, 91%, 60%)';
const green = '#22c55e';
const text = '#e2e8f0';
const muted = '#94a3b8';

export const POSPointsPaymentModal = ({
  open, orderTotal, customerPhone, orderId, customerId, onPointsApplied, onClose,
}: POSPointsPaymentModalProps) => {
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  
  // Coupon & discount state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [manualDiscount, setManualDiscount] = useState('');
  const [showDiscountKeypad, setShowDiscountKeypad] = useState(false);
  const [discountInput, setDiscountInput] = useState('');

  const validateCouponMutation = useValidateCoupon();
  const cleanPhone = customerPhone?.replace(/\D/g, '') || '';

  useEffect(() => {
    if (!open || !cleanPhone) return;
    setLoading(true);
    setInput('');
    setCouponCode('');
    setAppliedCoupon(null);
    setManualDiscount('');
    setShowDiscountKeypad(false);
    setDiscountInput('');
    supabase
      .from('customer_rewards')
      .select('points')
      .eq('phone', cleanPhone)
      .maybeSingle()
      .then(({ data }) => {
        setPoints(data?.points || 0);
        setLoading(false);
      });
  }, [open, cleanPhone]);

  if (!open) return null;

  // Calculate effective total after coupon/discount
  const couponDiscount = appliedCoupon?.discount || 0;
  const manualDiscountVal = parseFloat(manualDiscount) || 0;
  const totalDiscounts = couponDiscount + manualDiscountVal;
  const effectiveTotal = Math.max(0, orderTotal - totalDiscounts);
  const hasDiscount = totalDiscounts > 0;

  const canRedeem = points >= MIN_POINTS_TO_REDEEM;
  const maxDollar = Math.floor(Math.min(MAX_REDEEM_DOLLAR, Math.floor(points / POINTS_TO_DOLLAR_RATIO), effectiveTotal));
  const amount = parseInt(input) || 0;
  const valid = !hasDiscount && amount >= MIN_REDEEM_DOLLAR && amount <= maxDollar;
  const remaining = Math.max(0, effectiveTotal - (hasDiscount ? 0 : amount));

  const press = (key: string) => {
    if (key === 'C') setInput('');
    else if (key === 'DEL') setInput(p => p.slice(0, -1));
    else if (input.length < 2) setInput(p => p + key);
  };

  const discountPress = (key: string) => {
    if (key === 'C') setDiscountInput('');
    else if (key === 'DEL') setDiscountInput(p => p.slice(0, -1));
    else if (key === '.') {
      if (!discountInput.includes('.')) setDiscountInput(p => p + '.');
    } else {
      const parts = discountInput.split('.');
      if (parts[1] && parts[1].length >= 2) return;
      setDiscountInput(p => p + key);
    }
  };

  const applyPoints = () => {
    if (!valid) return;
    onPointsApplied(amount * POINTS_TO_DOLLAR_RATIO, amount, remaining);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const result = await validateCouponMutation.mutateAsync({
        code: couponCode,
        subtotal: orderTotal,
      });
      setAppliedCoupon({ code: result.coupon.code, discount: result.discount });
      setCouponCode('');
      setInput(''); // Clear points input since discount takes priority
      toast.success(`Coupon applied: -$${result.discount.toFixed(2)}`);
    } catch (err: any) {
      toast.error(err.message || 'Invalid coupon');
    }
  };

  const handleClearCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const handleApplyDiscount = () => {
    setManualDiscount(discountInput);
    setShowDiscountKeypad(false);
    setInput(''); // Clear points input
  };

  const handleClearDiscount = () => {
    setManualDiscount('');
    setDiscountInput('');
  };

  // When discount/coupon applied, allow "Done" to close with just discounts
  const handleDoneWithDiscount = () => {
    // Pass 0 points, 0 dollar value, remaining = effectiveTotal
    onPointsApplied(0, 0, effectiveTotal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-80 rounded-xl shadow-2xl" style={{ backgroundColor: bg, border: `1px solid ${border}`, color: text }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${border}` }}>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5" style={{ color: amber }} />
            <span className="text-base font-bold">Pay with Points</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:opacity-70"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="text-center py-6" style={{ color: muted }}>Loading...</div>
          ) : !cleanPhone ? (
            <div className="text-center py-6">
              <p className="font-semibold mb-1">No Phone Number</p>
              <p className="text-sm" style={{ color: muted }}>Phone required to redeem points.</p>
            </div>
          ) : (
            <>
              {/* Points + Order info */}
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: muted }}>Points: <span className="font-bold" style={{ color: amber }}>{points}</span></span>
                <span style={{ color: muted }}>Total: <span className="font-bold" style={{ color: text }}>${orderTotal.toFixed(2)}</span></span>
              </div>

              {/* Coupon Field */}
              <div>
                {appliedCoupon ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'hsl(140, 30%, 15%)', border: '1px solid hsl(140, 40%, 30%)' }}>
                    <Check className="w-4 h-4" style={{ color: green }} />
                    <span className="text-sm font-medium" style={{ color: green }}>{appliedCoupon.code}</span>
                    <span className="text-sm" style={{ color: green }}>-${appliedCoupon.discount.toFixed(2)}</span>
                    <button onClick={handleClearCoupon} className="ml-auto p-0.5 rounded hover:opacity-70">
                      <X className="w-3.5 h-3.5" style={{ color: '#f87171' }} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: muted }} />
                      <input
                        type="text"
                        placeholder="Coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        disabled={!!manualDiscountVal}
                        className="w-full h-9 pl-8 pr-2 text-sm rounded-lg outline-none"
                        style={{ backgroundColor: card, color: text, border: `1px solid ${border}`, opacity: manualDiscountVal ? 0.5 : 1 }}
                      />
                    </div>
                    <button
                      onClick={handleApplyCoupon}
                      disabled={!couponCode.trim() || validateCouponMutation.isPending || !!manualDiscountVal}
                      className="h-9 px-3 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: card, color: green, border: `1px solid hsl(140, 40%, 30%)`, opacity: !couponCode.trim() || !!manualDiscountVal ? 0.5 : 1 }}
                    >
                      {validateCouponMutation.isPending ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>

              {/* Manual Discount */}
              <div>
                {manualDiscountVal > 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'hsl(140, 30%, 15%)', border: '1px solid hsl(140, 40%, 30%)' }}>
                    <span className="text-sm font-medium" style={{ color: green }}>Discount</span>
                    <span className="text-sm" style={{ color: green }}>-${manualDiscountVal.toFixed(2)}</span>
                    <button onClick={handleClearDiscount} className="ml-auto p-0.5 rounded hover:opacity-70">
                      <X className="w-3.5 h-3.5" style={{ color: '#f87171' }} />
                    </button>
                  </div>
                ) : !showDiscountKeypad ? (
                  <button
                    onClick={() => { setShowDiscountKeypad(true); setDiscountInput(''); }}
                    disabled={!!appliedCoupon}
                    className="w-full h-9 rounded-lg text-sm font-medium"
                    style={{ backgroundColor: card, color: muted, border: `1px solid ${border}`, opacity: appliedCoupon ? 0.5 : 1 }}
                  >
                    + Manual Discount
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-9 rounded-lg flex items-center px-3" style={{ backgroundColor: card, border: `1px solid ${discountInput ? amber : border}` }}>
                        <span className="text-sm mr-1" style={{ color: amber }}>$</span>
                        <span className="text-base font-bold" style={{ color: discountInput ? text : muted }}>{discountInput || '0'}</span>
                      </div>
                      <button onClick={() => { setShowDiscountKeypad(false); setDiscountInput(''); }} className="h-9 px-3 rounded-lg text-xs" style={{ backgroundColor: card, color: muted, border: `1px solid ${border}` }}>Cancel</button>
                      <button onClick={handleApplyDiscount} disabled={!discountInput || parseFloat(discountInput) <= 0} className="h-9 px-3 rounded-lg text-xs font-bold" style={{ backgroundColor: parseFloat(discountInput) > 0 ? blue : card, color: parseFloat(discountInput) > 0 ? '#fff' : muted, border: `1px solid ${parseFloat(discountInput) > 0 ? blue : border}` }}>OK</button>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {['7','8','9','4','5','6','1','2','3'].map(k => (
                        <button key={k} onClick={() => discountPress(k)} className="h-9 rounded-lg text-sm font-bold" style={{ backgroundColor: card, color: text, border: `1px solid ${border}` }}>{k}</button>
                      ))}
                      <button onClick={() => discountPress('C')} className="h-9 rounded-lg text-sm font-bold" style={{ backgroundColor: card, color: '#f87171', border: `1px solid ${border}` }}>C</button>
                      <button onClick={() => discountPress('0')} className="h-9 rounded-lg text-sm font-bold" style={{ backgroundColor: card, color: text, border: `1px solid ${border}` }}>0</button>
                      <button onClick={() => discountPress('.')} className="h-9 rounded-lg text-sm font-bold" style={{ backgroundColor: card, color: text, border: `1px solid ${border}` }}>.</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Updated Total after discounts */}
              {hasDiscount && (
                <div className="flex justify-between items-center px-1 text-sm" style={{ color: green }}>
                  <span>After Discount:</span>
                  <span className="font-bold text-base">${effectiveTotal.toFixed(2)}</span>
                </div>
              )}

              {/* Points section - disabled when coupon/discount applied */}
              {canRedeem && !hasDiscount && (
                <>
                  {/* Amount display */}
                  <div className="h-10 rounded-lg flex items-center px-3" style={{ backgroundColor: card, border: `2px solid ${input ? amber : border}` }}>
                    <span className="text-sm mr-1" style={{ color: amber }}>$</span>
                    <span className="text-lg font-bold" style={{ color: input ? text : muted }}>{input || '0'}</span>
                    <span className="ml-auto text-xs" style={{ color: muted }}>${MIN_REDEEM_DOLLAR}-${maxDollar}</span>
                  </div>

                  {/* Keypad */}
                  <div className="grid grid-cols-3 gap-1">
                    {['7','8','9','4','5','6','1','2','3'].map(k => (
                      <button key={k} onClick={() => press(k)} className="h-10 rounded-lg text-base font-bold" style={{ backgroundColor: card, color: text, border: `1px solid ${border}` }}>{k}</button>
                    ))}
                    <button onClick={() => press('C')} className="h-10 rounded-lg text-base font-bold" style={{ backgroundColor: card, color: '#f87171', borderLeft: '2px solid hsl(0,70%,50%)', borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>C</button>
                    <button onClick={() => press('0')} className="h-10 rounded-lg text-base font-bold" style={{ backgroundColor: card, color: text, border: `1px solid ${border}` }}>0</button>
                    <button disabled className="h-10 rounded-lg text-base font-bold opacity-30" style={{ backgroundColor: card, color: text, border: `1px solid ${border}` }}>.</button>
                    <button onClick={() => press('DEL')} className="h-10 rounded-lg text-sm font-medium flex items-center justify-center gap-1" style={{ backgroundColor: card, color: text, border: `1px solid ${border}` }}>
                      <Delete className="w-4 h-4" /> Del
                    </button>
                    <button onClick={applyPoints} disabled={!valid} className="h-10 rounded-lg text-sm font-bold col-span-2" style={{ backgroundColor: valid ? blue : card, color: valid ? '#fff' : muted, border: `1px solid ${valid ? blue : border}` }}>
                      {valid ? `Apply $${amount}` : 'OK'}
                    </button>
                  </div>

                  {valid && remaining > 0 && (
                    <p className="text-xs text-center" style={{ color: muted }}>Remaining ${remaining.toFixed(2)} payable by Cash/Card</p>
                  )}
                </>
              )}

              {/* When discount applied but not enough points or points disabled */}
              {hasDiscount && (
                <div className="space-y-2">
                  <p className="text-xs text-center" style={{ color: muted }}>
                    Points disabled when coupon/discount is applied
                  </p>
                  <button
                    onClick={handleDoneWithDiscount}
                    className="w-full h-10 rounded-lg text-sm font-bold"
                    style={{ backgroundColor: blue, color: '#fff', border: `1px solid ${blue}` }}
                  >
                    Done — Pay ${effectiveTotal.toFixed(2)} by Cash/Card
                  </button>
                </div>
              )}

              {/* Not enough points message */}
              {!canRedeem && !hasDiscount && (
                <div className="text-center py-2">
                  <p className="text-sm" style={{ color: muted }}>
                    <span style={{ color: amber }}>{points} pts</span> — need {MIN_POINTS_TO_REDEEM} min to redeem
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

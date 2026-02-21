import { useState } from 'react';
import { DollarSign, Tag, Check, X, Delete } from 'lucide-react';
import { useValidateCoupon } from '@/hooks/useCoupons';
import { toast } from 'sonner';

const bg = 'hsl(220, 25%, 18%)';
const card = 'hsl(220, 22%, 28%)';
const border = 'hsl(220, 20%, 35%)';
const text = '#e2e8f0';
const muted = '#94a3b8';
const green = '#22c55e';
const blue = 'hsl(217, 91%, 60%)';
const amber = '#f59e0b';

interface POSPaymentChoiceModalProps {
  open: boolean;
  orderNumber: string;
  orderTotal: number;
  orderSubtotal: number;
  customerPhone?: string;
  onPaymentChoice: (method: 'cash' | 'card' | 'points', discountInfo?: { discount: number; couponCode?: string }) => void;
  onSkip: () => void;
}

export const POSPaymentChoiceModal = ({
  open, orderNumber, orderTotal, orderSubtotal, customerPhone, onPaymentChoice, onSkip,
}: POSPaymentChoiceModalProps) => {
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [manualDiscount, setManualDiscount] = useState('');
  const [showDiscountKeypad, setShowDiscountKeypad] = useState(false);
  const [discountInput, setDiscountInput] = useState('');

  const validateCouponMutation = useValidateCoupon();

  if (!open) return null;

  const couponDiscount = appliedCoupon?.discount || 0;
  const manualDiscountVal = parseFloat(manualDiscount) || 0;
  const totalDiscounts = couponDiscount + manualDiscountVal;
  const effectiveTotal = Math.max(0, orderTotal - totalDiscounts);
  const hasDiscount = totalDiscounts > 0;
  const hasPhone = !!customerPhone?.trim();

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const result = await validateCouponMutation.mutateAsync({
        code: couponCode,
        subtotal: orderSubtotal,
      });
      setAppliedCoupon({ code: result.coupon.code, discount: result.discount });
      setCouponCode('');
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
  };

  const handleClearDiscount = () => {
    setManualDiscount('');
    setDiscountInput('');
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

  const handleChoice = (method: 'cash' | 'card' | 'points') => {
    if (hasDiscount) {
      onPaymentChoice(method, { discount: totalDiscounts, couponCode: appliedCoupon?.code });
    } else {
      onPaymentChoice(method);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-96 rounded-xl shadow-2xl" style={{ backgroundColor: bg, border: `1px solid ${border}`, color: text }}>
        {/* Header */}
        <div className="px-5 py-3" style={{ borderBottom: `1px solid ${border}` }}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5" style={{ color: '#0ea5e9' }} />
            <span className="text-lg font-bold">Payment</span>
          </div>
          <p className="text-sm" style={{ color: muted }}>
            Order {orderNumber} — <span className="font-bold" style={{ color: text }}>${orderTotal.toFixed(2)}</span>
          </p>
        </div>

        <div className="p-4 space-y-3">
          {/* Coupon Field */}
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

          {/* Manual Discount */}
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

          {/* Updated Total after discounts */}
          {hasDiscount && (
            <div className="flex justify-between items-center px-1 text-sm" style={{ color: green }}>
              <span>After Discount:</span>
              <span className="font-bold text-lg">${effectiveTotal.toFixed(2)}</span>
            </div>
          )}

          {/* Payment Buttons */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              className="h-20 text-lg font-semibold rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1"
              style={{ backgroundColor: 'hsl(220, 26%, 22%)', borderColor: border, color: text }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = green; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; }}
              onClick={() => handleChoice('cash')}
            >
              <DollarSign className="w-7 h-7" style={{ color: green }} />
              Cash
            </button>
            <button
              className="h-20 text-lg font-semibold rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1"
              style={{ backgroundColor: 'hsl(220, 26%, 22%)', borderColor: border, color: text }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0ea5e9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; }}
              onClick={() => handleChoice('card')}
            >
              <svg className="w-7 h-7" style={{ color: '#0ea5e9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2"/>
                <path d="M2 10h20" strokeWidth="2"/>
              </svg>
              Card
            </button>
            <button
              className="h-20 text-lg font-semibold rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1"
              style={{ backgroundColor: 'hsl(220, 26%, 22%)', borderColor: border, color: text, opacity: hasPhone ? 1 : 0.4, cursor: hasPhone ? 'pointer' : 'not-allowed' }}
              onMouseEnter={(e) => { if (hasPhone) e.currentTarget.style.borderColor = amber; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; }}
              onClick={() => hasPhone && handleChoice('points')}
              disabled={!hasPhone}
              title={!hasPhone ? 'Add customer phone number to use points' : ''}
            >
              <svg className="w-7 h-7" style={{ color: amber }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Points
            </button>
          </div>

          {/* Skip */}
          <button
            className="w-full py-2.5 rounded-lg font-medium transition-all text-sm"
            style={{ color: muted }}
            onClick={onSkip}
          >
            Skip - Leave Unpaid
          </button>
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Star, X, Delete } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MIN_POINTS_TO_REDEEM, POINTS_TO_DOLLAR_RATIO, MIN_REDEEM_DOLLAR, MAX_REDEEM_DOLLAR } from '@/hooks/useRewards';

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
const text = '#e2e8f0';
const muted = '#94a3b8';

export const POSPointsPaymentModal = ({
  open, orderTotal, customerPhone, orderId, customerId, onPointsApplied, onClose,
}: POSPointsPaymentModalProps) => {
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');

  const cleanPhone = customerPhone?.replace(/\D/g, '') || '';

  useEffect(() => {
    if (!open || !cleanPhone) return;
    setLoading(true);
    setInput('');
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

  const canRedeem = points >= MIN_POINTS_TO_REDEEM;
  const maxDollar = Math.floor(Math.min(MAX_REDEEM_DOLLAR, Math.floor(points / POINTS_TO_DOLLAR_RATIO), orderTotal));
  const amount = parseInt(input) || 0;
  const valid = amount >= MIN_REDEEM_DOLLAR && amount <= maxDollar;
  const remaining = Math.max(0, orderTotal - amount);

  const press = (key: string) => {
    if (key === 'C') setInput('');
    else if (key === 'DEL') setInput(p => p.slice(0, -1));
    else if (input.length < 2) setInput(p => p + key);
  };

  const apply = () => {
    if (!valid) return;
    onPointsApplied(amount * POINTS_TO_DOLLAR_RATIO, amount, remaining);
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
          ) : !canRedeem ? (
            <div className="text-center py-6">
              <p className="font-semibold mb-1">Not Enough Points</p>
              <p className="text-sm" style={{ color: muted }}>
                <span style={{ color: amber }}>{points} pts</span> — need {MIN_POINTS_TO_REDEEM} min
              </p>
            </div>
          ) : (
            <>
              {/* Points + Order info */}
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: muted }}>Points: <span className="font-bold" style={{ color: amber }}>{points}</span></span>
                <span style={{ color: muted }}>Order: <span className="font-bold" style={{ color: text }}>${orderTotal.toFixed(2)}</span></span>
              </div>

              {/* Amount display */}
              <div className="h-12 rounded-lg flex items-center px-4" style={{ backgroundColor: card, border: `2px solid ${input ? amber : border}` }}>
                <span className="text-sm mr-1" style={{ color: amber }}>$</span>
                <span className="text-xl font-bold" style={{ color: input ? text : muted }}>{input || '0'}</span>
                <span className="ml-auto text-xs" style={{ color: muted }}>${MIN_REDEEM_DOLLAR}-${maxDollar}</span>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-1">
                {['7','8','9','4','5','6','1','2','3'].map(k => (
                  <button key={k} onClick={() => press(k)} className="h-11 rounded-lg text-base font-bold" style={{ backgroundColor: card, color: text, border: `1px solid ${border}` }}>{k}</button>
                ))}
                <button onClick={() => press('C')} className="h-11 rounded-lg text-base font-bold" style={{ backgroundColor: card, color: '#f87171', borderLeft: '2px solid hsl(0,70%,50%)', borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}` }}>C</button>
                <button onClick={() => press('0')} className="h-11 rounded-lg text-base font-bold" style={{ backgroundColor: card, color: text, border: `1px solid ${border}` }}>0</button>
                <button disabled className="h-11 rounded-lg text-base font-bold opacity-30" style={{ backgroundColor: card, color: text, border: `1px solid ${border}` }}>.</button>
                {/* Del + Apply */}
                <button onClick={() => press('DEL')} className="h-11 rounded-lg text-sm font-medium flex items-center justify-center gap-1" style={{ backgroundColor: card, color: text, border: `1px solid ${border}` }}>
                  <Delete className="w-4 h-4" /> Del
                </button>
                <button
                  onClick={apply}
                  disabled={!valid}
                  className="h-11 rounded-lg text-sm font-bold col-span-2"
                  style={{
                    backgroundColor: valid ? blue : card,
                    color: valid ? '#fff' : muted,
                    border: `1px solid ${valid ? blue : border}`,
                  }}
                >
                  {valid ? `Apply $${amount}` : 'OK'}
                </button>
              </div>

              {/* Remaining hint */}
              {valid && remaining > 0 && (
                <p className="text-xs text-center" style={{ color: muted }}>
                  Remaining ${remaining.toFixed(2)} payable by Cash/Card
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

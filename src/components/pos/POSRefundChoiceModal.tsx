import { DollarSign, CreditCard, X } from 'lucide-react';

const bg = 'hsl(220, 25%, 18%)';
const card = 'hsl(220, 22%, 28%)';
const border = 'hsl(220, 20%, 35%)';
const text = '#e2e8f0';
const muted = '#94a3b8';
const green = '#22c55e';

interface POSRefundChoiceModalProps {
  open: boolean;
  orderNumber: string;
  orderTotal: number;
  paymentMethod?: string;
  onRefund: (refundMethod: 'cash' | 'card') => void;
  onCancel: () => void;
}

export const POSRefundChoiceModal = ({
  open, orderNumber, orderTotal, paymentMethod, onRefund, onCancel,
}: POSRefundChoiceModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-96 rounded-xl shadow-2xl" style={{ backgroundColor: bg, border: `1px solid ${border}`, color: text }}>
        {/* Header */}
        <div className="px-5 py-3" style={{ borderBottom: `1px solid ${border}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-400" />
              <span className="text-lg font-bold">Cancel & Refund</span>
            </div>
            <button onClick={onCancel} className="p-1 rounded hover:opacity-70">
              <X className="w-4 h-4" style={{ color: muted }} />
            </button>
          </div>
          <p className="text-sm mt-1" style={{ color: muted }}>
            Order <span className="font-mono font-bold" style={{ color: text }}>{orderNumber}</span> is already paid.
          </p>
        </div>

        <div className="p-4 space-y-4">
          {/* Refund amount */}
          <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'hsl(0, 30%, 15%)', border: '1px solid hsl(0, 40%, 30%)' }}>
            <p className="text-xs" style={{ color: muted }}>Refund Amount</p>
            <p className="text-2xl font-bold text-red-400">${orderTotal.toFixed(2)}</p>
            {paymentMethod && paymentMethod !== 'split' && (
              <p className="text-xs mt-1" style={{ color: muted }}>
                Originally paid by <span className="capitalize font-medium" style={{ color: text }}>{paymentMethod}</span>
              </p>
            )}
            {paymentMethod === 'split' && (
              <p className="text-xs mt-1" style={{ color: muted }}>
                Originally paid by <span className="font-medium" style={{ color: text }}>Split (Cash + Card)</span>
              </p>
            )}
          </div>

          {/* Refund method buttons */}
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: muted }}>How to refund?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                className="h-20 text-lg font-semibold rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1"
                style={{ backgroundColor: 'hsl(220, 26%, 22%)', borderColor: border, color: text }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = green; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; }}
                onClick={() => onRefund('cash')}
              >
                <DollarSign className="w-7 h-7" style={{ color: green }} />
                Cash Refund
              </button>
              <button
                className="h-20 text-lg font-semibold rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1"
                style={{ backgroundColor: 'hsl(220, 26%, 22%)', borderColor: border, color: text }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0ea5e9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; }}
                onClick={() => onRefund('card')}
              >
                <CreditCard className="w-7 h-7" style={{ color: '#0ea5e9' }} />
                Card Refund
              </button>
            </div>
          </div>

          {/* Cancel button */}
          <button
            className="w-full py-2.5 rounded-lg font-medium transition-all text-sm"
            style={{ color: muted }}
            onClick={onCancel}
          >
            Don't Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

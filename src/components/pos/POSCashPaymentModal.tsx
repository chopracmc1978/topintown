import { useState } from 'react';
import { DollarSign, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface POSCashPaymentModalProps {
  open: boolean;
  onClose: () => void;
  total: number;
  onConfirm: () => void;
}

const quickAmounts = [5, 10, 20, 50, 100];

export const POSCashPaymentModal = ({ open, onClose, total, onConfirm }: POSCashPaymentModalProps) => {
  const [amountReceived, setAmountReceived] = useState<string>('');

  const received = parseFloat(amountReceived) || 0;
  const change = received - total;
  const isValid = received >= total;

  const handleQuickAmount = (amount: number) => {
    setAmountReceived(amount.toString());
  };

  const handleExactAmount = () => {
    setAmountReceived(total.toFixed(2));
  };

  const handleConfirm = () => {
    if (isValid) {
      onConfirm();
      setAmountReceived('');
    }
  };

  const handleClose = () => {
    setAmountReceived('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Cash Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Total Due */}
          <div className="text-center p-4 bg-secondary/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Due</p>
            <p className="text-3xl font-bold" style={{ color: '#1a8ccc' }}>${total.toFixed(2)}</p>
          </div>

          {/* Amount Received Input */}
          <div>
            <label className="text-sm text-muted-foreground">Amount Received</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="pl-7 text-lg font-medium"
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Quick Amounts</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={handleExactAmount}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                Exact
              </Button>
              {quickAmounts.map(amount => (
                <Button
                  key={amount}
                  variant="outline"
                  onClick={() => handleQuickAmount(amount)}
                  disabled={amount < total}
                  className={cn(amount < total && "opacity-50")}
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>

          {/* Change Display */}
          <div className={cn(
            "text-center p-4 rounded-lg transition-colors",
            isValid ? "bg-green-50 border border-green-200" : "bg-secondary/30"
          )}>
            <p className="text-sm text-muted-foreground">Change Due</p>
            <p className={cn(
              "text-2xl font-bold",
              isValid ? "text-green-600" : "text-muted-foreground"
            )}>
              ${Math.max(0, change).toFixed(2)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              variant="pizza" 
              onClick={handleConfirm}
              disabled={!isValid}
              className="flex-1"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Complete Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from 'react';
import { DollarSign, Calculator, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const quickAmounts = [20, 50, 100];

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

  // Keypad handlers
  const handleKeyPress = (key: string) => {
    if (key === 'C') {
      setAmountReceived('');
    } else if (key === 'DEL') {
      setAmountReceived(prev => prev.slice(0, -1));
    } else if (key === '.') {
      // Only add decimal if not already present
      if (!amountReceived.includes('.')) {
        setAmountReceived(prev => prev + '.');
      }
    } else {
      // Limit to 2 decimal places
      const parts = amountReceived.split('.');
      if (parts[1] && parts[1].length >= 2) return;
      setAmountReceived(prev => prev + key);
    }
  };

  const keypadButtons = [
    '7', '8', '9',
    '4', '5', '6',
    '1', '2', '3',
    'C', '0', '.',
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl p-4" style={{ backgroundColor: '#ffffff' }}>
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="w-5 h-5" />
            Cash Payment
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          {/* Left Side - Payment Info */}
          <div className="flex-1 space-y-3">
            {/* Total Due */}
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Due</p>
              <p className="text-2xl font-bold text-primary">${total.toFixed(2)}</p>
            </div>

            {/* Amount Received Display */}
            <div className="text-center p-3 bg-white border-2 border-primary/20 rounded-lg">
              <p className="text-xs text-muted-foreground">Amount Received</p>
              <p className="text-2xl font-bold text-foreground">
                ${amountReceived || '0.00'}
              </p>
            </div>

            {/* Quick Amount Buttons */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Quick Amounts</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleExactAmount}
                  className="text-green-600 border-green-300 hover:bg-green-50 h-10"
                >
                  Exact
                </Button>
                {quickAmounts.map(amount => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => handleQuickAmount(amount)}
                    disabled={amount < total}
                    className={cn("h-10", amount < total && "opacity-50")}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Change Display */}
            <div className={cn(
              "text-center p-3 rounded-lg transition-colors",
              isValid ? "bg-green-50 border border-green-200" : "bg-secondary/30"
            )}>
              <p className="text-xs text-muted-foreground">Change Due</p>
              <p className={cn(
                "text-xl font-bold",
                isValid ? "text-green-600" : "text-muted-foreground"
              )}>
                ${Math.max(0, change).toFixed(2)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={handleClose} className="flex-1 h-10">
                Cancel
              </Button>
              <Button 
                variant="pizza" 
                onClick={handleConfirm}
                disabled={!isValid}
                className="flex-1 h-10"
              >
                <Calculator className="w-4 h-4 mr-1" />
                Complete
              </Button>
            </div>
          </div>

          {/* Right Side - Numeric Keypad */}
          <div className="w-48 flex flex-col gap-2">
            <p className="text-xs text-muted-foreground text-center">Keypad</p>
            <div className="grid grid-cols-3 gap-1.5 flex-1">
              {keypadButtons.map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  onClick={() => handleKeyPress(key)}
                  className={cn(
                    "h-12 text-lg font-semibold",
                    key === 'C' && "text-red-500 hover:bg-red-50",
                    key === '.' && "text-muted-foreground"
                  )}
                  style={{ backgroundColor: 'white' }}
                >
                  {key}
                </Button>
              ))}
              {/* Backspace button spanning full width */}
              <Button
                variant="outline"
                onClick={() => handleKeyPress('DEL')}
                className="col-span-3 h-12 text-orange-500 hover:bg-orange-50"
                style={{ backgroundColor: 'white' }}
              >
                <Delete className="w-5 h-5 mr-2" />
                Backspace
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { POSSession } from '@/hooks/usePOSSession';

interface POSEndDayModalProps {
  open: boolean;
  onClose: () => void;
  onEndDay: (enteredCash: number) => void;
  activeSession: POSSession | null;
  todayCashSales: number;
}

export const POSEndDayModal = ({
  open,
  onClose,
  onEndDay,
  activeSession,
  todayCashSales,
}: POSEndDayModalProps) => {
  const [enteredAmount, setEnteredAmount] = useState('');

  // Reset amount when modal opens
  useEffect(() => {
    if (open) {
      setEnteredAmount('');
    }
  }, [open]);

  const startCash = activeSession?.start_cash || 0;
  const expectedEndCash = startCash + todayCashSales;

  const handleEndDay = () => {
    const amount = parseFloat(enteredAmount) || 0;
    onEndDay(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '----';
    return format(new Date(dateString), 'MMM dd, yyyy h:mm a');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">End Your Day</DialogTitle>
          <DialogDescription className="sr-only">
            End of day cash reconciliation
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4">
          {/* Session Info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">Start Time:</span>
              <span>{formatDate(activeSession?.start_time)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">End Time:</span>
              <span>----</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Start Day - Cash In Till:</span>
              <span className="font-semibold">$ {startCash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">End Day - Cash In Till:</span>
              <span className="font-semibold" style={{ color: '#1a8ccc' }}>$ {expectedEndCash.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Today's Summary */}
          <div className="space-y-2">
            <h4 className="font-medium">Today's</h4>
            <div className="flex justify-between text-sm">
              <span>Cash Sales Total:</span>
              <span className="font-semibold text-green-600">$ {todayCashSales.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Cash Count Input */}
          <div className="space-y-2">
            <Label htmlFor="cashAmount" className="font-medium">
              End Day - Cash In Till
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="cashAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount"
                value={enteredAmount}
                onChange={(e) => setEnteredAmount(e.target.value)}
                className="pl-7"
              />
            </div>
            {enteredAmount && parseFloat(enteredAmount) !== expectedEndCash && (
              <p className="text-xs text-amber-600">
                Difference: $ {(parseFloat(enteredAmount) - expectedEndCash).toFixed(2)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="bg-orange-600 text-white hover:bg-orange-700">
            Close
          </Button>
          <Button onClick={handleEndDay} className="bg-orange-500 text-white hover:bg-orange-600">
            End Day
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

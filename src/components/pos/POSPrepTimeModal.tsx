import { useState } from 'react';
import { Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface POSPrepTimeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (prepTime: number) => void;
  orderNumber: string;
}

const PREP_TIMES = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

export const POSPrepTimeModal = ({ 
  open, 
  onClose, 
  onConfirm,
  orderNumber 
}: POSPrepTimeModalProps) => {
  const [selectedTime, setSelectedTime] = useState<number>(20);

  const handleConfirm = () => {
    onConfirm(selectedTime);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Set Preparation Time
          </DialogTitle>
          <DialogDescription>
            Select estimated time for order {orderNumber}. Customer will receive SMS notification.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2 py-4">
          {PREP_TIMES.map((time) => (
            <button
              key={time}
              onClick={() => setSelectedTime(time)}
              className={cn(
                "py-3 px-4 rounded-lg text-center font-medium transition-all border-2",
                "outline-none focus:outline-none focus-visible:outline-none",
                "[&:focus]:ring-0 [&:focus]:border-inherit",
                selectedTime === time
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/50 text-foreground border-border hover:border-primary/50"
              )}
            >
              {time} min
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            variant="pizza" 
            onClick={handleConfirm} 
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-2" />
            Start Preparing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

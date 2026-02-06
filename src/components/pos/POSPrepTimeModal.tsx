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
    // Don't call onClose here - the parent will handle closing
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md border-0"
        style={{ backgroundColor: 'hsl(220, 25%, 18%)', color: '#e2e8f0' }}
      >
        {/* Override the white inner wrapper from DialogContent */}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'hsl(220, 25%, 18%)', zIndex: 0, borderRadius: 'inherit' }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: '#f1f5f9' }}>
              <Clock className="w-5 h-5" style={{ color: '#38bdf8' }} />
              Set Preparation Time
            </DialogTitle>
            <DialogDescription style={{ color: '#94a3b8' }}>
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
                  "[&:focus]:ring-0 [&:focus]:border-inherit"
                )}
                style={
                  selectedTime === time
                    ? { backgroundColor: '#0ea5e9', color: '#ffffff', borderColor: '#0ea5e9' }
                    : { backgroundColor: 'hsl(220, 26%, 22%)', color: '#e2e8f0', borderColor: 'hsl(220, 20%, 30%)' }
                }
              >
                {time} min
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="flex-1"
              style={{ backgroundColor: 'transparent', color: '#e2e8f0', borderColor: 'hsl(220, 20%, 30%)' }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              className="flex-1"
              style={{ backgroundColor: '#0ea5e9', color: '#ffffff' }}
            >
              <Send className="w-4 h-4 mr-2" />
              Start Preparing
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

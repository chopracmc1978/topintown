import { X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Order } from '@/types/menu';
import { KitchenTicket } from './KitchenTicket';
import { usePrinters } from '@/hooks/usePrinters';

interface ReceiptPreviewModalProps {
  order: Order;
  locationId: string;
  onClose: () => void;
}

export const ReceiptPreviewModal = ({ order, locationId, onClose }: ReceiptPreviewModalProps) => {
  const { printers } = usePrinters(locationId);
  
  const hasPrinters = printers.length > 0;
  const kitchenPrinters = printers.filter(p => p.is_active && (p.station === 'Kitchen' || p.station === 'Prep' || p.station === 'Expo'));

  const handlePrint = () => {
    if (!hasPrinters) {
      alert('No printers configured. Go to Settings to add printers.');
      return;
    }
    
    // TODO: Implement actual printing via IP printer
    console.log('Printing to:', kitchenPrinters);
    alert(`Would print kitchen ticket to configured printers`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-serif text-lg font-bold">Print Preview</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          <div className="shadow-lg">
            <KitchenTicket order={order} />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            {hasPrinters ? 'Print' : 'No Printers'}
          </Button>
        </div>

        {/* Printer Status */}
        {!hasPrinters && (
          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground text-center">
              No printers configured. Add printers in Settings to enable printing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

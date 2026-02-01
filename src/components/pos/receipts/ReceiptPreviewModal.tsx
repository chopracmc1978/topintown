import { useState } from 'react';
import { X, Printer, FileText, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Order } from '@/types/menu';
import { KitchenTicket } from './KitchenTicket';
import { CustomerReceipt } from './CustomerReceipt';
import { LOCATIONS } from '@/contexts/LocationContext';
import { usePrinters } from '@/hooks/usePrinters';

interface ReceiptPreviewModalProps {
  order: Order;
  locationId: string;
  onClose: () => void;
}

export const ReceiptPreviewModal = ({ order, locationId, onClose }: ReceiptPreviewModalProps) => {
  const [activeTab, setActiveTab] = useState<'kitchen' | 'customer'>('kitchen');
  const { printers } = usePrinters(locationId);
  
  const location = LOCATIONS.find(l => l.id === locationId);
  const hasPrinters = printers.length > 0;
  const kitchenPrinters = printers.filter(p => p.is_active && (p.station === 'Kitchen' || p.station === 'Prep' || p.station === 'Expo'));
  const counterPrinters = printers.filter(p => p.is_active && (p.station === 'Counter' || p.station === 'Bar'));

  const handlePrint = () => {
    if (!hasPrinters) {
      // No printers configured - just show a message
      alert('No printers configured. Go to Settings to add printers.');
      return;
    }
    
    // TODO: Implement actual printing via IP printer
    // This would send ESC/POS commands to the thermal printer
    console.log('Printing to:', activeTab === 'kitchen' ? kitchenPrinters : counterPrinters);
    alert(`Would print ${activeTab} receipt to configured printers`);
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'kitchen' | 'customer')} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border px-4">
            <TabsList className="h-12 bg-transparent">
              <TabsTrigger 
                value="kitchen" 
                className="data-[state=active]:bg-primary/10 gap-2"
              >
                <UtensilsCrossed className="w-4 h-4" />
                Kitchen Ticket
              </TabsTrigger>
              <TabsTrigger 
                value="customer" 
                className="data-[state=active]:bg-primary/10 gap-2"
              >
                <FileText className="w-4 h-4" />
                Customer Receipt
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto p-4 bg-gray-100">
            <TabsContent value="kitchen" className="mt-0">
              <div className="shadow-lg">
                <KitchenTicket order={order} />
              </div>
            </TabsContent>

            <TabsContent value="customer" className="mt-0">
              <div className="shadow-lg">
                <CustomerReceipt 
                  order={order}
                  locationName={location?.name}
                  locationAddress={location?.address}
                  locationPhone={location?.phone}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>

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

import { usePrinters } from './usePrinters';
import { Order } from '@/types/menu';
import { toast } from 'sonner';

export const usePrintReceipts = (locationId: string) => {
  const { printers } = usePrinters(locationId);
  
  const kitchenPrinters = printers.filter(p => p.is_active && (p.station === 'Kitchen' || p.station === 'Prep' || p.station === 'Expo'));
  const counterPrinters = printers.filter(p => p.is_active && (p.station === 'Counter' || p.station === 'Bar'));
  const hasPrinters = printers.length > 0;

  const printKitchenTicket = async (order: Order) => {
    if (kitchenPrinters.length === 0) {
      console.log('No kitchen printers configured');
      return false;
    }
    
    // TODO: Implement actual ESC/POS printing to thermal printer
    console.log('Printing kitchen ticket to:', kitchenPrinters.map(p => p.name));
    return true;
  };

  const printCustomerReceipt = async (order: Order) => {
    if (counterPrinters.length === 0) {
      console.log('No counter printers configured');
      return false;
    }
    
    // TODO: Implement actual ESC/POS printing to thermal printer
    console.log('Printing customer receipt to:', counterPrinters.map(p => p.name));
    return true;
  };

  const printBothReceipts = async (order: Order) => {
    if (!hasPrinters) {
      toast.error('No printers configured. Go to Settings to add printers.');
      return false;
    }

    const results = await Promise.all([
      printKitchenTicket(order),
      printCustomerReceipt(order),
    ]);

    const kitchenPrinted = results[0];
    const customerPrinted = results[1];

    if (kitchenPrinted && customerPrinted) {
      toast.success('Sent to printer: Kitchen Ticket + Customer Receipt');
    } else if (kitchenPrinted) {
      toast.success('Sent to printer: Kitchen Ticket');
      toast.warning('No counter printer configured for customer receipt');
    } else if (customerPrinted) {
      toast.success('Sent to printer: Customer Receipt');
      toast.warning('No kitchen printer configured for kitchen ticket');
    } else {
      toast.error('No printers available for this order');
    }

    return kitchenPrinted || customerPrinted;
  };

  return {
    hasPrinters,
    kitchenPrinters,
    counterPrinters,
    printKitchenTicket,
    printCustomerReceipt,
    printBothReceipts,
  };
};

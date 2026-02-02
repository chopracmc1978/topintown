import { usePrinters, Printer } from './usePrinters';
import { Order } from '@/types/menu';
import { toast } from 'sonner';
import { buildKitchenTicket, buildCustomerReceipt } from '@/utils/escpos';
import { LOCATIONS } from '@/contexts/LocationContext';
import { getPrintServerUrl, savePrintServerUrl } from '@/utils/printServer';

export const usePrintReceipts = (locationId: string) => {
  const { printers } = usePrinters(locationId);
  const location = LOCATIONS.find(l => l.id === locationId);
  
  const kitchenPrinters = printers.filter(p => p.is_active && (p.station === 'Kitchen' || p.station === 'Prep' || p.station === 'Expo'));
  const counterPrinters = printers.filter(p => p.is_active && (p.station === 'Counter' || p.station === 'Bar'));
  const hasPrinters = printers.length > 0;

  const sendToPrinter = async (printer: Printer, data: string): Promise<boolean> => {
    try {
      console.log(`Sending print job to ${printer.name} (${printer.ip_address})`);

      const printServerUrl = getPrintServerUrl();
      
      // Try to send to local print server
      const response = await fetch(`${printServerUrl}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          printer_ip: printer.ip_address,
          port: 9100,
          data: data,
          auto_cut: printer.auto_cut,
        }),
      });

      if (!response.ok) {
        throw new Error(`Print server error: ${response.statusText}`);
      }

      console.log(`Print job sent successfully to ${printer.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to print to ${printer.name}:`, error);
      
      // Check if it's a network error (print server not running)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('Print server not reachable. Make sure the print server is running.');
      }
      
      return false;
    }
  };

  const printKitchenTicket = async (order: Order): Promise<boolean> => {
    if (kitchenPrinters.length === 0) {
      console.log('No kitchen printers configured');
      return false;
    }
    
    const ticketData = buildKitchenTicket({
      id: order.id,
      createdAt: order.createdAt,
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      pickupTime: (order as any).pickupTime,
      customerName: order.customerName,
      notes: order.notes,
      items: order.items,
    });

    let anySuccess = false;
    for (const printer of kitchenPrinters) {
      const success = await sendToPrinter(printer, ticketData);
      if (success) anySuccess = true;
    }
    
    return anySuccess;
  };

  const printCustomerReceipt = async (order: Order): Promise<boolean> => {
    // If no counter printers, use kitchen printers for customer receipt too
    const targetPrinters = counterPrinters.length > 0 ? counterPrinters : kitchenPrinters;
    
    if (targetPrinters.length === 0) {
      console.log('No printers configured for customer receipt');
      return false;
    }
    
    const receiptData = buildCustomerReceipt({
      id: order.id,
      createdAt: order.createdAt,
      orderType: order.orderType,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      items: order.items,
    }, {
      name: location?.name,
      address: location?.address,
      phone: location?.phone,
    });

    let anySuccess = false;
    for (const printer of targetPrinters) {
      const success = await sendToPrinter(printer, receiptData);
      if (success) anySuccess = true;
    }
    
    return anySuccess;
  };

  const printBothReceipts = async (order: Order): Promise<boolean> => {
    if (!hasPrinters) {
      toast.error('No printers configured. Go to Settings to add printers.');
      return false;
    }

    // Show loading toast
    const loadingToast = toast.loading('Sending to printer...');

    try {
      const [kitchenResult, customerResult] = await Promise.all([
        printKitchenTicket(order),
        printCustomerReceipt(order),
      ]);

      toast.dismiss(loadingToast);

      if (kitchenResult && customerResult) {
        toast.success('Printed: Kitchen Ticket + Customer Receipt');
        return true;
      } else if (kitchenResult) {
        toast.success('Printed: Kitchen Ticket');
        return true;
      } else if (customerResult) {
        toast.success('Printed: Customer Receipt');
        return true;
      } else {
        toast.error('Print failed. Check if print server is running.');
        return false;
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Print failed. Check print server connection.');
      console.error('Print error:', error);
      return false;
    }
  };

  const setPrintServerUrl = (url: string) => {
    savePrintServerUrl(url);
  };

  return {
    hasPrinters,
    kitchenPrinters,
    counterPrinters,
    printKitchenTicket,
    printCustomerReceipt,
    printBothReceipts,
    setPrintServerUrl,
    printServerUrl: getPrintServerUrl(),
  };
};

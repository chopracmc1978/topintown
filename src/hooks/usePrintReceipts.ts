import { usePrinters, Printer } from './usePrinters';
import { Order } from '@/types/menu';
import { toast } from 'sonner';
import { buildKitchenTicket, buildCustomerReceipt } from '@/utils/escpos';
import { LOCATIONS } from '@/contexts/LocationContext';
import { sendToPrinterDirect, isNativePlatform } from '@/utils/directPrint';

export const usePrintReceipts = (locationId: string) => {
  const { printers } = usePrinters(locationId);
  const location = LOCATIONS.find(l => l.id === locationId);
  
  const kitchenPrinters = printers.filter(p => p.is_active && (p.station === 'Kitchen' || p.station === 'Prep' || p.station === 'Expo'));
  const counterPrinters = printers.filter(p => p.is_active && (p.station === 'Counter' || p.station === 'Bar'));
  const hasPrinters = printers.length > 0;

  const sendToPrinter = async (printer: Printer, data: string): Promise<boolean> => {
    try {
      console.log(`Sending print job to ${printer.name} (${printer.ip_address}:${printer.port})`);

      // Use direct TCP printing for native apps
      const result = await sendToPrinterDirect(
        { ip: printer.ip_address, port: printer.port, name: printer.name },
        data
      );

      if (result.success) {
        console.log(`Print job sent successfully to ${printer.name}`);
        return true;
      } else {
        console.error(`Print failed: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error(`Failed to print to ${printer.name}:`, error);
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
      items: order.items.map(item => ({
        quantity: item.quantity,
        name: item.name,
        totalPrice: item.totalPrice,
        pizzaCustomization: item.pizzaCustomization,
        wingsCustomization: item.wingsCustomization,
        comboCustomization: (item as any).comboCustomization,
        selectedSize: item.selectedSize,
      })),
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

    // Check if we're in native environment
    if (!isNativePlatform()) {
      toast.error('Printing only available in the native app');
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
        toast.error('Print failed. Check printer connection.');
        return false;
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Print failed. Check printer connection.');
      console.error('Print error:', error);
      return false;
    }
  };

  return {
    hasPrinters,
    kitchenPrinters,
    counterPrinters,
    printKitchenTicket,
    printCustomerReceipt,
    printBothReceipts,
    isNativePlatform: isNativePlatform(),
  };
};

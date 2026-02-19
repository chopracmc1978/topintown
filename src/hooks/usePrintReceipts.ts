import { usePrinters, Printer } from './usePrinters';
import { Order } from '@/types/menu';
import { toast } from 'sonner';
import { buildKitchenTicket, buildCustomerReceipt } from '@/utils/escpos';
import { LOCATIONS } from '@/contexts/LocationContext';
import { sendToPrinterDirect, isNativePlatform, openCashDrawer } from '@/utils/directPrint';
import { supabase } from '@/integrations/supabase/client';

type SonnerToastOptions = Parameters<typeof toast.info>[1];

const isPosRoute = () => {
  try {
    return typeof window !== 'undefined' && window.location.pathname.startsWith('/pos');
  } catch {
    return false;
  }
};

// POS requirement: no UI notifications (toasts). Keep silent in /pos.
const notify = {
  info: (message: string, options?: SonnerToastOptions) => {
    if (!isPosRoute()) toast.info(message, options);
  },
  success: (message: string, options?: SonnerToastOptions) => {
    if (!isPosRoute()) toast.success(message, options);
  },
  error: (message: string, options?: SonnerToastOptions) => {
    if (!isPosRoute()) toast.error(message, options);
  },
};

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
    
    const ticketPayload = {
      id: order.id,
      createdAt: order.createdAt,
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      pickupTime: (order as any).pickupTime,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      notes: order.notes,
      items: order.items,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      paymentStatus: order.paymentStatus,
    };

    let anySuccess = false;
    for (const printer of kitchenPrinters) {
      // Build per-printer so 80mm printers use full width (48 cols) and 58mm use 32 cols.
      const ticketData = buildKitchenTicket(ticketPayload, { paperWidthMm: printer.paper_width });
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
    
    const receiptPayload = {
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
    };
    
    const locationInfo = {
      name: location?.name,
      address: location?.address,
      phone: location?.phone,
    };
    
    // Fetch reward points for customer
    let rewardPoints: { lastBalance: number; earned: number; used: number; balance: number } | undefined;
    const cleanPhone = order.customerPhone?.replace(/\D/g, '');
    if (cleanPhone) {
      const dbOrderId = (order as any).dbId || order.id;
      const [rewardsResult, earnedResult, redeemedResult] = await Promise.all([
        supabase.from('customer_rewards').select('points, lifetime_points').eq('phone', cleanPhone).maybeSingle(),
        supabase.from('rewards_history').select('points_change').eq('phone', cleanPhone).eq('order_id', dbOrderId).eq('transaction_type', 'earned').maybeSingle(),
        supabase.from('rewards_history').select('points_change').eq('phone', cleanPhone).eq('order_id', dbOrderId).eq('transaction_type', 'redeemed').maybeSingle(),
      ]);
      if (rewardsResult.data) {
        const currentBalance = rewardsResult.data.points;
        const earned = earnedResult.data?.points_change || 0;
        const used = Math.abs(redeemedResult.data?.points_change || 0);
        const lastBalance = currentBalance - earned + used;
        rewardPoints = {
          lastBalance,
          earned,
          used,
          balance: currentBalance,
        };
      }
    }

    let anySuccess = false;
    for (const printer of targetPrinters) {
      // Build per-printer so 80mm printers use full width (48 cols) and 58mm use 32 cols.
      const receiptData = buildCustomerReceipt(receiptPayload, locationInfo, { paperWidthMm: printer.paper_width }, rewardPoints);
      const success = await sendToPrinter(printer, receiptData);
      if (success) anySuccess = true;
    }
    
    return anySuccess;
  };

  const printBothReceipts = async (order: Order): Promise<boolean> => {
    if (!hasPrinters) {
      notify.error('No printers configured. Go to Settings to add printers.');
      return false;
    }

    // Check if we're in native environment
    if (!isNativePlatform()) {
      notify.error('Printing only available in the native app');
      return false;
    }

    // Use info toast instead of loading toast to avoid UI blocking
    notify.info('Sending to printer...', { duration: 1500 });

    try {
      const [kitchenResult, customerResult] = await Promise.all([
        printKitchenTicket(order),
        printCustomerReceipt(order),
      ]);

      if (kitchenResult && customerResult) {
        notify.success('Printed: Kitchen Ticket + Customer Receipt');
        return true;
      } else if (kitchenResult) {
        notify.success('Printed: Kitchen Ticket');
        return true;
      } else if (customerResult) {
        notify.success('Printed: Customer Receipt');
        return true;
      } else {
        notify.error('Print failed. Check printer connection.');
        return false;
      }
    } catch (error) {
      notify.error('Print failed. Check printer connection.');
      console.error('Print error:', error);
      return false;
    }
  };

  const openTill = async (): Promise<boolean> => {
    // Use counter printer first, fallback to any active printer
    const targetPrinter = counterPrinters[0] || printers.find(p => p.is_active);
    
    if (!targetPrinter) {
      notify.error('No printer configured for cash drawer');
      return false;
    }

    if (!isNativePlatform()) {
      notify.error('Till open only available in native app');
      return false;
    }

    try {
      const result = await openCashDrawer({
        ip: targetPrinter.ip_address,
        port: targetPrinter.port,
        name: targetPrinter.name,
      });

      if (result.success) {
        notify.success('Till opened');
        return true;
      } else {
        notify.error(`Failed to open till: ${result.error || 'Unknown error'}`);
        return false;
      }
    } catch (error) {
      notify.error('Failed to open till');
      console.error('Till open error:', error);
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
    openTill,
    isNativePlatform: isNativePlatform(),
  };
};

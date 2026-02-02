import { useRef } from 'react';
import { Download, X, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CustomerOrder } from '@/hooks/useCustomerOrders';
import { LOCATIONS } from '@/contexts/LocationContext';

interface OrderReceiptModalProps {
  order: CustomerOrder | null;
  open: boolean;
  onClose: () => void;
}

export const OrderReceiptModal = ({ order, open, onClose }: OrderReceiptModalProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const location = LOCATIONS.find(l => l.id === order.locationId);
  const locationName = location?.name || 'Top In Town Pizza';
  const locationAddress = location?.address || '';
  const locationPhone = location?.phone || '';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${order.orderNumber}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              padding: 20px;
              max-width: 300px;
              margin: 0 auto;
            }
            .receipt { background: white; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .text-lg { font-size: 18px; }
            .text-sm { font-size: 12px; }
            .text-xs { font-size: 10px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-3 { margin-bottom: 12px; }
            .my-2 { margin: 8px 0; }
            .border-dashed { border-top: 1px dashed #000; }
            .flex { display: flex; justify-content: space-between; }
            .ml-3 { margin-left: 12px; }
            .text-gray { color: #666; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const subtotal = order.subtotal || order.total * 0.95;
  const tax = order.tax || order.total * 0.05;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Receipt - {order.orderNumber}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <Button onClick={handlePrint} variant="outline" className="flex-1">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        {/* Receipt Preview */}
        <div ref={receiptRef} className="receipt bg-white text-black font-mono text-sm p-4 border rounded-lg">
          {/* Header */}
          <div className="text-center mb-3">
            <p className="text-lg font-bold">{locationName}</p>
            {locationAddress && <p className="text-xs">{locationAddress}</p>}
            {locationPhone && <p className="text-xs">{locationPhone}</p>}
          </div>
          
          <Separator className="border-dashed border-black my-2" />
          
          {/* Order Info */}
          <div className="space-y-1 text-xs mb-3">
            <div className="flex justify-between">
              <span>Order #:</span>
              <span className="font-bold">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span>{formatTime(order.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="uppercase">{order.orderType}</span>
            </div>
            {order.pickupTime && (
              <div className="flex justify-between font-bold">
                <span>Pickup At:</span>
                <span>
                  {new Date(order.pickupTime).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              </div>
            )}
            {order.customerName && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{order.customerName}</span>
              </div>
            )}
          </div>
          
          <Separator className="border-dashed border-black my-2" />
          
          {/* Items */}
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between">
                  <div className="flex-1">
                    <span>{item.quantity}× {item.name}</span>
                    {item.customizations?.size && item.customizations?.crust && (
                      <p className="text-xs text-gray-600 ml-3">
                        {item.customizations.size.name}, {item.customizations.crust.name}
                      </p>
                    )}
                    {item.customizations?.flavor && (
                      <p className="text-xs text-gray-600 ml-3">
                        {item.customizations.flavor}
                      </p>
                    )}
                  </div>
                  <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          
          <Separator className="border-dashed border-black my-3" />
          
          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>GST (5%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <Separator className="border-dashed border-black my-1" />
            <div className="flex justify-between font-bold text-base">
              <span>TOTAL:</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </div>
          
          <Separator className="border-dashed border-black my-3" />
          
          {/* Payment Info */}
          <div className="text-center text-xs space-y-1">
            <div className="flex justify-between">
              <span>Payment:</span>
              <span className="uppercase font-medium">
                {order.paymentStatus === 'paid' ? `${order.paymentMethod || 'CARD'} - PAID` : 'UNPAID'}
              </span>
            </div>
          </div>
          
          <Separator className="border-dashed border-black my-3" />
          
          {/* Footer */}
          <div className="text-center text-xs space-y-1">
            <p>Thank you for your order!</p>
            <p className="text-gray-500">Please keep this receipt for your records</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

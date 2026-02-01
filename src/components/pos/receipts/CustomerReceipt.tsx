import { Order } from '@/types/menu';
import { Separator } from '@/components/ui/separator';

interface CustomerReceiptProps {
  order: Order;
  locationName?: string;
  locationAddress?: string;
  locationPhone?: string;
}

export const CustomerReceipt = ({ 
  order, 
  locationName = 'Top In Town Pizza',
  locationAddress = '',
  locationPhone = ''
}: CustomerReceiptProps) => {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const subtotal = order.subtotal || order.total * 0.95;
  const tax = order.tax || order.total * 0.05;

  return (
    <div className="bg-white text-black font-mono text-sm w-[280px] p-4 mx-auto">
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
          <span className="font-bold">{order.id}</span>
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
        {(order as any).pickupTime && (
          <div className="flex justify-between font-bold">
            <span>Pickup At:</span>
            <span>
              {new Date((order as any).pickupTime).toLocaleString('en-US', {
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
        {order.items.map((item, index) => (
          <div key={`${item.id}-${index}`}>
            <div className="flex justify-between">
              <div className="flex-1">
                <span>{item.quantity}× {item.name}</span>
                {item.pizzaCustomization && (
                  <p className="text-xs text-gray-600 ml-3">
                    {item.pizzaCustomization.size.name}, {item.pizzaCustomization.crust.name}
                  </p>
                )}
                {item.wingsCustomization && (
                  <p className="text-xs text-gray-600 ml-3">
                    {item.wingsCustomization.flavor}
                  </p>
                )}
                {item.selectedSize && !item.pizzaCustomization && (
                  <p className="text-xs text-gray-600 ml-3">{item.selectedSize}</p>
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
  );
};

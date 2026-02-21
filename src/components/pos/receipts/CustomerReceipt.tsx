import { Order } from '@/types/menu';
import { Separator } from '@/components/ui/separator';

export interface ReceiptRewardPoints {
  lastBalance: number;
  earned: number;
  used: number;
  balance: number;
}

interface CustomerReceiptProps {
  order: Order;
  locationName?: string;
  locationAddress?: string;
  locationPhone?: string;
  rewardPoints?: ReceiptRewardPoints;
}

export const CustomerReceipt = ({ 
  order, 
  locationName = 'Top In Town Pizza',
  locationAddress = '',
  locationPhone = '',
  rewardPoints,
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
        {locationAddress && <p className="text-xs">{locationAddress.replace(/,?\s*AB\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d/i, '').trim().replace(/,\s*$/, '')}</p>}
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
        {order.customerPhone && (
          <div className="flex justify-between">
            <span>Phone:</span>
            <span>{order.customerPhone}</span>
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
        {order.items.map((item, index) => {
          const comboCustomization = (item as any).comboCustomization;
          const hasCombo = comboCustomization?.selections?.length > 0;
          
          return (
            <div key={`${item.id}-${index}`}>
              <div className="flex justify-between">
                <div className="flex-1">
                  <span>{item.quantity}× {item.name}</span>
                </div>
                <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
              </div>
              
              {/* Standalone Pizza details */}
              {item.pizzaCustomization && !hasCombo && (
                <div className="text-xs text-gray-600 ml-3">
                  <p>{typeof item.pizzaCustomization.size === 'object' ? item.pizzaCustomization.size?.name : item.pizzaCustomization.size}, {typeof item.pizzaCustomization.crust === 'object' ? item.pizzaCustomization.crust?.name : item.pizzaCustomization.crust}</p>
                  {item.pizzaCustomization.sauceName && item.pizzaCustomization.sauceName.toLowerCase() !== 'no sauce' && (
                    <p>Sauce: {item.pizzaCustomization.sauceQuantity && item.pizzaCustomization.sauceQuantity !== 'normal' ? `${item.pizzaCustomization.sauceQuantity} ` : ''}{item.pizzaCustomization.sauceName}</p>
                  )}
                  {item.pizzaCustomization.sauceName?.toLowerCase() === 'no sauce' && (
                    <p>No Sauce</p>
                  )}
                  {item.pizzaCustomization.extraToppings?.length > 0 && (
                    <p>+{item.pizzaCustomization.extraToppings.map((t: any) => t.name).join(', ')}</p>
                  )}
                  {item.pizzaCustomization.defaultToppings?.filter((t: any) => t.quantity === 'none').length > 0 && (
                    <p>NO: {item.pizzaCustomization.defaultToppings.filter((t: any) => t.quantity === 'none').map((t: any) => t.name).join(', ')}</p>
                  )}
                </div>
              )}
              
              {/* Standalone Wings details */}
              {item.wingsCustomization && !hasCombo && (
                <p className="text-xs text-gray-600 ml-3">
                  {item.wingsCustomization.flavor}
                </p>
              )}
              
              {/* Non-pizza/combo size */}
              {item.selectedSize && !item.pizzaCustomization && !hasCombo && (
                <p className="text-xs text-gray-600 ml-3">{item.selectedSize}</p>
              )}
              
              {/* Combo selections with full details */}
              {hasCombo && (
                <div className="ml-3 mt-1">
                  {comboCustomization.selections.map((selection: any, selIdx: number) => (
                    <div key={selIdx} className="text-xs text-gray-600">
                      <span>- {selection.itemName}{selection.flavor ? ` (${selection.flavor})` : ''}</span>
                      {selection.pizzaCustomization && (
                        <div className="ml-3">
                          {selection.pizzaCustomization.size?.name && (
                            <p>{selection.pizzaCustomization.size.name}, {selection.pizzaCustomization.crust?.name || 'Regular'}</p>
                          )}
                          {selection.pizzaCustomization.extraToppings?.length > 0 && (
                            <p>+{selection.pizzaCustomization.extraToppings.map((t: any) => t.name).join(', ')}</p>
                          )}
                          {selection.pizzaCustomization.defaultToppings?.filter((t: any) => t.quantity === 'none').length > 0 && (
                            <p>NO: {selection.pizzaCustomization.defaultToppings.filter((t: any) => t.quantity === 'none').map((t: any) => t.name).join(', ')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
      
      {/* Reward Points */}
      {rewardPoints && (
        <>
          <Separator className="border-dashed border-black my-3" />
          <div className="text-center text-xs space-y-0.5">
            <p className="font-bold text-sm">🎁 Reward Points</p>
            <div className="flex justify-between">
              <span>Last Balance:</span>
              <span className="font-medium">{rewardPoints.lastBalance} pts</span>
            </div>
            <div className="flex justify-between" style={{ color: '#2e7d32' }}>
              <span>Add:</span>
              <span className="font-medium">+{rewardPoints.earned} pts</span>
            </div>
            {rewardPoints.used > 0 && (
              <div className="flex justify-between" style={{ color: '#d32f2f' }}>
                <span>Used:</span>
                <span className="font-medium">-{rewardPoints.used} pts</span>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <span>Balance:</span>
              <span>{rewardPoints.balance} pts</span>
            </div>
          </div>
        </>
      )}
      
      <Separator className="border-dashed border-black my-3" />
      
      {/* Footer */}
      <div className="text-center text-xs space-y-1">
        <p>Thank you for your order!</p>
        <p className="text-gray-500">Please keep this receipt for your records</p>
      </div>
    </div>
  );
};

import { Clock, Phone, MapPin, User, ChefHat, Package, Truck, Utensils, Printer, DollarSign, CreditCard, Pencil, CalendarDays, CheckCircle, Star } from 'lucide-react';
import { Order, OrderStatus, CartPizzaCustomization, CartComboCustomization, ComboSelectionItem } from '@/types/menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { LOCATIONS } from '@/contexts/LocationContext';

// Calculate amount paid from payment status
const getAmountPaid = (order: Order): number => {
  if (order.amountPaid !== undefined) return order.amountPaid;
  if (order.paymentStatus === 'paid') return order.total;
  return 0;
};

// Calculate balance due
const getBalanceDue = (order: Order): number => {
  const amountPaid = getAmountPaid(order);
  return Math.max(0, order.total - amountPaid);
};

interface POSOrderDetailProps {
  order: Order;
  locationId: string;
  onUpdateStatus: (status: OrderStatus) => void;
  onPayment: (method: 'cash' | 'card' | 'points') => void;
  onPrintTicket: () => void;
  onPrintReceipt: () => void;
  onEditOrder: () => void;
}

// Helper to format pizza customization details for kitchen
const formatPizzaDetails = (customization: CartPizzaCustomization): string[] => {
  const details: string[] = [];
  
  // Size and Crust (always show) - handle both object and string formats
  const sizeName = typeof customization.size === 'object' ? customization.size?.name : customization.size;
  const crustName = typeof customization.crust === 'object' ? customization.crust?.name : customization.crust;
  if (sizeName || crustName) {
    details.push(`${sizeName || 'Standard'}, ${crustName || 'Regular'}`);
  }
  
  // Cheese - only show if NOT regular/normal
  if (customization.cheeseType) {
    const cheeseChanges: string[] = [];
    // Check if cheese type is not mozzarella or if quantity is not normal
    if (customization.cheeseType.toLowerCase() === 'no cheese') {
      cheeseChanges.push('No Cheese');
    } else if (customization.cheeseType.toLowerCase() === 'dairy free') {
      cheeseChanges.push('Dairy Free Cheese');
    } else {
      // Mozzarella - check for quantity changes
      const hasQuantityChange = customization.cheeseSides?.some(
        cs => cs.quantity && cs.quantity !== 'regular' && cs.quantity !== 'normal'
      );
      if (hasQuantityChange) {
        const quantities = customization.cheeseSides
          ?.filter(cs => cs.quantity && cs.quantity !== 'regular' && cs.quantity !== 'normal')
          .map(cs => `${cs.side}: ${cs.quantity} cheese`)
          .join(', ');
        if (quantities) cheeseChanges.push(quantities);
      }
    }
    if (cheeseChanges.length > 0) {
      details.push(cheeseChanges.join(', '));
    }
  }
  
  // Sauce - show if changed from default or quantity is not regular
  if (customization.sauceName && customization.sauceName.toLowerCase() !== 'no sauce') {
    if (customization.sauceQuantity && customization.sauceQuantity !== 'normal') {
      details.push(`${customization.sauceQuantity} ${customization.sauceName}`);
    }
  } else if (customization.sauceName?.toLowerCase() === 'no sauce') {
    details.push('No Sauce');
  }
  
  // Spicy Level - only show if at least one side is not 'none'
  const leftSpicy = customization.spicyLevel?.left;
  const rightSpicy = customization.spicyLevel?.right;
  
  // Map internal values to display names
  const spicyDisplayName = (level: string) => {
    if (level === 'medium') return 'Medium Hot';
    if (level === 'hot') return 'Hot';
    if (level === 'none' || !level) return 'None';
    return level;
  };
  
  // Check if any side has spicy selected (not none)
  const hasLeftSpicy = leftSpicy && leftSpicy !== 'none';
  const hasRightSpicy = rightSpicy && rightSpicy !== 'none';
  
  if (hasLeftSpicy || hasRightSpicy) {
    // Both sides same and not none - show single level
    if (leftSpicy === rightSpicy) {
      details.push(`Spicy Level: ${spicyDisplayName(leftSpicy!)}`);
    } else {
      // Different sides - show both with Left/Right labels
      details.push(`Spicy Level: Left ${spicyDisplayName(leftSpicy || 'none')}, Right ${spicyDisplayName(rightSpicy || 'none')}`);
    }
  }
  
  // Free Toppings (Cilantro, Ginger, Garlic) - show if selected
  if (customization.freeToppings && customization.freeToppings.length > 0) {
    details.push(`Add: ${customization.freeToppings.join(', ')}`);
  }
  
  // Default Toppings - only show if removed (quantity = 'none') or changed
  const removedToppings = customization.defaultToppings?.filter(t => t.quantity === 'none');
  if (removedToppings && removedToppings.length > 0) {
    details.push(`NO: ${removedToppings.map(t => t.name).join(', ')}`);
  }
  
  // Default toppings with changed quantity (less or extra)
  const modifiedDefaults = customization.defaultToppings?.filter(
    t => t.quantity === 'less' || t.quantity === 'extra'
  );
  if (modifiedDefaults && modifiedDefaults.length > 0) {
    modifiedDefaults.forEach(t => {
      const sideInfo = t.side && t.side !== 'whole' ? ` (${t.side})` : '';
      details.push(`${t.quantity} ${t.name}${sideInfo}`);
    });
  }
  
  // Extra Toppings - always show if any
  if (customization.extraToppings && customization.extraToppings.length > 0) {
    const extraList = customization.extraToppings.map(t => {
      const sideInfo = t.side && t.side !== 'whole' ? ` (${t.side})` : '';
      return `+${t.name}${sideInfo}`;
    });
    details.push(extraList.join(', '));
  }
  
  // Notes
  if (customization.note) {
    details.push(`Note: ${customization.note}`);
  }
  
  return details;
};

// Helper to format combo selection details
const formatComboDetails = (comboCustomization: CartComboCustomization, formatPizzaDetailsFn: typeof formatPizzaDetails): React.ReactNode[] => {
  const details: React.ReactNode[] = [];
  
  comboCustomization.selections.forEach((selection, idx) => {
    const selectionDetails: string[] = [];
    
    if (selection.itemType === 'pizza' && selection.pizzaCustomization) {
      const pizzaDetails = formatPizzaDetailsFn(selection.pizzaCustomization);
      details.push(
        <div key={idx} className="mt-1 first:mt-0">
          <p className="font-medium text-foreground">• {selection.itemName}</p>
          <div className="ml-3 text-sm text-muted-foreground space-y-0.5">
            {pizzaDetails.map((detail, i) => (
              <p key={i} className={cn(
                detail.startsWith('NO:') && 'text-destructive font-medium',
                detail.startsWith('+') && 'text-green-600 font-medium',
                detail.startsWith('Note:') && 'italic'
              )}>{detail}</p>
            ))}
          </div>
        </div>
      );
    } else if (selection.itemType === 'wings' && selection.flavor) {
      details.push(
        <p key={idx} className="mt-1 first:mt-0">• {selection.itemName} - {selection.flavor}</p>
      );
    } else {
      details.push(
        <p key={idx} className="mt-1 first:mt-0">• {selection.itemName}</p>
      );
    }
  });
  
  return details;
};

const statusFlow: Record<OrderStatus, OrderStatus | null> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
  delivered: null,
  cancelled: null,
};

// Get button label based on status and whether it's an advance order
const getStatusButtonLabel = (status: OrderStatus, isAdvanceOrder: boolean): string => {
  if (status === 'pending') {
    return 'Accept';
  }
  const labels: Record<OrderStatus, string> = {
    pending: 'Accept',
    preparing: 'Mark Ready',
    ready: 'Complete Order',
    delivered: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status];
};

export const POSOrderDetail = ({ order, locationId, onUpdateStatus, onPayment, onPrintTicket, onPrintReceipt, onEditOrder }: POSOrderDetailProps) => {
  const nextStatus = statusFlow[order.status];
  const location = LOCATIONS.find(l => l.id === locationId);
  
  // Check if this is an advance order (has scheduled pickup time in the future)
  const isAdvanceOrder = order.pickupTime && new Date(order.pickupTime) > new Date();

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatPickupDateTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }) + ' at ' + d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const OrderTypeIcon = order.orderType === 'delivery' ? Truck : order.orderType === 'dine-in' ? Utensils : Package;

  return (
    <div className="h-full flex flex-col rounded-xl overflow-hidden" style={{ background: 'hsl(220, 25%, 18%)', border: '1px solid hsl(220, 20%, 28%)' }}>
      {/* Header */}
      <div className="p-4" style={{ background: 'hsl(220, 25%, 16%)', borderBottom: '1px solid hsl(220, 20%, 28%)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-bold text-white">{order.id}</span>
            <Badge variant="outline" className="capitalize text-gray-300 border-gray-600">
              {order.source || 'online'}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700/50"
              onClick={onPrintReceipt}
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Receipt
            </Button>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-sm px-3 py-1",
              order.status === 'pending' && "bg-yellow-900/40 text-yellow-300 border-yellow-600",
              order.status === 'preparing' && "bg-blue-900/40 text-blue-300 border-blue-600",
              order.status === 'ready' && "bg-green-900/40 text-green-300 border-green-600",
              order.status === 'delivered' && "bg-gray-800 text-gray-300 border-gray-600",
              order.status === 'cancelled' && "bg-red-900/40 text-red-300 border-red-600",
            )}
          >
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatTime(order.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <OrderTypeIcon className="w-4 h-4" />
            <span className="capitalize">{order.orderType}</span>
            {order.tableNumber && <span>(Table {order.tableNumber})</span>}
          </div>
        </div>
        
        {/* Advance Order Pickup Time */}
        {order.pickupTime && (
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-blue-300 bg-blue-900/30 px-3 py-1.5 rounded-lg w-fit">
            <CalendarDays className="w-4 h-4" />
            <span>Scheduled Pickup: {formatPickupDateTime(order.pickupTime)}</span>
          </div>
        )}
      </div>

      {/* Customer Info */}
      <div className="p-4" style={{ borderBottom: '1px solid hsl(220, 20%, 28%)' }}>
        <h3 className="font-semibold text-sm text-gray-400 mb-2">CUSTOMER</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-white">{order.customerName || 'Walk-in Customer'}</span>
          </div>
          {order.customerPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">{order.customerPhone}</span>
            </div>
          )}
          {order.orderType === 'delivery' && order.customerAddress && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">{order.customerAddress}</span>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="flex-1 overflow-auto p-4">
        <h3 className="font-semibold text-sm text-gray-400 mb-3">ORDER ITEMS</h3>
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={`${item.id}-${index}`} className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-400">{item.quantity}×</span>
                  <span className="font-medium text-white">{item.name}</span>
                </div>
                {item.selectedSize && !item.pizzaCustomization && (
                  <span className="text-sm text-gray-400 ml-6">{item.selectedSize}</span>
                )}
                {item.pizzaCustomization && (
                  <div className="text-sm text-gray-400 ml-6 space-y-0.5">
                    {formatPizzaDetails(item.pizzaCustomization).map((detail, idx) => (
                      <p key={idx} className={cn(
                        detail.startsWith('NO:') && 'text-red-400 font-medium',
                        detail.startsWith('+') && 'text-green-400 font-medium',
                        detail.startsWith('Note:') && 'italic'
                      )}>{detail}</p>
                    ))}
                  </div>
                )}
                {item.wingsCustomization && (
                  <p className="text-sm text-gray-400 ml-6">{item.wingsCustomization.flavor}</p>
                )}
                {item.comboCustomization && (
                  <div className="text-sm text-gray-400 ml-6 space-y-1">
                    {formatComboDetails(item.comboCustomization, formatPizzaDetails)}
                  </div>
                )}
              </div>
              <span className="font-medium text-white">${item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="mt-4 p-3 rounded-lg" style={{ background: 'hsl(45, 60%, 20%)', border: '1px solid hsl(45, 60%, 35%)' }}>
            <p className="text-sm font-medium text-yellow-300">Note:</p>
            <p className="text-sm text-yellow-200">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="p-4" style={{ borderTop: '1px solid hsl(220, 20%, 28%)', background: 'hsl(220, 22%, 18%)' }}>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Subtotal</span>
            <span className="text-white">${(order.subtotal || order.total * 0.92).toFixed(2)}</span>
          </div>
           {order.discount && order.discount > 0 && (
             <div className="flex justify-between text-green-400">
               <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
               <span>-${order.discount.toFixed(2)}</span>
             </div>
           )}
          <div className="flex justify-between">
            <span className="text-gray-400">GST (5%)</span>
            <span className="text-white">${(order.tax || order.total * 0.05).toFixed(2)}</span>
          </div>
          <Separator className="my-2" style={{ background: 'hsl(220, 20%, 30%)' }} />
          <div className="flex justify-between text-lg font-bold text-white">
            <span className="text-white">Total</span>
            <span className="text-blue-400">${order.total.toFixed(2)}</span>
          </div>
           {/* Show balance due if partially paid or paid but order was edited */}
           {order.paymentStatus === 'paid' && getBalanceDue(order) > 0 && (
             <>
               <Separator className="my-2" style={{ background: 'hsl(220, 20%, 30%)' }} />
               <div className="flex justify-between text-red-400 font-bold">
                 <span>Balance Due</span>
                 <span>${getBalanceDue(order).toFixed(2)}</span>
               </div>
             </>
           )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3" style={{ borderTop: '1px solid hsl(220, 20%, 28%)' }}>
        {/* Payment Actions */}
         {(order.paymentStatus !== 'paid' || getBalanceDue(order) > 0) && (
          <div className="grid grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              className="flex-1 text-green-400 border-green-600 hover:bg-green-900/30"
              onClick={() => onPayment('cash')}
            >
              <DollarSign className="w-4 h-4 mr-2" />
               {order.paymentStatus === 'paid' && getBalanceDue(order) > 0 
                 ? `Cash`
                 : 'Cash'
               }
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 text-blue-400 border-blue-600 hover:bg-blue-900/30"
              onClick={() => onPayment('card')}
            >
              <CreditCard className="w-4 h-4 mr-2" />
               {order.paymentStatus === 'paid' && getBalanceDue(order) > 0 
                 ? `Card`
                 : 'Card'
               }
            </Button>
            {order.customerPhone && (
              <Button 
                variant="outline" 
                className="flex-1 border-amber-600 hover:bg-amber-900/30"
                style={{ color: '#f59e0b' }}
                onClick={() => onPayment('points')}
              >
                <Star className="w-4 h-4 mr-2" />
                Points
              </Button>
            )}
          </div>
        )}

        {/* Status & Print Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onPrintTicket} className="text-gray-300 border-gray-600 hover:bg-gray-700/50">
            <Printer className="w-4 h-4 mr-2" />
            Kitchen
          </Button>
          
          <Button variant="outline" onClick={onEditOrder} className="text-gray-300 border-gray-600 hover:bg-gray-700/50">
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <Button
              variant="outline"
              className="text-red-400 border-red-600 hover:bg-red-900/30"
              onClick={() => onUpdateStatus('cancelled')}
            >
              Cancel
            </Button>
          )}
          
          {nextStatus && (
            <Button 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => onUpdateStatus(nextStatus)}
            >
              {order.status === 'pending' ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <ChefHat className="w-4 h-4 mr-2" />
              )}
              {getStatusButtonLabel(order.status, !!isAdvanceOrder)}
            </Button>
          )}
        </div>
      </div>

    </div>
  );
};

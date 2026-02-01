import { Clock, Phone, MapPin, User, ChefHat, Package, Truck, Utensils, Printer, DollarSign, CreditCard, Pencil } from 'lucide-react';
import { Order, OrderStatus, CartPizzaCustomization } from '@/types/menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface POSOrderDetailProps {
  order: Order;
  onUpdateStatus: (status: OrderStatus) => void;
  onPayment: (method: 'cash' | 'card') => void;
  onPrintTicket: () => void;
  onEditOrder: () => void;
}

// Helper to format pizza customization details for kitchen
const formatPizzaDetails = (customization: CartPizzaCustomization): string[] => {
  const details: string[] = [];
  
  // Size and Crust (always show)
  details.push(`${customization.size.name}, ${customization.crust.name}`);
  
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

const statusFlow: Record<OrderStatus, OrderStatus | null> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
  delivered: null,
  cancelled: null,
};

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Start Preparing',
  preparing: 'Mark Ready',
  ready: 'Complete Order',
  delivered: 'Completed',
  cancelled: 'Cancelled',
};

export const POSOrderDetail = ({ order, onUpdateStatus, onPayment, onPrintTicket, onEditOrder }: POSOrderDetailProps) => {
  const nextStatus = statusFlow[order.status];

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const OrderTypeIcon = order.orderType === 'delivery' ? Truck : order.orderType === 'dine-in' ? Utensils : Package;

  return (
    <div className="h-full flex flex-col bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-secondary/50 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-bold">{order.id}</span>
            <Badge variant="outline" className="capitalize">
              {order.source || 'online'}
            </Badge>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-sm px-3 py-1",
              order.status === 'pending' && "bg-yellow-100 text-yellow-800",
              order.status === 'preparing' && "bg-blue-100 text-blue-800",
              order.status === 'ready' && "bg-green-100 text-green-800",
              order.status === 'delivered' && "bg-gray-100 text-gray-800",
              order.status === 'cancelled' && "bg-red-100 text-red-800",
            )}
          >
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
      </div>

      {/* Customer Info */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm text-muted-foreground mb-2">CUSTOMER</h3>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{order.customerName || 'Walk-in Customer'}</span>
          </div>
          {order.customerPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{order.customerPhone}</span>
            </div>
          )}
          {order.orderType === 'delivery' && order.customerAddress && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{order.customerAddress}</span>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="flex-1 overflow-auto p-4">
        <h3 className="font-semibold text-sm text-muted-foreground mb-3">ORDER ITEMS</h3>
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={`${item.id}-${index}`} className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">{item.quantity}×</span>
                  <span className="font-medium">{item.name}</span>
                </div>
                {item.selectedSize && !item.pizzaCustomization && (
                  <span className="text-sm text-muted-foreground ml-6">{item.selectedSize}</span>
                )}
                {item.pizzaCustomization && (
                  <div className="text-sm text-muted-foreground ml-6 space-y-0.5">
                    {formatPizzaDetails(item.pizzaCustomization).map((detail, idx) => (
                      <p key={idx} className={cn(
                        detail.startsWith('NO:') && 'text-destructive font-medium',
                        detail.startsWith('+') && 'text-green-600 font-medium',
                        detail.startsWith('Note:') && 'italic'
                      )}>{detail}</p>
                    ))}
                  </div>
                )}
                {item.wingsCustomization && (
                  <p className="text-sm text-muted-foreground ml-6">{item.wingsCustomization.flavor}</p>
                )}
              </div>
              <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
        </div>

        {order.notes && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm font-medium text-yellow-800">Note:</p>
            <p className="text-sm text-yellow-700">{order.notes}</p>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="p-4 border-t border-border bg-secondary/30">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${(order.subtotal || order.total * 0.92).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>${(order.tax || order.total * 0.08).toFixed(2)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Payment Actions */}
        {order.paymentStatus !== 'paid' && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onPayment('cash')}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Cash
            </Button>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onPayment('card')}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Card
            </Button>
          </div>
        )}

        {/* Status & Print Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onPrintTicket}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          
          <Button variant="outline" onClick={onEditOrder}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <Button
              variant="outline"
              className="text-destructive border-destructive hover:bg-destructive/10"
              onClick={() => onUpdateStatus('cancelled')}
            >
              Cancel
            </Button>
          )}
          
          {nextStatus && (
            <Button 
              variant="pizza" 
              className="flex-1"
              onClick={() => onUpdateStatus(nextStatus)}
            >
              <ChefHat className="w-4 h-4 mr-2" />
              {statusLabels[order.status]}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

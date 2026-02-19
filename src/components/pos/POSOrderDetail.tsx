import { useState } from 'react';
import { Clock, Phone, MapPin, User, ChefHat, Package, Truck, Utensils, Printer, DollarSign, CreditCard, Pencil, CalendarDays, CheckCircle, Star, Tag, Check, X, Delete } from 'lucide-react';
import { Order, OrderStatus, CartPizzaCustomization, CartComboCustomization, ComboSelectionItem } from '@/types/menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { LOCATIONS } from '@/contexts/LocationContext';
import { useValidateCoupon } from '@/hooks/useCoupons';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  onStartPreparing?: () => void;
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
  if (status === 'preparing' && isAdvanceOrder) {
    return 'Start Preparing';
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

export const POSOrderDetail = ({ order, locationId, onUpdateStatus, onPayment, onPrintTicket, onPrintReceipt, onEditOrder, onStartPreparing }: POSOrderDetailProps) => {
  const nextStatus = statusFlow[order.status];
  const location = LOCATIONS.find(l => l.id === locationId);

  // Coupon & discount state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [showDiscountKeypad, setShowDiscountKeypad] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [manualDiscount, setManualDiscount] = useState('');
  const validateCouponMutation = useValidateCoupon();

  const couponDiscount = appliedCoupon?.discount || 0;
  const manualDiscountVal = parseFloat(manualDiscount) || 0;
  const newDiscounts = couponDiscount + manualDiscountVal;
  const hasNewDiscount = newDiscounts > 0;
  
  // Check if this is an advance order (has scheduled pickup time in the future)
  const hasFuturePickup = order.pickupTime && new Date(order.pickupTime) > new Date();
  // Only show as "advance/scheduled" when already accepted (preparing status)
  const isAdvanceOrder = hasFuturePickup && order.status === 'preparing';

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

  // Auto-save discount before payment
  const saveDiscountAndPay = async (method: 'cash' | 'card') => {
    const existingDiscount = order.discount || 0;
    const totalDiscount = existingDiscount + newDiscounts;
    const sub = order.subtotal || order.total * 0.952;
    const discountedSub = Math.max(0, sub - totalDiscount);
    const newTax = discountedSub * 0.05;
    const newTotal = discountedSub + newTax;

    const { error } = await supabase.from('orders').update({
      discount: totalDiscount,
      coupon_code: appliedCoupon?.code || order.couponCode || null,
      tax: newTax,
      total: newTotal,
    }).eq('order_number', order.id);

    if (error) {
      toast.error('Failed to save discount');
      return;
    }

    // Update local order object so payment modal gets the correct total
    order.discount = totalDiscount;
    order.tax = newTax;
    order.total = newTotal;

    setAppliedCoupon(null);
    setCouponCode('');
    setManualDiscount('');
    setDiscountInput('');

    toast.success(`Discount saved — new total $${newTotal.toFixed(2)}`);
    onPayment(method);
  };

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
            <button
              type="button"
              className="h-7 px-2 flex items-center rounded-md text-xs"
              style={{ background: 'hsl(220, 22%, 28%)', color: '#d1d5db', border: '1px solid hsl(220, 20%, 35%)' }}
              onClick={onPrintReceipt}
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Receipt
            </button>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-sm px-3 py-1",
              order.status === 'pending' && "pos-bg-yellow-900-40 text-yellow-300 border-yellow-600",
              order.status === 'preparing' && isAdvanceOrder && "pos-bg-purple-900-40 text-purple-300 border-purple-600",
              order.status === 'preparing' && !isAdvanceOrder && "pos-bg-blue-900-40 text-blue-300 border-blue-600",
              order.status === 'ready' && "pos-bg-green-900-40 text-green-300 border-green-600",
              order.status === 'delivered' && "bg-gray-800 text-gray-300 border-gray-600",
              order.status === 'cancelled' && "pos-bg-red-900-40 text-red-300 border-red-600",
            )}
          >
            {isAdvanceOrder ? 'Scheduled' : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
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
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-blue-300 pos-bg-blue-900-30 px-3 py-1.5 rounded-lg w-fit">
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

      {/* Coupon & Discount - single line */}
      {(order.paymentStatus !== 'paid' || getBalanceDue(order) > 0) && !order.discount && (
        <div className="px-4 py-2 space-y-2" style={{ borderTop: '1px solid hsl(220, 20%, 28%)' }}>
          {/* Applied discounts display */}
          {(appliedCoupon || manualDiscountVal > 0) && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'hsl(140, 30%, 15%)', border: '1px solid hsl(140, 40%, 30%)' }}>
              <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              {appliedCoupon && <span className="text-xs font-medium text-green-400">{appliedCoupon.code} -${appliedCoupon.discount.toFixed(2)}</span>}
              {appliedCoupon && manualDiscountVal > 0 && <span className="text-green-600">+</span>}
              {manualDiscountVal > 0 && <span className="text-xs font-medium text-green-400">Discount -${manualDiscountVal.toFixed(2)}</span>}
              <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); setManualDiscount(''); setDiscountInput(''); }} className="ml-auto p-0.5 rounded hover:opacity-70">
                <X className="w-3 h-3 text-red-400" />
              </button>
            </div>
          )}

          {/* Single row: Coupon | Apply | Discount field */}
          {!appliedCoupon || !manualDiscountVal ? (
            <div className="flex items-center gap-1.5">
              {/* Coupon input */}
              {!appliedCoupon && (
                <>
                  <input
                    type="text"
                    placeholder="Coupon"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && (async () => {
                      if (!couponCode.trim()) return;
                      try {
                        const result = await validateCouponMutation.mutateAsync({ code: couponCode, subtotal: order.subtotal || order.total * 0.952 });
                        setAppliedCoupon({ code: result.coupon.code, discount: result.discount });
                        setCouponCode('');
                        toast.success(`Coupon applied: -$${result.discount.toFixed(2)}`);
                      } catch (err: any) { toast.error(err.message || 'Invalid coupon'); }
                    })()}
                    className="h-8 w-[100px] px-2 text-xs rounded outline-none font-mono"
                    style={{ backgroundColor: 'hsl(220, 22%, 28%)', color: '#e2e8f0', border: '1px solid hsl(220, 20%, 35%)' }}
                  />
                  <button
                    onClick={async () => {
                      if (!couponCode.trim()) return;
                      try {
                        const result = await validateCouponMutation.mutateAsync({ code: couponCode, subtotal: order.subtotal || order.total * 0.952 });
                        setAppliedCoupon({ code: result.coupon.code, discount: result.discount });
                        setCouponCode('');
                        toast.success(`Coupon applied: -$${result.discount.toFixed(2)}`);
                      } catch (err: any) { toast.error(err.message || 'Invalid coupon'); }
                    }}
                    disabled={!couponCode.trim() || validateCouponMutation.isPending}
                    className="h-8 px-2.5 rounded text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: 'hsl(220, 22%, 28%)', color: '#22c55e', border: '1px solid hsl(140, 40%, 30%)', opacity: !couponCode.trim() ? 0.5 : 1 }}
                  >
                    {validateCouponMutation.isPending ? '...' : 'Apply'}
                  </button>
                </>
              )}

              {/* Discount field - simple click to show keypad */}
              {!manualDiscountVal && (
                <div className="relative ml-auto">
                  <div
                    className="h-8 flex items-center px-2 rounded cursor-pointer"
                    style={{ backgroundColor: 'hsl(220, 22%, 28%)', border: '1px solid hsl(220, 20%, 35%)', minWidth: '80px' }}
                    onClick={() => setShowDiscountKeypad(!showDiscountKeypad)}
                  >
                    <span className="text-xs mr-1" style={{ color: '#f59e0b' }}>$</span>
                    <span className="text-sm font-bold" style={{ color: discountInput ? '#e2e8f0' : '#64748b' }}>{discountInput || 'Discount'}</span>
                  </div>

                  {/* Numeric keypad popup - matching reference */}
                  {showDiscountKeypad && (
                    <div className="absolute bottom-full right-0 mb-1 p-2 rounded-lg z-50 shadow-2xl" style={{ backgroundColor: 'hsl(220, 25%, 16%)', border: '1px solid hsl(220, 20%, 30%)', width: '200px' }}>
                      {/* Display */}
                      <div className="h-8 flex items-center justify-end px-3 mb-2 rounded" style={{ backgroundColor: 'hsl(220, 22%, 22%)', border: '1px solid hsl(220, 20%, 35%)' }}>
                        <span className="text-xs mr-1" style={{ color: '#f59e0b' }}>$</span>
                        <span className="text-base font-bold" style={{ color: discountInput ? '#e2e8f0' : '#64748b' }}>{discountInput || '0'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['7','8','9','4','5','6','1','2','3'].map(k => (
                          <button key={k} onClick={() => {
                            const parts = discountInput.split('.');
                            if (parts[1] && parts[1].length >= 2) return;
                            setDiscountInput(p => p + k);
                          }} className="h-12 rounded-lg text-lg font-bold" style={{ backgroundColor: 'hsl(220, 22%, 28%)', color: '#e2e8f0', border: '1px solid hsl(220, 20%, 35%)' }}>{k}</button>
                        ))}
                        <button onClick={() => setDiscountInput('')} className="h-12 rounded-lg text-lg font-bold" style={{ backgroundColor: 'hsl(220, 22%, 28%)', color: '#f87171', border: '1px solid hsl(220, 20%, 35%)', borderBottom: '2px solid #f87171' }}>C</button>
                        <button onClick={() => {
                          const parts = discountInput.split('.');
                          if (parts[1] && parts[1].length >= 2) return;
                          setDiscountInput(p => p + '0');
                        }} className="h-12 rounded-lg text-lg font-bold" style={{ backgroundColor: 'hsl(220, 22%, 28%)', color: '#e2e8f0', border: '1px solid hsl(220, 20%, 35%)' }}>0</button>
                        <button onClick={() => {
                          if (!discountInput.includes('.')) setDiscountInput(p => p + '.');
                        }} className="h-12 rounded-lg text-lg font-bold" style={{ backgroundColor: 'hsl(220, 22%, 28%)', color: '#e2e8f0', border: '1px solid hsl(220, 20%, 35%)' }}>.</button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                        <button onClick={() => setDiscountInput(p => p.slice(0, -1))} className="h-12 rounded-lg text-sm font-bold" style={{ backgroundColor: 'hsl(220, 22%, 28%)', color: '#94a3b8', border: '1px solid hsl(220, 20%, 35%)' }}>⌫ Del</button>
                        <button onClick={() => {
                          if (parseFloat(discountInput) > 0) {
                            setManualDiscount(discountInput);
                          }
                          setShowDiscountKeypad(false);
                        }} className="h-12 rounded-lg text-sm font-bold" style={{ backgroundColor: 'hsl(217, 91%, 60%)', color: '#fff' }}>OK</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* After discount total + save */}
          {hasNewDiscount && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-green-400">After Discount: <span className="font-bold text-sm">${Math.max(0, order.total - newDiscounts).toFixed(2)}</span></span>
              <button
                onClick={async () => {
                  const existingDiscount = order.discount || 0;
                  const totalDiscount = existingDiscount + newDiscounts;
                  const sub = order.subtotal || order.total * 0.952;
                  const discountedSub = Math.max(0, sub - totalDiscount);
                  const newTax = discountedSub * 0.05;
                  const newTotal = discountedSub + newTax;

                  await supabase.from('orders').update({
                    discount: totalDiscount,
                    coupon_code: appliedCoupon?.code || order.couponCode || null,
                    tax: newTax,
                    total: newTotal,
                  }).eq('order_number', order.id);

                  setAppliedCoupon(null);
                  setCouponCode('');
                  setManualDiscount('');
                  setDiscountInput('');
                  toast.success(`Discount saved — new total $${newTotal.toFixed(2)}`);
                  window.location.reload();
                }}
                className="h-7 px-3 rounded text-xs font-bold"
                style={{ backgroundColor: 'hsl(217, 91%, 60%)', color: '#fff' }}
              >Save</button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-4 space-y-3" style={{ borderTop: '1px solid hsl(220, 20%, 28%)' }}>
        {/* Payment Actions */}
         {(order.paymentStatus !== 'paid' || getBalanceDue(order) > 0) && (
          <div className="grid grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              className="flex-1 text-green-400 border-green-600 hover:bg-green-900/30"
              onClick={async () => {
                if (hasNewDiscount) await saveDiscountAndPay('cash');
                else onPayment('cash');
              }}
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
              onClick={async () => {
                if (hasNewDiscount) await saveDiscountAndPay('card');
                else onPayment('card');
              }}
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
                style={{ color: '#f59e0b', opacity: (hasNewDiscount || (order.discount && order.discount > 0)) ? 0.4 : 1 }}
                onClick={() => onPayment('points')}
                disabled={hasNewDiscount || !!(order.discount && order.discount > 0)}
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
          
          {/* Advance order in preparing status: "Start Preparing" button */}
          {isAdvanceOrder && onStartPreparing && (
            <Button 
              className="flex-1 text-white bg-purple-600 hover:bg-purple-700"
              onClick={onStartPreparing}
            >
              <ChefHat className="w-4 h-4 mr-2" />
              Start Preparing
            </Button>
          )}

          {/* Normal status flow button (show for pending orders including scheduled, and non-advance preparing/ready) */}
          {nextStatus && !isAdvanceOrder && (
            <Button 
              className={cn(
                "flex-1 text-white",
                nextStatus === 'delivered' && order.paymentStatus !== 'paid'
                  ? "bg-gray-600 hover:bg-gray-600 cursor-not-allowed opacity-60"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
              onClick={() => {
                if (nextStatus === 'delivered' && order.paymentStatus !== 'paid') {
                  toast.error('Cannot complete order — payment is still unpaid');
                  return;
                }
                onUpdateStatus(nextStatus);
              }}
            >
              {order.status === 'pending' ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <ChefHat className="w-4 h-4 mr-2" />
              )}
              {getStatusButtonLabel(order.status, false)}
            </Button>
          )}
        </div>
      </div>

    </div>
  );
};

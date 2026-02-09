import { useRef, useState, useEffect } from 'react';
import { Download, X, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CustomerOrder } from '@/hooks/useCustomerOrders';
import { LOCATIONS } from '@/contexts/LocationContext';
import { supabase } from '@/integrations/supabase/client';

interface RewardPoints {
  lastBalance: number;
  earned: number;
  used: number;
  balance: number;
}

interface OrderReceiptModalProps {
  order: CustomerOrder | null;
  open: boolean;
  onClose: () => void;
}

export const OrderReceiptModal = ({ order, open, onClose }: OrderReceiptModalProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [rewardPoints, setRewardPoints] = useState<RewardPoints | undefined>(undefined);

  // Fetch reward points via edge function (customers aren't Supabase-authed, so direct queries are blocked by RLS)
  useEffect(() => {
    const fetchRewards = async () => {
      if (!order?.customerPhone) {
        setRewardPoints(undefined);
        return;
      }
      const phone = order.customerPhone.replace(/\D/g, '');
      if (!phone) return;

      try {
        const { data, error } = await supabase.functions.invoke('customer-rewards', {
          body: { phone, includeHistory: true },
        });

        if (error || !data?.rewards) {
          setRewardPoints(undefined);
          return;
        }

        const currentBalance = data.rewards.points || 0;
        const history = data.history || [];
        
        // Find earned/redeemed entries for this specific order
        const earnedEntry = history.find((h: any) => h.order_id === order.id && h.transaction_type === 'earned');
        const redeemedEntry = history.find((h: any) => h.order_id === order.id && h.transaction_type === 'redeemed');
        
        const earned = earnedEntry?.points_change || 0;
        const used = Math.abs(redeemedEntry?.points_change || 0);
        const lastBalance = currentBalance - earned + used;

        setRewardPoints({
          lastBalance,
          earned,
          used,
          balance: currentBalance,
        });
      } catch (err) {
        console.error('Error fetching rewards for receipt:', err);
        setRewardPoints(undefined);
      }
    };
    if (open && order) fetchRewards();
  }, [order?.customerPhone, open]);

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

  // Sanitize a string for safe use in HTML template literals (prevents XSS in document.write)
  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Sanitize the order number for use in the title (defense-in-depth)
    const safeOrderNumber = escapeHtml(order.orderNumber || '');

    // The innerHTML comes from React-rendered JSX which auto-escapes user content.
    // We use cloneNode to safely copy the DOM instead of raw string interpolation.
    const receiptClone = printContent.cloneNode(true) as HTMLElement;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${safeOrderNumber}</title>
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
        <body></body>
      </html>
    `);
    printWindow.document.close();
    // Safely append the cloned DOM node instead of using innerHTML string interpolation
    printWindow.document.body.appendChild(
      printWindow.document.importNode(receiptClone, true)
    );
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
            {locationAddress && <p className="text-xs">{locationAddress.replace(/,?\s*AB\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d/i, '').trim().replace(/,\s*$/, '')}</p>}
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
            {order.items.map((item) => {
              const customizations = item.customizations;
              const hasPizzaCustomization = customizations?.size?.name || customizations?.crust?.name;
              const hasWingsCustomization = customizations?.flavor;
              const hasComboCustomization = customizations?.comboId || customizations?.comboName || customizations?.selections;
              
              // Build size/crust line only if both exist and have names
              const sizeCrustParts: string[] = [];
              if (customizations?.size?.name) sizeCrustParts.push(customizations.size.name);
              if (customizations?.crust?.name) sizeCrustParts.push(`${customizations.crust.name} Crust`);
              const sizeCrustLine = sizeCrustParts.length > 0 ? sizeCrustParts.join(', ') : null;
              
              // Build customization lines for pizza
              const customizationLines: string[] = [];
              
              if (hasPizzaCustomization && !hasComboCustomization) {
                // Sauce (only if non-default)
                if (customizations?.sauceName && customizations.sauceName !== 'Pizza Sauce') {
                  const sauceText = customizations.sauceQuantity === 'extra' 
                    ? `${customizations.sauceName} (Extra)` 
                    : customizations.sauceName;
                  customizationLines.push(`Sauce: ${sauceText}`);
                }
                
                // Cheese (only if non-default)
                if (customizations?.cheeseType && customizations.cheeseType !== 'mozzarella') {
                  const cheeseText = customizations.cheeseType === 'none' 
                    ? 'No Cheese' 
                    : customizations.cheeseType === 'dairy_free' 
                      ? 'Dairy Free Cheese' 
                      : customizations.cheeseType;
                  customizationLines.push(cheeseText);
                }
                
                // Spicy Level
                if (customizations?.spicyLevel) {
                  if (typeof customizations.spicyLevel === 'string' && customizations.spicyLevel !== 'none') {
                    const level = customizations.spicyLevel === 'medium' ? 'Medium Hot' : 
                                  customizations.spicyLevel.charAt(0).toUpperCase() + customizations.spicyLevel.slice(1);
                    customizationLines.push(`Spicy: ${level}`);
                  } else if (typeof customizations.spicyLevel === 'object') {
                    const leftLevel = customizations.spicyLevel.left;
                    const rightLevel = customizations.spicyLevel.right;
                    if (leftLevel !== 'none' || rightLevel !== 'none') {
                      const parts: string[] = [];
                      if (leftLevel !== 'none') {
                        parts.push(`L:${leftLevel === 'medium' ? 'Medium Hot' : leftLevel}`);
                      }
                      if (rightLevel !== 'none') {
                        parts.push(`R:${rightLevel === 'medium' ? 'Medium Hot' : rightLevel}`);
                      }
                      customizationLines.push(`Spicy: ${parts.join(' ')}`);
                    }
                  }
                }
                
                // Free Toppings
                if (customizations?.freeToppings && customizations.freeToppings.length > 0) {
                  customizationLines.push(`Add: ${customizations.freeToppings.join(', ')}`);
                }
                
                // Modified Default Toppings
                if (customizations?.defaultToppings) {
                  const modified = customizations.defaultToppings.filter((t: any) => t.quantity !== 'regular');
                  if (modified.length > 0) {
                    const modifiedText = modified.map((t: any) => {
                      if (t.quantity === 'none') return `NO ${t.name}`;
                      if (t.quantity === 'less') return `Less ${t.name}`;
                      if (t.quantity === 'extra') return `Extra ${t.name}`;
                      return t.name;
                    }).join(', ');
                    customizationLines.push(modifiedText);
                  }
                }
                
                // Extra Toppings
                if (customizations?.extraToppings && customizations.extraToppings.length > 0) {
                  const extraText = customizations.extraToppings.map((t: any) => {
                    const side = t.side && t.side !== 'whole' ? ` (${t.side === 'left' ? 'L' : 'R'})` : '';
                    return `+${t.name}${side}`;
                  }).join(', ');
                  customizationLines.push(extraText);
                }
                
                // Note
                if (customizations?.note) {
                  customizationLines.push(`Note: ${customizations.note}`);
                }
              }
              
              return (
                <div key={item.id}>
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <span>{item.quantity}× {item.name}</span>
                    </div>
                    <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                  </div>
                  
                  {/* Pizza Customizations (standalone pizzas only) */}
                  {!hasComboCustomization && sizeCrustLine && (
                    <p className="text-xs text-gray-600 ml-3">{sizeCrustLine}</p>
                  )}
                  {!hasComboCustomization && customizationLines.map((line, idx) => (
                    <p key={idx} className="text-xs text-gray-600 ml-3">{line}</p>
                  ))}
                  
                  {/* Wings Flavor (standalone only) */}
                  {!hasComboCustomization && hasWingsCustomization && (
                    <p className="text-xs text-gray-600 ml-3">{customizations.flavor}</p>
                  )}
                  
                  {/* Combo Selections with full details */}
                  {hasComboCustomization && customizations?.selections && (
                    <div className="ml-3 mt-1">
                      {customizations.selections.map((selection: any, selIdx: number) => (
                        <div key={selIdx} className="text-xs text-gray-600">
                          <span>- {selection.itemName}{selection.flavor ? ` (${selection.flavor})` : ''}</span>
                          {selection.pizzaCustomization && (
                            <div className="ml-3">
                              {selection.pizzaCustomization.size?.name && (
                                <p>{selection.pizzaCustomization.size.name}, {selection.pizzaCustomization.crust?.name || 'Regular'}</p>
                              )}
                              {selection.pizzaCustomization.spicyLevel && (
                                typeof selection.pizzaCustomization.spicyLevel === 'object' ? (
                                  (selection.pizzaCustomization.spicyLevel.left !== 'none' || selection.pizzaCustomization.spicyLevel.right !== 'none') && (
                                    <p>Spicy: {selection.pizzaCustomization.spicyLevel.left !== 'none' ? `L:${selection.pizzaCustomization.spicyLevel.left}` : ''} {selection.pizzaCustomization.spicyLevel.right !== 'none' ? `R:${selection.pizzaCustomization.spicyLevel.right}` : ''}</p>
                                  )
                                ) : selection.pizzaCustomization.spicyLevel !== 'none' && (
                                  <p>Spicy: {selection.pizzaCustomization.spicyLevel}</p>
                                )
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
                <div className="flex justify-between text-green-700">
                  <span>Add:</span>
                  <span className="font-medium">+{rewardPoints.earned} pts</span>
                </div>
                {rewardPoints.used > 0 && (
                  <div className="flex justify-between text-red-700">
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
      </DialogContent>
    </Dialog>
  );
};

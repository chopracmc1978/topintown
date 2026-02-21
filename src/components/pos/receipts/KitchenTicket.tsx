import { Order, CartPizzaCustomization, CartComboCustomization } from '@/types/menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface KitchenTicketProps {
  order: Order;
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
  
  // Cheese - show if not default
  if (customization.cheeseType) {
    const ct = customization.cheeseType.toLowerCase();
    if (ct === 'no cheese' || ct === 'none') {
      details.push('Cheese: None');
    } else if (ct === 'dairy free') {
      details.push('Cheese: Dairy Free');
    } else {
      const cheeseQty = (customization as any).cheeseQuantity;
      if (cheeseQty && cheeseQty !== 'regular' && cheeseQty !== 'normal') {
        details.push(`Cheese: ${cheeseQty} ${customization.cheeseType}`);
      }
    }
  }
  
  // Sauce - always show sauce name
  if (customization.sauceName?.toLowerCase() === 'no sauce') {
    details.push('No Sauce');
  } else if (customization.sauceName) {
    const qtyPrefix = customization.sauceQuantity && customization.sauceQuantity !== 'normal'
      ? `${customization.sauceQuantity} ` : '';
    details.push(`Sauce: ${qtyPrefix}${customization.sauceName}`);
  }
  
  // Spicy Level
  const leftSpicy = customization.spicyLevel?.left;
  const rightSpicy = customization.spicyLevel?.right;
  
  const spicyDisplayName = (level: string) => {
    if (level === 'medium') return 'Medium Hot';
    if (level === 'hot') return 'Hot';
    if (level === 'none' || !level) return 'None';
    return level;
  };
  
  const hasLeftSpicy = leftSpicy && leftSpicy !== 'none';
  const hasRightSpicy = rightSpicy && rightSpicy !== 'none';
  
  if (hasLeftSpicy || hasRightSpicy) {
    if (leftSpicy === rightSpicy) {
      details.push(`Spicy: ${spicyDisplayName(leftSpicy!)}`);
    } else {
      details.push(`Spicy: L:${spicyDisplayName(leftSpicy || 'none')} R:${spicyDisplayName(rightSpicy || 'none')}`);
    }
  }
  
  // Free Toppings
  if (customization.freeToppings && customization.freeToppings.length > 0) {
    details.push(`Add: ${customization.freeToppings.join(', ')}`);
  }
  
  // Removed Default Toppings
  const removedToppings = customization.defaultToppings?.filter(t => t.quantity === 'none');
  if (removedToppings && removedToppings.length > 0) {
    details.push(`NO: ${removedToppings.map(t => t.name).join(', ')}`);
  }
  
  // Modified Default Toppings
  const modifiedDefaults = customization.defaultToppings?.filter(
    t => t.quantity === 'less' || t.quantity === 'extra'
  );
  if (modifiedDefaults && modifiedDefaults.length > 0) {
    modifiedDefaults.forEach(t => {
      const sideInfo = t.side && t.side !== 'whole' ? ` (${t.side})` : '';
      details.push(`${t.quantity} ${t.name}${sideInfo}`);
    });
  }
  
  // Extra Toppings
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

// Helper to format combo selection details for kitchen
const formatComboDetailsForKitchen = (comboCustomization: CartComboCustomization, formatPizzaDetailsFn: typeof formatPizzaDetails): React.ReactNode[] => {
  const details: React.ReactNode[] = [];
  
  comboCustomization.selections.forEach((selection, idx) => {
    if (selection.itemType === 'pizza' && selection.pizzaCustomization) {
      const pizzaDetails = formatPizzaDetailsFn(selection.pizzaCustomization);
      details.push(
        <div key={idx} className="mt-1 first:mt-0 border-l-2 border-gray-400 pl-2">
          <p className="font-bold text-xs uppercase">{selection.itemName}</p>
          <div className="text-xs space-y-0.5">
            {pizzaDetails.map((detail, i) => (
              <p key={i} className={cn(
                detail.startsWith('NO:') && 'font-bold bg-red-100 px-1 -mx-1',
                detail.startsWith('+') && 'font-bold bg-green-100 px-1 -mx-1',
                detail.startsWith('Note:') && 'italic bg-yellow-100 px-1 -mx-1'
              )}>{detail}</p>
            ))}
          </div>
        </div>
      );
    } else if (selection.itemType === 'wings' && selection.flavor) {
      details.push(
        <p key={idx} className="text-xs mt-1 first:mt-0">• {selection.itemName} - {selection.flavor}</p>
      );
    } else {
      details.push(
        <p key={idx} className="text-xs mt-1 first:mt-0">• {selection.itemName}</p>
      );
    }
  });
  
  return details;
};

export const KitchenTicket = ({ order }: KitchenTicketProps) => {
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
    });
  };

  return (
    <div className="bg-white text-black font-mono text-sm w-[280px] p-4 mx-auto">
      {/* Header */}
      <div className="text-center mb-3">
        <p className="text-xl font-bold">KITCHEN ORDER</p>
        <p className="text-2xl font-black mt-1">{order.id}</p>
      </div>
      
      <Separator className="border-dashed border-black my-2" />
      
      {/* Order Info */}
      <div className="space-y-1 text-xs mb-3">
        <div className="flex justify-between">
          <span>Time:</span>
          <span className="font-bold">{formatTime(order.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{formatDate(order.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Type:</span>
          <span className="uppercase font-bold">{order.orderType}</span>
        </div>
        {order.tableNumber && (
          <div className="flex justify-between">
            <span>Table:</span>
            <span className="font-bold">{order.tableNumber}</span>
          </div>
        )}
        {(order as any).pickupTime && (
          <div className="flex justify-between bg-yellow-100 px-1 -mx-1">
            <span>Pickup:</span>
            <span className="font-bold">
              {new Date((order as any).pickupTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </div>
        )}
      </div>
      
      <Separator className="border-dashed border-black my-2" />
      
      {/* Items */}
      <div className="space-y-3">
        {order.items.map((item, index) => (
          <div key={`${item.id}-${index}`} className="border-b border-dashed border-gray-300 pb-2 last:border-b-0">
            <div className="flex gap-2">
              <span className="font-black text-lg">{item.quantity}×</span>
              <span className="font-bold text-base uppercase flex-1">{item.name}</span>
            </div>
            
            {item.selectedSize && !item.pizzaCustomization && (
              <p className="text-xs ml-5">{item.selectedSize}</p>
            )}
            
            {item.pizzaCustomization && (
              <div className="text-xs ml-5 space-y-0.5 mt-1">
                {formatPizzaDetails(item.pizzaCustomization).map((detail, idx) => (
                  <p key={idx} className={cn(
                    detail.startsWith('NO:') && 'font-bold bg-red-100 px-1 -mx-1',
                    detail.startsWith('+') && 'font-bold bg-green-100 px-1 -mx-1',
                    detail.startsWith('Note:') && 'italic bg-yellow-100 px-1 -mx-1'
                  )}>{detail}</p>
                ))}
              </div>
            )}
            
            {item.wingsCustomization && (
              <p className="text-xs ml-5 font-medium">{item.wingsCustomization.flavor}</p>
            )}
            
            {item.comboCustomization && (
              <div className="ml-3 mt-1 space-y-1">
                {formatComboDetailsForKitchen(item.comboCustomization, formatPizzaDetails)}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Order Notes */}
      {order.notes && (
        <>
          <Separator className="border-dashed border-black my-2" />
          <div className="bg-yellow-100 p-2 -mx-2">
            <p className="font-bold text-xs">ORDER NOTE:</p>
            <p className="text-sm">{order.notes}</p>
          </div>
        </>
      )}
      
      <Separator className="border-dashed border-black my-2" />
      
      {/* Customer */}
      {order.customerName && (
        <div className="text-center text-xs">
          <p>Customer: <span className="font-bold">{order.customerName}</span></p>
        </div>
      )}
    </div>
  );
};

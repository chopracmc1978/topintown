import { format } from 'date-fns';
import { History, ShoppingCart, Edit2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CartItem, CartPizzaCustomization } from '@/types/menu';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface OrderHistory {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  items: CartItem[];
  customer_name: string | null;
  customer_phone?: string | null;
  reward_points?: number;
}

interface POSOrderHistoryDropdownProps {
  orders: OrderHistory[];
  isSearching: boolean;
  onSelectOrder: (items: CartItem[], mode: 'exact' | 'edit') => void;
  onClose: () => void;
  rewardPoints?: number;
}

// Compact item summary with customization details
const formatItemSummary = (item: CartItem): string => {
  let summary = `${item.quantity}x ${item.name}`;
  
  if (item.comboCustomization) {
    // Show combo with selection count
    const selectionCount = item.comboCustomization.selections?.length || 0;
    summary += ` (${selectionCount} items)`;
  } else if (item.pizzaCustomization) {
    summary += ` (${item.pizzaCustomization.size.name})`;
  } else if (item.wingsCustomization) {
    summary += ` - ${item.wingsCustomization.flavor}`;
  }
  
  return summary;
};

export const POSOrderHistoryDropdown = ({
  orders,
  isSearching,
  onSelectOrder,
  onClose,
  rewardPoints = 0,
}: POSOrderHistoryDropdownProps) => {
  // Limit to 3 orders
  const displayOrders = orders.slice(0, 3);

  if (isSearching) {
    return (
      <div data-order-history className="fixed top-16 right-4 w-80 max-h-[calc(100vh-100px)] border border-border rounded-lg shadow-2xl z-[9999] p-4 overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
        {/* Solid background shield for legacy Android */}
        <div className="absolute inset-0 bg-white" style={{ backgroundColor: '#ffffff', zIndex: -1 }} />
        <div className="flex items-center gap-2 text-muted-foreground relative">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
          <span className="text-sm">Searching orders...</span>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return null;
  }

  return (
    <div data-order-history className="fixed top-16 right-4 w-80 max-h-[calc(100vh-100px)] border border-border rounded-lg shadow-2xl z-[9999] overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
      {/* Solid background shield for legacy Android WebView */}
      <div className="absolute inset-0" style={{ backgroundColor: '#ffffff', zIndex: -1 }} />
      
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 relative" style={{ backgroundColor: '#f3f4f6' }}>
        <History className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Last {displayOrders.length} Order{displayOrders.length > 1 ? 's' : ''}</span>
      </div>
      
      <ScrollArea className="max-h-[calc(100vh-160px)]" style={{ backgroundColor: '#ffffff' }}>
        <div className="divide-y divide-border">
          {displayOrders.map((order, orderIdx) => {
            const hasName = order.customer_name && order.customer_name !== 'Walk-in Customer';
            const showRewardPoints = orderIdx === 0 && rewardPoints > 0;
            
            return (
              <div key={order.id} className="p-3 transition-colors" style={{ backgroundColor: '#ffffff' }}>
                {/* Customer Info */}
                <div className="flex items-start justify-between mb-2">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    {/* Line 1: Name (left) + Reward Points (right) OR Phone (left) + Reward Points (right) */}
                    <div className="flex items-center justify-between gap-2">
                      {hasName ? (
                        <p className="font-bold text-base text-foreground truncate">
                          {order.customer_name}
                        </p>
                      ) : (
                        <p className="font-bold text-base text-foreground">
                          {order.customer_phone || 'No phone'}
                        </p>
                      )}
                      {showRewardPoints && (
                        <div className="flex items-center gap-1 text-xs font-medium text-amber-600 shrink-0">
                          <Gift className="w-3.5 h-3.5" />
                          <span>{rewardPoints} pts</span>
                        </div>
                      )}
                    </div>
                    {/* Line 2: Phone (only if name exists) */}
                    {hasName && (
                      <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                    )}
                    {/* Line 3: Order number + date */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-primary font-bold">{order.order_number}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-sm shrink-0 ml-2">${order.total.toFixed(2)}</span>
                </div>
                
                {/* Order Items Preview */}
                <div className="text-xs text-muted-foreground mb-2 space-y-0.5">
                  {order.items.slice(0, 3).map((item, idx) => (
                    <p key={idx} className="truncate">{formatItemSummary(item)}</p>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-primary">+{order.items.length - 3} more items</p>
                  )}
                </div>
                
                {/* Action Buttons - ensure visibility */}
                <div className="flex gap-2" style={{ visibility: 'visible', opacity: 1 }}>
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                    style={{ visibility: 'visible', opacity: 1 }}
                    onClick={() => {
                      onSelectOrder(order.items, 'exact');
                      onClose();
                    }}
                  >
                    <ShoppingCart className="w-3 h-3 mr-1" />
                    Same Order
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs border-border"
                    style={{ visibility: 'visible', opacity: 1 }}
                    onClick={() => {
                      onSelectOrder(order.items, 'edit');
                      onClose();
                    }}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit & Order
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

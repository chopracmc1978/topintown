import { format } from 'date-fns';
import { History, ShoppingCart, Edit2 } from 'lucide-react';
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
}

interface POSOrderHistoryDropdownProps {
  orders: OrderHistory[];
  isSearching: boolean;
  onSelectOrder: (items: CartItem[], mode: 'exact' | 'edit') => void;
  onClose: () => void;
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
}: POSOrderHistoryDropdownProps) => {
  if (isSearching) {
    return (
      <div className="fixed top-14 left-0 w-96 max-h-[calc(100vh-56px)] bg-card border-r border-border shadow-xl z-50 p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
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
    <div className="fixed top-14 left-0 w-96 max-h-[calc(100vh-56px)] bg-card border-r border-border shadow-xl z-50 overflow-hidden">
      <div className="bg-secondary/50 px-3 py-2 border-b border-border flex items-center gap-2">
        <History className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Last {orders.length} Order{orders.length > 1 ? 's' : ''}</span>
      </div>
      
      <ScrollArea className="h-[calc(100vh-100px)]">
        <div className="divide-y divide-border">
          {orders.map((order) => (
            <div key={order.id} className="p-3 hover:bg-secondary/30 transition-colors">
              {/* Customer Info - Phone first, then name, then order # */}
              <div className="flex items-start justify-between mb-2">
                <div className="space-y-0.5">
                  {/* Line 1: Phone */}
                  <p className="font-semibold text-sm text-foreground">
                    {order.customer_phone || 'No phone'}
                  </p>
                  {/* Line 2: Name (if available) */}
                  {order.customer_name && order.customer_name !== 'Walk-in Customer' && (
                    <p className="text-xs text-muted-foreground">{order.customer_name}</p>
                  )}
                  {/* Line 3: Order number + date */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary font-bold">{order.order_number}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
                <span className="font-bold text-sm">${order.total.toFixed(2)}</span>
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
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs"
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
                  variant="secondary"
                  className="flex-1 h-7 text-xs"
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
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

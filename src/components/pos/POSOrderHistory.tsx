import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Printer, Search, Loader2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CustomerReceiptModal } from './receipts/CustomerReceiptModal';
import { Order, CartItem, CartPizzaCustomization, CartWingsCustomization, OrderType, OrderStatus, OrderSource, PaymentStatus, PaymentMethod } from '@/types/menu';
import { POINTS_PER_DOLLAR } from '@/hooks/useRewards';

interface POSOrderHistoryProps {
  locationId: string;
}

interface DBOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customizations: any;
  created_at: string;
}

export const POSOrderHistory = ({ locationId }: POSOrderHistoryProps) => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Fetch orders for date range
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const startDate = new Date(dateRange.from);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999);

      const { data: dbOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('location_id', locationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!dbOrders || dbOrders.length === 0) {
        setOrders([]);
        return;
      }

      // Fetch all order items
      const orderIds = dbOrders.map(o => o.id);
      const { data: dbItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Group items by order
      const itemsByOrder: Record<string, DBOrderItem[]> = {};
      (dbItems || []).forEach(item => {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = [];
        }
        itemsByOrder[item.order_id].push(item as DBOrderItem);
      });

      // Convert to frontend format
      const convertedOrders = dbOrders.map(dbOrder => {
        const dbItems = itemsByOrder[dbOrder.id] || [];
        const items: CartItem[] = dbItems.map(item => {
          const customizations = item.customizations;
          const pizzaCustomization = customizations?.size ? customizations as CartPizzaCustomization : undefined;
          const wingsCustomization = customizations?.flavor && !customizations?.size ? customizations as CartWingsCustomization : undefined;

          return {
            id: item.menu_item_id || item.id,
            name: item.name,
            description: '',
            price: item.unit_price,
            image: '',
            category: pizzaCustomization ? 'pizza' : wingsCustomization ? 'chicken_wings' : 'sides',
            quantity: item.quantity,
            totalPrice: item.total_price,
            pizzaCustomization,
            wingsCustomization,
          };
        });

        return {
          id: dbOrder.order_number || dbOrder.id,
          items,
          customerName: dbOrder.customer_name || 'Walk-in Customer',
          customerPhone: dbOrder.customer_phone || '',
          customerAddress: dbOrder.customer_address || '',
          customerId: dbOrder.customer_id || undefined,
          orderType: (dbOrder.order_type || 'pickup') as OrderType,
          status: (dbOrder.status || 'pending') as OrderStatus,
          total: dbOrder.total,
          subtotal: dbOrder.subtotal,
          tax: dbOrder.tax,
          createdAt: new Date(dbOrder.created_at),
          notes: dbOrder.notes || undefined,
          source: (dbOrder.source || 'web') as OrderSource,
          paymentStatus: (dbOrder.payment_status || 'unpaid') as PaymentStatus,
          paymentMethod: dbOrder.payment_method as PaymentMethod | undefined,
          tableNumber: dbOrder.table_number || undefined,
          pickupTime: dbOrder.pickup_time ? new Date(dbOrder.pickup_time) : undefined,
        };
      });

      setOrders(convertedOrders);
    } catch (err) {
      console.error('Error fetching order history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [dateRange, locationId]);

  // Filter orders by search
  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(query) ||
      order.customerPhone?.toLowerCase().includes(query) ||
      order.customerName?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-purple-100 text-purple-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  const handlePrintReceipt = (order: Order) => {
    setSelectedOrder(order);
    setShowReceiptModal(true);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="justify-start text-left font-normal bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by Order ID, Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button variant="outline" onClick={fetchOrders} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {/* Orders Table */}
      <div className="border rounded-lg">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">Sr. No.</TableHead>
                <TableHead>Order Id</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order Type</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pts Earned</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No orders found for this period
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order, index) => (
                  <TableRow key={order.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{order.id}</TableCell>
                    <TableCell>{order.customerPhone || '-'}</TableCell>
                    <TableCell>
                      <Badge className={cn('capitalize', getStatusBadge(order.status))}>
                        {order.status === 'delivered' ? 'Completed' : order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{order.orderType}</TableCell>
                    <TableCell className="font-semibold">${order.total.toFixed(2)}</TableCell>
                    <TableCell>
                      {order.status === 'delivered' ? (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Star className="w-3 h-3" />
                          +{Math.floor(order.total * POINTS_PER_DOLLAR)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(order.createdAt, 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePrintReceipt(order)}
                        title="Print Receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
        <span>Total Orders: {filteredOrders.length}</span>
        <span>
          Total Revenue: ${filteredOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
        </span>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedOrder && (
        <CustomerReceiptModal
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          locationId={locationId}
        />
      )}
    </div>
  );
};

import { useState } from 'react';
import { Clock, CheckCircle, XCircle, ChefHat, Truck, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/contexts/OrderContext';
import { Order } from '@/types/menu';
import { cn } from '@/lib/utils';

const statusConfig = {
  pending: { label: 'New', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  preparing: { label: 'Preparing', icon: ChefHat, color: 'bg-blue-100 text-blue-800' },
  ready: { label: 'Ready', icon: Package, color: 'bg-green-100 text-green-800' },
  delivered: { label: 'Complete', icon: CheckCircle, color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

const POS = () => {
  const { orders, updateOrderStatus } = useOrders();
  const [filter, setFilter] = useState<Order['status'] | 'all'>('all');

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter((order) => order.status === filter);

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    const statusFlow: Record<Order['status'], Order['status'] | null> = {
      pending: 'preparing',
      preparing: 'ready',
      ready: 'delivered',
      delivered: null,
      cancelled: null,
    };
    return statusFlow[currentStatus];
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="w-8 h-8" />
            <div>
              <h1 className="font-serif text-xl font-bold">Bella Pizza POS</h1>
              <p className="text-sm text-primary-foreground/70">Order Management System</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-primary-foreground/70">Active Orders</p>
            <p className="text-2xl font-bold">
              {orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Status Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all",
              filter === 'all'
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            All Orders ({orders.length})
          </button>
          {(Object.keys(statusConfig) as Order['status'][]).map((status) => {
            const config = statusConfig[status];
            const count = orders.filter((o) => o.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2",
                  filter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                <config.icon className="w-4 h-4" />
                {config.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
              No orders yet
            </h3>
            <p className="text-muted-foreground">
              Orders will appear here when customers place them.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => {
              const config = statusConfig[order.status];
              const nextStatus = getNextStatus(order.status);

              return (
                <div
                  key={order.id}
                  className="bg-card rounded-xl border border-border overflow-hidden shadow-card"
                >
                  {/* Order Header */}
                  <div className="bg-secondary/50 p-4 flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-foreground">{order.id}</p>
                      <p className="text-sm text-muted-foreground">{formatTime(order.createdAt)}</p>
                    </div>
                    <div className={cn("px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1", config.color)}>
                      <config.icon className="w-4 h-4" />
                      {config.label}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="p-4 border-b border-border">
                    <p className="font-medium text-foreground">{order.customerName}</p>
                    <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {order.orderType === 'delivery' ? (
                        <Truck className="w-4 h-4 text-primary" />
                      ) : (
                        <Package className="w-4 h-4 text-primary" />
                      )}
                      <span className="text-sm">
                        {order.orderType === 'delivery' ? order.customerAddress : 'Pickup'}
                      </span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-4 space-y-2">
                    {order.items.map((item) => (
                      <div key={`${item.id}-${item.selectedSize}`} className="flex justify-between text-sm">
                        <span>
                          <span className="font-medium">{item.quantity}x</span> {item.name}
                          {item.selectedSize && (
                            <span className="text-muted-foreground"> ({item.selectedSize})</span>
                          )}
                        </span>
                        <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                    {order.notes && (
                      <p className="text-sm text-muted-foreground italic pt-2 border-t border-border">
                        Note: {order.notes}
                      </p>
                    )}
                  </div>

                  {/* Order Footer */}
                  <div className="p-4 bg-secondary/30 flex items-center justify-between">
                    <p className="text-lg font-bold text-primary">${order.total.toFixed(2)}</p>
                    <div className="flex gap-2">
                      {order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      )}
                      {nextStatus && (
                        <Button
                          variant="pizza"
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, nextStatus)}
                        >
                          Mark {statusConfig[nextStatus].label}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default POS;

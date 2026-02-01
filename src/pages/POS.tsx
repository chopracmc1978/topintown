import { useState } from 'react';
import { ChefHat, Plus, Clock, CheckCircle, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOSOrders } from '@/hooks/usePOSOrders';
import { Order, OrderStatus, CartItem, OrderType, OrderSource } from '@/types/menu';
import { POSOrderCard } from '@/components/pos/POSOrderCard';
import { POSOrderDetail } from '@/components/pos/POSOrderDetail';
import { POSNewOrderPanel } from '@/components/pos/POSNewOrderPanel';
import { POSCashPaymentModal } from '@/components/pos/POSCashPaymentModal';

import { cn } from '@/lib/utils';

const statusTabs = [
  { id: 'all', label: 'All', icon: Package },
  { id: 'pending', label: 'New', icon: Clock },
  { id: 'preparing', label: 'Preparing', icon: ChefHat },
  { id: 'ready', label: 'Ready', icon: CheckCircle },
  { id: 'delivered', label: 'Done', icon: CheckCircle },
] as const;

const POS = () => {
  const { orders, loading, addOrder, updateOrderStatus, updatePaymentStatus, updateOrder } = usePOSOrders();
  
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [pendingPaymentOrderId, setPendingPaymentOrderId] = useState<string | null>(null);

  // Filter orders
  const filteredOrders = activeTab === 'all'
    ? orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
    : activeTab === 'delivered'
    ? orders.filter(o => o.status === 'delivered')
    : orders.filter(o => o.status === activeTab);

  const selectedOrder = selectedOrderId 
    ? orders.find(o => o.id === selectedOrderId) 
    : null;

  // Counts
  const counts = {
    all: orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  const handleCreateOrder = async (orderData: {
    items: CartItem[];
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    orderType: OrderType;
    source: OrderSource;
    tableNumber?: string;
    notes?: string;
  }) => {
    const subtotal = orderData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    const newOrder = await addOrder({
      ...orderData,
      subtotal,
      tax,
      total,
      status: 'pending',
      paymentStatus: 'unpaid',
    });

    setShowNewOrder(false);
    if (newOrder) {
      setSelectedOrderId(newOrder.id);
    }
  };

  const handleUpdateStatus = (status: OrderStatus) => {
    if (!selectedOrderId) return;
    updateOrderStatus(selectedOrderId, status);
    
    // Clear selection and go back to empty state after status change
    setSelectedOrderId(null);
  };

  const handlePayment = (method: 'cash' | 'card') => {
    if (!selectedOrderId) return;

    if (method === 'cash') {
      setPendingPaymentOrderId(selectedOrderId);
      setCashModalOpen(true);
    } else {
      // Card payment - mark as paid directly (terminal handles it)
      updatePaymentStatus(selectedOrderId, 'paid', 'card');
    }
  };

  const handlePaymentComplete = (method: 'cash' | 'card' = 'cash') => {
    if (pendingPaymentOrderId) {
      updatePaymentStatus(pendingPaymentOrderId, 'paid', method);
    }
    setCashModalOpen(false);
    setPendingPaymentOrderId(null);
  };

  const handlePrintTicket = () => {
    // Printing handled silently
  };

  const handleEditOrder = () => {
    if (selectedOrder) {
      setEditingOrder(selectedOrder);
      setShowNewOrder(false);
    }
  };

  const handleUpdateOrder = (orderData: { items: CartItem[]; notes?: string }) => {
    if (editingOrder) {
      updateOrder(editingOrder.id, orderData);
      setEditingOrder(null);
      setSelectedOrderId(editingOrder.id);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-2 px-4 flex-shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <ChefHat className="w-7 h-7" />
            <div>
              <h1 className="font-serif text-lg font-bold">Bella Pizza POS</h1>
              <p className="text-xs text-primary-foreground/70">Order Management</p>
            </div>
          </div>
          
          {/* Status Tabs in Header */}
          <div className="flex gap-2 flex-1">
            {statusTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-white text-primary"
                    : "bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "bg-primary-foreground/20"
                )}>
                  {counts[tab.id as keyof typeof counts]}
                </span>
              </button>
            ))}
          </div>

          <Button 
            onClick={() => {
              setShowNewOrder(true);
              setSelectedOrderId(null);
            }}
            className="bg-white text-primary hover:bg-white/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Order List */}
        <div className="w-80 border-r border-border flex flex-col bg-secondary/20">
          <ScrollArea className="flex-1 p-3">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
                <p>Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No orders</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOrders.map(order => (
                  <POSOrderCard
                    key={order.id}
                    order={order}
                    isSelected={selectedOrderId === order.id}
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setShowNewOrder(false);
                    }}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Detail, Edit, or New Order */}
        <div className="flex-1 p-4 overflow-auto">
          {editingOrder ? (
            <POSNewOrderPanel
              onCreateOrder={handleCreateOrder}
              onCancel={() => {
                setEditingOrder(null);
                setSelectedOrderId(editingOrder.id);
              }}
              editingOrder={editingOrder}
              onUpdateOrder={handleUpdateOrder}
            />
          ) : showNewOrder ? (
            <POSNewOrderPanel
              onCreateOrder={handleCreateOrder}
              onCancel={() => setShowNewOrder(false)}
            />
          ) : selectedOrder ? (
            <POSOrderDetail
              order={selectedOrder}
              onUpdateStatus={handleUpdateStatus}
              onPayment={handlePayment}
              onPrintTicket={handlePrintTicket}
              onEditOrder={handleEditOrder}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select an order or create a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cash Payment Modal */}
      <POSCashPaymentModal
        open={cashModalOpen}
        onClose={() => {
          setCashModalOpen(false);
          setPendingPaymentOrderId(null);
        }}
        total={selectedOrder?.total || 0}
        onConfirm={handlePaymentComplete}
      />
    </div>
  );
};

export default POS;

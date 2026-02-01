import { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle, Package, Loader2, MapPin, LogOut, ChefHat, Bell, Volume2, VolumeX, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOSOrders } from '@/hooks/usePOSOrders';
import { usePOSNotificationSound } from '@/hooks/usePOSNotificationSound';
import { Order, OrderStatus, CartItem, OrderType, OrderSource } from '@/types/menu';
import { POSOrderCard } from '@/components/pos/POSOrderCard';
import { POSOrderDetail } from '@/components/pos/POSOrderDetail';
import { POSNewOrderPanel } from '@/components/pos/POSNewOrderPanel';
import { POSCashPaymentModal } from '@/components/pos/POSCashPaymentModal';
import { POSPrepTimeModal } from '@/components/pos/POSPrepTimeModal';
import { POSLoginScreen } from '@/components/pos/POSLoginScreen';
import { POSSettingsPanel } from '@/components/pos/POSSettingsPanel';
import { ReceiptPreviewModal } from '@/components/pos/receipts/ReceiptPreviewModal';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/logo.png';

import { cn } from '@/lib/utils';

const statusTabs = [
  { id: 'all', label: 'All', icon: Package },
  { id: 'pending', label: 'New', icon: Clock },
  { id: 'preparing', label: 'Preparing', icon: ChefHat },
  { id: 'ready', label: 'Ready', icon: CheckCircle },
  { id: 'delivered', label: 'Done', icon: CheckCircle },
] as const;

const LOCATION_NAMES: Record<string, string> = {
  'calgary': 'Calgary',
  'chestermere': 'Chestermere (Kinniburgh)',
};

const POS = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { orders, loading, addOrder, updateOrderStatus, updatePaymentStatus, updateOrder } = usePOSOrders();
  
  // Notification sound for new web/app orders
  const { hasPendingRemoteOrders, pendingCount, isAudioEnabled, enableAudio } = usePOSNotificationSound(orders);
  
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [pendingPaymentOrderId, setPendingPaymentOrderId] = useState<string | null>(null);
  const [prepTimeModalOpen, setPrepTimeModalOpen] = useState(false);
  const [pendingPrepOrderId, setPendingPrepOrderId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  
  // Get location from localStorage (set during login)
  const [currentLocationId, setCurrentLocationId] = useState<string>('calgary');
  
  useEffect(() => {
    const savedLocation = localStorage.getItem('pos_location_id');
    if (savedLocation) {
      setCurrentLocationId(savedLocation);
    }
  }, [user]);

  // Show login screen if not authenticated
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <POSLoginScreen onLoginSuccess={() => {
      const savedLocation = localStorage.getItem('pos_location_id');
      if (savedLocation) {
        setCurrentLocationId(savedLocation);
      }
    }} />;
  }

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
    }, currentLocationId);

    setShowNewOrder(false);
    if (newOrder) {
      setSelectedOrderId(newOrder.id);
    }
  };

  const handleUpdateStatus = (status: OrderStatus, prepTime?: number) => {
    if (!selectedOrderId) return;
    
    // If changing to "preparing", show prep time modal first
    if (status === 'preparing' && !prepTime) {
      setPendingPrepOrderId(selectedOrderId);
      setPrepTimeModalOpen(true);
      return;
    }
    
    updateOrderStatus(selectedOrderId, status, prepTime);
    
    // Clear selection and go back to empty state after status change
    setSelectedOrderId(null);
  };

  const handlePrepTimeConfirm = (prepTime: number) => {
    if (pendingPrepOrderId) {
      updateOrderStatus(pendingPrepOrderId, 'preparing', prepTime);
      setSelectedOrderId(null);
    }
    setPrepTimeModalOpen(false);
    setPendingPrepOrderId(null);
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
    if (selectedOrder) {
      setShowReceiptPreview(true);
    }
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
      <header className={cn(
        "border-b border-border py-2 px-4 flex-shrink-0 shadow-sm transition-colors",
        hasPendingRemoteOrders ? "bg-orange-100 animate-pulse" : "bg-white"
      )}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Top In Town Pizza" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-serif text-lg font-bold text-foreground">Top In Town Pizza</h1>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{LOCATION_NAMES[currentLocationId] || currentLocationId}</span>
              </div>
            </div>
            {hasPendingRemoteOrders && (
              <div className="flex items-center gap-2 bg-orange-500 text-white px-3 py-1.5 rounded-full animate-bounce">
                <Bell className="w-4 h-4" />
                <span className="font-semibold text-sm">{pendingCount} New Online Order{pendingCount > 1 ? 's' : ''}!</span>
              </div>
            )}
            {!isAudioEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={enableAudio}
                className="bg-yellow-100 border-yellow-400 text-yellow-800 hover:bg-yellow-200"
              >
                <VolumeX className="w-4 h-4 mr-1" />
                Click to Enable Sound
              </Button>
            )}
            {isAudioEnabled && (
              <div className="flex items-center gap-1 text-green-600 text-xs">
                <Volume2 className="w-3 h-3" />
                <span>Sound On</span>
              </div>
            )}
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
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                  activeTab === tab.id
                    ? "bg-primary-foreground text-primary"
                    : "bg-background"
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
          >
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>

          <Button 
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>

          <Button 
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem('pos_location_id');
              signOut();
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
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

      {/* Prep Time Modal */}
      <POSPrepTimeModal
        open={prepTimeModalOpen}
        onClose={() => {
          setPrepTimeModalOpen(false);
          setPendingPrepOrderId(null);
        }}
        onConfirm={handlePrepTimeConfirm}
        orderNumber={pendingPrepOrderId || ''}
      />

      {/* Settings Panel */}
      {showSettings && (
        <POSSettingsPanel
          locationId={currentLocationId}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Receipt Preview Modal */}
      {showReceiptPreview && selectedOrder && (
        <ReceiptPreviewModal
          order={selectedOrder}
          locationId={currentLocationId}
          onClose={() => setShowReceiptPreview(false)}
        />
      )}
    </div>
  );
};

export default POS;

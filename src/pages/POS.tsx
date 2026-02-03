import { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle, Package, Loader2, MapPin, LogOut, ChefHat, Bell, Settings, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOSOrders } from '@/hooks/usePOSOrders';
import { usePOSNotificationSound } from '@/hooks/usePOSNotificationSound';
import { usePrintReceipts } from '@/hooks/usePrintReceipts';
import { usePOSSession } from '@/hooks/usePOSSession';
import { Order, OrderStatus, CartItem, OrderType, OrderSource } from '@/types/menu';
import { POSOrderCard } from '@/components/pos/POSOrderCard';
import { POSOrderDetail } from '@/components/pos/POSOrderDetail';
import { POSNewOrderPanel } from '@/components/pos/POSNewOrderPanel';
import { POSCashPaymentModal } from '@/components/pos/POSCashPaymentModal';
import { POSPrepTimeModal } from '@/components/pos/POSPrepTimeModal';
import { POSLoginScreen } from '@/components/pos/POSLoginScreen';
import { POSSettingsPanel } from '@/components/pos/POSSettingsPanel';
import { POSEndDayModal } from '@/components/pos/POSEndDayModal';
import { POSReportsPanel } from '@/components/pos/POSReportsPanel';
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
  
  // Get location from localStorage (set during login) - wrapped in try-catch for native safety
  const [currentLocationId, setCurrentLocationId] = useState<string>(() => {
    try {
      return localStorage.getItem('pos_location_id') || 'calgary';
    } catch (e) {
      console.error('Failed to read location from localStorage:', e);
      return 'calgary';
    }
  });
  
  // Pass location to orders hook for filtering
  const { orders, loading, addOrder, updateOrderStatus, updatePaymentStatus, updateOrder, clearEndOfDayOrders } = usePOSOrders(currentLocationId);
  
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [pendingPaymentOrderId, setPendingPaymentOrderId] = useState<string | null>(null);
  const [prepTimeModalOpen, setPrepTimeModalOpen] = useState(false);
  const [pendingPrepOrderId, setPendingPrepOrderId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showEndDay, setShowEndDay] = useState(false);
  const [showReports, setShowReports] = useState(false);
  
  // Notification sound for new web/app orders
  const { hasPendingRemoteOrders, pendingCount, isAudioEnabled, enableAudio } = usePOSNotificationSound(orders);
  
  // Print receipts hook
  const { printKitchenTicket, printCustomerReceipt } = usePrintReceipts(currentLocationId);
  
  // POS Session management
  const { 
    activeSession, 
    todayCashSales, 
    startSession, 
    endSession, 
    getLastSessionEndCash,
    setupAutoLogout 
  } = usePOSSession(currentLocationId, user?.id);
  
  // Start session on login if none exists - wrapped in try-catch for native safety
  useEffect(() => {
    const initSession = async () => {
      try {
        if (user && !activeSession) {
          const lastCash = await getLastSessionEndCash();
          await startSession(lastCash);
        }
      } catch (error) {
        console.error('Failed to initialize POS session:', error);
        // Don't throw - just log the error to prevent crash
      }
    };
    initSession();
  }, [user, activeSession]);
  
  // Setup auto-logout at 2 AM Mountain Time
  useEffect(() => {
    if (activeSession) {
      try {
        return setupAutoLogout(async () => {
          try {
            // Auto end session with calculated cash
            const expectedCash = (activeSession?.start_cash || 0) + todayCashSales;
            await endSession(expectedCash);
            localStorage.removeItem('pos_location_id');
            signOut();
          } catch (error) {
            console.error('Auto-logout failed:', error);
          }
        });
      } catch (error) {
        console.error('Failed to setup auto-logout:', error);
      }
    }
  }, [activeSession, todayCashSales]);
  
  useEffect(() => {
    try {
      const savedLocation = localStorage.getItem('pos_location_id');
      if (savedLocation && savedLocation !== currentLocationId) {
        setCurrentLocationId(savedLocation);
      }
    } catch (error) {
      console.error('Failed to read location from localStorage:', error);
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
    const tax = subtotal * 0.05; // 5% GST (Alberta)
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
    
    // If changing to "preparing", check if it's an advance order
    if (status === 'preparing' && !prepTime) {
      const order = orders.find(o => o.id === selectedOrderId);
      
      // For advance orders with pickupTime, skip prep time modal and just accept
      if (order?.pickupTime) {
        updateOrderStatus(selectedOrderId, 'preparing', undefined, currentLocationId);
        setSelectedOrderId(null);
        return;
      }
      
      // For ASAP orders, show prep time modal
      setPendingPrepOrderId(selectedOrderId);
      setPrepTimeModalOpen(true);
      return;
    }
    
    updateOrderStatus(selectedOrderId, status, prepTime, currentLocationId);
    
    // Clear selection and go back to empty state after status change
    setSelectedOrderId(null);
  };

  const handlePrepTimeConfirm = (prepTime: number) => {
    if (pendingPrepOrderId) {
      updateOrderStatus(pendingPrepOrderId, 'preparing', prepTime, currentLocationId);
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
      printKitchenTicket(selectedOrder);
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
      {/* Header - Tablet optimized with larger touch targets */}
      <header className={cn(
        "border-b border-border py-3 px-5 flex-shrink-0 shadow-sm transition-colors",
        hasPendingRemoteOrders ? "bg-orange-100 animate-pulse" : "bg-white"
      )}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Top In Town Pizza" className="w-12 h-12 object-contain" />
            <div className="flex items-center gap-1.5">
              <MapPin className="w-5 h-5 text-primary" />
              <h1 className="font-serif text-xl font-bold text-foreground">{LOCATION_NAMES[currentLocationId] || currentLocationId}</h1>
            </div>
            {hasPendingRemoteOrders && (
              <div className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-full animate-bounce">
                <Bell className="w-5 h-5" />
                <span className="font-semibold text-base">{pendingCount} New Online Order{pendingCount > 1 ? 's' : ''}!</span>
              </div>
            )}
          </div>
          
          {/* Status Tabs - Larger for tablet touch */}
          <div className="flex gap-2 flex-1">
            {statusTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-lg text-base font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
                <span className={cn(
                  "text-sm px-2 py-1 rounded-full min-w-[24px] text-center",
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
            className="text-base px-5 py-3 h-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Order
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowEndDay(true)}
            className="text-orange-600 border-orange-300 hover:bg-orange-50 text-base px-4 py-3 h-auto"
          >
            <CalendarClock className="w-5 h-5 mr-2" />
            End Day
          </Button>

          <Button 
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            title="Settings"
            className="h-12 w-12"
          >
            <Settings className="w-6 h-6" />
          </Button>

          <Button 
            variant="ghost"
            size="icon"
            onClick={() => {
              localStorage.removeItem('pos_location_id');
              signOut();
            }}
            className="text-muted-foreground hover:text-foreground h-12 w-12"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Order List - Narrower to give more space for menu */}
        <div className="w-72 border-r border-border flex flex-col bg-secondary/20">
          <ScrollArea className="flex-1 p-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin" />
                <p className="text-lg">Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No orders</p>
              </div>
            ) : (
              <div className="space-y-3">
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
              locationId={currentLocationId}
              onUpdateStatus={handleUpdateStatus}
              onPayment={handlePayment}
              onPrintTicket={handlePrintTicket}
              onPrintReceipt={() => printCustomerReceipt(selectedOrder)}
              onEditOrder={handleEditOrder}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Package className="w-20 h-20 mx-auto mb-6 opacity-50" />
                <p className="text-xl">Select an order or create a new one</p>
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
          isAudioEnabled={isAudioEnabled}
          onEnableAudio={enableAudio}
        />
      )}

      {/* End of Day Modal */}
      <POSEndDayModal
        open={showEndDay}
        onClose={() => setShowEndDay(false)}
        onEndDay={async (enteredCash) => {
          const success = await endSession(enteredCash);
          if (success) {
            // Clear orders from POS view (keep advance orders)
            await clearEndOfDayOrders(currentLocationId);
            setShowEndDay(false);
            localStorage.removeItem('pos_location_id');
            signOut();
          }
        }}
        activeSession={activeSession}
        todayCashSales={todayCashSales}
      />

      {/* Reports Panel */}
      {showReports && (
        <POSReportsPanel
          locationId={currentLocationId}
          onClose={() => setShowReports(false)}
        />
      )}
    </div>
  );
};

export default POS;

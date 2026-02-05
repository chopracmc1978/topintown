import { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle, Package, Loader2, MapPin, LogOut, ChefHat, Bell, Settings, CalendarClock, DollarSign } from 'lucide-react';
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

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';

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
  
  // New order flow state: Create Order -> Prep Time -> Payment Type
  const [newOrderPending, setNewOrderPending] = useState<Order | null>(null);
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [pendingPrepTime, setPendingPrepTime] = useState<number>(20);
  
  // Notification sound for new web/app orders
  const { hasPendingRemoteOrders, pendingCount, isAudioEnabled, volume, toggleAudio, adjustVolume, playTestSound } = usePOSNotificationSound(orders);
  
  // Print receipts hook
  const { printKitchenTicket, printCustomerReceipt, openTill, hasPrinters } = usePrintReceipts(currentLocationId);
  
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
     discount?: number;
     couponCode?: string;
  }) => {
    const subtotal = orderData.items.reduce((sum, item) => sum + item.totalPrice, 0);
     const discount = orderData.discount || 0;
     const discountedSubtotal = Math.max(0, subtotal - discount);
     const tax = discountedSubtotal * 0.05; // 5% GST (Alberta)
     const total = discountedSubtotal + tax;

    const newOrder = await addOrder({
      ...orderData,
      subtotal,
      tax,
      total,
       discount,
       couponCode: orderData.couponCode,
      status: 'pending',
      paymentStatus: 'unpaid',
    }, currentLocationId);

    setShowNewOrder(false);
    
    // Step 2: Immediately show prep time modal for the new order
    if (newOrder) {
      setNewOrderPending(newOrder);
      setPendingPrepOrderId(newOrder.id);
      setPrepTimeModalOpen(true);
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
    // If this is a new order flow, save prep time and show payment choice
    if (newOrderPending) {
      console.log('New order flow - showing payment choice', newOrderPending);
      setPendingPrepTime(prepTime);
      setPrepTimeModalOpen(false);
      setShowPaymentChoice(true);
      return;
    }
    
    // Normal flow for existing orders
    if (pendingPrepOrderId) {
      updateOrderStatus(pendingPrepOrderId, 'preparing', prepTime, currentLocationId);
      setSelectedOrderId(null);
    }
    setPrepTimeModalOpen(false);
    setPendingPrepOrderId(null);
  };

  // Handle payment choice for new orders
  const handleNewOrderPaymentChoice = (method: 'cash' | 'card') => {
    if (!newOrderPending) return;
    
    // First, update order status to preparing with prep time
    updateOrderStatus(newOrderPending.id, 'preparing', pendingPrepTime, currentLocationId);
    
    if (method === 'cash') {
      // Show cash modal
      setPendingPaymentOrderId(newOrderPending.id);
      setShowPaymentChoice(false);
      setCashModalOpen(true);
    } else {
      // Card payment - mark as paid directly
      updatePaymentStatus(newOrderPending.id, 'paid', 'card');
      setShowPaymentChoice(false);
      setNewOrderPending(null);
      setSelectedOrderId(null);
    }
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
    
    // Clean up new order flow state
    if (newOrderPending) {
      setNewOrderPending(null);
      setSelectedOrderId(null);
    }
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
    <div className="h-screen w-screen flex flex-col p-2 overflow-hidden pos-no-focus-ring pos-hd-text pos-premium-theme" style={{ minHeight: '100vh', minWidth: '100vw', background: 'hsl(210, 20%, 98%)', paddingTop: 'max(env(safe-area-inset-top), 8px)' }}>
      {/* Full-screen solid background shield to prevent any bleed-through on Android tablets */}
      <div className="fixed inset-0 z-[-1]" style={{ background: 'hsl(210, 20%, 98%)' }} aria-hidden="true" />
      {/* Main POS container with rounded corners - full viewport */}
      <div className="flex-1 flex flex-col rounded-lg overflow-hidden shadow-md w-full h-full" style={{ background: 'hsl(0, 0%, 100%)' }}>
      {/* Header - Tablet optimized with larger touch targets */}
      <header className={cn(
        "border-b py-2 px-3 flex-shrink-0 shadow-sm transition-colors pos-header bg-white",
        hasPendingRemoteOrders ? "bg-orange-100 animate-pulse" : ""
      )}>
        <div className="flex items-center gap-2 w-full">
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                // Reset to home state - close all modals/panels
                setSelectedOrderId(null);
                setShowNewOrder(false);
                setEditingOrder(null);
                setShowSettings(false);
                setShowReports(false);
                setActiveTab('all');
              }}
              className={cn(
                "font-serif text-lg font-bold text-foreground hover:text-primary transition-colors cursor-pointer whitespace-nowrap",
                // Remove ALL default button chrome/highlight on mobile/legacy WebViews
                "appearance-none bg-transparent border-0 p-0 m-0",
                "hover:bg-transparent active:bg-transparent focus:bg-transparent focus-visible:bg-transparent",
                "outline-none focus:outline-none focus-visible:outline-none",
                "shadow-none focus:shadow-none"
              )}
            >
              {LOCATION_NAMES[currentLocationId] || currentLocationId}
            </button>
            {hasPendingRemoteOrders && (
              <div className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1.5 rounded-full animate-bounce text-sm">
                <Bell className="w-4 h-4" />
                <span className="font-semibold">{pendingCount} New!</span>
              </div>
            )}
          </div>
          
          {/* Status Tabs - Premium style */}
          <div className="flex gap-1.5 flex-1 justify-center">
            {statusTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "pos-tab-button flex items-center gap-1.5",
                  "outline-none focus:outline-none focus-visible:outline-none",
                  "border-none focus:ring-0 focus-visible:ring-0",
                  activeTab === tab.id ? "active" : ""
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full min-w-[22px] text-center",
                  activeTab === tab.id
                    ? "bg-white/25 text-white"
                    : "bg-white text-gray-600"
                )}>
                  {counts[tab.id as keyof typeof counts]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button 
              onClick={() => {
                setShowNewOrder(true);
                setSelectedOrderId(null);
              }}
              className="text-sm px-3 py-2 h-auto"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Order
            </Button>

            <Button 
              variant="outline"
              onClick={() => {
                if (hasPrinters) {
                  openTill();
                }
              }}
              className="text-sm px-2 py-2 h-auto border-green-300 text-green-700 hover:bg-green-50"
              title="Open Cash Drawer"
            >
              <DollarSign className="w-4 h-4 mr-1" />
              Till
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowEndDay(true)}
              className="text-orange-600 border-orange-300 hover:bg-orange-50 text-sm px-2 py-2 h-auto"
            >
              <CalendarClock className="w-4 h-4 mr-1" />
              End Day
            </Button>

            <Button 
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              title="Settings"
              className="h-10 w-10"
            >
              <Settings className="w-5 h-5" />
            </Button>

            <Button 
              variant="ghost"
              size="icon"
              onClick={() => {
                localStorage.removeItem('pos_location_id');
                signOut();
              }}
              className="text-muted-foreground hover:text-foreground h-10 w-10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Full remaining height */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel - Order List - Percentage based width */}
        <div className="w-[18%] min-w-[200px] max-w-[280px] border-r border-border flex flex-col bg-secondary/20">
          <ScrollArea className="flex-1 p-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
                <p className="text-sm">Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No orders</p>
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

        {/* Right Panel - Detail, Edit, or New Order - Fill remaining space */}
        <div className="flex-1 p-3 overflow-auto min-h-0">
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
          // Clean up new order flow if cancelled
          if (newOrderPending) {
            setNewOrderPending(null);
          }
        }}
         total={(() => {
           // For new order flow, use the pending order's total
           if (newOrderPending) {
             return newOrderPending.total;
           }
           if (!selectedOrder) return 0;
           // If order was already paid but edited, show balance due
           if (selectedOrder.paymentStatus === 'paid' && selectedOrder.amountPaid !== undefined) {
             return Math.max(0, selectedOrder.total - selectedOrder.amountPaid);
           }
           return selectedOrder.total;
         })()}
        onConfirm={handlePaymentComplete}
        onCardPayment={() => {
          // Switch from cash to card payment
          setCashModalOpen(false);
          if (newOrderPending) {
            // For new order flow - mark as paid with card
            updatePaymentStatus(newOrderPending.id, 'paid', 'card');
            setNewOrderPending(null);
            setSelectedOrderId(null);
            setPendingPaymentOrderId(null);
          } else if (pendingPaymentOrderId) {
            // For existing order flow
            updatePaymentStatus(pendingPaymentOrderId, 'paid', 'card');
            setPendingPaymentOrderId(null);
          }
        }}
      />

      {/* Prep Time Modal */}
      <POSPrepTimeModal
        open={prepTimeModalOpen}
        onClose={() => {
          setPrepTimeModalOpen(false);
          setPendingPrepOrderId(null);
          // Only clean up if we're NOT going to payment choice (user cancelled)
          if (newOrderPending && !showPaymentChoice) {
            setNewOrderPending(null);
            // Order stays pending unpaid
          }
        }}
        onConfirm={handlePrepTimeConfirm}
        orderNumber={newOrderPending?.id || pendingPrepOrderId || ''}
      />

      {/* Payment Choice Dialog for New Orders */}
      <AlertDialog open={showPaymentChoice && newOrderPending !== null} onOpenChange={(open) => {
        if (!open) {
          // If cancelled, still proceed with preparing (just unpaid)
          if (newOrderPending) {
            updateOrderStatus(newOrderPending.id, 'preparing', pendingPrepTime, currentLocationId);
            setNewOrderPending(null);
            setSelectedOrderId(null);
          }
          setShowPaymentChoice(false);
        }
      }}>
        <AlertDialogContent 
          className="sm:max-w-md" 
          style={{ backgroundColor: '#ffffff' }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <DollarSign className="w-6 h-6 text-primary" />
              Select Payment Type
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Order {newOrderPending?.id ?? ''} - ${(newOrderPending?.total ?? 0).toFixed(2)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex gap-4 py-6">
            <Button
              variant="outline"
              className="flex-1 h-24 text-xl font-semibold border-2 hover:border-green-500 hover:bg-green-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNewOrderPaymentChoice('cash');
              }}
            >
              <DollarSign className="w-8 h-8 mr-2 text-green-600" />
              Cash
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-24 text-xl font-semibold border-2 hover:border-blue-500 hover:bg-blue-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNewOrderPaymentChoice('card');
              }}
            >
              <svg className="w-8 h-8 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2"/>
                <path d="M2 10h20" strokeWidth="2"/>
              </svg>
              Card
            </Button>
          </div>
          
          <div className="flex justify-center">
            <Button
              variant="ghost"
              className="w-full"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Proceed without payment (unpaid order)
                if (newOrderPending) {
                  updateOrderStatus(newOrderPending.id, 'preparing', pendingPrepTime, currentLocationId);
                  setNewOrderPending(null);
                  setSelectedOrderId(null);
                }
                setShowPaymentChoice(false);
              }}
            >
              Skip - Leave Unpaid
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Panel */}
      {showSettings && (
        <POSSettingsPanel
          locationId={currentLocationId}
          onClose={() => setShowSettings(false)}
          isAudioEnabled={isAudioEnabled}
          volume={volume}
          onToggleAudio={toggleAudio}
          onVolumeChange={adjustVolume}
          onTestSound={playTestSound}
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
    </div>
  );
};

export default POS;

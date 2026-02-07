import { useState, useEffect, useMemo } from 'react';
import { Plus, Clock, CheckCircle, Package, Loader2, MapPin, LogOut, ChefHat, Bell, Settings, CalendarClock } from 'lucide-react';
import { DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOSOrders } from '@/hooks/usePOSOrders';
import { usePOSNotificationSound } from '@/hooks/usePOSNotificationSound';
import { usePrintReceipts } from '@/hooks/usePrintReceipts';
import { usePOSSession } from '@/hooks/usePOSSession';
import { Order, OrderStatus, CartItem, OrderType, OrderSource } from '@/types/menu';
import { POSOrderCard, OrderRewardInfo } from '@/components/pos/POSOrderCard';
import { POSOrderDetail } from '@/components/pos/POSOrderDetail';
import { POSNewOrderPanel } from '@/components/pos/POSNewOrderPanel';
import { POSCashPaymentModal } from '@/components/pos/POSCashPaymentModal';
import { POSPointsPaymentModal } from '@/components/pos/POSPointsPaymentModal';
import { POSPaymentChoiceModal } from '@/components/pos/POSPaymentChoiceModal';
import { POSPrepTimeModal } from '@/components/pos/POSPrepTimeModal';
import { POSLoginScreen } from '@/components/pos/POSLoginScreen';
import { POSSettingsPanel } from '@/components/pos/POSSettingsPanel';
import { POSEndDayModal } from '@/components/pos/POSEndDayModal';
import { POSReportsPanel } from '@/components/pos/POSReportsPanel';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';

import { cn } from '@/lib/utils';


// Custom cash-register icon for Till button
const CashRegisterIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Register body */}
    <rect x="3" y="10" width="18" height="10" rx="1" />
    {/* Display screen */}
    <rect x="12" y="12" width="7" height="4" rx="0.5" />
    {/* Keypad buttons */}
    <rect x="5" y="12" width="2" height="2" rx="0.3" />
    <rect x="8" y="12" width="2" height="2" rx="0.3" />
    <rect x="5" y="15" width="2" height="2" rx="0.3" />
    <rect x="8" y="15" width="2" height="2" rx="0.3" />
    {/* Receipt paper */}
    <path d="M6 10V5a1 1 0 011-1h4a1 1 0 011 1v5" />
    <line x1="7" y1="6" x2="11" y2="6" />
    <line x1="7" y1="8" x2="10" y2="8" />
  </svg>
);

const statusTabs = [
  { id: 'all', label: 'All', icon: Package },
  { id: 'pending', label: 'New', icon: Clock },
  { id: 'advance', label: 'Advance', icon: CalendarClock },
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
  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [showBalancePayment, setShowBalancePayment] = useState(false);
  const [balanceRemaining, setBalanceRemaining] = useState<number>(0);
  const [pointsDiscountApplied, setPointsDiscountApplied] = useState<{ pointsUsed: number; dollarValue: number } | null>(null);
  const [existingPointsOrder, setExistingPointsOrder] = useState<Order | null>(null);
  
  // Notification sound for new web/app orders
  const { hasPendingRemoteOrders, pendingCount, hasAdvanceAlerts, advanceAlertCount, isAudioEnabled, volume, toggleAudio, adjustVolume, playTestSound } = usePOSNotificationSound(orders);
  
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
  
  // Fetch reward points for all orders' phone numbers
  const [rewardsMap, setRewardsMap] = useState<Record<string, OrderRewardInfo>>({});
  
  useEffect(() => {
    const fetchRewards = async () => {
      // Collect unique phone numbers from orders
      const phones = [...new Set(orders.map(o => o.customerPhone).filter(Boolean))];
      if (phones.length === 0) {
        setRewardsMap({});
        return;
      }
      
      const { data } = await supabase
        .from('customer_rewards')
        .select('phone, points, lifetime_points')
        .in('phone', phones);
      
      if (data) {
        const map: Record<string, OrderRewardInfo> = {};
        data.forEach(r => {
          map[r.phone] = { lifetime_points: r.lifetime_points, points: r.points };
        });
        setRewardsMap(map);
      }
    };
    fetchRewards();
  }, [orders]);

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

  // Helper: is this an advance order (accepted but waiting for scheduled time)
  const isAdvanceOrder = (o: Order) => 
    o.status === 'preparing' && o.pickupTime && new Date(o.pickupTime) > new Date();

  // Filter orders
  const filteredOrders = activeTab === 'all'
    ? orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
    : activeTab === 'delivered'
    ? orders.filter(o => o.status === 'delivered')
    : activeTab === 'advance'
    ? orders.filter(o => isAdvanceOrder(o))
    : activeTab === 'preparing'
    ? orders.filter(o => o.status === 'preparing' && !isAdvanceOrder(o))
    : orders.filter(o => o.status === activeTab);

  const selectedOrder = selectedOrderId 
    ? orders.find(o => o.id === selectedOrderId) 
    : null;

  // Counts
  const advanceCount = orders.filter(o => isAdvanceOrder(o)).length;
  const counts = {
    all: orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length,
    pending: orders.filter(o => o.status === 'pending').length,
    advance: advanceCount,
    preparing: orders.filter(o => o.status === 'preparing' && !isAdvanceOrder(o)).length,
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
     rewardsUsed?: number;
     rewardsDiscount?: number;
     pickupTime?: Date;
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
      pickupTime: orderData.pickupTime,
    }, currentLocationId);

    // If rewards were used, deduct points from customer's balance
    if (newOrder && orderData.rewardsUsed && orderData.rewardsDiscount && orderData.customerPhone) {
      try {
        const { data: existing } = await supabase
          .from('customer_rewards')
          .select('*')
          .eq('phone', orderData.customerPhone)
          .single();

        if (existing && existing.points >= orderData.rewardsUsed) {
          await supabase
            .from('customer_rewards')
            .update({ points: existing.points - orderData.rewardsUsed })
            .eq('id', existing.id);

          // Record redemption in history
          const { data: orderRecord } = await supabase
            .from('orders')
            .select('id')
            .eq('order_number', newOrder.id)
            .maybeSingle();

          await supabase
            .from('rewards_history')
            .insert({
              phone: orderData.customerPhone,
              customer_id: existing.customer_id || null,
              order_id: orderRecord?.id || null,
              points_change: -orderData.rewardsUsed,
              transaction_type: 'redeemed',
              description: `Redeemed ${orderData.rewardsUsed} pts for $${orderData.rewardsDiscount.toFixed(2)} discount`,
            });

          // Also store rewards info on the order
          if (orderRecord) {
            await supabase
              .from('orders')
              .update({
                rewards_used: orderData.rewardsUsed,
                rewards_discount: orderData.rewardsDiscount,
              })
              .eq('id', orderRecord.id);
          }
        }
      } catch (err) {
        console.error('Error deducting reward points:', err);
      }
    }

    setShowNewOrder(false);
    
    // Step 2: For scheduled orders, skip prep time and go to payment
    if (newOrder) {
      if (orderData.pickupTime) {
        // Scheduled order: skip prep time, go directly to payment choice
        setNewOrderPending(newOrder);
        setPendingPrepTime(0); // No prep time for advance orders
        setShowPaymentChoice(true);
      } else {
        // ASAP order: show prep time modal
        setNewOrderPending(newOrder);
        setPendingPrepOrderId(newOrder.id);
        setPrepTimeModalOpen(true);
      }
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
  const handleNewOrderPaymentChoice = async (method: 'cash' | 'card' | 'points', discountInfo?: { discount: number; couponCode?: string }) => {
    if (!newOrderPending) return;

    let updatedOrder = newOrderPending;

    // If discount was applied at payment time, update the order
    if (discountInfo && discountInfo.discount > 0) {
      const existingDiscount = newOrderPending.discount || 0;
      const totalDiscount = existingDiscount + discountInfo.discount;
      const discountedSubtotal = Math.max(0, newOrderPending.subtotal - totalDiscount);
      const newTax = discountedSubtotal * 0.05;
      const newTotal = discountedSubtotal + newTax;

      await supabase
        .from('orders')
        .update({
          discount: totalDiscount,
          coupon_code: discountInfo.couponCode || newOrderPending.couponCode || null,
          tax: newTax,
          total: newTotal,
        })
        .eq('order_number', newOrderPending.id);

      updatedOrder = { ...newOrderPending, discount: totalDiscount, couponCode: discountInfo.couponCode || newOrderPending.couponCode, tax: newTax, total: newTotal };
      setNewOrderPending(updatedOrder);
    }
    
    // First, update order status to preparing with prep time
    updateOrderStatus(updatedOrder.id, 'preparing', pendingPrepTime, currentLocationId);
    
    if (method === 'cash') {
      // Show cash modal
      setPendingPaymentOrderId(updatedOrder.id);
      setShowPaymentChoice(false);
      setCashModalOpen(true);
    } else if (method === 'points') {
      // Show points redemption modal
      setShowPaymentChoice(false);
      setPointsModalOpen(true);
    } else {
      // Card payment - mark as paid directly
      updatePaymentStatus(updatedOrder.id, 'paid', method);
      setShowPaymentChoice(false);
      setNewOrderPending(null);
      setSelectedOrderId(null);
    }
  };

  // Handle points applied — check if remaining balance needs cash/card
  const handlePointsApplied = async (pointsUsed: number, dollarValue: number, remainingBalance: number) => {
    setPointsModalOpen(false);
    
    // Determine which order this applies to
    const targetOrder = newOrderPending || existingPointsOrder;
    if (!targetOrder) return;

    // Store points discount on order (only if points were actually used)
    if (pointsUsed > 0) {
      await supabase
        .from('orders')
        .update({ 
          rewards_used: pointsUsed, 
          rewards_discount: dollarValue,
        })
        .eq('order_number', targetOrder.id);

      setPointsDiscountApplied({ pointsUsed, dollarValue });
    }
    
    if (remainingBalance <= 0.01) {
      // Fully paid with points
      updatePaymentStatus(targetOrder.id, 'paid', 'points');
      setPointsDiscountApplied(null);
      setNewOrderPending(null);
      setExistingPointsOrder(null);
      setSelectedOrderId(null);
    } else {
      // Show balance payment dialog (Cash / Card / Skip)
      setBalanceRemaining(remainingBalance);
      setShowBalancePayment(true);
    }
  };

  const handleBalancePayment = (method: 'cash' | 'card' | 'skip') => {
    setShowBalancePayment(false);
    const targetOrder = newOrderPending || existingPointsOrder;
    if (!targetOrder) return;

    if (method === 'skip') {
      // Leave unpaid
      setPointsDiscountApplied(null);
      setNewOrderPending(null);
      setExistingPointsOrder(null);
      setSelectedOrderId(null);
    } else if (method === 'cash') {
      setPendingPaymentOrderId(targetOrder.id);
      setCashModalOpen(true);
    } else {
      // Card — mark as paid
      updatePaymentStatus(targetOrder.id, 'paid', 'card');
      setPointsDiscountApplied(null);
      setNewOrderPending(null);
      setExistingPointsOrder(null);
      setSelectedOrderId(null);
    }
  };

  const handlePayment = (method: 'cash' | 'card' | 'points') => {
    if (!selectedOrderId) return;

    if (method === 'cash') {
      setPendingPaymentOrderId(selectedOrderId);
      setCashModalOpen(true);
    } else if (method === 'points') {
      // Open points modal for existing order
      const order = orders.find(o => o.id === selectedOrderId);
      if (order) {
        setExistingPointsOrder(order);
        setPointsModalOpen(true);
      }
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
    setPointsDiscountApplied(null);
    
    // Clean up order flow state
    if (newOrderPending) {
      setNewOrderPending(null);
      setSelectedOrderId(null);
    }
    if (existingPointsOrder) {
      setExistingPointsOrder(null);
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
    <div className="h-screen w-screen flex flex-col p-2 overflow-hidden pos-no-focus-ring pos-hd-text pos-premium-theme" style={{ minHeight: '100vh', minWidth: '100vw', background: 'hsl(220, 26%, 14%)', paddingTop: 'max(env(safe-area-inset-top), 8px)' }}>
      {/* Full-screen solid background shield to prevent any bleed-through on Android tablets */}
      <div className="fixed inset-0 z-[-1]" style={{ background: 'hsl(220, 26%, 14%)' }} aria-hidden="true" />
      {/* Main POS container with rounded corners - full viewport */}
      <div className="flex-1 flex flex-col rounded-lg overflow-hidden shadow-md w-full h-full" style={{ background: 'hsl(220, 26%, 14%)' }}>
      {/* Header - Tablet optimized with larger touch targets */}
      <header className={cn(
        "border-b py-2 px-3 flex-shrink-0 shadow-sm transition-colors pos-header",
        hasPendingRemoteOrders ? "!bg-orange-900/50 animate-pulse" : "",
        hasAdvanceAlerts && !hasPendingRemoteOrders ? "!bg-amber-900/50 animate-pulse" : ""
      )}>
        <div className="flex items-center gap-2 w-full">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              title="Home"
              onPointerDown={(e) => {
                // Prevent any native tap highlight/selection artifacts
                e.preventDefault();
              }}
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
                "font-serif text-lg font-bold transition-colors cursor-pointer whitespace-nowrap",
                // Ensure absolutely no outline/border/ring can render
                "bg-transparent border-0 p-0 m-0 outline-none ring-0 shadow-none",
                "hover:bg-transparent active:bg-transparent",
                "select-none [-webkit-tap-highlight-color:transparent] [-webkit-user-select:none] [-webkit-touch-callout:none]"
              )}
              style={{ outline: 'none', border: 'none', boxShadow: 'none', color: 'hsl(210, 20%, 98%)' }}
            >
              {LOCATION_NAMES[currentLocationId] || currentLocationId}
            </span>
            {hasPendingRemoteOrders && (
              <div className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1.5 rounded-full animate-bounce text-sm">
                <Bell className="w-4 h-4" />
                <span className="font-semibold">{pendingCount} New!</span>
              </div>
            )}
            {hasAdvanceAlerts && !hasPendingRemoteOrders && (
              <div className="flex items-center gap-1 bg-amber-500 text-white px-3 py-1.5 rounded-full animate-bounce text-sm">
                <CalendarClock className="w-4 h-4" />
                <span className="font-semibold">{advanceAlertCount} Due Soon!</span>
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
                    : "bg-gray-700 text-gray-300"
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
              className="text-sm px-3 py-2 h-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Order
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                // Always show/call; any errors are handled silently in /pos.
                openTill();
              }}
              className={cn(
                "h-10 w-10 shrink-0",
                "border-green-500 text-green-400 hover:bg-green-900/30",
                "outline-none focus:outline-none focus-visible:outline-none",
                "ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                "shadow-none focus:shadow-none focus-visible:shadow-none",
                "select-none [-webkit-tap-highlight-color:transparent]"
              )}
              title="Till"
              aria-label="Till"
            >
              <CashRegisterIcon className="w-10 h-10" />
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowEndDay(true)}
              className="text-orange-400 border-orange-500 hover:bg-orange-900/30 text-sm px-2 py-2 h-auto"
            >
              <CalendarClock className="w-4 h-4 mr-1" />
              End Day
            </Button>

            <Button 
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              title="Settings"
              className="h-10 w-10 text-gray-300 hover:text-white hover:bg-gray-700/50"
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
              className="text-gray-400 hover:text-white hover:bg-gray-700/50 h-10 w-10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Full remaining height */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel - Order List - Percentage based width */}
        <div className="w-[18%] min-w-[200px] max-w-[280px] border-r flex flex-col" style={{ background: 'hsl(220, 25%, 16%)', borderColor: 'hsl(220, 20%, 28%)' }}>
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
                    rewardInfo={order.customerPhone ? rewardsMap[order.customerPhone] : null}
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
        <div className="flex-1 p-3 overflow-auto min-h-0" style={{ background: 'hsl(220, 26%, 14%)' }}>
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
            <div className="h-full flex items-center justify-center" style={{ color: 'hsl(215, 15%, 55%)' }}>
              <div className="text-center">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: 'hsl(215, 15%, 45%)' }} />
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
      <POSPaymentChoiceModal
        open={showPaymentChoice && newOrderPending !== null}
        orderNumber={newOrderPending?.id ?? ''}
        orderTotal={newOrderPending?.total ?? 0}
        orderSubtotal={newOrderPending?.subtotal ?? 0}
        onPaymentChoice={handleNewOrderPaymentChoice}
        onSkip={() => {
          if (newOrderPending) {
            updateOrderStatus(newOrderPending.id, 'preparing', pendingPrepTime, currentLocationId);
            setNewOrderPending(null);
            setSelectedOrderId(null);
          }
          setShowPaymentChoice(false);
        }}
      />

      {/* Points Payment Modal */}
      <POSPointsPaymentModal
        open={pointsModalOpen}
        orderTotal={(newOrderPending || existingPointsOrder)?.total ?? 0}
        customerPhone={(newOrderPending || existingPointsOrder)?.customerPhone ?? ''}
        orderId={(newOrderPending || existingPointsOrder)?.id ?? ''}
        customerId={(newOrderPending || existingPointsOrder)?.customerId}
        onPointsApplied={handlePointsApplied}
        onClose={() => {
          setPointsModalOpen(false);
          setExistingPointsOrder(null);
          // Go back to payment choice only for new orders
          if (newOrderPending) {
            setShowPaymentChoice(true);
          }
        }}
      />

      {/* Balance Payment Dialog (after points applied) */}
      {showBalancePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-xl border shadow-2xl p-6" style={{ backgroundColor: 'hsl(220, 25%, 18%)', borderColor: 'hsl(220, 20%, 28%)', color: '#e2e8f0' }}>
            <h2 className="text-xl font-bold text-center mb-2">Remaining Balance</h2>
            {pointsDiscountApplied && (
              <p className="text-center text-sm mb-1" style={{ color: '#94a3b8' }}>
                Points discount: <span style={{ color: '#22c55e' }}>-${pointsDiscountApplied.dollarValue.toFixed(2)}</span>
              </p>
            )}
            <p className="text-center text-3xl font-bold mb-6" style={{ color: '#f87171' }}>
              ${balanceRemaining.toFixed(2)}
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                className="h-20 text-xl font-semibold rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1"
                style={{ backgroundColor: 'hsl(220, 26%, 22%)', borderColor: 'hsl(220, 20%, 28%)', color: '#e2e8f0' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#22c55e'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'hsl(220, 20%, 28%)'; }}
                onClick={() => handleBalancePayment('cash')}
              >
                <DollarSign className="w-7 h-7" style={{ color: '#22c55e' }} />
                Cash
              </button>
              <button
                className="h-20 text-xl font-semibold rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1"
                style={{ backgroundColor: 'hsl(220, 26%, 22%)', borderColor: 'hsl(220, 20%, 28%)', color: '#e2e8f0' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0ea5e9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'hsl(220, 20%, 28%)'; }}
                onClick={() => handleBalancePayment('card')}
              >
                <svg className="w-7 h-7" style={{ color: '#0ea5e9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2"/>
                  <path d="M2 10h20" strokeWidth="2"/>
                </svg>
                Card
              </button>
            </div>
            
            <button
              className="w-full py-3 rounded-lg font-medium transition-all"
              style={{ color: '#94a3b8' }}
              onClick={() => handleBalancePayment('skip')}
            >
              Skip - Leave Unpaid
            </button>
          </div>
        </div>
      )}


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

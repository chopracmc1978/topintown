import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Clock, CheckCircle, Package, Loader2, MapPin, LogOut, ChefHat, Bell, Settings, CalendarClock, User } from 'lucide-react';
import { DollarSign } from 'lucide-react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePOSOrders } from '@/hooks/usePOSOrders';
import { usePOSNotificationSound } from '@/hooks/usePOSNotificationSound';
import { usePrintReceipts } from '@/hooks/usePrintReceipts';
import { useWakeLock } from '@/hooks/useWakeLock';
import { usePOSSession } from '@/hooks/usePOSSession';
import { usePOSStaff, type POSStaffMember } from '@/hooks/usePOSStaff';
import { Order, OrderStatus, CartItem, OrderType, OrderSource } from '@/types/menu';
import { POSOrderCard, OrderRewardInfo } from '@/components/pos/POSOrderCard';
import { POSOrderDetail } from '@/components/pos/POSOrderDetail';
import { POSNewOrderPanel } from '@/components/pos/POSNewOrderPanel';
import { POSCashPaymentModal } from '@/components/pos/POSCashPaymentModal';
import { POSPointsPaymentModal } from '@/components/pos/POSPointsPaymentModal';
import { POSPaymentChoiceModal } from '@/components/pos/POSPaymentChoiceModal';
import { POSRefundChoiceModal } from '@/components/pos/POSRefundChoiceModal';
import { POSPrepTimeModal } from '@/components/pos/POSPrepTimeModal';
import { POSLoginScreen } from '@/components/pos/POSLoginScreen';
import { POSStaffPinScreen } from '@/components/pos/POSStaffPinScreen';
import { POSSettingsPanel } from '@/components/pos/POSSettingsPanel';
import { POSEndDayModal } from '@/components/pos/POSEndDayModal';
import { POSStaffReportCard } from '@/components/pos/POSStaffReportCard';
import { POSReportsPanel } from '@/components/pos/POSReportsPanel';
import { POSSettingsPinModal } from '@/components/pos/POSSettingsPinModal';
import { useAuth } from '@/hooks/useAuth';
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';
import tillIcon from '@/assets/till-icon.png';

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

/**
 * Auth gate: renders the login screen or loading spinner BEFORE mounting
 * any heavy POS hooks (orders, notifications, printing, sessions).
 * This prevents hook failures from causing a white screen on native.
 */
const POS = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [currentLocationId, setCurrentLocationId] = useState<string>(() => {
    try {
      return localStorage.getItem('pos_location_id') || 'calgary';
    } catch (e) {
      console.error('Failed to read location from localStorage:', e);
      return 'calgary';
    }
  });
  const [activeStaff, setActiveStaff] = useState<POSStaffMember | null>(null);
  // Track if this is a fresh login (user changed) so we skip localStorage restore
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  // Restore active staff from localStorage ONLY if same user session persists
  useEffect(() => {
    if (!user) {
      setActiveStaff(null);
      setLastUserId(null);
      return;
    }

    if (lastUserId && lastUserId === user.id) {
      // Same user, don't reset
      return;
    }

    if (!lastUserId) {
      // First load - check if we have a stored staff AND it's the same user
      try {
        const savedUserId = localStorage.getItem('pos_auth_user_id');
        const savedStaff = localStorage.getItem('pos_active_staff');
        if (savedUserId === user.id && savedStaff) {
          setActiveStaff(JSON.parse(savedStaff));
        } else {
          // Different user or no saved data - force PIN screen
          setActiveStaff(null);
          localStorage.removeItem('pos_active_staff');
        }
      } catch {
        setActiveStaff(null);
      }
      // Save current user id
      localStorage.setItem('pos_auth_user_id', user.id);
      setLastUserId(user.id);
    }
  }, [user, lastUserId]);

  // Sync location from localStorage on login
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

  // POS staff hook — pass empty string when not authed so hook stays in loading
  // state until user logs in. When user authenticates, locationId switches from
  // '' → 'calgary' which triggers the fetch with proper RLS credentials.
  const { staff, verifyPin, loading: staffLoading } = usePOSStaff(user ? currentLocationId : '');

  // Persist active staff to localStorage
  useEffect(() => {
    try {
      if (activeStaff) {
        localStorage.setItem('pos_active_staff', JSON.stringify(activeStaff));
      } else {
        localStorage.removeItem('pos_active_staff');
      }
    } catch {}
  }, [activeStaff]);

  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <POSLoginScreen onLoginSuccess={() => {
      try {
        const savedLocation = localStorage.getItem('pos_location_id');
        if (savedLocation) {
          setCurrentLocationId(savedLocation);
        }
      } catch {}
      // Clear any previous staff session so PIN screen shows
      setActiveStaff(null);
      localStorage.removeItem('pos_active_staff');
      localStorage.removeItem('pos_auth_user_id');
    }} />;
  }

  // Show loader while staff data is loading (prevent falling through to dashboard)
  if (staffLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'hsl(220, 26%, 14%)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#e2e8f0' }} />
      </div>
    );
  }

  // If staff members exist for this location, require PIN login
  if (staff.length > 0 && !activeStaff) {
    return (
      <POSStaffPinScreen
        locationName={LOCATION_NAMES[currentLocationId] || currentLocationId}
        onPinVerified={(staffMember) => setActiveStaff(staffMember)}
        onBack={() => {
          localStorage.removeItem('pos_location_id');
          signOut();
        }}
        verifyPin={verifyPin}
      />
    );
  }

  // Only mount the heavy dashboard AFTER authentication succeeds
  return (
    <ErrorBoundary renderFallback={(error, retry) => (
      <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: 'hsl(220, 26%, 14%)', color: '#e2e8f0' }}>
        <div className="text-center max-w-md space-y-4">
          <h1 className="text-xl font-semibold">POS failed to load</h1>
          <p className="text-sm opacity-70">An error occurred while loading the dashboard.</p>
          {error && (
            <p className="text-xs opacity-50 bg-black/30 p-3 rounded text-left overflow-auto max-h-32 break-words">
              {error.message}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button onClick={retry} className="bg-gray-600 text-white px-6 py-2 rounded-lg">Try Again</button>
            <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-lg">Reload</button>
          </div>
        </div>
      </div>
    )}>
      <POSDashboard
        user={user}
        signOut={async () => {
          setActiveStaff(null);
          localStorage.removeItem('pos_active_staff');
          localStorage.removeItem('pos_auth_user_id');
          await signOut();
        }}
        currentLocationId={currentLocationId}
        setCurrentLocationId={setCurrentLocationId}
        activeStaff={activeStaff}
        onStaffLogout={() => {
          setActiveStaff(null);
          localStorage.removeItem('pos_active_staff');
        }}
      />
    </ErrorBoundary>
  );
};

/**
 * The heavy POS dashboard. Only mounted when user is authenticated.
 * All hooks (orders, notifications, printing, sessions) live here.
 */
const POSDashboard = ({
  user,
  signOut,
  currentLocationId,
  setCurrentLocationId,
  activeStaff,
  onStaffLogout,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  signOut: () => Promise<void>;
  currentLocationId: string;
  setCurrentLocationId: (id: string) => void;
  activeStaff: POSStaffMember | null;
  onStaffLogout: () => void;
}) => {
  console.log('[POSDashboard] Mount — user:', user?.id, 'loc:', currentLocationId, 'staff:', activeStaff?.name);
  // Pass location to orders hook for filtering
  const { orders, loading, addOrder, updateOrderStatus, updatePaymentStatus, updateOrder, clearEndOfDayOrders, startPreparingAdvanceOrder, refetch } = usePOSOrders(currentLocationId);
  
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [incomingCallPhone, setIncomingCallPhone] = useState<string>('');
  const [incomingCallName, setIncomingCallName] = useState<string>('');
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [pendingPaymentOrderId, setPendingPaymentOrderId] = useState<string | null>(null);
  const [prepTimeModalOpen, setPrepTimeModalOpen] = useState(false);
  const [pendingPrepOrderId, setPendingPrepOrderId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showEndDay, setShowEndDay] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showStaffReport, setShowStaffReport] = useState(false);
  const [showSettingsPin, setShowSettingsPin] = useState(false);
  const [settingsPin, setSettingsPin] = useState<string | null>(null);
  const [settingsPinLoaded, setSettingsPinLoaded] = useState(false);
  
  // New order flow state
  const [newOrderPending, setNewOrderPending] = useState<Order | null>(null);
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [pendingPrepTime, setPendingPrepTime] = useState<number>(20);
  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [showBalancePayment, setShowBalancePayment] = useState(false);
  const [balanceRemaining, setBalanceRemaining] = useState<number>(0);
  const [pointsDiscountApplied, setPointsDiscountApplied] = useState<{ pointsUsed: number; dollarValue: number } | null>(null);
  const [existingPointsOrder, setExistingPointsOrder] = useState<Order | null>(null);
  
  // Refund flow state
  const [showRefundChoice, setShowRefundChoice] = useState(false);
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
  
  // Notification sound for new web/app orders
  const { hasPendingRemoteOrders, pendingCount, hasAdvanceAlerts, advanceAlertCount, isAudioEnabled, volume, toggleAudio, adjustVolume, playTestSound } = usePOSNotificationSound(orders);
  
  // Keep screen awake
  const wakeLock = useWakeLock();

  // Incoming phone call detection
  const { incomingCall, handleCall, dismissCall } = useIncomingCalls(currentLocationId);

  // Auto-open new order when incoming call detected
  useEffect(() => {
    if (incomingCall && !showNewOrder && !editingOrder) {
      setIncomingCallPhone(incomingCall.caller_phone);
      setIncomingCallName(incomingCall.caller_name || '');
      setShowNewOrder(true);
      setSelectedOrderId(null);
      handleCall(incomingCall.id);
    }
  }, [incomingCall, showNewOrder, editingOrder]);

  // Print receipts hook
  const { printKitchenTicket, printCustomerReceipt, openTill, hasPrinters } = usePrintReceipts(currentLocationId);
  
  // POS Session management
  const { 
    activeSession, 
    todayCashSales,
    todayCardSales,
    todayWebAppSales,
    startSession, 
    endSession, 
    getLastSessionEndCash,
    setupAutoLogout 
  } = usePOSSession(currentLocationId, user?.id);
  
  // Start session on login if none exists
  useEffect(() => {
    const initSession = async () => {
      try {
        if (user && !activeSession) {
          const lastCash = await getLastSessionEndCash();
          await startSession(lastCash, activeStaff?.id);
        }
      } catch (error) {
        console.error('Failed to initialize POS session:', error);
      }
    };
    initSession();
  }, [user, activeSession]);

  // Fetch settings PIN for current location (location-level, not per-user)
  useEffect(() => {
    const fetchSettingsPin = async () => {
      if (!user) return;
      try {
        const { data: responseData, error } = await supabase.functions.invoke('manage-users', {
          body: { action: 'getLocationPin', locationId: currentLocationId },
        });
        console.log('[POS] Location PIN lookup for:', currentLocationId, 'result:', responseData, 'error:', error);
        if (responseData?.pin) {
          setSettingsPin(responseData.pin);
        } else {
          setSettingsPin(null);
        }
      } catch (err) {
        console.error('Error fetching settings pin:', err);
      } finally {
        setSettingsPinLoaded(true);
      }
    };
    fetchSettingsPin();
  }, [user, currentLocationId]);
  
  // Setup auto-logout at 2 AM Mountain Time
  useEffect(() => {
    if (activeSession) {
      try {
        return setupAutoLogout(async () => {
          try {
            const expectedCash = (activeSession?.start_cash || 0) + todayCashSales;
            await endSession(expectedCash);
            // Return to staff PIN screen, keep store login alive
            onStaffLogout();
          } catch (error) {
            console.error('Auto-logout failed:', error);
          }
        });
      } catch (error) {
        console.error('Failed to setup auto-logout:', error);
      }
    }
  }, [activeSession, todayCashSales]);
  
  // Fetch reward points for all orders' phone numbers + per-order earned/used
  const [rewardsMap, setRewardsMap] = useState<Record<string, OrderRewardInfo>>({});
  const [rewardsVersion, setRewardsVersion] = useState(0);
  
  useEffect(() => {
    const fetchRewards = async () => {
      const phones = [...new Set(orders.map(o => o.customerPhone).filter(Boolean))];
      if (phones.length === 0) {
        setRewardsMap({});
        return;
      }
      
      // Fetch current balances
      const { data: rewardsData } = await supabase
        .from('customer_rewards')
        .select('phone, points, lifetime_points')
        .in('phone', phones);

      // Fetch per-order reward history for all visible orders
      const orderDbIds = orders.map(o => o.dbId).filter(Boolean) as string[];
      let historyByOrder: Record<string, { earned: number; used: number }> = {};
      
      if (orderDbIds.length > 0) {
        const { data: historyData } = await supabase
          .from('rewards_history')
          .select('order_id, points_change, transaction_type')
          .in('order_id', orderDbIds);
        
        if (historyData) {
          historyData.forEach(h => {
            if (!h.order_id) return;
            if (!historyByOrder[h.order_id]) {
              historyByOrder[h.order_id] = { earned: 0, used: 0 };
            }
            if (h.transaction_type === 'earned') {
              historyByOrder[h.order_id].earned += h.points_change;
            } else if (h.transaction_type === 'redeemed') {
              historyByOrder[h.order_id].used += Math.abs(h.points_change);
            }
          });
        }
      }

      // Build per-order reward map keyed by order dbId
      const map: Record<string, OrderRewardInfo> = {};
      const rewardsByPhone: Record<string, { lifetime_points: number; points: number }> = {};
      
      if (rewardsData) {
        rewardsData.forEach(r => {
          rewardsByPhone[r.phone] = { lifetime_points: r.lifetime_points, points: r.points };
        });
      }

      orders.forEach(o => {
        if (!o.customerPhone || !o.dbId) return;
        const reward = rewardsByPhone[o.customerPhone];
        if (!reward) return;
        const history = historyByOrder[o.dbId] || { earned: 0, used: 0 };
        map[o.dbId] = {
          lifetime_points: reward.lifetime_points,
          points: reward.points,
          orderEarned: history.earned,
          orderUsed: history.used,
        };
      });
      
      setRewardsMap(map);
    };
    fetchRewards();
  }, [orders, rewardsVersion]);

  const isAdvanceOrder = (o: Order) => {
    if (o.status !== 'preparing' || !o.pickupTime) return false;
    const pickupMs = new Date(o.pickupTime).getTime();
    const now = Date.now();
    if (pickupMs <= now) return false; // pickup time has passed
    const createdMs = new Date(o.createdAt).getTime();
    const originalLeadMinutes = (pickupMs - createdMs) / (1000 * 60);
    // Only treat as advance if the original lead time was > 65 minutes
    return originalLeadMinutes > 65;
  };

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
      posStaffId: activeStaff?.id,
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
    
    // If cancelling a paid order, show refund choice instead
    if (status === 'cancelled') {
      const order = orders.find(o => o.id === selectedOrderId);
      if (order && order.paymentStatus === 'paid') {
        setRefundOrderId(selectedOrderId);
        setShowRefundChoice(true);
        return;
      }
    }
    
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
    
    // After delivering, wait for reward points to be written then re-fetch
    if (status === 'delivered') {
      setTimeout(() => setRewardsVersion(v => v + 1), 2000);
    }
    
    // Clear selection and go back to empty state after status change
    setSelectedOrderId(null);
  };

  const handleRefund = async (refundMethod: 'cash' | 'card') => {
    if (!refundOrderId) return;
    const order = orders.find(o => o.id === refundOrderId);
    if (!order) return;

    try {
      // Update payment status to refunded and clear amounts
      const updateData: any = {
        payment_status: 'refunded',
        payment_method: order.paymentMethod,
        amount_paid: 0,
        cash_amount: null,
        card_amount: null,
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      };

      // Record what was refunded for reports: negative amounts
      if (refundMethod === 'cash') {
        updateData.cash_amount = -(order.total);
        updateData.card_amount = null;
      } else {
        updateData.card_amount = -(order.total);
        updateData.cash_amount = null;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('order_number', refundOrderId);

      if (error) throw error;

      // Send cancellation SMS
      if (order.customerPhone || order.customerId) {
        await supabase.functions.invoke('order-sms', {
          body: { orderNumber: refundOrderId, phone: order.customerPhone, customerId: order.customerId, type: 'cancelled', locationId: currentLocationId }
        }).catch(() => {});
      }

      toast.success(`Order ${refundOrderId} cancelled & refunded via ${refundMethod}`);
      refetch();
    } catch (err: any) {
      console.error('Error processing refund:', err);
      toast.error('Failed to process refund');
    }

    setShowRefundChoice(false);
    setRefundOrderId(null);
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
    
    // Normal flow for existing orders (e.g. web orders → Start Preparing)
    if (pendingPrepOrderId) {
      updateOrderStatus(pendingPrepOrderId, 'preparing', prepTime, currentLocationId);
      // Auto-print kitchen ticket for web/app orders
      const orderToPrint = orders.find(o => o.id === pendingPrepOrderId);
      if (orderToPrint) {
        printKitchenTicket(orderToPrint);
      }
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
      // Card payment - mark as paid directly with full amount as card
      updatePaymentStatus(updatedOrder.id, 'paid', method, { cardAmount: updatedOrder.total });
      // Auto-print kitchen ticket
      printKitchenTicket(updatedOrder);
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
      // Auto-print kitchen ticket
      printKitchenTicket(targetOrder);
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
      // Leave unpaid - still print kitchen ticket
      if (targetOrder) printKitchenTicket(targetOrder);
      setPointsDiscountApplied(null);
      setNewOrderPending(null);
      setExistingPointsOrder(null);
      setSelectedOrderId(null);
    } else if (method === 'cash') {
      setPendingPaymentOrderId(targetOrder.id);
      setCashModalOpen(true);
    } else {
      // Card — mark as paid
      updatePaymentStatus(targetOrder.id, 'paid', 'card', { cardAmount: balanceRemaining });
      // Auto-print kitchen ticket
      if (targetOrder) printKitchenTicket(targetOrder);
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
      const order = orders.find(o => o.id === selectedOrderId);
      updatePaymentStatus(selectedOrderId, 'paid', 'card', { cardAmount: order?.total || 0 });
    }
  };

  const handlePaymentComplete = (method: 'cash' | 'card' = 'cash') => {
    if (pendingPaymentOrderId) {
      const orderToPay = newOrderPending || existingPointsOrder || orders.find(o => o.id === pendingPaymentOrderId);
      const total = orderToPay?.total || 0;
      const splitAmounts = method === 'cash' 
        ? { cashAmount: total } 
        : { cardAmount: total };
      updatePaymentStatus(pendingPaymentOrderId, 'paid', method, splitAmounts);
      // Auto-print kitchen ticket
      const orderToPrint = newOrderPending || existingPointsOrder || orders.find(o => o.id === pendingPaymentOrderId);
      if (orderToPrint) {
        printKitchenTicket(orderToPrint);
      }
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
    <div className="fixed inset-0 flex flex-col overflow-hidden pos-no-focus-ring pos-hd-text pos-premium-theme" style={{ background: 'hsl(220, 26%, 14%)', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }}>
      {/* Full-screen solid background shield to prevent any bleed-through on Android tablets */}
      <div className="fixed inset-0 z-[-1]" style={{ background: 'hsl(220, 26%, 14%)' }} aria-hidden="true" />
      {/* Main POS container - truly full viewport, no rounding or padding */}
      <div className="flex-1 flex flex-col overflow-hidden w-full h-full" style={{ background: 'hsl(220, 26%, 14%)' }}>
      {/* Header - Compact for small tablets, normal for large screens */}
      <header className="border-b py-1.5 lg:py-2.5 px-2 lg:px-4 flex-shrink-0 shadow-sm transition-colors pos-header">
        <div className="flex items-center gap-1 lg:gap-2 w-full min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
            <span
              title="Home"
              onPointerDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => {
                setSelectedOrderId(null);
                setShowNewOrder(false);
                setEditingOrder(null);
                setShowSettings(false);
                setShowReports(false);
                setActiveTab('all');
              }}
              className={cn(
                "font-serif text-base lg:text-lg font-bold transition-colors cursor-pointer whitespace-nowrap",
                "bg-transparent border-0 p-0 m-0 outline-none ring-0 shadow-none",
                "hover:bg-transparent active:bg-transparent",
                "select-none [-webkit-tap-highlight-color:transparent] [-webkit-user-select:none] [-webkit-touch-callout:none]"
              )}
              style={{ outline: 'none', border: 'none', boxShadow: 'none', color: 'hsl(210, 20%, 98%)' }}
            >
              {LOCATION_NAMES[currentLocationId] || currentLocationId}
            </span>
            {hasPendingRemoteOrders && (
              <button
                type="button"
                className="flex items-center gap-1 bg-orange-500 text-white px-2 py-1 rounded-full animate-bounce text-xs cursor-pointer hover:bg-orange-600 transition-colors"
                onClick={() => {
                  const firstPending = orders.find(o => 
                    (o.source === 'web' || o.source === 'app' || o.source === 'online') && o.status === 'pending'
                  );
                  if (firstPending) {
                    setSelectedOrderId(firstPending.id);
                    setShowNewOrder(false);
                  }
                }}
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="font-semibold">{pendingCount} New!</span>
              </button>
            )}
          </div>
          
          {/* Status Tabs - Compact for small tablets, larger for big screens */}
          <div className="flex gap-1 lg:gap-1.5 flex-1 justify-center min-w-0 overflow-hidden">
            {statusTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedOrderId(null); }}
                className={cn(
                  "pos-tab-button-compact flex items-center gap-1 lg:gap-1.5",
                  "outline-none focus:outline-none focus-visible:outline-none",
                  "border-none focus:ring-0 focus-visible:ring-0",
                  activeTab === tab.id ? "active" : ""
                )}
              >
                <tab.icon className="w-3.5 lg:w-4 h-3.5 lg:h-4" />
                {tab.label}
                <span className={cn(
                  "text-[10px] lg:text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none",
                  activeTab === tab.id
                    ? "pos-bg-white-25 text-white"
                    : "bg-gray-700 text-gray-300"
                )}>
                  {counts[tab.id as keyof typeof counts]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            <Button 
              onClick={() => {
                setShowNewOrder(true);
                setSelectedOrderId(null);
              }}
              className="text-xs lg:text-sm px-2.5 lg:px-4 py-1.5 lg:py-2 h-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-3.5 lg:w-4 h-3.5 lg:h-4 mr-1" />
              New
            </Button>

            <button
              onClick={() => openTill()}
              className={cn(
                "h-9 w-9 lg:h-11 lg:w-11 shrink-0 flex items-center justify-center rounded-md",
                "bg-transparent border-none",
                "outline-none focus:outline-none focus-visible:outline-none",
                "ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                "shadow-none focus:shadow-none focus-visible:shadow-none",
                "select-none [-webkit-tap-highlight-color:transparent]",
                "hover:opacity-80 transition-opacity"
              )}
              title="Till"
              aria-label="Till"
            >
              <img src={tillIcon} alt="Till" className="w-7 h-7 lg:w-8 lg:h-8 object-contain" style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(52%) saturate(456%) hue-rotate(87deg) brightness(95%) contrast(87%)' }} />
            </button>

            <button
              type="button"
              disabled={!settingsPinLoaded}
              onClick={() => {
                console.log('[POS] Settings clicked - settingsPin:', JSON.stringify(settingsPin), 'settingsPinLoaded:', settingsPinLoaded, 'showSettingsPin:', showSettingsPin);
                if (!settingsPinLoaded) {
                  console.log('[POS] Settings blocked - PIN not loaded yet');
                  return;
                }
                if (settingsPin) {
                  console.log('[POS] Opening PIN modal for pin:', settingsPin);
                  setShowSettingsPin(true);
                } else {
                  console.log('[POS] No PIN set - opening settings directly');
                  setShowSettings(true);
                }
              }}
              title="Settings"
              className="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center rounded-md"
              style={{ background: 'hsl(220, 22%, 28%)', color: '#94a3b8', border: '1px solid hsl(220, 20%, 35%)' }}
            >
              <Settings className="w-4 lg:w-5 h-4 lg:h-5" />
            </button>

            {/* Active staff name - initials on small tablets, full name on larger */}
            {activeStaff && (
              <div className="flex items-center gap-1 px-1.5 lg:px-2" style={{ color: '#94a3b8' }}>
                <User className="w-3.5 lg:w-4 h-3.5 lg:h-4" />
                <span className="text-xs lg:text-sm font-medium">
                  <span className="xl:hidden">{activeStaff.name.split(' ').map(w => w[0]).join('').toUpperCase()}</span>
                  <span className="hidden xl:inline truncate max-w-[120px]">{activeStaff.name}</span>
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (activeStaff) {
                  setShowStaffReport(true);
                } else {
                  localStorage.removeItem('pos_location_id');
                  signOut();
                }
              }}
              title={activeStaff ? 'Log Off' : 'Log Out'}
              className="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center rounded-md"
              style={{ background: 'hsl(220, 22%, 28%)', color: '#94a3b8', border: '1px solid hsl(220, 20%, 35%)' }}
            >
              <LogOut className="w-3.5 lg:w-4 h-3.5 lg:h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Full remaining height */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Panel - Order List - Percentage based width */}
        <div className="w-[25%] min-w-[200px] max-w-[320px] md:w-[25%] md:min-w-[260px] md:max-w-[320px] lg:w-[18%] lg:min-w-[240px] lg:max-w-[300px] border-r flex flex-col flex-shrink-0" style={{ background: 'hsl(220, 25%, 16%)', borderColor: 'hsl(220, 20%, 28%)' }}>
          <ScrollArea className="flex-1 p-2 lg:p-3">
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
                    rewardInfo={order.dbId ? rewardsMap[order.dbId] : null}
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
        <div className="flex-1 p-2 lg:p-4 overflow-hidden min-h-0 min-w-0" style={{ background: 'hsl(220, 26%, 14%)' }}>
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
              onCancel={() => {
                setShowNewOrder(false);
                setIncomingCallPhone('');
                setIncomingCallName('');
              }}
              initialPhone={incomingCallPhone || undefined}
              initialName={incomingCallName || undefined}
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
              onStartPreparing={() => {
                if (selectedOrderId) {
                  startPreparingAdvanceOrder(selectedOrderId);
                  setSelectedOrderId(null);
                }
              }}
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
            updatePaymentStatus(newOrderPending.id, 'paid', 'card', { cardAmount: newOrderPending.total });
            setNewOrderPending(null);
            setSelectedOrderId(null);
            setPendingPaymentOrderId(null);
          } else if (pendingPaymentOrderId) {
            const order = orders.find(o => o.id === pendingPaymentOrderId);
            updatePaymentStatus(pendingPaymentOrderId, 'paid', 'card', { cardAmount: order?.total || 0 });
            setPendingPaymentOrderId(null);
          }
        }}
        onSplitPayment={(cashAmount) => {
          // Split payment: partial cash + remainder on card
          setCashModalOpen(false);
          const orderId = newOrderPending?.id || pendingPaymentOrderId;
          const orderTotal = newOrderPending?.total || orders.find(o => o.id === pendingPaymentOrderId)?.total || 0;
          const cardPortion = Math.max(0, orderTotal - cashAmount);
          if (orderId) {
            // Mark as paid with split amounts tracked
            updatePaymentStatus(orderId, 'paid', 'split', { cashAmount, cardAmount: cardPortion });
            toast.success(`Split payment: $${cashAmount.toFixed(2)} cash + $${cardPortion.toFixed(2)} card`);
          }
          setPendingPaymentOrderId(null);
          setPointsDiscountApplied(null);
          if (newOrderPending) {
            // Auto-print kitchen ticket for new orders
            printKitchenTicket(newOrderPending);
            setNewOrderPending(null);
            setSelectedOrderId(null);
          }
          if (existingPointsOrder) {
            setExistingPointsOrder(null);
          }
        }}
      />

      {/* Prep Time Modal */}
      <POSPrepTimeModal
        open={prepTimeModalOpen}
        onClose={async () => {
          setPrepTimeModalOpen(false);
          setPendingPrepOrderId(null);
          // If cancelling during new order creation, delete the order from DB
          if (newOrderPending && !showPaymentChoice) {
            const cancelledOrderNumber = newOrderPending.id;
            setNewOrderPending(null);
            try {
              const { data: orderRecord } = await supabase
                .from('orders')
                .select('id')
                .eq('order_number', cancelledOrderNumber)
                .maybeSingle();
              if (orderRecord) {
                await supabase.from('order_items').delete().eq('order_id', orderRecord.id);
                await supabase.from('orders').delete().eq('id', orderRecord.id);
              }
              // Refetch to sync local state
              refetch();
            } catch (err) {
              console.error('Error deleting cancelled order:', err);
            }
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
        customerPhone={newOrderPending?.customerPhone}
        onPaymentChoice={handleNewOrderPaymentChoice}
        onSkip={() => {
          if (newOrderPending) {
            updateOrderStatus(newOrderPending.id, 'preparing', pendingPrepTime, currentLocationId);
            // Auto-print kitchen ticket
            printKitchenTicket(newOrderPending);
            setNewOrderPending(null);
            setSelectedOrderId(null);
          }
          setShowPaymentChoice(false);
        }}
      />

      {/* Refund Choice Modal */}
      <POSRefundChoiceModal
        open={showRefundChoice}
        orderNumber={refundOrderId ?? ''}
        orderTotal={orders.find(o => o.id === refundOrderId)?.total ?? 0}
        paymentMethod={orders.find(o => o.id === refundOrderId)?.paymentMethod}
        onRefund={handleRefund}
        onCancel={() => {
          setShowRefundChoice(false);
          setRefundOrderId(null);
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

      {/* Settings PIN Modal */}
      <POSSettingsPinModal
        open={showSettingsPin}
        onClose={() => setShowSettingsPin(false)}
        onSuccess={() => {
          setShowSettingsPin(false);
          setShowSettings(true);
        }}
        correctPin={settingsPin || ''}
      />

      {showSettings && (
        <POSSettingsPanel
          locationId={currentLocationId}
          onClose={() => setShowSettings(false)}
          onEndDay={() => setShowEndDay(true)}
          isAudioEnabled={isAudioEnabled}
          volume={volume}
          onToggleAudio={toggleAudio}
          onVolumeChange={adjustVolume}
          onTestSound={playTestSound}
          isScreenAwake={wakeLock.isEnabled}
          onToggleScreenAwake={wakeLock.toggle}
          isScreenAwakeSupported={wakeLock.isSupported}
        />
      )}

      {/* Staff Report Card Modal */}
      <POSStaffReportCard
        open={showStaffReport}
        onClose={() => setShowStaffReport(false)}
        onEndDay={() => {
          setShowStaffReport(false);
          setShowEndDay(true);
        }}
        onSwitchUser={() => {
          setShowStaffReport(false);
          onStaffLogout();
        }}
        staffName={activeStaff?.name || 'Staff'}
        activeSession={activeSession}
        locationId={currentLocationId}
      />

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
            // Return to staff PIN screen, keep store login alive
            onStaffLogout();
          }
        }}
        activeSession={activeSession}
        todayCashSales={todayCashSales}
        todayCardSales={todayCardSales}
        todayWebAppSales={todayWebAppSales}
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

import { useState, useEffect, useRef } from 'react';
import { Clock, Phone, Globe, User, Utensils, Package, Truck, Smartphone, Gift, CalendarClock, Timer } from 'lucide-react';
import { Order } from '@/types/menu';
import { cn } from '@/lib/utils';

export interface OrderRewardInfo {
  lifetime_points: number;
  points: number; // current balance
  orderEarned: number; // points earned from this specific order
  orderUsed: number; // points redeemed on this specific order
}

interface POSOrderCardProps {
  order: Order;
  isSelected: boolean;
  onClick: () => void;
  rewardInfo?: OrderRewardInfo | null;
}

const statusBadgeClass: Record<string, string> = {
  pending: 'pos-badge pos-badge-pending',
  preparing: 'pos-badge pos-badge-preparing',
  ready: 'pos-badge pos-badge-ready',
  delivered: 'pos-badge pos-badge-delivered',
  cancelled: 'pos-badge',
};

const sourceConfig: Record<string, { icon: typeof Globe; label: string }> = {
  web: { icon: Globe, label: 'Web' },
  online: { icon: Globe, label: 'Web' },
  app: { icon: Smartphone, label: 'App' },
  phone: { icon: Phone, label: 'Phone' },
  'walk-in': { icon: User, label: 'Walk-in' },
};

const orderTypeIcons: Record<string, typeof Package> = {
  pickup: Package,
  delivery: Truck,
  'dine-in': Utensils,
};

export const POSOrderCard = ({ order, isSelected, onClick, rewardInfo }: POSOrderCardProps) => {
  const source = sourceConfig[order.source || 'web'] || sourceConfig.web;
  const SourceIcon = source.icon;
  const TypeIcon = orderTypeIcons[order.orderType] || Package;

  // Countdown timer for orders with pickup time
  const [countdown, setCountdown] = useState('');
  const [isOverdue, setIsOverdue] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false); // < 5 min
  const beeped2MinRef = useRef(false);

  useEffect(() => {
    if (!order.pickupTime || order.status === 'ready' || order.status === 'delivered' || order.status === 'cancelled') {
      setCountdown('');
      beeped2MinRef.current = false;
      return;
    }

    const playDoubleBeep = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        // First beep
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime);
        gain1.gain.setValueAtTime(0.6, ctx.currentTime);
        gain1.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.3);
        // Second beep after short gap
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.45);
        gain2.gain.setValueAtTime(0, ctx.currentTime);
        gain2.gain.setValueAtTime(0.6, ctx.currentTime + 0.45);
        gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.75);
        osc2.start(ctx.currentTime + 0.45);
        osc2.stop(ctx.currentTime + 0.75);
        setTimeout(() => ctx.close(), 1000);
      } catch (e) { /* silent fail */ }
    };

    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(order.pickupTime!).getTime();
      const diff = target - now;

      if (diff <= 0) {
        const overMs = Math.abs(diff);
        const overMin = Math.floor(overMs / 60000);
        const overSec = Math.floor((overMs % 60000) / 1000);
        setCountdown(`-${overMin}:${String(overSec).padStart(2, '0')}`);
        setIsOverdue(true);
        setIsUrgent(true);
      } else {
        const min = Math.floor(diff / 60000);
        const sec = Math.floor((diff % 60000) / 1000);
        setCountdown(`${min}:${String(sec).padStart(2, '0')}`);
        setIsOverdue(false);
        setIsUrgent(diff < 5 * 60000); // red when < 5 min

        // Double beep once at 1 minute remaining
        if (diff <= 1 * 60000 && !beeped2MinRef.current) {
          beeped2MinRef.current = true;
          playDoubleBeep();
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [order.pickupTime, order.status]);

  const getTimeSince = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  // Distinguish true advance/scheduled orders from prep-time orders
  // Prep-time: staff sets "ready in X min" → pickupTime is close to createdAt (≤65 min)
  // Advance: customer schedules for a future time → pickupTime is far from createdAt (>65 min)
  const isAdvanceOrder = (() => {
    if (!order.pickupTime || !order.createdAt) return false;
    const leadMin = (new Date(order.pickupTime).getTime() - new Date(order.createdAt).getTime()) / 60000;
    return leadMin > 65;
  })();

  // Show "New!" badge for web/app orders until accepted (no longer pending)
  const isNewRemoteOrder = (order.source === 'web' || order.source === 'app' || order.source === 'online') 
    && order.status === 'pending';

  const balancePoints = rewardInfo?.points ?? 0;
  const orderEarned = rewardInfo?.orderEarned ?? 0;
  const orderUsed = rewardInfo?.orderUsed ?? 0;
  const lastBalance = balancePoints - orderEarned + orderUsed;

  return (
    <div
      onClick={onClick}
      className={cn(
        'pos-order-card p-2.5 cursor-pointer max-w-[240px] 2xl:max-w-[300px]',
        isSelected && 'selected'
      )}
    >
      {/* Order ID */}
      <div className="font-mono font-bold text-base 2xl:text-lg mb-1 truncate" style={{ color: '#ffffff' }}>
        {order.id}
      </div>

      {/* Badges Row */}
      <div className="flex flex-col gap-1 mb-1">
        {isNewRemoteOrder && (
          <span className="pos-badge animate-pulse font-bold" style={{ background: 'hsl(30,90%,45%)', borderColor: 'hsl(30,95%,55%)', color: '#fff', fontSize: '10px' }}>
            🆕 New!
          </span>
        )}
        <div className="flex items-center justify-between gap-1">
          <span className="pos-badge" style={{ background: 'hsl(220,22%,28%)', borderColor: 'hsl(220,20%,35%)', color: 'hsl(210,15%,75%)' }}>
            <SourceIcon className="inline w-3 h-3 mr-1 -mt-0.5" />
            {source.label}
          </span>
          {countdown && (
            <span className="text-sm font-bold flex items-center gap-1 shrink-0" style={{ color: isUrgent ? '#ef4444' : '#22c55e' }}>
              <Timer className="w-3.5 h-3.5" />
              {countdown}
            </span>
          )}
        </div>
        <span className={
          isAdvanceOrder && order.status === 'preparing' && order.pickupTime && new Date(order.pickupTime) > new Date()
            ? 'pos-badge'
            : (statusBadgeClass[order.status] || 'pos-badge')
        } style={
          isAdvanceOrder && order.status === 'preparing' && order.pickupTime && new Date(order.pickupTime) > new Date()
            ? { background: 'hsl(260,50%,30%)', borderColor: 'hsl(260,60%,50%)', color: 'hsl(260,80%,80%)' }
            : undefined
        }>
          {isAdvanceOrder && order.status === 'preparing' && order.pickupTime && new Date(order.pickupTime) > new Date()
            ? 'Scheduled'
            : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>

      {/* Customer Phone + Reward Points Row */}
      <div className="flex items-start justify-between gap-1 mb-0.5">
        <div className="min-w-0">
          {order.customerPhone && (
            <p className="text-lg font-semibold truncate" style={{ color: '#ffffff' }}>
              {order.customerPhone}
            </p>
          )}
          <p className="font-semibold text-sm truncate" style={{ color: '#ffffff' }}>
            {order.customerName || 'Walk-in Customer'}
          </p>
        </div>
        {/* Reward Points - compact column */}
        {rewardInfo && (orderEarned > 0 || orderUsed > 0 || balancePoints > 0) && (
          <div className="text-[13px] leading-tight text-right shrink-0" style={{ color: '#d97706' }}>
            <div>{lastBalance} last bal</div>
            <div style={{ color: '#2e7d32' }}>+{orderEarned} earned</div>
            <div style={{ color: '#d32f2f' }}>-{orderUsed} used</div>
            <div className="font-bold">{balancePoints} pts bal</div>
          </div>
        )}
      </div>

      {/* Order Info */}
      <div className="text-sm font-semibold mb-0.5" style={{ color: '#ffffff' }}>
        <span className="flex items-center gap-1">
          <TypeIcon className="w-3.5 h-3.5" />
          <span className="capitalize">{order.orderType}</span>
        </span>
      </div>
      <div className="text-sm font-semibold mb-1" style={{ color: '#ffffff' }}>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {getTimeSince(order.createdAt)}
        </span>
      </div>

      {/* Scheduled pickup time for advance orders */}
      {isAdvanceOrder && order.pickupTime && new Date(order.pickupTime) > new Date() && (
        <div className="text-sm font-semibold mb-1" style={{ color: 'hsl(260,70%,75%)' }}>
          <div className="flex items-center gap-1">
            <CalendarClock className="w-3.5 h-3.5" />
            Pickup
          </div>
          <div>{new Date(order.pickupTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} {new Date(order.pickupTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
        </div>
      )}

      {/* Items Preview */}
      <div className="text-sm mb-1" style={{ color: '#ffffff' }}>
        {itemCount} item{itemCount !== 1 ? 's' : ''}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-sm font-bold" style={{ color: 'hsl(217,91%,60%)' }}>
          ${order.total.toFixed(2)}
        </span>
        {isOverdue && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold animate-bounce" style={{ background: 'hsl(36,90%,45%)', color: '#fff' }}>
            <CalendarClock className="w-3 h-3" />
            Due!
          </span>
        )}
         {(() => {
           // Calculate balance due
           const amountPaid = order.amountPaid ?? (order.paymentStatus === 'paid' ? order.total : 0);
           const balanceDue = Math.max(0, order.total - amountPaid);
           
           if (order.paymentStatus === 'paid' && balanceDue > 0.01) {
             return (
               <span className="pos-badge" style={{ 
                 background: 'hsl(30,60%,25%)', 
                 borderColor: 'hsl(30,70%,50%)', 
                 color: 'hsl(30,80%,70%)',
                 fontSize: '10px'
               }}>
                 +${balanceDue.toFixed(2)}
               </span>
             );
           } else if (order.paymentStatus === 'paid') {
             return <span className="pos-badge pos-badge-paid">Paid</span>;
           } else {
             return <span className="pos-badge pos-badge-unpaid">Unpaid</span>;
           }
         })()}
      </div>
    </div>
  );
};

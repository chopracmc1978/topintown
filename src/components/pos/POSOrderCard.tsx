import { Clock, Phone, Globe, User, Utensils, Package, Truck, Smartphone } from 'lucide-react';
import { Order } from '@/types/menu';
import { cn } from '@/lib/utils';

interface POSOrderCardProps {
  order: Order;
  isSelected: boolean;
  onClick: () => void;
}

const statusBadgeClass: Record<string, string> = {
  pending: 'pos-badge pos-badge-pending',
  preparing: 'pos-badge pos-badge-preparing',
  ready: 'pos-badge pos-badge-ready',
  delivered: 'pos-badge',
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

export const POSOrderCard = ({ order, isSelected, onClick }: POSOrderCardProps) => {
  const source = sourceConfig[order.source || 'web'] || sourceConfig.web;
  const SourceIcon = source.icon;
  const TypeIcon = orderTypeIcons[order.orderType] || Package;

  const getTimeSince = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000 / 60);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      onClick={onClick}
      className={cn(
        'pos-order-card p-2.5 cursor-pointer max-w-[200px]',
        isSelected && 'selected'
      )}
    >
      {/* Order ID */}
      <div className="font-mono font-bold text-xs mb-1 truncate" style={{ color: 'hsl(220,20%,20%)' }}>
        {order.id}
      </div>

      {/* Badges Row */}
      <div className="flex items-center gap-1 mb-1 flex-wrap">
        <span className="pos-badge" style={{ background: 'hsl(210,15%,94%)', borderColor: 'hsl(210,15%,80%)', color: 'hsl(210,20%,35%)' }}>
          <SourceIcon className="inline w-3 h-3 mr-1 -mt-0.5" />
          {source.label}
        </span>
        <span className={statusBadgeClass[order.status] || 'pos-badge'}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </span>
      </div>

      {/* Customer */}
      <p className="font-semibold text-xs mb-0.5 truncate" style={{ color: 'hsl(220,20%,15%)' }}>
        {order.customerName || 'Walk-in Customer'}
      </p>

      {/* Order Info */}
      <div className="flex items-center gap-1.5 text-[11px] mb-1" style={{ color: 'hsl(220,10%,45%)' }}>
        <span className="flex items-center gap-0.5">
          <TypeIcon className="w-3 h-3" />
          <span className="capitalize">{order.orderType}</span>
        </span>
        <span className="flex items-center gap-0.5">
          <Clock className="w-3 h-3" />
          {getTimeSince(order.createdAt)}
        </span>
      </div>

      {/* Items Preview */}
      <div className="text-[11px] mb-1" style={{ color: 'hsl(220,10%,50%)' }}>
        {itemCount} item{itemCount !== 1 ? 's' : ''}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'hsl(210,15%,90%)' }}>
        <span className="text-sm font-bold" style={{ color: 'hsl(200,85%,40%)' }}>
          ${order.total.toFixed(2)}
        </span>
        <span className={order.paymentStatus === 'paid' ? 'pos-badge pos-badge-paid' : 'pos-badge pos-badge-unpaid'}>
          {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
        </span>
      </div>
    </div>
  );
};

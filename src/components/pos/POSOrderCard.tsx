import { Clock, Phone, Globe, User, MapPin, Utensils, Package, Truck, Smartphone } from 'lucide-react';
import { Order } from '@/types/menu';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface POSOrderCardProps {
  order: Order;
  isSelected: boolean;
  onClick: () => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  preparing: 'bg-blue-100 text-blue-800 border-blue-300',
  ready: 'bg-green-100 text-green-800 border-green-300',
  delivered: 'bg-gray-100 text-gray-800 border-gray-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

const sourceConfig = {
  web: { icon: Globe, label: 'Web', color: 'bg-blue-100 text-blue-700' },
  online: { icon: Globe, label: 'Web', color: 'bg-blue-100 text-blue-700' },
  app: { icon: Smartphone, label: 'App', color: 'bg-purple-100 text-purple-700' },
  phone: { icon: Phone, label: 'Phone', color: 'bg-orange-100 text-orange-700' },
  'walk-in': { icon: User, label: 'Walk-in', color: 'bg-gray-100 text-gray-700' },
};

const orderTypeIcons = {
  pickup: Package,
  delivery: Truck,
  'dine-in': Utensils,
};

export const POSOrderCard = ({ order, isSelected, onClick }: POSOrderCardProps) => {
  const source = sourceConfig[order.source || 'web'] || sourceConfig.web;
  const SourceIcon = source.icon;
  const TypeIcon = orderTypeIcons[order.orderType];
  
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
        "p-4 rounded-xl border-2 cursor-pointer transition-all",
        isSelected
          ? "shadow-md"
          : "border-border bg-card hover:shadow-sm"
      )}
      style={isSelected ? { 
        borderColor: '#1a8ccc', 
        backgroundColor: 'rgba(26, 140, 204, 0.05)' 
      } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-lg">{order.id}</span>
          <Badge variant="outline" className={cn("text-xs px-1.5 py-0", source.color)}>
            <SourceIcon className="w-3 h-3 mr-1" />
            {source.label}
          </Badge>
        </div>
        <Badge variant="outline" className={cn("text-xs", statusColors[order.status])}>
          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
        </Badge>
      </div>

      {/* Customer */}
      <div className="mb-3">
        <p className="font-medium text-foreground truncate">{order.customerName || 'Walk-in Customer'}</p>
        {order.customerPhone && (
          <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
        )}
      </div>

      {/* Order Info */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <TypeIcon className="w-4 h-4" />
          <span className="capitalize">{order.orderType}</span>
        </div>
        {order.tableNumber && (
          <span>Table {order.tableNumber}</span>
        )}
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{getTimeSince(order.createdAt)}</span>
        </div>
      </div>

      {/* Items Preview */}
      <div className="text-sm text-muted-foreground mb-3">
        {itemCount} item{itemCount !== 1 ? 's' : ''}
        {order.items.length > 0 && (
          <span className="ml-1">
            • {order.items.slice(0, 2).map(i => i.name).join(', ')}
            {order.items.length > 2 && ` +${order.items.length - 2} more`}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-lg font-bold" style={{ color: '#1a8ccc' }}>${order.total.toFixed(2)}</span>
        <Badge 
          variant={order.paymentStatus === 'paid' ? 'default' : 'outline'}
          className={order.paymentStatus === 'paid' ? 'bg-green-600' : 'text-orange-600 border-orange-300'}
        >
          {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
        </Badge>
      </div>
    </div>
  );
};

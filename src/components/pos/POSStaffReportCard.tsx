import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, Clock, ShoppingBag, DollarSign, CreditCard, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { POSSession } from '@/hooks/usePOSSession';

interface StaffSessionStats {
  totalOrders: number;
  cashOrders: number;
  cardOrders: number;
  cashSales: number;
  cardSales: number;
  totalSales: number;
  avgTicket: number;
}

interface POSStaffReportCardProps {
  open: boolean;
  onClose: () => void;
  onEndDay: () => void;
  onSwitchUser: () => void;
  staffName: string;
  activeSession: POSSession | null;
  locationId: string;
}

export const POSStaffReportCard = ({
  open,
  onClose,
  onEndDay,
  onSwitchUser,
  staffName,
  activeSession,
  locationId,
}: POSStaffReportCardProps) => {
  const [stats, setStats] = useState<StaffSessionStats>({
    totalOrders: 0,
    cashOrders: 0,
    cardOrders: 0,
    cashSales: 0,
    cardSales: 0,
    totalSales: 0,
    avgTicket: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && activeSession) {
      fetchSessionStats();
    }
  }, [open, activeSession]);

  const fetchSessionStats = async () => {
    if (!activeSession) return;
    setLoading(true);

    try {
      // Fetch all orders created during this session
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, payment_method, payment_status, status')
        .eq('location_id', locationId)
        .gte('created_at', activeSession.start_time)
        .neq('status', 'cancelled');

      if (error) {
        console.error('Error fetching session stats:', error);
        setLoading(false);
        return;
      }

      const paidOrders = (orders || []).filter(o => o.payment_status === 'paid');
      const cashOrders = paidOrders.filter(o => o.payment_method === 'cash');
      const cardOrders = paidOrders.filter(o => o.payment_method === 'card');
      const pointsOrders = paidOrders.filter(o => o.payment_method === 'points');

      const cashSales = cashOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const cardSales = cardOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const pointsSales = pointsOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalSales = cashSales + cardSales + pointsSales;
      const totalOrderCount = orders?.length || 0;

      setStats({
        totalOrders: totalOrderCount,
        cashOrders: cashOrders.length,
        cardOrders: cardOrders.length,
        cashSales,
        cardSales,
        totalSales,
        avgTicket: totalOrderCount > 0 ? totalSales / totalOrderCount : 0,
      });
    } catch (err) {
      console.error('Error fetching session stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const sessionDuration = () => {
    if (!activeSession) return '—';
    const start = new Date(activeSession.start_time);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold flex items-center justify-center gap-2">
            <User className="w-5 h-5" />
            {staffName}'s Session
          </DialogTitle>
          <DialogDescription className="sr-only">
            Staff session summary report card
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Session Time */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Session Started</span>
            </div>
            <span className="text-sm">
              {activeSession ? format(new Date(activeSession.start_time), 'h:mm a') : '—'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Duration</span>
            </div>
            <span className="text-sm font-semibold">{sessionDuration()}</span>
          </div>

          <Separator />

          {/* Orders Summary */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Orders Summary
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold">{loading ? '...' : stats.totalOrders}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-green-600">{loading ? '...' : stats.cashOrders}</div>
                <div className="text-xs text-muted-foreground">Cash</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-blue-600">{loading ? '...' : stats.cardOrders}</div>
                <div className="text-xs text-muted-foreground">Card</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sales Summary */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Sales Summary
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cash Sales</span>
                <span className="font-semibold text-green-600">$ {loading ? '...' : stats.cashSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Card Sales</span>
                <span className="font-semibold text-blue-600">$ {loading ? '...' : stats.cardSales.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Total Sales</span>
                <span className="font-bold text-lg text-primary">$ {loading ? '...' : stats.totalSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg. Ticket</span>
                <span className="font-medium">$ {loading ? '...' : stats.avgTicket.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onSwitchUser}
            className="flex-1"
          >
            <User className="w-4 h-4 mr-1" />
            Switch User
          </Button>
          <Button
            onClick={onEndDay}
            className="flex-1 bg-orange-500 text-white hover:bg-orange-600"
          >
            <LogOut className="w-4 h-4 mr-1" />
            End Day
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

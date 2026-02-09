import { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Order } from '@/types/menu';
import { CustomerReceipt, ReceiptRewardPoints } from './CustomerReceipt';
import { usePrinters } from '@/hooks/usePrinters';
import { supabase } from '@/integrations/supabase/client';
import { LOCATIONS } from '@/contexts/LocationContext';

interface CustomerReceiptModalProps {
  order: Order;
  locationId: string;
  locationName?: string;
  locationAddress?: string;
  locationPhone?: string;
  onClose: () => void;
}

export const CustomerReceiptModal = ({ 
  order, 
  locationId, 
  locationName,
  locationAddress,
  locationPhone,
  onClose 
}: CustomerReceiptModalProps) => {
  const { printers } = usePrinters(locationId);
  const [rewardPoints, setRewardPoints] = useState<ReceiptRewardPoints | undefined>(undefined);

  // Resolve location info from LOCATIONS if not provided via props
  const resolvedLocation = LOCATIONS.find(l => l.id === locationId);
  const finalName = locationName || resolvedLocation?.name || 'Top In Town Pizza';
  const finalAddress = locationAddress || resolvedLocation?.address || '';
  const finalPhone = locationPhone || resolvedLocation?.phone || '';

  // Fetch reward points for customer
  useEffect(() => {
    const fetchRewards = async () => {
      const phone = order.customerPhone?.replace(/\D/g, '');
      if (!phone) return;
      
      // Use dbId (real DB UUID) if available, otherwise fall back to order.id
      const orderId = (order as any).dbId || order.id;
      
      const [rewardsResult, earnedResult, redeemedResult] = await Promise.all([
        supabase
          .from('customer_rewards')
          .select('points, lifetime_points')
          .eq('phone', phone)
          .maybeSingle(),
        supabase
          .from('rewards_history')
          .select('points_change')
          .eq('phone', phone)
          .eq('order_id', orderId)
          .eq('transaction_type', 'earned')
          .maybeSingle(),
        supabase
          .from('rewards_history')
          .select('points_change')
          .eq('phone', phone)
          .eq('order_id', orderId)
          .eq('transaction_type', 'redeemed')
          .maybeSingle(),
      ]);
      
      if (rewardsResult.data) {
        const currentBalance = rewardsResult.data.points;
        const earned = earnedResult.data?.points_change || 0;
        const used = Math.abs(redeemedResult.data?.points_change || 0);
        const lastBalance = currentBalance - earned + used;
        setRewardPoints({
          lastBalance,
          earned,
          used,
          balance: currentBalance,
        });
      }
    };
    fetchRewards();
  }, [order.customerPhone]);
  
  const hasPrinters = printers.length > 0;
  const counterPrinters = printers.filter(p => p.is_active && (p.station === 'Counter' || p.station === 'Bar'));

  const handlePrint = () => {
    if (!hasPrinters) {
      alert('No printers configured. Go to Settings to add printers.');
      return;
    }
    
    // TODO: Implement actual printing via IP printer
    console.log('Printing to:', counterPrinters);
    alert(`Would print customer receipt to configured printers`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-serif text-lg font-bold">Customer Receipt</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          <div className="shadow-lg">
            <CustomerReceipt 
              order={order}
              locationName={finalName}
              locationAddress={finalAddress}
              locationPhone={finalPhone}
              rewardPoints={rewardPoints}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            {hasPrinters ? 'Print' : 'No Printers'}
          </Button>
        </div>

        {/* Printer Status */}
        {!hasPrinters && (
          <div className="px-4 pb-4">
            <p className="text-xs text-muted-foreground text-center">
              No printers configured. Add printers in Settings to enable printing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

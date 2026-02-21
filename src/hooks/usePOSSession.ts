import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const shouldShowPOSNotifications = () => {
  try {
    return typeof window !== 'undefined' && !window.location.pathname.startsWith('/pos');
  } catch {
    return true;
  }
};

export interface POSSession {
  id: string;
  location_id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  start_cash: number;
  end_cash: number | null;
  cash_sales_total: number | null;
  entered_cash_amount: number | null;
  is_active: boolean;
}

export const usePOSSession = (locationId: string, userId: string | undefined) => {
  const [activeSession, setActiveSession] = useState<POSSession | null>(null);
  const [todayCashSales, setTodayCashSales] = useState<number>(0);
  const [todayCardSales, setTodayCardSales] = useState<number>(0);
  const [todayWebAppSales, setTodayWebAppSales] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const autoLogoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch active session for current location and user
  const fetchActiveSession = useCallback(async () => {
    if (!userId || !locationId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pos_sessions')
        .select('*')
        .eq('location_id', locationId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching POS session:', error);
        // Don't throw - just log and continue
      } else {
        setActiveSession(data as POSSession | null);
      }
    } catch (err: any) {
      console.error('Error fetching POS session:', err);
      // Don't rethrow - prevent crash in native environment
    } finally {
      setLoading(false);
    }
  }, [locationId, userId]);

  // Calculate today's sales by payment method
  const fetchTodayCashSales = useCallback(async () => {
    if (!locationId) return;

    try {
      const now = new Date();
      const today = new Date(now.toLocaleString('en-US', { timeZone: 'America/Edmonton' }));
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('orders')
        .select('total, payment_method, source, cash_amount, card_amount, payment_status')
        .eq('location_id', locationId)
        .in('payment_status', ['paid', 'refunded'])
        .gte('created_at', today.toISOString());

      if (error) {
        console.error('Error fetching sales:', error);
        return;
      }

      const orders = data || [];
      // Use cash_amount/card_amount for accurate split payment tracking
      let cashTotal = 0;
      let cardTotal = 0;
      orders.forEach(o => {
        if (o.cash_amount != null || o.card_amount != null) {
          // Split payment or tracked amounts
          cashTotal += o.cash_amount || 0;
          cardTotal += o.card_amount || 0;
        } else {
          // Legacy: fall back to payment_method
          if (o.payment_method === 'cash') cashTotal += o.total || 0;
          else if (o.payment_method === 'card') cardTotal += o.total || 0;
        }
      });
      const webAppTotal = orders.filter(o => (o.source === 'web' || o.source === 'app') && o.payment_status !== 'refunded').reduce((sum, o) => sum + (o.total || 0), 0);
      
      setTodayCashSales(cashTotal);
      setTodayCardSales(cardTotal);
      setTodayWebAppSales(webAppTotal);
    } catch (err: any) {
      console.error('Error fetching sales:', err);
    }
  }, [locationId]);

  // Start a new session
  const startSession = async (startCash: number = 0, posStaffId?: string): Promise<POSSession | null> => {
    if (!userId || !locationId) return null;

    try {
      // First, close any existing active sessions
      await supabase
        .from('pos_sessions')
        .update({ 
          is_active: false, 
          end_time: new Date().toISOString() 
        })
        .eq('location_id', locationId)
        .eq('user_id', userId)
        .eq('is_active', true);

      // Create new session
      const insertData: any = {
        location_id: locationId,
        user_id: userId,
        start_cash: startCash,
        is_active: true,
      };
      if (posStaffId) {
        insertData.pos_staff_id = posStaffId;
      }

      const { data, error } = await supabase
        .from('pos_sessions')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      setActiveSession(data as POSSession);
      return data as POSSession;
    } catch (err: any) {
      console.error('Error starting POS session:', err);
      if (shouldShowPOSNotifications()) toast.error('Failed to start session');
      return null;
    }
  };

  // End current session
  const endSession = async (enteredCashAmount: number): Promise<boolean> => {
    if (!activeSession) return false;

    try {
      await fetchTodayCashSales();
      
      const endCash = activeSession.start_cash + todayCashSales;

      const { error } = await supabase
        .from('pos_sessions')
        .update({
          end_time: new Date().toISOString(),
          end_cash: endCash,
          cash_sales_total: todayCashSales,
          entered_cash_amount: enteredCashAmount,
          is_active: false,
        })
        .eq('id', activeSession.id);

      if (error) throw error;

      setActiveSession(null);
      return true;
    } catch (err: any) {
      console.error('Error ending POS session:', err);
      if (shouldShowPOSNotifications()) toast.error('Failed to end session');
      return false;
    }
  };

  // Get last session's end cash for start cash default
  const getLastSessionEndCash = async (): Promise<number> => {
    if (!locationId) return 0;

    try {
      const { data, error } = await supabase
        .from('pos_sessions')
        .select('entered_cash_amount')
        .eq('location_id', locationId)
        .eq('is_active', false)
        .order('end_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return data?.entered_cash_amount || 0;
    } catch (err: any) {
      console.error('Error fetching last session:', err);
      return 0;
    }
  };

  // Setup auto-logout at 2 AM Mountain Time
  const setupAutoLogout = useCallback((onAutoLogout: () => void) => {
    if (autoLogoutTimerRef.current) {
      clearTimeout(autoLogoutTimerRef.current);
    }

    const now = new Date();
    // Get current time in Mountain Time
    const mtNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Edmonton' }));
    
    // Calculate next 2 AM Mountain Time
    const next2AM = new Date(mtNow);
    next2AM.setHours(2, 0, 0, 0);
    
    // If it's already past 2 AM today, schedule for tomorrow
    if (mtNow >= next2AM) {
      next2AM.setDate(next2AM.getDate() + 1);
    }

    // Calculate milliseconds until 2 AM
    const msUntil2AM = next2AM.getTime() - mtNow.getTime();
    
    console.log(`Auto-logout scheduled in ${Math.round(msUntil2AM / 1000 / 60)} minutes`);

    autoLogoutTimerRef.current = setTimeout(() => {
      console.log('Auto-logout triggered at 2 AM Mountain Time');
      onAutoLogout();
    }, msUntil2AM);

    return () => {
      if (autoLogoutTimerRef.current) {
        clearTimeout(autoLogoutTimerRef.current);
      }
    };
  }, []);

  // Fetch session and cash sales on mount
  useEffect(() => {
    fetchActiveSession();
    fetchTodayCashSales();
  }, [fetchActiveSession, fetchTodayCashSales]);

  // Refresh cash sales periodically
  useEffect(() => {
    const interval = setInterval(fetchTodayCashSales, 60000); // Every minute
    return () => clearInterval(interval);
  }, [fetchTodayCashSales]);

  return {
    activeSession,
    todayCashSales,
    todayCardSales,
    todayWebAppSales,
    loading,
    startSession,
    endSession,
    getLastSessionEndCash,
    setupAutoLogout,
    refreshSession: fetchActiveSession,
    refreshCashSales: fetchTodayCashSales,
  };
};

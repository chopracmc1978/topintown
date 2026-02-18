import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IncomingCall {
  id: string;
  caller_phone: string;
  caller_name: string | null;
  location_id: string;
  handled: boolean;
  created_at: string;
}

export const useIncomingCalls = (locationId: string) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  // Listen for new incoming calls via realtime
  useEffect(() => {
    if (!locationId) return;

    const channel = supabase
      .channel(`incoming-calls-${locationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'incoming_calls',
          filter: `location_id=eq.${locationId}`,
        },
        (payload) => {
          const call = payload.new as IncomingCall;
          if (!call.handled) {
            setIncomingCall(call);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationId]);

  // Mark call as handled
  const handleCall = useCallback(async (callId: string) => {
    await supabase
      .from('incoming_calls')
      .update({ handled: true })
      .eq('id', callId);
    setIncomingCall(null);
  }, []);

  // Dismiss without handling
  const dismissCall = useCallback(async (callId: string) => {
    await supabase
      .from('incoming_calls')
      .update({ handled: true })
      .eq('id', callId);
    setIncomingCall(null);
  }, []);

  return { incomingCall, handleCall, dismissCall };
};

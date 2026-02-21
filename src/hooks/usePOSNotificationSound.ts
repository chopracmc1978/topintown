import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Order } from '@/types/menu';

export const usePOSNotificationSound = (orders: Order[]) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const advanceAlertIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true); // Start enabled by default
  const [volume, setVolume] = useState(0.8); // Volume 0-2 (0-200%)
  const gainNodeRef = useRef<GainNode | null>(null);
  const [isAudioReady, setIsAudioReady] = useState(false); // Whether AudioContext is initialized
  const previousPendingIdsRef = useRef<Set<string>>(new Set());
  const alertedAdvanceIdsRef = useRef<Set<string>>(new Set()); // Track which advance orders already triggered 30-min alert
  const userToggledOffRef = useRef(false); // Track if user explicitly disabled
  const [advanceAlertOrderIds, setAdvanceAlertOrderIds] = useState<string[]>([]); // Currently alerting advance orders

  // Track pending web/app orders (not walk-in) — memoised to prevent infinite re-renders
  const pendingRemoteOrders = useMemo(
    () => orders.filter(o => o.status === 'pending' && (o.source === 'web' || o.source === 'app')),
    [orders]
  );

  // Track advance orders approaching pickup time — memoised
  // Rules:
  // - If the order was placed with ≥45 min until pickup: alert at 45 min before
  // - If the order was placed with <45 min until pickup: alert at 20 min before
  // - Applies to both 'pending' (needs accepting) and 'preparing' (needs start preparing)
  const advanceOrdersDueSoon = useMemo(() => {
    const now = Date.now();
    return orders.filter(o => {
      if (!o.pickupTime) return false;
      // Only trigger for pending or preparing (scheduled/advance) orders
      if (o.status !== 'pending' && o.status !== 'preparing') return false;
      // Only for remote/advance orders that have a future pickup time
      const pickupMs = new Date(o.pickupTime).getTime();
      const minutesUntil = (pickupMs - now) / (1000 * 60);

      // Determine the alert window based on how much lead time existed when order was created
      const createdMs = o.createdAt ? new Date(o.createdAt).getTime() : now;
      const originalLeadMinutes = (pickupMs - createdMs) / (1000 * 60);

      // Short-notice order (placed with <45 min lead): alert at 20 min before pickup
      // Normal advance order (placed with ≥45 min lead): alert at 45 min before pickup
      const alertWindow = originalLeadMinutes < 45 ? 20 : 45;

      return minutesUntil <= alertWindow && minutesUntil > -5;
    });
  }, [orders]);

  // Initialize AudioContext (doesn't mean audio is enabled)
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      // Always try to resume on each call (critical for tablets)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log('✅ AudioContext resumed from suspended');
        }).catch(() => {});
      }
      return true;
    }
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      // Create a master gain node for volume amplification (supports >100%)
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = volume;
      
      // Always resume — critical for mobile/tablet browsers
      audioContextRef.current.resume().then(() => {
        console.log('✅ AudioContext created and resumed');
      }).catch(() => {});
      
      setIsAudioReady(true);
      console.log('✅ AudioContext initialized');
      return true;
    } catch (e) {
      console.error('Failed to create AudioContext:', e);
      return false;
    }
  }, []);

  // Play a loud, attention-grabbing notification sound
  const playNotificationTone = useCallback(() => {
    if (!audioContextRef.current) {
      if (!initAudioContext()) return;
    }

    const ctx = audioContextRef.current!;
    
    // Resume if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const currentVolume = volume;
    
    // Create a LOUD alarm-style sound sequence
    // Use master gain node for amplification (supports 0-200%)
    const masterGain = gainNodeRef.current || ctx.destination;
    
    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(masterGain);
      
      oscillator.type = 'square'; // Harsh, attention-grabbing
      oscillator.frequency.setValueAtTime(freq, startTime);
      
      // Envelope (0 to 1, volume is controlled by master gain)
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(1, startTime + 0.01);
      gainNode.gain.setValueAtTime(1, startTime + duration - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    // Alarm pattern: high-low alternating, repeated
    const pattern = [
      { freq: 1200, time: 0, dur: 0.12 },
      { freq: 800, time: 0.15, dur: 0.12 },
      { freq: 1200, time: 0.30, dur: 0.12 },
      { freq: 800, time: 0.45, dur: 0.12 },
      { freq: 1400, time: 0.60, dur: 0.2 },
    ];

    pattern.forEach(({ freq, time, dur }) => {
      playTone(freq, now + time, dur);
    });

    console.log('🔔 Playing notification sound at volume:', currentVolume);
  }, [volume, initAudioContext]);

  // Stop the looping sound
  const stopSound = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('🔕 Stopped notification sound');
    }
  }, []);

  // Start looping sound
  const startSound = useCallback(() => {
    if (intervalRef.current) return; // Already playing

    // Play immediately
    playNotificationTone();
    
    // Loop every 2.5 seconds
    intervalRef.current = setInterval(() => {
      playNotificationTone();
    }, 2500);
    
    console.log('🔔 Started notification loop');
  }, [playNotificationTone]);

  // Enable audio (user toggled on) — MUST unlock audio in user gesture context for tablets
  const enableAudio = useCallback(() => {
    userToggledOffRef.current = false;
    initAudioContext();
    
    // Play a silent "unlock" tone immediately in the user gesture to satisfy mobile browser policy
    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0; // Silent
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.01);
    }
    
    setIsAudioEnabled(true);
    console.log('✅ Audio enabled by user');
    
    // If there are already pending orders, start sound now
    if (pendingRemoteOrders.length > 0) {
      startSound();
    }
  }, [pendingRemoteOrders.length, startSound, initAudioContext]);

  // Disable audio (user toggled off)
  const disableAudio = useCallback(() => {
    userToggledOffRef.current = true;
    setIsAudioEnabled(false);
    stopSound();
    console.log('🔕 Audio disabled by user');
  }, [stopSound]);

  // Toggle audio on/off
  const toggleAudio = useCallback((enabled: boolean) => {
    if (enabled) {
      enableAudio();
    } else {
      disableAudio();
    }
  }, [enableAudio, disableAudio]);

  // Adjust volume (0-2 for 0-200%)
  const adjustVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(2, newVolume));
    setVolume(clamped);
    // Update master gain node in real-time
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clamped;
    }
    console.log('🔊 Volume set to:', Math.round(clamped * 100) + '%');
  }, []);

  // Play test sound — unlock and play in user gesture context
  const playTestSound = useCallback(() => {
    initAudioContext();
    // Ensure resumed for tablets
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume().then(() => playNotificationTone());
    } else {
      playNotificationTone();
    }
  }, [initAudioContext, playNotificationTone]);

  // Initialize AudioContext on first user interaction (for browser policy)
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!audioContextRef.current) {
        initAudioContext();
      }
    };
    
    // Only need once
    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('touchstart', handleFirstInteraction, { once: true });
    
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [initAudioContext]);

  // Detect NEW orders (not just existing pending ones)
  useEffect(() => {
    const currentIds = new Set(pendingRemoteOrders.map(o => o.id));
    const previousIds = previousPendingIdsRef.current;
    
    // Check for new orders that weren't there before
    const hasNewOrders = [...currentIds].some(id => !previousIds.has(id));
    
    if (hasNewOrders && isAudioEnabled) {
      console.log('🆕 New online order detected!');
      startSound();
    }
    
    // Update the ref
    previousPendingIdsRef.current = currentIds;
  }, [pendingRemoteOrders, isAudioEnabled, startSound]);

  // Start/stop looping sound based on pending remote orders OR advance alerts approaching pickup
  useEffect(() => {
    const shouldLoop = (pendingRemoteOrders.length > 0 || advanceAlertOrderIds.length > 0) && isAudioEnabled;
    if (shouldLoop) {
      startSound();
    } else {
      stopSound();
    }
  }, [pendingRemoteOrders.length, advanceAlertOrderIds.length, isAudioEnabled, startSound, stopSound]);

  // Check advance orders every 30 seconds for 30-min alert
  useEffect(() => {
    if (!isAudioEnabled) return;

    const checkAdvanceOrders = () => {
      const newAlerts: string[] = [];
      advanceOrdersDueSoon.forEach(o => {
        if (!alertedAdvanceIdsRef.current.has(o.id)) {
          alertedAdvanceIdsRef.current.add(o.id);
          newAlerts.push(o.id);
          console.log('⏰ Advance order approaching pickup time:', o.id, o.pickupTime);
        }
      });
      if (newAlerts.length > 0) {
        setAdvanceAlertOrderIds(prev => [...prev, ...newAlerts]);
      }
    };

    checkAdvanceOrders();
    advanceAlertIntervalRef.current = setInterval(checkAdvanceOrders, 30000); // Check every 30s

    return () => {
      if (advanceAlertIntervalRef.current) {
        clearInterval(advanceAlertIntervalRef.current);
        advanceAlertIntervalRef.current = null;
      }
    };
  }, [advanceOrdersDueSoon, isAudioEnabled]);

  // Clear advance alerts when those orders move past 'preparing' or are handled
  useEffect(() => {
    const activeAdvanceIds = new Set(advanceOrdersDueSoon.map(o => o.id));
    setAdvanceAlertOrderIds(prev => {
      const next = prev.filter(id => activeAdvanceIds.has(id));
      // Only update if something actually changed to prevent unnecessary re-renders
      return next.length === prev.length ? prev : next;
    });
  }, [advanceOrdersDueSoon]);

  // Cleanup on unmount - use empty deps to only run on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (advanceAlertIntervalRef.current) {
        clearInterval(advanceAlertIntervalRef.current);
        advanceAlertIntervalRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    hasPendingRemoteOrders: pendingRemoteOrders.length > 0,
    pendingCount: pendingRemoteOrders.length,
    hasAdvanceAlerts: advanceAlertOrderIds.length > 0,
    advanceAlertCount: advanceAlertOrderIds.length,
    isAudioEnabled,
    volume,
    enableAudio,
    disableAudio,
    toggleAudio,
    adjustVolume,
    playTestSound,
    dismissAdvanceAlert: (orderId: string) => {
      setAdvanceAlertOrderIds(prev => prev.filter(id => id !== orderId));
    },
  };
};

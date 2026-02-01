import { useEffect, useRef, useCallback, useState } from 'react';
import { Order } from '@/types/menu';

export const usePOSNotificationSound = (orders: Order[]) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true); // Default to true
  const previousPendingIdsRef = useRef<Set<string>>(new Set());
  const initAttemptedRef = useRef(false);

  // Track pending web/app orders (not walk-in)
  const pendingRemoteOrders = orders.filter(
    o => o.status === 'pending' && (o.source === 'web' || o.source === 'app')
  );

  // Try to initialize AudioContext immediately on mount
  useEffect(() => {
    if (initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      // Try to resume immediately (may work if user has interacted before)
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log('✅ Audio auto-enabled successfully');
          setIsAudioEnabled(true);
        }).catch(() => {
          console.log('⚠️ Audio requires user interaction to enable');
          setIsAudioEnabled(false);
        });
      } else {
        setIsAudioEnabled(true);
      }
    } catch (e) {
      console.error('Failed to create AudioContext:', e);
      setIsAudioEnabled(false);
    }
  }, []);

  // Play a loud, attention-grabbing notification sound
  const playNotificationTone = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
      } catch (e) {
        console.error('Failed to create AudioContext:', e);
        return;
      }
    }

    const ctx = audioContextRef.current;
    
    // Resume if suspended
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Create a LOUD alarm-style sound sequence
    const playTone = (freq: number, startTime: number, duration: number, volume: number = 0.8) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'square'; // Harsh, attention-grabbing
      oscillator.frequency.setValueAtTime(freq, startTime);
      
      // Loud attack, quick decay
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
      gainNode.gain.setValueAtTime(volume, startTime + duration - 0.05);
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
      playTone(freq, now + time, dur, 0.9);
    });

    console.log('🔔 Playing notification sound');
  }, []);

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

  // Enable audio on user interaction
  const enableAudio = useCallback(() => {
    if (isAudioEnabled) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
      setIsAudioEnabled(true);
      console.log('✅ Audio enabled after user interaction');
      
      // If there are already pending orders, start sound now
      if (pendingRemoteOrders.length > 0) {
        startSound();
      }
    } catch (e) {
      console.error('Failed to enable audio:', e);
    }
  }, [isAudioEnabled, pendingRemoteOrders.length, startSound]);

  // Listen for any user interaction to enable audio
  useEffect(() => {
    const handleInteraction = () => {
      enableAudio();
    };
    
    // Multiple event types for better coverage
    const events = ['click', 'touchstart', 'keydown', 'mousedown'];
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: false, passive: true });
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, [enableAudio]);

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

  // Start/stop based on pending orders
  useEffect(() => {
    if (pendingRemoteOrders.length > 0 && isAudioEnabled) {
      startSound();
    } else if (pendingRemoteOrders.length === 0) {
      stopSound();
    }
  }, [pendingRemoteOrders.length, isAudioEnabled, startSound, stopSound]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSound();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopSound]);

  return {
    hasPendingRemoteOrders: pendingRemoteOrders.length > 0,
    pendingCount: pendingRemoteOrders.length,
    isAudioEnabled,
    enableAudio,
  };
};

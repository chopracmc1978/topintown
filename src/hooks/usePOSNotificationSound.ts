import { useEffect, useRef, useCallback, useState } from 'react';
import { Order } from '@/types/menu';

export const usePOSNotificationSound = (orders: Order[]) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false); // Start false until user enables
  const [volume, setVolume] = useState(0.8); // Volume 0-1
  const [isAudioReady, setIsAudioReady] = useState(false); // Whether AudioContext is initialized
  const previousPendingIdsRef = useRef<Set<string>>(new Set());
  const userToggledOffRef = useRef(false); // Track if user explicitly disabled

  // Track pending web/app orders (not walk-in)
  const pendingRemoteOrders = orders.filter(
    o => o.status === 'pending' && (o.source === 'web' || o.source === 'app')
  );

  // Initialize AudioContext (doesn't mean audio is enabled)
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return true;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      
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
    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = 'square'; // Harsh, attention-grabbing
      oscillator.frequency.setValueAtTime(freq, startTime);
      
      // Use current volume setting
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(currentVolume, startTime + 0.01);
      gainNode.gain.setValueAtTime(currentVolume, startTime + duration - 0.05);
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

  // Enable audio (user toggled on)
  const enableAudio = useCallback(() => {
    userToggledOffRef.current = false;
    initAudioContext();
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

  // Adjust volume
  const adjustVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolume(clamped);
    console.log('🔊 Volume set to:', Math.round(clamped * 100) + '%');
  }, []);

  // Play test sound
  const playTestSound = useCallback(() => {
    initAudioContext();
    playNotificationTone();
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

  // Start/stop based on pending orders
  useEffect(() => {
    if (pendingRemoteOrders.length > 0 && isAudioEnabled) {
      startSound();
    } else if (pendingRemoteOrders.length === 0) {
      stopSound();
    }
  }, [pendingRemoteOrders.length, isAudioEnabled, startSound, stopSound]);

  // Cleanup on unmount - use empty deps to only run on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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
    isAudioEnabled,
    volume,
    enableAudio,
    disableAudio,
    toggleAudio,
    adjustVolume,
    playTestSound,
  };
};

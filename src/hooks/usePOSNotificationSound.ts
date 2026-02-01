import { useEffect, useRef, useCallback } from 'react';
import { Order } from '@/types/menu';

// Create a loud notification sound using Web Audio API
const createNotificationSound = (): AudioContext | null => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    return new AudioContextClass();
  } catch {
    console.warn('Web Audio API not supported');
    return null;
  }
};

const playNotificationTone = (audioContext: AudioContext) => {
  const now = audioContext.currentTime;
  
  // Create a loud, attention-grabbing multi-tone sequence
  const frequencies = [880, 1100, 880, 1100]; // A5, C#6 alternating
  const noteDuration = 0.15;
  
  frequencies.forEach((freq, index) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'square'; // More piercing sound
    oscillator.frequency.setValueAtTime(freq, now + index * noteDuration);
    
    // Loud volume
    gainNode.gain.setValueAtTime(0.5, now + index * noteDuration);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + (index + 1) * noteDuration);
    
    oscillator.start(now + index * noteDuration);
    oscillator.stop(now + (index + 1) * noteDuration);
  });
};

export const usePOSNotificationSound = (orders: Order[]) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasUserInteracted = useRef(false);

  // Track pending web/app orders (not walk-in)
  const pendingRemoteOrders = orders.filter(
    o => o.status === 'pending' && (o.source === 'web' || o.source === 'app')
  );

  const stopSound = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = createNotificationSound();
    }
    
    if (!audioContextRef.current) return;

    // Resume audio context if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    // Play immediately
    playNotificationTone(audioContextRef.current);
    
    // Loop every 2 seconds
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        if (audioContextRef.current && audioContextRef.current.state === 'running') {
          playNotificationTone(audioContextRef.current);
        }
      }, 2000);
    }
  }, []);

  // Enable audio on first user interaction
  const enableAudio = useCallback(() => {
    if (!hasUserInteracted.current) {
      hasUserInteracted.current = true;
      if (!audioContextRef.current) {
        audioContextRef.current = createNotificationSound();
      }
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }
  }, []);

  // Listen for user interaction to enable audio
  useEffect(() => {
    const handleInteraction = () => enableAudio();
    
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [enableAudio]);

  // Start/stop sound based on pending remote orders
  useEffect(() => {
    if (pendingRemoteOrders.length > 0 && hasUserInteracted.current) {
      startSound();
    } else {
      stopSound();
    }
  }, [pendingRemoteOrders.length, startSound, stopSound]);

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
  };
};

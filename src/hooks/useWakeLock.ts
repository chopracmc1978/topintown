import { useState, useEffect, useCallback, useRef } from 'react';

const WAKE_LOCK_KEY = 'pos_keep_screen_awake';

export const useWakeLock = () => {
  const [isEnabled, setIsEnabled] = useState(() => {
    return localStorage.getItem(WAKE_LOCK_KEY) === 'true';
  });
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current?.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      }
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
      wakeLockRef.current = null;
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    localStorage.setItem(WAKE_LOCK_KEY, String(enabled));
  }, []);

  // Acquire/release based on enabled state
  useEffect(() => {
    if (isEnabled) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => { releaseWakeLock(); };
  }, [isEnabled, requestWakeLock, releaseWakeLock]);

  // Re-acquire on visibility change (wake lock is released when tab is hidden)
  useEffect(() => {
    if (!isEnabled) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isEnabled, requestWakeLock]);

  return { isEnabled, toggle, isSupported: 'wakeLock' in navigator };
};

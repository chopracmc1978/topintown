import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  email: string;
  phone: string;
  fullName: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface CustomerContextType {
  customer: Customer | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setCustomer: (customer: Customer | null) => void;
  refreshCustomer: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

const CUSTOMER_STORAGE_KEY = 'topintown_customer';
const SESSION_STORAGE_KEY = 'topintown_session';
const LAST_ACTIVITY_KEY = 'topintown_last_activity';
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export const CustomerProvider = ({ children }: { children: ReactNode }) => {
  const [customer, setCustomerState] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update last activity timestamp
  const updateLastActivity = useCallback(() => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  // Check if session has expired due to inactivity
  const checkInactivity = useCallback(() => {
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
      if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
        return true; // Session expired
      }
    }
    return false;
  }, []);

  // Logout function
  const logout = useCallback(() => {
    setCustomerState(null);
    localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  }, []);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    updateLastActivity();
    
    // Only set timer if customer is logged in
    if (customer) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('Auto-logout due to inactivity');
        logout();
      }, INACTIVITY_TIMEOUT);
    }
  }, [customer, logout, updateLastActivity]);

  // Load customer from localStorage on mount
  useEffect(() => {
    const storedCustomer = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (storedCustomer) {
      try {
        // Check if session expired while browser was closed
        if (checkInactivity()) {
          console.log('Session expired due to inactivity');
          localStorage.removeItem(CUSTOMER_STORAGE_KEY);
          localStorage.removeItem(SESSION_STORAGE_KEY);
          localStorage.removeItem(LAST_ACTIVITY_KEY);
        } else {
          setCustomerState(JSON.parse(storedCustomer));
        }
      } catch (error) {
        console.error('Error parsing stored customer:', error);
        localStorage.removeItem(CUSTOMER_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, [checkInactivity]);

  // Setup activity listeners when customer is logged in
  useEffect(() => {
    if (!customer) return;

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Also handle visibility change (when user comes back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check if session expired while tab was hidden
        if (checkInactivity()) {
          console.log('Session expired while tab was hidden');
          logout();
        } else {
          resetInactivityTimer();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle beforeunload to save last activity time
    const handleBeforeUnload = () => {
      updateLastActivity();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Start the initial timer
    resetInactivityTimer();

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [customer, resetInactivityTimer, checkInactivity, logout, updateLastActivity]);

  // Persist customer to localStorage
  const setCustomer = (newCustomer: Customer | null) => {
    setCustomerState(newCustomer);
    if (newCustomer) {
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(newCustomer));
      updateLastActivity();
    } else {
      localStorage.removeItem(CUSTOMER_STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-login', {
        body: { email: email.toLowerCase().trim(), password },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }

      setCustomer(data.customer);
      localStorage.setItem(SESSION_STORAGE_KEY, data.sessionToken);
      
      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const refreshCustomer = async () => {
    if (!customer?.id) return;

    try {
      // Use edge function to refresh customer (avoids public SELECT on customers table)
      const { data, error } = await supabase.functions.invoke('customer-profile', {
        body: { customerId: customer.id },
      });

      if (!error && data?.customer) {
        setCustomer({
          id: data.customer.id,
          email: data.customer.email,
          phone: data.customer.phone,
          fullName: data.customer.full_name,
          emailVerified: data.customer.email_verified,
          phoneVerified: data.customer.phone_verified,
        });
      }
    } catch (error) {
      console.error('Error refreshing customer:', error);
    }
  };

  return (
    <CustomerContext.Provider value={{ customer, loading, login, logout, setCustomer, refreshCustomer }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
};

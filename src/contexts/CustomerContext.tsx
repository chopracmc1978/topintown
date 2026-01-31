import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

export const CustomerProvider = ({ children }: { children: ReactNode }) => {
  const [customer, setCustomerState] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Load customer from localStorage on mount
  useEffect(() => {
    const storedCustomer = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (storedCustomer) {
      try {
        setCustomerState(JSON.parse(storedCustomer));
      } catch (error) {
        console.error('Error parsing stored customer:', error);
        localStorage.removeItem(CUSTOMER_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  // Persist customer to localStorage
  const setCustomer = (newCustomer: Customer | null) => {
    setCustomerState(newCustomer);
    if (newCustomer) {
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(newCustomer));
    } else {
      localStorage.removeItem(CUSTOMER_STORAGE_KEY);
      localStorage.removeItem(SESSION_STORAGE_KEY);
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

  const logout = () => {
    setCustomer(null);
  };

  const refreshCustomer = async () => {
    if (!customer?.id) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customer.id)
        .single();

      if (!error && data) {
        setCustomer({
          id: data.id,
          email: data.email,
          phone: data.phone,
          fullName: data.full_name,
          emailVerified: data.email_verified,
          phoneVerified: data.phone_verified,
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

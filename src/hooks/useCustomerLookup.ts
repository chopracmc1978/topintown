import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CartItem, CartPizzaCustomization, CartWingsCustomization, CartComboCustomization } from '@/types/menu';

interface CustomerOrderHistory {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  items: CartItem[];
  customer_name: string | null;
  customer_phone: string | null;
}

interface CustomerInfo {
  id: string;
  phone: string;
  full_name: string | null;
  reward_points?: number;
}

export const useCustomerLookup = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [orderHistory, setOrderHistory] = useState<CustomerOrderHistory[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [rewardPoints, setRewardPoints] = useState(0);

  // Search for customer and their last 5 orders by phone
  const searchByPhone = useCallback(async (phone: string) => {
    if (!phone || phone.length < 3) {
      setOrderHistory([]);
      setCustomerInfo(null);
      return;
    }

    setIsSearching(true);
    try {
      // Clean phone number for search (remove non-digits)
      const cleanPhone = phone.replace(/\D/g, '');
      
      // First check customers table
      const { data: customer } = await supabase
        .from('customers')
        .select('id, phone, full_name')
        .ilike('phone', `%${cleanPhone}%`)
        .limit(1)
        .single();

      if (customer) {
        setCustomerInfo(customer);
      } else {
        setCustomerInfo(null);
      }
      
      // Fetch reward points for this phone
      const { data: rewards } = await supabase
        .from('customer_rewards')
        .select('points')
        .eq('phone', cleanPhone)
        .single();
      
      setRewardPoints(rewards?.points || 0);

      // Search orders by phone (works even without customer record)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, created_at, total, customer_name, customer_phone')
        .ilike('customer_phone', `%${cleanPhone}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        setOrderHistory([]);
        return;
      }

      // Fetch items for these orders
      const orderIds = orders.map(o => o.id);
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Map items to orders
      const ordersWithItems: CustomerOrderHistory[] = orders.map(order => {
        const orderItems = (items || [])
          .filter(item => item.order_id === order.id)
          .map(item => {
            const customizations = item.customizations as any;
            
            // Detect customization type
            let pizzaCustomization: CartPizzaCustomization | undefined;
            let wingsCustomization: CartWingsCustomization | undefined;
            let comboCustomization: CartComboCustomization | undefined;
            let category: string = 'sides';

            if (customizations) {
              // Check for combo (has comboId and selections array)
              if (customizations.comboId && customizations.selections) {
                comboCustomization = customizations as CartComboCustomization;
                category = 'combo';
              }
              // Check for pizza (has size object)
              else if (customizations.size && typeof customizations.size === 'object') {
                pizzaCustomization = customizations as CartPizzaCustomization;
                category = 'pizza';
              }
              // Check for wings (has flavor but no size)
              else if (customizations.flavor && !customizations.size) {
                wingsCustomization = customizations as CartWingsCustomization;
                category = 'chicken_wings';
              }
            }

            return {
              id: item.menu_item_id || item.id,
              name: item.name,
              description: '',
              price: item.unit_price,
              image: '',
              category,
              quantity: item.quantity,
              totalPrice: item.total_price,
              pizzaCustomization,
              wingsCustomization,
              comboCustomization,
            } as CartItem;
          });

        return {
          id: order.id,
          order_number: order.order_number,
          created_at: order.created_at,
          total: order.total,
          items: orderItems,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
        };
      });

      setOrderHistory(ordersWithItems);
    } catch (err) {
      console.error('Error searching customer:', err);
      setOrderHistory([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Save or update customer in database
  const saveCustomer = useCallback(async (phone: string, name?: string) => {
    if (!phone) return null;

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return null;

    try {
      // Check if customer exists
      const { data: existing } = await supabase
        .from('customers')
        .select('id, phone, full_name')
        .eq('phone', cleanPhone)
        .single();

      if (existing) {
        // Update name if provided and different
        if (name && name !== existing.full_name && name !== 'Walk-in Customer') {
          await supabase
            .from('customers')
            .update({ full_name: name })
            .eq('id', existing.id);
        }
        return existing.id;
      }

      // Create new customer
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          phone: cleanPhone,
          full_name: name && name !== 'Walk-in Customer' ? name : null,
          email: `${cleanPhone}@placeholder.local`, // Required field placeholder
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating customer:', error);
        return null;
      }

      return newCustomer?.id || null;
    } catch (err) {
      console.error('Error saving customer:', err);
      return null;
    }
  }, []);

  const clearSearch = useCallback(() => {
    setOrderHistory([]);
    setCustomerInfo(null);
    setRewardPoints(0);
  }, []);

  return {
    isSearching,
    orderHistory,
    customerInfo,
    rewardPoints,
    searchByPhone,
    saveCustomer,
    clearSearch,
  };
};

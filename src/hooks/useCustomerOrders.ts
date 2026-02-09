import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrderItemCustomization {
  // Pizza customization
  size?: { id: string; name: string; price: number };
  crust?: { id: string; name: string; price: number };
  cheeseType?: string;
  cheeseSides?: { side: string; quantity: string }[];
  sauceId?: string | null;
  sauceName?: string;
  sauceQuantity?: string;
  spicyLevel?: { left: string; right: string } | string;
  freeToppings?: string[];
  defaultToppings?: { id: string; name: string; quantity: string; side?: string }[];
  extraToppings?: { id: string; name: string; price: number; side?: string }[];
  note?: string;
  
  // Wings customization
  flavor?: string;
  originalItemId?: string;
  
  // Combo customization
  comboId?: string;
  comboName?: string;
  comboBasePrice?: number;
  totalExtraCharge?: number;
  selections?: {
    itemType: string;
    itemName: string;
    flavor?: string;
    pizzaCustomization?: any;
    extraCharge: number;
  }[];
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizations: OrderItemCustomization | null;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  locationId: string;
  status: string;
  orderType: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  createdAt: string;
  pickupTime: string | null;
  customerName: string | null;
  customerPhone: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  items: OrderItem[];
}

const SESSION_STORAGE_KEY = 'topintown_session';

export const useCustomerOrders = (customerId: string | undefined) => {
  return useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: async (): Promise<CustomerOrder[]> => {
      if (!customerId) return [];

      // Include signed session token for authorization
      const sessionToken = localStorage.getItem(SESSION_STORAGE_KEY) || '';

      // Use edge function to fetch orders securely (avoids public SELECT on orders table)
      const { data, error } = await supabase.functions.invoke('get-customer-orders', {
        body: { customerId, sessionToken },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const orders = data?.orders || [];

      return orders.map((order: any) => ({
        id: order.id,
        orderNumber: order.order_number,
        locationId: order.location_id,
        status: order.status,
        orderType: order.order_type,
        subtotal: Number(order.subtotal),
        tax: Number(order.tax),
        total: Number(order.total),
        notes: order.notes,
        createdAt: order.created_at,
        pickupTime: order.pickup_time,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        items: (order.items || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          totalPrice: Number(item.total_price),
          customizations: item.customizations as OrderItemCustomization | null,
        })),
      }));
    },
    enabled: !!customerId,
  });
};

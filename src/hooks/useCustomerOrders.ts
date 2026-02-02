import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizations: any;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  locationId: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  createdAt: string;
  pickupTime: string | null;
  items: OrderItem[];
}

export const useCustomerOrders = (customerId: string | undefined) => {
  return useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: async (): Promise<CustomerOrder[]> => {
      if (!customerId) return [];

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch order items for each order
      const ordersWithItems = await Promise.all(
        (orders || []).map(async (order) => {
          const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);

          if (itemsError) throw itemsError;

          return {
            id: order.id,
            orderNumber: order.order_number,
            locationId: order.location_id,
            status: order.status,
            subtotal: Number(order.subtotal),
            tax: Number(order.tax),
            total: Number(order.total),
            notes: order.notes,
            createdAt: order.created_at,
            pickupTime: order.pickup_time,
            items: (items || []).map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              unitPrice: Number(item.unit_price),
              totalPrice: Number(item.total_price),
              customizations: item.customizations,
            })),
          };
        })
      );

      return ordersWithItems;
    },
    enabled: !!customerId,
  });
};

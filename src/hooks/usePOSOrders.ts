import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, PaymentStatus, PaymentMethod, CartItem, OrderType, OrderSource, CartPizzaCustomization, CartWingsCustomization } from '@/types/menu';
import { toast } from 'sonner';

interface DBOrder {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  location_id: string;
  status: string;
  source: string;
  order_type: string;
  payment_status: string;
  payment_method: string | null;
  table_number: string | null;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface DBOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customizations: any;
  created_at: string;
}

// Convert database order to frontend Order type
const convertDBOrder = (dbOrder: DBOrder, dbItems: DBOrderItem[]): Order => {
  const items: CartItem[] = dbItems.map(item => {
    const customizations = item.customizations;
    const pizzaCustomization = customizations?.size ? customizations as CartPizzaCustomization : undefined;
    const wingsCustomization = customizations?.flavor && !customizations?.size ? customizations as CartWingsCustomization : undefined;

    return {
      id: item.menu_item_id || item.id,
      name: item.name,
      description: '',
      price: item.unit_price,
      image: '',
      category: pizzaCustomization ? 'pizza' : wingsCustomization ? 'chicken_wings' : 'sides',
      quantity: item.quantity,
      totalPrice: item.total_price,
      pizzaCustomization,
      wingsCustomization,
    };
  });

  return {
    id: dbOrder.order_number || dbOrder.id,
    items,
    customerName: dbOrder.customer_name || 'Online Customer',
    customerPhone: dbOrder.customer_phone || '',
    customerAddress: dbOrder.customer_address || '',
    orderType: (dbOrder.order_type || 'pickup') as OrderType,
    status: (dbOrder.status || 'pending') as OrderStatus,
    total: dbOrder.total,
    subtotal: dbOrder.subtotal,
    tax: dbOrder.tax,
    createdAt: new Date(dbOrder.created_at),
    notes: dbOrder.notes || undefined,
    source: (dbOrder.source || 'web') as OrderSource,
    paymentStatus: (dbOrder.payment_status || 'unpaid') as PaymentStatus,
    paymentMethod: dbOrder.payment_method as PaymentMethod | undefined,
    tableNumber: dbOrder.table_number || undefined,
  };
};

export const usePOSOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all orders with their items
  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch orders from today (or could be configurable)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: dbOrders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!dbOrders || dbOrders.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // Fetch all order items
      const orderIds = dbOrders.map(o => o.id);
      const { data: dbItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Group items by order
      const itemsByOrder: Record<string, DBOrderItem[]> = {};
      (dbItems || []).forEach(item => {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = [];
        }
        itemsByOrder[item.order_id].push(item as DBOrderItem);
      });

      // Convert to frontend format
      const convertedOrders = dbOrders.map(order => 
        convertDBOrder(order as DBOrder, itemsByOrder[order.id] || [])
      );

      setOrders(convertedOrders);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate order number via edge function
  const generateOrderNumber = async (locationId: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-order-number', {
        body: { locationId }
      });
      
      if (error) throw error;
      return data.orderNumber;
    } catch (err) {
      console.error('Error generating order number, using fallback:', err);
      // Fallback to timestamp-based if edge function fails
      return `TIT-${Date.now().toString(36).toUpperCase()}`;
    }
  };

  // Send SMS notification for order status
  const sendOrderSms = async (orderNumber: string, phone: string, type: 'preparing' | 'ready' | 'complete', prepTime?: number) => {
    try {
      if (!phone) {
        console.log('No phone number, skipping SMS');
        return;
      }
      
      const { error } = await supabase.functions.invoke('order-sms', {
        body: { orderNumber, phone, type, prepTime }
      });
      
      if (error) throw error;
      toast.success(`SMS sent to customer`);
    } catch (err: any) {
      console.error('Error sending SMS:', err);
      toast.error('Failed to send SMS notification');
    }
  };

  // Add new order (for POS walk-in orders)
  const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt'>, locationId: string = 'calgary'): Promise<Order | null> => {
    try {
      const orderNumber = await generateOrderNumber(locationId);
      
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          location_id: locationId,
          status: orderData.status,
          source: orderData.source,
          order_type: orderData.orderType,
          payment_status: orderData.paymentStatus,
          payment_method: orderData.paymentMethod || null,
          customer_name: orderData.customerName,
          customer_phone: orderData.customerPhone,
          customer_address: orderData.customerAddress,
          table_number: orderData.tableNumber || null,
          subtotal: orderData.subtotal,
          tax: orderData.tax,
          total: orderData.total,
          notes: orderData.notes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItems = orderData.items.map(item => ({
        order_id: newOrder.id,
        menu_item_id: item.pizzaCustomization?.originalItemId || item.wingsCustomization?.originalItemId || null,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.totalPrice,
        customizations: item.pizzaCustomization 
          ? JSON.parse(JSON.stringify(item.pizzaCustomization))
          : item.wingsCustomization 
          ? JSON.parse(JSON.stringify(item.wingsCustomization))
          : null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Return the created order
      const createdOrder: Order = {
        ...orderData,
        id: orderNumber,
        createdAt: new Date(newOrder.created_at),
      };

      // Add to local state immediately
      setOrders(prev => [createdOrder, ...prev]);

      return createdOrder;
    } catch (err: any) {
      console.error('Error adding order:', err);
      setError(err.message);
      return null;
    }
  };

  // Update order status with optional SMS
  const updateOrderStatus = async (orderNumber: string, status: OrderStatus, prepTime?: number) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('order_number', orderNumber);

      if (error) throw error;

      // Get order phone for SMS
      const order = orders.find(o => o.id === orderNumber);
      
      // Send SMS based on status
      if (order?.customerPhone) {
        if (status === 'preparing' && prepTime) {
          await sendOrderSms(orderNumber, order.customerPhone, 'preparing', prepTime);
        } else if (status === 'ready') {
          await sendOrderSms(orderNumber, order.customerPhone, 'ready');
        } else if (status === 'delivered') {
          await sendOrderSms(orderNumber, order.customerPhone, 'complete');
        }
      }

      // Update local state
      setOrders(prev => prev.map(o => 
        o.id === orderNumber ? { ...o, status } : o
      ));
    } catch (err: any) {
      console.error('Error updating order status:', err);
      setError(err.message);
    }
  };

  // Update payment status
  const updatePaymentStatus = async (orderNumber: string, paymentStatus: PaymentStatus, paymentMethod?: PaymentMethod) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: paymentStatus, 
          payment_method: paymentMethod || null,
          updated_at: new Date().toISOString() 
        })
        .eq('order_number', orderNumber);

      if (error) throw error;

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderNumber ? { ...order, paymentStatus, paymentMethod } : order
      ));
    } catch (err: any) {
      console.error('Error updating payment status:', err);
      setError(err.message);
    }
  };

  // Update order (items and notes)
  const updateOrder = async (orderNumber: string, updates: { items: CartItem[]; notes?: string }) => {
    try {
      const subtotal = updates.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const tax = subtotal * 0.08;
      const total = subtotal + tax;

      // Get order ID from order_number
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .single();

      if (fetchError) throw fetchError;

      // Update order totals
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          subtotal, 
          tax, 
          total, 
          notes: updates.notes || null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderData.id);

      if (updateError) throw updateError;

      // Delete existing items and insert new ones
      await supabase.from('order_items').delete().eq('order_id', orderData.id);

      const orderItems = updates.items.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.pizzaCustomization?.originalItemId || item.wingsCustomization?.originalItemId || null,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.totalPrice,
        customizations: item.pizzaCustomization 
          ? JSON.parse(JSON.stringify(item.pizzaCustomization))
          : item.wingsCustomization 
          ? JSON.parse(JSON.stringify(item.wingsCustomization))
          : null,
      }));

      await supabase.from('order_items').insert(orderItems);

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderNumber 
          ? { ...order, items: updates.items, notes: updates.notes, subtotal, tax, total } 
          : order
      ));
    } catch (err: any) {
      console.error('Error updating order:', err);
      setError(err.message);
    }
  };

  // Get order by ID
  const getOrderById = (orderNumber: string) => {
    return orders.find(order => order.id === orderNumber);
  };

  // Set up realtime subscription for new orders
  useEffect(() => {
    fetchOrders();

    // Subscribe to new orders and updates
    const channel = supabase
      .channel('pos-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          console.log('New order received:', payload);
          // Fetch the complete order with items
          const newOrderId = payload.new.id;
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', newOrderId);

          const order = convertDBOrder(payload.new as DBOrder, (items || []) as DBOrderItem[]);
          
          // Add to orders if not already present
          setOrders(prev => {
            if (prev.some(o => o.id === order.id)) return prev;
            return [order, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          console.log('Order updated:', payload);
          const updatedOrder = payload.new as DBOrder;
          
          // Update local state
          setOrders(prev => prev.map(order => {
            if (order.id === updatedOrder.order_number) {
              return {
                ...order,
                status: updatedOrder.status as OrderStatus,
                paymentStatus: updatedOrder.payment_status as PaymentStatus,
                paymentMethod: updatedOrder.payment_method as PaymentMethod | undefined,
                notes: updatedOrder.notes || undefined,
                subtotal: updatedOrder.subtotal,
                tax: updatedOrder.tax,
                total: updatedOrder.total,
              };
            }
            return order;
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    orders,
    loading,
    error,
    addOrder,
    updateOrderStatus,
    updatePaymentStatus,
    updateOrder,
    getOrderById,
    refetch: fetchOrders,
  };
};

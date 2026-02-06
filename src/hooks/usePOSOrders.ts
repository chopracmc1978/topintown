import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderStatus, PaymentStatus, PaymentMethod, CartItem, OrderType, OrderSource, CartPizzaCustomization, CartWingsCustomization, CartComboCustomization } from '@/types/menu';
import { toast } from 'sonner';
import { LOCATIONS } from '@/contexts/LocationContext';

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
   discount: number | null;
   coupon_code: string | null;
   amount_paid: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  pickup_time: string | null;
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
    
    // Check for combo customization first (has comboId or selections)
    const comboCustomization = customizations?.comboId || customizations?.selections 
      ? customizations as CartComboCustomization 
      : undefined;
    
    // Then check for pizza customization (has size object)
    const pizzaCustomization = !comboCustomization && customizations?.size 
      ? customizations as CartPizzaCustomization 
      : undefined;
    
    // Finally wings customization (has flavor but no size)
    const wingsCustomization = !comboCustomization && !pizzaCustomization && customizations?.flavor 
      ? customizations as CartWingsCustomization 
      : undefined;

    // Determine category based on customization type
    let category: CartItem['category'] = 'sides';
    if (comboCustomization) category = 'pizza'; // Combos can be treated as pizza category
    else if (pizzaCustomization) category = 'pizza';
    else if (wingsCustomization) category = 'chicken_wings';

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
    };
  });

  return {
    id: dbOrder.order_number || dbOrder.id,
    items,
    customerName: dbOrder.customer_name || 'Online Customer',
    customerPhone: dbOrder.customer_phone || '',
    customerAddress: dbOrder.customer_address || '',
    customerId: dbOrder.customer_id || undefined,
    orderType: (dbOrder.order_type || 'pickup') as OrderType,
    status: (dbOrder.status || 'pending') as OrderStatus,
    total: dbOrder.total,
    subtotal: dbOrder.subtotal,
    tax: dbOrder.tax,
     discount: dbOrder.discount || undefined,
     couponCode: dbOrder.coupon_code || undefined,
    createdAt: new Date(dbOrder.created_at),
    notes: dbOrder.notes || undefined,
    source: (dbOrder.source || 'web') as OrderSource,
    paymentStatus: (dbOrder.payment_status || 'unpaid') as PaymentStatus,
    paymentMethod: dbOrder.payment_method as PaymentMethod | undefined,
    tableNumber: dbOrder.table_number || undefined,
    pickupTime: dbOrder.pickup_time ? new Date(dbOrder.pickup_time) : undefined,
     amountPaid: dbOrder.amount_paid || undefined,
  };
};

export const usePOSOrders = (locationId?: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocationId, setCurrentLocationId] = useState<string | undefined>(locationId);

  // Update location when prop changes
  useEffect(() => {
    if (locationId && locationId !== currentLocationId) {
      setCurrentLocationId(locationId);
    }
  }, [locationId]);

  // Fetch orders with their items - filtered by location
  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch orders from today, filtered by location
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let query = supabase
        .from('orders')
        .select('*')
        .gte('created_at', today.toISOString());
      
      // Filter by location if specified
      if (currentLocationId) {
        query = query.eq('location_id', currentLocationId);
      }
      
      const { data: dbOrders, error: ordersError } = await query.order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        setError(ordersError.message);
        setLoading(false);
        return; // Don't throw - just return with error state
      }

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

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        // Continue without items rather than crashing
      }

      // Group items by order
      const itemsByOrder: Record<string, DBOrderItem[]> = {};
      ((dbItems || []) as DBOrderItem[]).forEach(item => {
        if (!itemsByOrder[item.order_id]) {
          itemsByOrder[item.order_id] = [];
        }
        itemsByOrder[item.order_id].push(item);
      });

      // Convert to frontend format
      const convertedOrders = dbOrders.map(order => 
        convertDBOrder(order as DBOrder, itemsByOrder[order.id] || [])
      );

      setOrders(convertedOrders);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err?.message || 'Unknown error');
      // Don't rethrow - prevent crash in native environment
    } finally {
      setLoading(false);
    }
  };

  // Generate order number via edge function (uses atomic DB function)
  const generateOrderNumber = async (locationId: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('generate-order-number', {
      body: { locationId }
    });
    
    if (error) {
      console.error('Error generating order number:', error);
      throw new Error('Unable to generate order number. Please try again.');
    }
    return data.orderNumber;
  };

  // Send SMS notification for order status
  const sendOrderSms = async (
    orderNumber: string, 
    phone: string | undefined, 
    customerId: string | undefined,
    type: 'accepted' | 'preparing' | 'ready' | 'complete', 
    options?: { prepTime?: number; pickupTime?: Date }
  ) => {
    try {
      if (!phone && !customerId) {
        console.log('No phone or customerId, skipping SMS');
        return;
      }
      
      console.log(`Sending order SMS: ${type} for ${orderNumber} to phone=${phone} customerId=${customerId}`);
      
      const { data, error } = await supabase.functions.invoke('order-sms', {
        body: { 
          orderNumber, 
          phone, 
          customerId, 
          type, 
          prepTime: options?.prepTime,
          pickupTime: options?.pickupTime?.toISOString()
        }
      });
      
      if (error) throw error;
      
      // Check response for skipped cases
      if (data?.message?.includes('skipped')) {
        console.log('SMS skipped:', data.message);
        return;
      }
      
      toast.success(`SMS sent to customer`);
    } catch (err: any) {
      console.error('Error sending SMS:', err);
      toast.error('Failed to send SMS notification');
    }
  };

  // Send email receipt to customer
  const sendEmailReceipt = async (order: Order, locationId: string) => {
    try {
      // Get customer email from database
      if (!order.customerId) {
        console.log('No customer ID, skipping email receipt');
        return;
      }

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('email, email_verified')
        .eq('id', order.customerId)
        .single();

      if (customerError || !customer?.email) {
        console.log('Customer email not found, skipping email receipt');
        return;
      }

      if (!customer.email_verified) {
        console.log('Customer email not verified, skipping email receipt');
        return;
      }

      const location = LOCATIONS.find(l => l.id === locationId);
      
      const emailData = {
        orderId: order.id,
        email: customer.email,
        customerName: order.customerName || 'Valued Customer',
        orderNumber: order.id,
        orderDate: order.createdAt.toISOString(),
        orderType: order.orderType,
        pickupTime: order.pickupTime?.toISOString(),
        items: order.items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.totalPrice,
          customizations: item.pizzaCustomization || item.wingsCustomization,
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        locationName: location?.name || 'Top In Town Pizza',
        locationAddress: location?.address || '',
        locationPhone: location?.phone || '',
      };

      console.log('Sending email receipt to:', customer.email);
      
      const { error } = await supabase.functions.invoke('send-receipt', {
        body: emailData
      });

      if (error) throw error;
      
      console.log('Email receipt sent successfully');
    } catch (err: any) {
      console.error('Error sending email receipt:', err);
      // Don't show toast for email failures, just log
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
           discount: orderData.discount || null,
           coupon_code: orderData.couponCode || null,
          notes: orderData.notes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items - include combo customization
      const orderItems = orderData.items.map(item => ({
        order_id: newOrder.id,
        menu_item_id: item.pizzaCustomization?.originalItemId || item.wingsCustomization?.originalItemId || null,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.totalPrice,
        customizations: item.comboCustomization 
          ? JSON.parse(JSON.stringify(item.comboCustomization))
          : item.pizzaCustomization 
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

  // Award reward points when order is completed
  const awardRewardPoints = async (order: Order) => {
    try {
      if (!order.customerPhone) {
        console.log('No customer phone, skipping reward points');
        return;
      }

      // Calculate points: 1 point per $2 spent (0.5 points per $1)
      const pointsToAward = Math.floor(order.total * 0.5);
      if (pointsToAward <= 0) return;

      console.log(`Awarding ${pointsToAward} reward points to ${order.customerPhone}`);

      // Get existing rewards record
      const { data: existing } = await supabase
        .from('customer_rewards')
        .select('*')
        .eq('phone', order.customerPhone)
        .maybeSingle();

      if (existing) {
        // Update existing record — customer already has a rewards account
        await supabase
          .from('customer_rewards')
          .update({
            points: existing.points + pointsToAward,
            lifetime_points: existing.lifetime_points + pointsToAward,
            customer_id: order.customerId || existing.customer_id,
          })
          .eq('id', existing.id);
      } else {
        // No rewards account exists — walk-in customer without an account
        // Do NOT create a rewards record; points only start after they sign up online
        console.log('No rewards account for this phone, skipping points (walk-in without account)');
        return;
      }

      // Get the order's database ID for the history record
      const { data: orderData } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', order.id)
        .maybeSingle();

      // Record in history
      await supabase
        .from('rewards_history')
        .insert({
          phone: order.customerPhone,
          customer_id: order.customerId || null,
          order_id: orderData?.id || null,
          points_change: pointsToAward,
          transaction_type: 'earned',
          description: `Earned ${pointsToAward} points from order ${order.id}`,
        });

      console.log('Reward points awarded successfully');
      toast.success(`${pointsToAward} reward points added!`);
    } catch (err: any) {
      console.error('Error awarding reward points:', err);
      // Don't throw - rewards shouldn't block order completion
    }
  };

  // Update order status with optional SMS and email receipt
  const updateOrderStatus = async (orderNumber: string, status: OrderStatus, prepTime?: number, locationId?: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('order_number', orderNumber);

      if (error) throw error;

      // Get order for SMS
      const order = orders.find(o => o.id === orderNumber);
      
      // Send SMS based on status (pass both phone and customerId for fallback lookup)
      if (order?.customerPhone || order?.customerId) {
        if (status === 'preparing') {
          // Check if it's an advance order (has pickupTime)
          if (order.pickupTime) {
            // For advance orders, send "accepted" SMS with pickup time
            await sendOrderSms(orderNumber, order.customerPhone, order.customerId, 'accepted', { pickupTime: order.pickupTime });
          } else if (prepTime) {
            // For ASAP orders, send "preparing" SMS with prep time
            await sendOrderSms(orderNumber, order.customerPhone, order.customerId, 'preparing', { prepTime });
          }
        } else if (status === 'ready') {
          await sendOrderSms(orderNumber, order.customerPhone, order.customerId, 'ready');
        } else if (status === 'delivered') {
          await sendOrderSms(orderNumber, order.customerPhone, order.customerId, 'complete');
          // Send email receipt when order is completed
          if (order && locationId) {
            await sendEmailReceipt(order, locationId);
          }
          // Award reward points when order is completed
          await awardRewardPoints(order);
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
       // Get current order to know the total for amount_paid
       const currentOrder = orders.find(o => o.id === orderNumber);
       const newAmountPaid = paymentStatus === 'paid' ? (currentOrder?.total || 0) : 0;
       
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: paymentStatus, 
          payment_method: paymentMethod || null,
           amount_paid: newAmountPaid,
          updated_at: new Date().toISOString() 
        })
        .eq('order_number', orderNumber);

      if (error) throw error;

      // Update local state
      setOrders(prev => prev.map(order => 
         order.id === orderNumber 
           ? { 
               ...order, 
               paymentStatus, 
               paymentMethod,
               // When marking as paid, update amountPaid to match current total
                amountPaid: newAmountPaid
             } 
           : order
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
       
       // Get current order to preserve discount and calculate correct tax
       const currentOrder = orders.find(o => o.id === orderNumber);
       const discount = currentOrder?.discount || 0;
       const discountedSubtotal = Math.max(0, subtotal - discount);
       const tax = discountedSubtotal * 0.05; // 5% GST (Alberta)
       const total = discountedSubtotal + tax;
       
       // Track amount already paid if order was previously paid
       const amountPaid = currentOrder?.paymentStatus === 'paid' 
         ? (currentOrder.amountPaid ?? currentOrder.total) 
         : 0;

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
        customizations: item.comboCustomization 
          ? JSON.parse(JSON.stringify(item.comboCustomization))
          : item.pizzaCustomization 
          ? JSON.parse(JSON.stringify(item.pizzaCustomization))
          : item.wingsCustomization 
          ? JSON.parse(JSON.stringify(item.wingsCustomization))
          : null,
      }));

      await supabase.from('order_items').insert(orderItems);

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderNumber 
           ? { 
               ...order, 
               items: updates.items, 
               notes: updates.notes, 
               subtotal, 
               tax, 
               total,
               // Preserve amountPaid to track balance due after editing
               amountPaid: order.paymentStatus === 'paid' 
                 ? (order.amountPaid ?? order.total)
                 : order.amountPaid
             } 
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

  // Clear orders at End of Day - mark delivered orders as archived, keep advance preparing orders
  const clearEndOfDayOrders = async (locationId: string) => {
    try {
      // Get today's date range in Mountain Time
      const now = new Date();
      const mtNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Edmonton' }));
      mtNow.setHours(0, 0, 0, 0);

      // Clear all orders from local state except:
      // 1. Advance orders that are still in "preparing" status (have pickupTime in the future)
      // 2. Pending orders with future pickupTime
      setOrders(prev => prev.filter(order => {
        // Keep advance orders with future pickup times
        if (order.pickupTime) {
          const pickupDate = new Date(order.pickupTime);
          if (pickupDate > now && (order.status === 'preparing' || order.status === 'pending')) {
            return true;
          }
        }
        // Clear everything else
        return false;
      }));

      console.log('End of Day: Orders cleared from POS view');
    } catch (err: any) {
      console.error('Error clearing end of day orders:', err);
    }
  };

  // Set up realtime subscription for new orders - filtered by location
  useEffect(() => {
    fetchOrders();

    // Subscribe to new orders and updates for this location
    const channelName = currentLocationId ? `pos-orders-${currentLocationId}` : 'pos-orders-all';
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: currentLocationId ? `location_id=eq.${currentLocationId}` : undefined,
        },
        async (payload) => {
          console.log('New order received:', payload);
          const newOrder = payload.new as DBOrder;
          
          // Double-check location filter (in case filter wasn't applied)
          if (currentLocationId && newOrder.location_id !== currentLocationId) {
            console.log('Order for different location, ignoring');
            return;
          }
          
          // Fetch the complete order with items
          const newOrderId = payload.new.id;
          const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', newOrderId);

          const order = convertDBOrder(newOrder, (items || []) as DBOrderItem[]);
          
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
          filter: currentLocationId ? `location_id=eq.${currentLocationId}` : undefined,
        },
        async (payload) => {
          console.log('Order updated:', payload);
          const updatedOrder = payload.new as DBOrder;
          
          // Double-check location filter
          if (currentLocationId && updatedOrder.location_id !== currentLocationId) {
            return;
          }
          
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
                 amountPaid: updatedOrder.amount_paid || undefined,
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
  }, [currentLocationId]);

  return {
    orders,
    loading,
    error,
    addOrder,
    updateOrderStatus,
    updatePaymentStatus,
    updateOrder,
    getOrderById,
    clearEndOfDayOrders,
    refetch: fetchOrders,
  };
};

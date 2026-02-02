import { useState, useEffect } from 'react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface DailySalesData {
  date: string;
  totalSales: number;
  orderCount: number;
  avgTicket: number;
  cashSales: number;
  cardSales: number;
}

interface CategorySalesData {
  category: string;
  totalSales: number;
  orderCount: number;
  percentage: number;
}

interface ProductSalesData {
  name: string;
  category: string;
  quantity: number;
  totalSales: number;
}

interface HourlySalesData {
  hour: number;
  totalSales: number;
  orderCount: number;
}

interface PaymentTypeData {
  method: string;
  totalSales: number;
  orderCount: number;
  percentage: number;
}

interface OrderSourceData {
  source: string;
  totalSales: number;
  orderCount: number;
  percentage: number;
}

export const usePOSReports = (locationId: string) => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Fetch daily/monthly sales
  const fetchDailySales = async (start: Date, end: Date): Promise<DailySalesData[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total, payment_method, status')
        .eq('location_id', locationId)
        .gte('created_at', startOfDay(start).toISOString())
        .lte('created_at', endOfDay(end).toISOString())
        .neq('status', 'cancelled');

      if (error) throw error;

      // Group by date
      const salesByDate: Record<string, DailySalesData> = {};
      
      (data || []).forEach(order => {
        const dateKey = format(new Date(order.created_at), 'yyyy-MM-dd');
        
        if (!salesByDate[dateKey]) {
          salesByDate[dateKey] = {
            date: dateKey,
            totalSales: 0,
            orderCount: 0,
            avgTicket: 0,
            cashSales: 0,
            cardSales: 0,
          };
        }
        
        salesByDate[dateKey].totalSales += order.total || 0;
        salesByDate[dateKey].orderCount += 1;
        
        if (order.payment_method === 'cash') {
          salesByDate[dateKey].cashSales += order.total || 0;
        } else if (order.payment_method === 'card') {
          salesByDate[dateKey].cardSales += order.total || 0;
        }
      });

      // Calculate averages
      Object.values(salesByDate).forEach(day => {
        day.avgTicket = day.orderCount > 0 ? day.totalSales / day.orderCount : 0;
      });

      return Object.values(salesByDate).sort((a, b) => b.date.localeCompare(a.date));
    } catch (err) {
      console.error('Error fetching daily sales:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch category-wise sales
  const fetchCategorySales = async (start: Date, end: Date): Promise<CategorySalesData[]> => {
    setLoading(true);
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('location_id', locationId)
        .gte('created_at', startOfDay(start).toISOString())
        .lte('created_at', endOfDay(end).toISOString())
        .neq('status', 'cancelled');

      if (ordersError) throw ordersError;

      const orderIds = (orders || []).map(o => o.id);
      
      if (orderIds.length === 0) return [];

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('name, total_price, customizations, menu_item_id')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Get menu items for category info
      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('id, category');

      const menuItemMap = new Map((menuItems || []).map(m => [m.id, m.category]));

      // Group by category
      const salesByCategory: Record<string, CategorySalesData> = {};
      let totalSales = 0;

      (items || []).forEach(item => {
        // Determine category from customizations or menu item
        let category = 'Other';
        const customizations = item.customizations as any;
        
        if (customizations?.size) {
          category = 'Pizza';
        } else if (customizations?.flavor) {
          category = 'Chicken Wings';
        } else if (item.menu_item_id && menuItemMap.has(item.menu_item_id)) {
          category = formatCategory(menuItemMap.get(item.menu_item_id) || 'other');
        }

        if (!salesByCategory[category]) {
          salesByCategory[category] = {
            category,
            totalSales: 0,
            orderCount: 0,
            percentage: 0,
          };
        }

        salesByCategory[category].totalSales += item.total_price || 0;
        salesByCategory[category].orderCount += 1;
        totalSales += item.total_price || 0;
      });

      // Calculate percentages
      Object.values(salesByCategory).forEach(cat => {
        cat.percentage = totalSales > 0 ? (cat.totalSales / totalSales) * 100 : 0;
      });

      return Object.values(salesByCategory).sort((a, b) => b.totalSales - a.totalSales);
    } catch (err) {
      console.error('Error fetching category sales:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch best/worst selling products
  const fetchProductSales = async (start: Date, end: Date): Promise<{ best: ProductSalesData[]; worst: ProductSalesData[] }> => {
    setLoading(true);
    try {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('location_id', locationId)
        .gte('created_at', startOfDay(start).toISOString())
        .lte('created_at', endOfDay(end).toISOString())
        .neq('status', 'cancelled');

      if (ordersError) throw ordersError;

      const orderIds = (orders || []).map(o => o.id);
      
      if (orderIds.length === 0) return { best: [], worst: [] };

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('name, total_price, quantity, customizations')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Group by product name
      const salesByProduct: Record<string, ProductSalesData> = {};

      (items || []).forEach(item => {
        const name = item.name;
        const customizations = item.customizations as any;
        let category = 'Other';
        
        if (customizations?.size) {
          category = 'Pizza';
        } else if (customizations?.flavor) {
          category = 'Chicken Wings';
        }

        if (!salesByProduct[name]) {
          salesByProduct[name] = {
            name,
            category,
            quantity: 0,
            totalSales: 0,
          };
        }

        salesByProduct[name].quantity += item.quantity || 1;
        salesByProduct[name].totalSales += item.total_price || 0;
      });

      const sorted = Object.values(salesByProduct).sort((a, b) => b.quantity - a.quantity);
      
      return {
        best: sorted.slice(0, 10),
        worst: sorted.slice(-10).reverse(),
      };
    } catch (err) {
      console.error('Error fetching product sales:', err);
      return { best: [], worst: [] };
    } finally {
      setLoading(false);
    }
  };

  // Fetch hourly sales
  const fetchHourlySales = async (start: Date, end: Date): Promise<HourlySalesData[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total')
        .eq('location_id', locationId)
        .gte('created_at', startOfDay(start).toISOString())
        .lte('created_at', endOfDay(end).toISOString())
        .neq('status', 'cancelled');

      if (error) throw error;

      // Group by hour
      const salesByHour: Record<number, HourlySalesData> = {};
      
      // Initialize all hours
      for (let i = 0; i < 24; i++) {
        salesByHour[i] = { hour: i, totalSales: 0, orderCount: 0 };
      }

      (data || []).forEach(order => {
        const hour = new Date(order.created_at).getHours();
        salesByHour[hour].totalSales += order.total || 0;
        salesByHour[hour].orderCount += 1;
      });

      return Object.values(salesByHour);
    } catch (err) {
      console.error('Error fetching hourly sales:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch payment type breakdown
  const fetchPaymentTypes = async (start: Date, end: Date): Promise<PaymentTypeData[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('total, payment_method')
        .eq('location_id', locationId)
        .gte('created_at', startOfDay(start).toISOString())
        .lte('created_at', endOfDay(end).toISOString())
        .eq('payment_status', 'paid')
        .neq('status', 'cancelled');

      if (error) throw error;

      const salesByPayment: Record<string, PaymentTypeData> = {};
      let totalSales = 0;

      (data || []).forEach(order => {
        const method = order.payment_method || 'Unknown';
        
        if (!salesByPayment[method]) {
          salesByPayment[method] = {
            method: formatPaymentMethod(method),
            totalSales: 0,
            orderCount: 0,
            percentage: 0,
          };
        }

        salesByPayment[method].totalSales += order.total || 0;
        salesByPayment[method].orderCount += 1;
        totalSales += order.total || 0;
      });

      // Calculate percentages
      Object.values(salesByPayment).forEach(p => {
        p.percentage = totalSales > 0 ? (p.totalSales / totalSales) * 100 : 0;
      });

      return Object.values(salesByPayment).sort((a, b) => b.totalSales - a.totalSales);
    } catch (err) {
      console.error('Error fetching payment types:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch order sources (Walk-in, Web, App)
  const fetchOrderSources = async (start: Date, end: Date): Promise<OrderSourceData[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('total, source')
        .eq('location_id', locationId)
        .gte('created_at', startOfDay(start).toISOString())
        .lte('created_at', endOfDay(end).toISOString())
        .neq('status', 'cancelled');

      if (error) throw error;

      const salesBySource: Record<string, OrderSourceData> = {};
      let totalSales = 0;

      (data || []).forEach(order => {
        const source = order.source || 'Unknown';
        
        if (!salesBySource[source]) {
          salesBySource[source] = {
            source: formatSource(source),
            totalSales: 0,
            orderCount: 0,
            percentage: 0,
          };
        }

        salesBySource[source].totalSales += order.total || 0;
        salesBySource[source].orderCount += 1;
        totalSales += order.total || 0;
      });

      // Calculate percentages
      Object.values(salesBySource).forEach(s => {
        s.percentage = totalSales > 0 ? (s.totalSales / totalSales) * 100 : 0;
      });

      return Object.values(salesBySource).sort((a, b) => b.totalSales - a.totalSales);
    } catch (err) {
      console.error('Error fetching order sources:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch cancelled orders
  const fetchCancelledOrders = async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('order_number, total, created_at, customer_name, source')
        .eq('location_id', locationId)
        .gte('created_at', startOfDay(start).toISOString())
        .lte('created_at', endOfDay(end).toISOString())
        .eq('status', 'cancelled');

      if (error) throw error;

      const totalLost = (data || []).reduce((sum, o) => sum + (o.total || 0), 0);
      
      return {
        orders: data || [],
        count: data?.length || 0,
        totalLost,
      };
    } catch (err) {
      console.error('Error fetching cancelled orders:', err);
      return { orders: [], count: 0, totalLost: 0 };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    dateRange,
    setDateRange,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    fetchDailySales,
    fetchCategorySales,
    fetchProductSales,
    fetchHourlySales,
    fetchPaymentTypes,
    fetchOrderSources,
    fetchCancelledOrders,
  };
};

// Helper functions
const formatCategory = (category: string): string => {
  const map: Record<string, string> = {
    pizza: 'Pizza',
    sides: 'Sides',
    drinks: 'Drinks',
    desserts: 'Desserts',
    dipping_sauce: 'Dipping Sauce',
    chicken_wings: 'Chicken Wings',
    baked_lasagna: 'Baked Lasagna',
  };
  return map[category] || category;
};

const formatPaymentMethod = (method: string): string => {
  const map: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
  };
  return map[method] || method;
};

const formatSource = (source: string): string => {
  const map: Record<string, string> = {
    'walk-in': 'Walk-in',
    web: 'Website',
    app: 'Mobile App',
  };
  return map[source] || source;
};

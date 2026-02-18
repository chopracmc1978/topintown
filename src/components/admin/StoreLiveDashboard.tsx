import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LocationRow } from '@/hooks/useLocations';
import { DollarSign, ShoppingCart, Receipt, TrendingUp, MapPin, Eye, ChevronDown, ChevronUp, Check, X, Ban } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { POSReportsPanel } from '@/components/pos/POSReportsPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Props {
  location: LocationRow;
}

const StoreLiveDashboard = ({ location }: Props) => {
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const yesterdayStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const yesterdayEnd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, []);

  const { data: todayOrders } = useQuery({
    queryKey: ['store-dashboard', location.id, 'today'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, status, created_at, order_type, payment_status')
        .eq('location_id', location.id)
        .gte('created_at', todayStart)
        .neq('status', 'cancelled');
      if (error) throw error;
      return data;
    },
    refetchInterval: 15000,
  });

  const { data: yesterdayOrders } = useQuery({
    queryKey: ['store-dashboard', location.id, 'yesterday'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, status')
        .eq('location_id', location.id)
        .gte('created_at', yesterdayStart)
        .lte('created_at', yesterdayEnd)
        .neq('status', 'cancelled');
      if (error) throw error;
      return data;
    },
  });

  const { data: bestSellers } = useQuery({
    queryKey: ['store-dashboard', location.id, 'best-sellers'],
    queryFn: async () => {
      const { data: orderIds, error: oErr } = await supabase
        .from('orders')
        .select('id')
        .eq('location_id', location.id)
        .gte('created_at', todayStart)
        .neq('status', 'cancelled');
      if (oErr) throw oErr;
      if (!orderIds?.length) return [];
      
      const ids = orderIds.map(o => o.id);
      const { data: items, error: iErr } = await supabase
        .from('order_items')
        .select('name, quantity, total_price')
        .in('order_id', ids);
      if (iErr) throw iErr;

      const map = new Map<string, { name: string; sold: number; revenue: number }>();
      items?.forEach(item => {
        const existing = map.get(item.name) || { name: item.name, sold: 0, revenue: 0 };
        existing.sold += item.quantity;
        existing.revenue += Number(item.total_price);
        map.set(item.name, existing);
      });
      return Array.from(map.values()).sort((a, b) => b.sold - a.sold).slice(0, 5);
    },
    refetchInterval: 30000,
  });

  const { data: weekData } = useQuery({
    queryKey: ['store-dashboard', location.id, 'week'],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at')
        .eq('location_id', location.id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .neq('status', 'cancelled');
      if (error) throw error;

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const chartMap = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        chartMap.set(days[d.getDay()], 0);
      }
      data?.forEach(o => {
        const day = days[new Date(o.created_at).getDay()];
        chartMap.set(day, (chartMap.get(day) || 0) + Number(o.total));
      });
      return Array.from(chartMap.entries()).map(([day, sales]) => ({ day, sales: Math.round(sales) }));
    },
  });

  const { data: liveOrders } = useQuery({
    queryKey: ['store-dashboard', location.id, 'live'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total, order_type, customer_name, customer_phone, created_at, payment_status, payment_method, notes, source, subtotal, tax, discount, rewards_discount, coupon_code')
        .eq('location_id', location.id)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  // Fetch items for all live orders
  const liveOrderIds = liveOrders?.map(o => o.id) || [];
  const { data: liveOrderItems } = useQuery({
    queryKey: ['store-dashboard', location.id, 'live-items', liveOrderIds],
    queryFn: async () => {
      if (!liveOrderIds.length) return {};
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', liveOrderIds);
      if (error) throw error;
      const map: Record<string, any[]> = {};
      data?.forEach(item => {
        if (!map[item.order_id]) map[item.order_id] = [];
        map[item.order_id].push(item);
      });
      return map;
    },
    enabled: liveOrderIds.length > 0,
  });

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['store-dashboard', location.id] });
      toast.success(`Order ${status === 'cancelled' ? 'cancelled' : 'accepted'}`);
    },
    onError: () => toast.error('Failed to update order'),
  });

  // Order detail data
  const { data: orderDetail } = useQuery({
    queryKey: ['store-order-detail', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      const { data: order, error: oErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', selectedOrderId)
        .single();
      if (oErr) throw oErr;

      const { data: items, error: iErr } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', selectedOrderId);
      if (iErr) throw iErr;

      return { order, items: items || [] };
    },
    enabled: !!selectedOrderId,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`store-live-${location.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `location_id=eq.${location.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['store-dashboard', location.id] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        queryClient.invalidateQueries({ queryKey: ['store-dashboard', location.id, 'live-items'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [location.id, queryClient]);

  const totalSales = todayOrders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
  const ordersCount = todayOrders?.length || 0;
  const activeOrders = liveOrders?.length || 0;
  const avgValue = ordersCount > 0 ? totalSales / ordersCount : 0;

  const yesterdaySales = yesterdayOrders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
  const yesterdayCount = yesterdayOrders?.length || 0;

  const salesChange = yesterdaySales > 0 ? ((totalSales - yesterdaySales) / yesterdaySales * 100) : 0;
  const ordersChange = yesterdayCount > 0 ? ((ordersCount - yesterdayCount) / yesterdayCount * 100) : 0;

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    preparing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ready: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <MapPin className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-serif text-2xl font-bold">{location.name}</h2>
          <p className="text-muted-foreground text-sm">{location.address}, {location.city}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Sales Today" value={`$${totalSales.toLocaleString('en-US', { minimumFractionDigits: 0 })}`} icon={<DollarSign className="w-5 h-5 text-green-400" />} change={salesChange} />
        <StatCard title="Active Orders" value={String(activeOrders)} icon={<ShoppingCart className="w-5 h-5 text-orange-400" />} subtitle="Right now" />
        <StatCard title="Orders Today" value={String(ordersCount)} icon={<Receipt className="w-5 h-5 text-blue-400" />} change={ordersChange} />
        <StatCard title="Avg Order Value" value={`$${avgValue.toFixed(2)}`} icon={<TrendingUp className="w-5 h-5 text-purple-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Sellers */}
        <div className="bg-card border rounded-xl p-5">
          <h3 className="font-semibold text-lg mb-4">Best Sellers</h3>
          {bestSellers?.length ? (
            <div className="space-y-3">
              {bestSellers.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sold} sold</p>
                  </div>
                  <p className="font-semibold text-foreground">${Math.round(item.revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No sales data yet today</p>
          )}
        </div>

        {/* Sales Trends */}
        <div className="bg-card border rounded-xl p-5">
          <h3 className="font-semibold text-lg mb-4">Sales Trends (Last 7 Days)</h3>
          {weekData?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekData}>
                <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm">No data</p>
          )}
        </div>
      </div>

      {/* Live Orders - expandable with full details */}
      <div className="bg-card border rounded-xl p-5 mt-6">
        <h3 className="font-semibold text-lg mb-4">Live Orders ({activeOrders})</h3>
        {liveOrders?.length ? (
          <div className="space-y-3">
            {liveOrders.map(order => {
              const isExpanded = expandedOrders.has(order.id);
              const items = liveOrderItems?.[order.id] || [];
              return (
                <div key={order.id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleExpand(order.id)}
                    className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-all text-left"
                  >
                    <div>
                      <p className="font-medium text-foreground">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">{order.customer_name || 'Walk-in'} • {order.order_type} • {order.source}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">${Number(order.total).toFixed(2)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[order.status] || 'bg-muted text-muted-foreground'}`}>
                        {order.status}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 border-t bg-background space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium">{order.customer_name || 'Walk-in'}</span></div>
                        <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{order.customer_phone || '-'}</span></div>
                        <div><span className="text-muted-foreground">Type:</span> <span className="font-medium capitalize">{order.order_type}</span></div>
                        <div><span className="text-muted-foreground">Payment:</span> <span className="font-medium capitalize">{order.payment_method || 'Unpaid'} ({order.payment_status})</span></div>
                        <div><span className="text-muted-foreground">Time:</span> <span className="font-medium">{format(new Date(order.created_at), 'h:mm a')}</span></div>
                        <div><span className="text-muted-foreground">Source:</span> <span className="font-medium capitalize">{order.source}</span></div>
                        {order.coupon_code && <div><span className="text-muted-foreground">Coupon:</span> <span className="font-medium">{order.coupon_code}</span></div>}
                      </div>

                      {order.notes && (
                        <div className="bg-muted/50 rounded-lg p-2 text-sm">
                          <span className="text-muted-foreground">Notes: </span>{order.notes}
                        </div>
                      )}

                      <Separator />

                      <div>
                        <h4 className="font-semibold text-sm mb-2">Items ({items.length})</h4>
                        <div className="space-y-2">
                          {items.map((item: any) => {
                            const c = item.customizations as any;
                            return (
                              <div key={item.id} className="flex justify-between items-start p-2 bg-muted/30 rounded-lg text-sm">
                                <div className="flex-1">
                                  <p className="font-medium">{item.quantity}x {item.name}</p>
                                  {c?.size && (
                                    <p className="text-xs text-muted-foreground">
                                      {typeof c.size === 'object' ? c.size.name : c.size}
                                      {c.crust && ` • ${typeof c.crust === 'object' ? c.crust.name : c.crust}`}
                                    </p>
                                  )}
                                  {c?.sauces?.length > 0 && (
                                    <p className="text-xs text-muted-foreground">Sauce: {c.sauces.map((s: any) => typeof s === 'string' ? s : `${s.name}${s.quantity === 'extra' ? ' (extra)' : ''}`).join(', ')}</p>
                                  )}
                                  {c?.cheese && (
                                    <p className="text-xs text-muted-foreground">Cheese: {typeof c.cheese === 'string' ? c.cheese : `${c.cheese.name}${c.cheese.quantity === 'extra' ? ' (extra)' : ''}`}</p>
                                  )}
                                  {c?.defaultToppings?.some((t: any) => t.quantity === 'none') && (
                                    <p className="text-xs text-red-500">Removed: {c.defaultToppings.filter((t: any) => t.quantity === 'none').map((t: any) => typeof t === 'string' ? t : t.name).join(', ')}</p>
                                  )}
                                  {c?.extraToppings?.length > 0 && (
                                    <p className="text-xs text-green-600">+ {c.extraToppings.map((t: any) => {
                                      const name = typeof t === 'string' ? t : t.name;
                                      const side = t.side && t.side !== 'whole' ? ` (${t.side})` : '';
                                      const qty = t.quantity && t.quantity !== 'regular' ? ` ${t.quantity}` : '';
                                      return `${name}${qty}${side}`;
                                    }).join(', ')}</p>
                                  )}
                                  {c?.spicyLevel && (c.spicyLevel.left !== 'none' || c.spicyLevel.right !== 'none') && (
                                    <p className="text-xs text-orange-500">🌶 Spicy: L:{c.spicyLevel.left} R:{c.spicyLevel.right}</p>
                                  )}
                                  {c?.freeToppings?.length > 0 && (
                                    <p className="text-xs text-muted-foreground">Free: {c.freeToppings.map((t: any) => typeof t === 'string' ? t : t.name).join(', ')}</p>
                                  )}
                                  {c?.flavor && <p className="text-xs text-muted-foreground">Flavor: {typeof c.flavor === 'object' ? c.flavor.name : c.flavor}</p>}
                                  {c?.note && <p className="text-xs text-orange-500 italic">Note: {c.note}</p>}
                                </div>
                                <p className="font-semibold">${Number(item.total_price).toFixed(2)}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center text-sm">
                        <div className="space-y-0.5">
                          <p><span className="text-muted-foreground">Subtotal:</span> ${Number(order.subtotal).toFixed(2)}</p>
                          {Number(order.discount) > 0 && <p className="text-green-600">Discount: -${Number(order.discount).toFixed(2)}</p>}
                          {Number(order.rewards_discount) > 0 && <p className="text-green-600">Rewards: -${Number(order.rewards_discount).toFixed(2)}</p>}
                          <p><span className="text-muted-foreground">Tax:</span> ${Number(order.tax).toFixed(2)}</p>
                          <p className="font-bold">Total: ${Number(order.total).toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          {order.status === 'pending' && (
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ orderId: order.id, status: 'preparing' }); }} className="bg-green-600 hover:bg-green-700 text-white">
                              <Check className="w-4 h-4 mr-1" /> Accept
                            </Button>
                          )}
                          {order.status === 'preparing' && (
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ orderId: order.id, status: 'ready' }); }} className="bg-blue-600 hover:bg-blue-700 text-white">
                              <Check className="w-4 h-4 mr-1" /> Mark Ready
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ orderId: order.id, status: 'cancelled' }); }}>
                            <Ban className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedOrderId(order.id); }}>
                            <Eye className="w-4 h-4 mr-1" /> Full View
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No active orders right now</p>
        )}
      </div>

      {/* Full Reports Section */}
      <div className="bg-card border rounded-xl p-5 mt-6">
        <POSReportsPanel locationId={location.id} onClose={() => {}} embedded />
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrderId} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {orderDetail ? (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Order #</p>
                  <p className="font-semibold">{orderDetail.order.order_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${statusColors[orderDetail.order.status] || 'bg-muted text-muted-foreground'}`}>
                    {orderDetail.order.status}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{orderDetail.order.customer_name || 'Walk-in'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{orderDetail.order.customer_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{orderDetail.order.order_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p className="font-medium capitalize">{orderDetail.order.source}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment</p>
                  <p className="font-medium capitalize">{orderDetail.order.payment_method || 'Unpaid'} ({orderDetail.order.payment_status})</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(orderDetail.order.created_at), 'MMM dd, yyyy h:mm a')}</p>
                </div>
              </div>

              {orderDetail.order.notes && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{orderDetail.order.notes}</p>
                </div>
              )}

              <Separator />

              {/* Items */}
              <div>
                <h4 className="font-semibold mb-2">Items</h4>
                <div className="space-y-2">
                  {orderDetail.items.map((item: any) => {
                    const customizations = item.customizations as any;
                    return (
                      <div key={item.id} className="flex justify-between items-start p-2 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{item.quantity}x {item.name}</p>
                          {customizations?.size && (
                            <p className="text-xs text-muted-foreground">
                              {typeof customizations.size === 'object' ? customizations.size.name : customizations.size}
                              {customizations.crust && ` • ${typeof customizations.crust === 'object' ? customizations.crust.name : customizations.crust}`}
                            </p>
                          )}
                          {customizations?.extraToppings?.length > 0 && (
                            <p className="text-xs text-green-600">+ {customizations.extraToppings.map((t: any) => typeof t === 'string' ? t : t.name).join(', ')}</p>
                          )}
                          {customizations?.note && (
                            <p className="text-xs text-orange-500 italic">Note: {customizations.note}</p>
                          )}
                        </div>
                        <p className="font-semibold">${Number(item.total_price).toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${Number(orderDetail.order.subtotal).toFixed(2)}</span>
                </div>
                {Number(orderDetail.order.discount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${Number(orderDetail.order.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${Number(orderDetail.order.tax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1 border-t">
                  <span>Total</span>
                  <span>${Number(orderDetail.order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({ title, value, icon, change, subtitle }: { title: string; value: string; icon: React.ReactNode; change?: number; subtitle?: string }) => (
  <div className="bg-card border rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm text-muted-foreground">{title}</p>
      {icon}
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    {change !== undefined && change !== 0 && (
      <p className={`text-xs mt-1 ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
        {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs yesterday
      </p>
    )}
    {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
  </div>
);

export default StoreLiveDashboard;

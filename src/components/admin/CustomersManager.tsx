import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Search, Mail, Phone, CheckCircle, XCircle, ShoppingBag, Loader2, Eye, Gift, Star } from 'lucide-react';
import { format } from 'date-fns';
import { POINTS_PER_DOLLAR } from '@/hooks/useRewards';

interface Customer {
  id: string;
  full_name: string | null;
  email: string;
  phone: string;
  email_verified: boolean;
  phone_verified: boolean;
  created_at: string;
  updated_at: string;
  reward_points?: number;
  lifetime_points?: number;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  order_type: string;
  created_at: string;
}

const normalizePhone = (value: string) => value.replace(/\D/g, '');

const isPointsEligibleStatus = (status: string) =>
  ['delivered', 'completed', 'complete'].includes(status.toLowerCase());

const CustomersManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [ordersDialogOpen, setOrdersDialogOpen] = useState(false);

  // Fetch customers with rewards (excluding password_hash for security)
  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, full_name, email, phone, email_verified, phone_verified, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;

      // Fetch all rewards
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('customer_rewards')
        .select('phone, points, lifetime_points');

      if (rewardsError) throw rewardsError;

      // Map rewards to customers by phone
      const rewardsMap = new Map(
        (rewardsData || []).map((r) => [
          normalizePhone(r.phone),
          { points: r.points, lifetime_points: r.lifetime_points },
        ])
      );

      return (customersData || []).map((customer) => {
        const phoneKey = normalizePhone(customer.phone);
        return {
          ...customer,
          reward_points: rewardsMap.get(phoneKey)?.points || 0,
          lifetime_points: rewardsMap.get(phoneKey)?.lifetime_points || 0,
        };
      }) as Customer[];
    },
  });

  // Fetch orders for selected customer - search by phone to find all orders
  const { data: customerOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders', selectedCustomer?.id, selectedCustomer?.phone],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      
      // Query orders by customer phone (more reliable than customer_id for POS orders)
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, status, total, order_type, created_at')
        .or(`customer_id.eq.${selectedCustomer.id},customer_phone.ilike.%${normalizePhone(selectedCustomer.phone)}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!selectedCustomer,
  });

  const derivedLifetimePoints = (customerOrders || []).reduce((sum, order) => {
    if (!isPointsEligibleStatus(order.status)) return sum;
    return sum + Math.floor(order.total * POINTS_PER_DOLLAR);
  }, 0);

  const lifetimePoints = Math.max(selectedCustomer?.lifetime_points || 0, derivedLifetimePoints);
  const rewardsBalancePoints = selectedCustomer?.reward_points || 0;

  // If rewards haven't been recorded yet for these orders, still show a sensible balance in the UI
  const balancePoints = rewardsBalancePoints > 0 ? rewardsBalancePoints : lifetimePoints;
  const usedPoints = Math.max(0, lifetimePoints - balancePoints);

  const filteredCustomers = customers?.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.full_name?.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower) ||
      customer.phone.includes(searchTerm)
    );
  });

  const handleViewOrders = (customer: Customer) => {
    setSelectedCustomer(customer);
    setOrdersDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      preparing: 'default',
      ready: 'default',
      delivered: 'outline',
      complete: 'outline',
      completed: 'outline',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Customer Database
              <Badge variant="secondary" className="ml-2">
                {customers?.length || 0} customers
              </Badge>
            </CardTitle>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredCustomers?.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No customers match your search' : 'No customers yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Rewards</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="font-medium">
                        {customer.full_name || 'No name'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {customer.email}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-primary" />
                        <div>
                          <div className="font-medium">{customer.reward_points || 0} pts</div>
                          <div className="text-xs text-muted-foreground">
                            {customer.lifetime_points || 0} lifetime
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1 text-xs">
                          {customer.email_verified ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-muted-foreground" />
                          )}
                          Email
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          {customer.phone_verified ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-muted-foreground" />
                          )}
                          Phone
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(customer.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewOrders(customer)}
                        className="gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Orders
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Orders Dialog */}
      <Dialog open={ordersDialogOpen} onOpenChange={setOrdersDialogOpen}>
        <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] sm:w-full h-[70vh] max-h-[calc(100vh-10rem)] top-20 sm:top-24 translate-y-0 flex flex-col overflow-hidden p-0">
          {/* Fixed Header with Customer Info */}
          <div className="shrink-0 bg-background border-b px-6 py-4 pr-14">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Customer Orders
              </DialogTitle>
            </DialogHeader>
            
            {/* Customer Details */}
            <div className="mt-3 space-y-2 text-sm">
              {/* Row 1: Name + Phone */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{selectedCustomer?.full_name || 'No name'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {selectedCustomer?.phone}
                </div>
              </div>
              
              {/* Row 2: Email */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                {selectedCustomer?.email}
              </div>
              
              {/* Row 3: Points breakdown */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pt-1">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Gift className="w-4 h-4" />
                  <span>{lifetimePoints} pts</span>
                  <span className="text-xs">(lifetime)</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Gift className="w-4 h-4" />
                  <span>{usedPoints} pts</span>
                  <span className="text-xs">(used)</span>
                </div>
                <div className="flex items-center gap-1.5 text-primary font-medium">
                  <Gift className="w-4 h-4" />
                  <span>{balancePoints} pts</span>
                  <span className="text-xs">(balance)</span>
                </div>
              </div>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="px-6 py-4">
              {ordersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : customerOrders?.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No orders yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Pts Earned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerOrders?.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          {order.order_number}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {order.order_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${order.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {isPointsEligibleStatus(order.status) ? (
                            <span className="flex items-center justify-end gap-1 text-primary font-medium">
                              <Star className="w-3 h-3" />
                              +{Math.floor(order.total * POINTS_PER_DOLLAR)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </ScrollArea>

          {/* Fixed Footer with Totals */}
          <div className="shrink-0 bg-background border-t px-6 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Orders</span>
              <span className="font-medium">{customerOrders?.length || 0}</span>
            </div>
            {customerOrders && customerOrders.length > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Total Spent</span>
                <span className="font-medium text-primary">
                  ${customerOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CustomersManager;
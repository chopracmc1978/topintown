import { useNavigate } from 'react-router-dom';
import { Package, Calendar, MapPin, LogOut, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw, User } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCustomer } from '@/contexts/CustomerContext';
import { useCustomerOrders, CustomerOrder } from '@/hooks/useCustomerOrders';
import { cn } from '@/lib/utils';
import { LOCATIONS } from '@/contexts/LocationContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { CartItem, CartPizzaCustomization } from '@/types/menu';

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', icon: CheckCircle, color: 'bg-blue-100 text-blue-800' },
  preparing: { label: 'Preparing', icon: Loader2, color: 'bg-purple-100 text-purple-800' },
  ready: { label: 'Ready', icon: Package, color: 'bg-green-100 text-green-800' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
};

const MyOrders = () => {
  const navigate = useNavigate();
  const { customer, logout, loading: customerLoading } = useCustomer();
  const { data: orders, isLoading: ordersLoading } = useCustomerOrders(customer?.id);
  const { clearCart } = useCart();
  const { toast } = useToast();

  // Redirect if not logged in
  if (!customerLoading && !customer) {
    navigate('/customer-login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleRepeatOrder = (order: CustomerOrder) => {
    // Clear current cart first
    clearCart();

    // Convert order items to cart items and add to cart via localStorage workaround
    const cartItems: CartItem[] = order.items.map((item, index) => {
      const baseItem: CartItem = {
        id: `repeat-${item.id}-${Date.now()}-${index}`,
        name: item.name,
        description: '',
        price: item.unitPrice,
        image: '',
        category: 'pizza' as const,
        popular: false,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
      };

      // Check if item has pizza customization
      if (item.customizations?.size || item.customizations?.crust) {
        baseItem.pizzaCustomization = item.customizations as CartPizzaCustomization;
        baseItem.description = `${item.customizations.size?.name || ''}, ${item.customizations.crust?.name || ''}`.trim();
      }

      // Check if item has wings customization
      if (item.customizations?.flavor) {
        baseItem.wingsCustomization = {
          flavor: item.customizations.flavor,
          originalItemId: item.customizations.originalItemId || item.id,
        };
        baseItem.description = `Flavor: ${item.customizations.flavor}`;
      }

      return baseItem;
    });

    // Store in localStorage temporarily and navigate - cart will pick it up
    localStorage.setItem('repeat_order_items', JSON.stringify(cartItems));

    toast({
      title: 'Order Added to Cart',
      description: `${order.items.length} items from order #${order.orderNumber} added to your cart.`,
    });

    navigate('/cart');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLocationName = (locationId: string) => {
    const location = LOCATIONS.find(l => l.id === locationId);
    return location?.name || locationId;
  };

  if (customerLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground">My Orders</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, {customer?.fullName || customer?.email}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/profile')}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Orders List */}
          {orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <Card key={order.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold">
                            Order #{order.orderNumber}
                          </CardTitle>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(order.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {getLocationName(order.locationId)}
                            </span>
                          </div>
                        </div>
                        <Badge className={cn('flex items-center gap-1', status.color)}>
                          <StatusIcon className={cn('w-3 h-3', order.status === 'preparing' && 'animate-spin')} />
                          {status.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Order Items */}
                      <div className="space-y-2 mb-4">
                        {order.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-sm text-muted-foreground">
                            +{order.items.length - 3} more items
                          </p>
                        )}
                      </div>

                      {/* Order Total & Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div>
                          <span className="font-semibold">Total</span>
                          <span className="text-lg font-bold text-primary ml-2">${order.total.toFixed(2)}</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRepeatOrder(order)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Repeat Order
                        </Button>
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div className="mt-3 p-3 bg-secondary/30 rounded-lg">
                          <p className="text-sm text-muted-foreground">{order.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
                <p className="text-muted-foreground mb-6">
                  Start by placing your first order!
                </p>
                <Button variant="pizza" onClick={() => navigate('/menu')}>
                  Browse Menu
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyOrders;

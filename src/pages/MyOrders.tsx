import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Calendar, MapPin, LogOut, Clock, CheckCircle, AlertCircle, Loader2, RefreshCw, User, FileText, Star } from 'lucide-react';
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
import { OrderReceiptModal } from '@/components/orders/OrderReceiptModal';
import { POINTS_PER_DOLLAR } from '@/hooks/useRewards';

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
  const [receiptOrder, setReceiptOrder] = useState<CustomerOrder | null>(null);

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
    // Convert order items to cart items
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

    // Clear cart first, then store repeat items in localStorage
    clearCart();
    
    // Small delay to ensure clearCart completes before setting new items
    setTimeout(() => {
      localStorage.setItem('repeat_order_items', JSON.stringify(cartItems));

      toast({
        title: 'Order Added to Cart',
        description: `${order.items.length} items from order #${order.orderNumber} added to your cart.`,
      });

      navigate('/cart');
    }, 100);
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
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(order.createdAt)}
                            </span>
                            {order.pickupTime && (
                              <span className="flex items-center gap-1 text-primary font-medium">
                                <Clock className="w-4 h-4" />
                                Pickup: {formatDate(order.pickupTime)}
                              </span>
                            )}
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
                      <div className="space-y-3 mb-4">
                        {order.items.slice(0, 3).map((item) => {
                          const customizations = item.customizations;
                          const hasPizzaCustomization = customizations?.size || customizations?.crust;
                          const hasWingsCustomization = customizations?.flavor && !customizations?.comboId;
                          const hasComboCustomization = customizations?.comboId || customizations?.selections;
                          
                          return (
                            <div key={item.id} className="text-sm">
                              <div className="flex justify-between">
                                <span className="text-foreground font-medium">
                                  {item.quantity}x {item.name}
                                </span>
                                <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                              </div>
                              
                              {/* Combo Customization Details */}
                              {hasComboCustomization && customizations.selections && (
                                <div className="mt-1 ml-4 text-xs text-muted-foreground space-y-2">
                                  {customizations.selections.map((selection: any, idx: number) => (
                                    <div key={idx} className="border-l-2 border-border pl-2">
                                      <p className="font-medium text-foreground">
                                        {selection.itemName}
                                        {selection.flavor && <span className="text-muted-foreground"> - {selection.flavor}</span>}
                                      </p>
                                      
                                      {/* Pizza customization within combo */}
                                      {selection.pizzaCustomization && (
                                        <div className="mt-0.5 space-y-0.5">
                                          {/* Size & Crust */}
                                          <p>
                                            {selection.pizzaCustomization.size?.name || ''}{selection.pizzaCustomization.crust?.name ? `, ${selection.pizzaCustomization.crust.name}` : ''}
                                          </p>
                                          
                                          {/* Spicy Level */}
                                          {selection.pizzaCustomization.spicyLevel && (
                                            <>
                                              {typeof selection.pizzaCustomization.spicyLevel === 'string' && selection.pizzaCustomization.spicyLevel !== 'none' && (
                                                <p>Spicy: {selection.pizzaCustomization.spicyLevel === 'medium' ? 'Medium Hot' : selection.pizzaCustomization.spicyLevel}</p>
                                              )}
                                              {typeof selection.pizzaCustomization.spicyLevel === 'object' && (selection.pizzaCustomization.spicyLevel.left !== 'none' || selection.pizzaCustomization.spicyLevel.right !== 'none') && (
                                                <p>Spicy: {selection.pizzaCustomization.spicyLevel.left !== 'none' ? `L:${selection.pizzaCustomization.spicyLevel.left === 'medium' ? 'Med' : selection.pizzaCustomization.spicyLevel.left}` : ''} {selection.pizzaCustomization.spicyLevel.right !== 'none' ? `R:${selection.pizzaCustomization.spicyLevel.right === 'medium' ? 'Med' : selection.pizzaCustomization.spicyLevel.right}` : ''}</p>
                                              )}
                                            </>
                                          )}
                                          
                                          {/* Extra Toppings */}
                                          {selection.pizzaCustomization.extraToppings?.length > 0 && (
                                            <p>+{selection.pizzaCustomization.extraToppings.map((t: any) => t.name).join(', ')}</p>
                                          )}
                                          
                                          {/* Removed Default Toppings */}
                                          {selection.pizzaCustomization.defaultToppings?.filter((t: any) => t.quantity === 'none').length > 0 && (
                                            <p>NO: {selection.pizzaCustomization.defaultToppings.filter((t: any) => t.quantity === 'none').map((t: any) => t.name).join(', ')}</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Pizza Customization Details (standalone) */}
                              {hasPizzaCustomization && !hasComboCustomization && (
                                <div className="mt-1 ml-4 text-xs text-muted-foreground space-y-0.5">
                                  {/* Size & Crust */}
                                  <p>
                                    {customizations.size?.name || ''}{customizations.crust?.name ? `, ${customizations.crust.name} Crust` : ''}
                                  </p>
                                  
                                  {/* Sauce */}
                                  {customizations.sauceName && customizations.sauceName !== 'Pizza Sauce' && (
                                    <p>Sauce: {customizations.sauceName}{customizations.sauceQuantity === 'extra' ? ' (Extra)' : ''}</p>
                                  )}
                                  
                                  {/* Cheese */}
                                  {customizations.cheeseType && customizations.cheeseType !== 'mozzarella' && (
                                    <p>Cheese: {customizations.cheeseType === 'none' ? 'No Cheese' : customizations.cheeseType === 'dairy_free' ? 'Dairy Free' : customizations.cheeseType}</p>
                                  )}
                                  
                                  {/* Spicy Level */}
                                  {customizations.spicyLevel && (
                                    <>
                                      {typeof customizations.spicyLevel === 'string' && customizations.spicyLevel !== 'none' && (
                                        <p>Spicy: {customizations.spicyLevel === 'medium' ? 'Medium Hot' : customizations.spicyLevel.charAt(0).toUpperCase() + customizations.spicyLevel.slice(1)}</p>
                                      )}
                                      {typeof customizations.spicyLevel === 'object' && (customizations.spicyLevel.left !== 'none' || customizations.spicyLevel.right !== 'none') && (
                                        <p>Spicy: {customizations.spicyLevel.left !== 'none' ? `L:${customizations.spicyLevel.left === 'medium' ? 'Medium Hot' : customizations.spicyLevel.left}` : ''} {customizations.spicyLevel.right !== 'none' ? `R:${customizations.spicyLevel.right === 'medium' ? 'Medium Hot' : customizations.spicyLevel.right}` : ''}</p>
                                      )}
                                    </>
                                  )}
                                  
                                  {/* Free Toppings */}
                                  {customizations.freeToppings && customizations.freeToppings.length > 0 && (
                                    <p>Add: {customizations.freeToppings.join(', ')}</p>
                                  )}
                                  
                                  {/* Modified Default Toppings */}
                                  {customizations.defaultToppings && customizations.defaultToppings.filter((t: any) => t.quantity !== 'regular').length > 0 && (
                                    <p>
                                      {customizations.defaultToppings
                                        .filter((t: any) => t.quantity !== 'regular')
                                        .map((t: any) => {
                                          if (t.quantity === 'none') return `NO: ${t.name}`;
                                          if (t.quantity === 'less') return `Less ${t.name}`;
                                          if (t.quantity === 'extra') return `Extra ${t.name}`;
                                          return t.name;
                                        })
                                        .join(', ')}
                                    </p>
                                  )}
                                  
                                  {/* Extra Toppings */}
                                  {customizations.extraToppings && customizations.extraToppings.length > 0 && (
                                    <p>
                                      +{customizations.extraToppings.map((t: any) => {
                                        const side = t.side && t.side !== 'whole' ? ` (${t.side === 'left' ? 'L' : 'R'})` : '';
                                        return `${t.name}${side}`;
                                      }).join(', ')}
                                    </p>
                                  )}
                                  
                                  {/* Note */}
                                  {customizations.note && (
                                    <p className="italic">Note: {customizations.note}</p>
                                  )}
                                </div>
                              )}
                              
                              {/* Wings Customization */}
                              {hasWingsCustomization && (
                                <p className="mt-1 ml-4 text-xs text-muted-foreground">
                                  Flavor: {customizations.flavor}
                                </p>
                              )}
                            </div>
                          );
                        })}
                        {order.items.length > 3 && (
                          <p className="text-sm text-muted-foreground">
                            +{order.items.length - 3} more items
                          </p>
                        )}
                      </div>

                      {/* Order Total & Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="font-semibold">Total</span>
                            <span className="text-lg font-bold text-primary ml-2">${order.total.toFixed(2)}</span>
                          </div>
                          {(order.status === 'delivered' || order.status === 'completed') && (
                            <div className="flex items-center gap-1 text-sm text-primary bg-primary/10 px-2 py-1 rounded-md">
                              <Star className="w-3.5 h-3.5" />
                              <span className="font-medium">+{Math.floor(order.total * POINTS_PER_DOLLAR)} pts earned</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setReceiptOrder(order)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Receipt
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRepeatOrder(order)}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Repeat
                          </Button>
                        </div>
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

      {/* Receipt Modal */}
      <OrderReceiptModal
        order={receiptOrder}
        open={!!receiptOrder}
        onClose={() => setReceiptOrder(null)}
      />
    </div>
  );
};

export default MyOrders;

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Phone, User, FileText, Truck, Store, Edit2, ChevronDown, ChevronUp, LogIn, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/contexts/CartContext';
import { useLocation as useLocationContext } from '@/contexts/LocationContext';
import { useCustomer } from '@/contexts/CustomerContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CartItem } from '@/types/menu';
import PizzaCustomizationModal from '@/components/pizza/PizzaCustomizationModal';
import WingsCustomizationModal from '@/components/wings/WingsCustomizationModal';
import { CustomerVerification } from '@/components/checkout/CustomerVerification';
import { useMenuItems } from '@/hooks/useMenuItems';
import { supabase } from '@/integrations/supabase/client';

// Order item card with expandable details
const OrderItemCard = ({ 
  item, 
  onEditPizza,
  onEditWings 
}: { 
  item: CartItem; 
  onEditPizza: (item: CartItem) => void;
  onEditWings: (item: CartItem) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const pizzaCustomization = item.pizzaCustomization;
  const wingsCustomization = item.wingsCustomization;
  const hasCustomization = pizzaCustomization || wingsCustomization;

  return (
    <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
      <div className="flex items-center gap-4">
        <img
          src={item.image}
          alt={item.name}
          className="w-16 h-16 object-cover rounded-lg"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground">{item.name}</h4>
            {pizzaCustomization && (
              <button
                onClick={() => onEditPizza(item)}
                className="text-primary hover:text-primary/80 transition-colors"
                title="Edit customization"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {wingsCustomization && (
              <button
                onClick={() => onEditWings(item)}
                className="text-primary hover:text-primary/80 transition-colors"
                title="Edit flavor"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {pizzaCustomization 
              ? `${pizzaCustomization.size.name} • ${pizzaCustomization.crust.name} • Qty: ${item.quantity}`
              : wingsCustomization
              ? `Flavor: ${wingsCustomization.flavor} • Qty: ${item.quantity}`
              : `${item.selectedSize ? `${item.selectedSize} • ` : ''}Qty: ${item.quantity}`
            }
          </p>
        </div>
        <span className="font-semibold">${item.totalPrice.toFixed(2)}</span>
      </div>

      {/* Expandable details for customized items */}
      {hasCustomization && (
        <>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide details' : 'Show details'}
          </button>

          {expanded && pizzaCustomization && (
            <div className="text-xs space-y-2 p-3 bg-background/50 rounded-lg">
              {/* Cheese */}
              <div>
                <span className="font-medium text-muted-foreground">Cheese: </span>
                <span className="capitalize">{pizzaCustomization.cheeseType.replace('-', ' ')}</span>
                {pizzaCustomization.cheeseSides.length > 0 && pizzaCustomization.cheeseType !== 'no-cheese' && (
                  <span className="text-muted-foreground">
                    {' '}({pizzaCustomization.cheeseSides.map(cs => `${cs.side}: ${cs.quantity}`).join(', ')})
                  </span>
                )}
              </div>

              {/* Sauce */}
              {pizzaCustomization.sauceName && (
                <div>
                  <span className="font-medium text-muted-foreground">Sauce: </span>
                  <span>{pizzaCustomization.sauceName}</span>
                  {pizzaCustomization.sauceQuantity === 'extra' && (
                    <span className="text-primary"> (Extra)</span>
                  )}
                </div>
              )}

              {/* Spicy Level */}
              {(pizzaCustomization.spicyLevel.left !== 'none' || pizzaCustomization.spicyLevel.right !== 'none') && (
                <div>
                  <span className="font-medium text-muted-foreground">Spicy: </span>
                  {pizzaCustomization.spicyLevel.left === pizzaCustomization.spicyLevel.right ? (
                    <span className="capitalize">{pizzaCustomization.spicyLevel.left}</span>
                  ) : (
                    <span>
                      L: {pizzaCustomization.spicyLevel.left === 'none' ? 'No Spicy' : pizzaCustomization.spicyLevel.left}, 
                      R: {pizzaCustomization.spicyLevel.right === 'none' ? 'No Spicy' : pizzaCustomization.spicyLevel.right}
                    </span>
                  )}
                </div>
              )}

              {/* Free Toppings */}
              {pizzaCustomization.freeToppings.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">Free Add-ons: </span>
                  <span>{pizzaCustomization.freeToppings.join(', ')}</span>
                </div>
              )}

              {/* Default Toppings */}
              {pizzaCustomization.defaultToppings.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">Toppings: </span>
                  <div className="mt-1 space-y-0.5">
                    {pizzaCustomization.defaultToppings
                      .filter(t => t.quantity !== 'none')
                      .map(t => (
                        <div key={t.id} className="flex justify-between text-muted-foreground">
                          <span>{t.name}</span>
                          <span>
                            {t.quantity !== 'regular' && <span className="capitalize">{t.quantity}</span>}
                            {t.side !== 'whole' && <span className="ml-1">({t.side === 'left' ? 'L' : 'R'})</span>}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Removed Toppings */}
              {pizzaCustomization.defaultToppings.some(t => t.quantity === 'none') && (
                <div>
                  <span className="font-medium text-destructive">Removed: </span>
                  <span className="text-muted-foreground line-through">
                    {pizzaCustomization.defaultToppings.filter(t => t.quantity === 'none').map(t => t.name).join(', ')}
                  </span>
                </div>
              )}

              {/* Extra Toppings */}
              {pizzaCustomization.extraToppings.length > 0 && (
                <div>
                  <span className="font-medium text-primary">Extra Toppings: </span>
                  <div className="mt-1 space-y-0.5">
                    {pizzaCustomization.extraToppings.map(t => (
                      <div key={t.id} className="flex justify-between text-muted-foreground">
                        <span>{t.name}</span>
                        <span>
                          +${t.price.toFixed(2)}
                          {t.side !== 'whole' && <span className="ml-1">({t.side === 'left' ? 'L' : 'R'})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note */}
              {pizzaCustomization.note && (
                <div className="border-t pt-2 mt-2">
                  <span className="font-medium text-muted-foreground">Note: </span>
                  <span className="italic">{pizzaCustomization.note}</span>
                </div>
              )}
            </div>
          )}

          {expanded && wingsCustomization && (
            <div className="text-xs space-y-2 p-3 bg-background/50 rounded-lg">
              <div>
                <span className="font-medium text-muted-foreground">Flavor: </span>
                <span>{wingsCustomization.flavor}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const { selectedLocation } = useLocationContext();
  const { customer } = useCustomer();
  const { data: menuItems } = useMenuItems();
  
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('pickup');
  const [editingPizzaItem, setEditingPizzaItem] = useState<CartItem | null>(null);
  const [editingWingsItem, setEditingWingsItem] = useState<CartItem | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [verifiedCustomerId, setVerifiedCustomerId] = useState<string | null>(customer?.id || null);
  const [placingOrder, setPlacingOrder] = useState(false);
  
  const [formData, setFormData] = useState({
    address: '',
    notes: '',
  });

  // Find the original menu item for editing pizza
  const originalPizzaMenuItem = editingPizzaItem?.pizzaCustomization 
    ? menuItems?.find(m => m.id === editingPizzaItem.pizzaCustomization?.originalItemId)
    : null;

  // Find the original menu item for editing wings
  const originalWingsMenuItem = editingWingsItem?.wingsCustomization 
    ? menuItems?.find(m => m.id === editingWingsItem.wingsCustomization?.originalItemId)
    : null;

  const handleCheckoutClick = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty!');
      return;
    }

    // If already verified, place order directly
    if (verifiedCustomerId || customer?.id) {
      handlePlaceOrder(verifiedCustomerId || customer!.id);
    } else {
      setShowVerification(true);
    }
  };

  const handleVerificationComplete = (customerId: string) => {
    setVerifiedCustomerId(customerId);
    setShowVerification(false);
    handlePlaceOrder(customerId);
  };

  const handlePlaceOrder = async (customerId: string) => {
    setPlacingOrder(true);
    
    try {
      const locationId = selectedLocation?.id || 'calgary';
      
      // Generate order number via edge function
      let orderNumber: string;
      try {
        const { data, error } = await supabase.functions.invoke('generate-order-number', {
          body: { locationId }
        });
        if (error) throw error;
        orderNumber = data.orderNumber;
      } catch (err) {
        console.error('Error generating order number, using fallback:', err);
        // Fallback: build format locally
        const LOCATION_CODES: Record<string, string> = { calgary: 'CAL', chestermere: 'KIN' };
        const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const locCode = LOCATION_CODES[locationId?.toLowerCase()] || 'CAL';
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = MONTHS[now.getMonth()];
        const day = now.getDate().toString().padStart(2, '0');
        const seq = 101 + Math.floor(Math.random() * 100);
        orderNumber = `TIT-${locCode}-${year}${month}${day}${seq}`;
      }
      
      const deliveryFee = orderType === 'delivery' ? 3.99 : 0;
      const tax = total * 0.05; // 5% GST
      const grandTotal = total + deliveryFee + tax;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerId,
          location_id: locationId,
          status: 'pending',
          subtotal: total,
          tax: tax,
          total: grandTotal,
          notes: `${orderType === 'delivery' ? `Delivery to: ${formData.address}\n` : ''}${formData.notes}`.trim() || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
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

      clearCart();
      toast.success('Order placed successfully!');
      navigate(`/order-confirmation/${order.id}`);
    } catch (error: any) {
      console.error('Error placing order:', error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const deliveryFee = orderType === 'delivery' ? 3.99 : 0;
  const tax = total * 0.05;
  const grandTotal = total + deliveryFee + tax;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-serif text-3xl font-bold text-foreground mb-4">Checkout</h1>
            <p className="text-muted-foreground mb-6">Your cart is empty. Add some items first!</p>
            <Button variant="pizza" onClick={() => navigate('/menu')}>
              Browse Menu
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <h1 className="font-serif text-3xl font-bold text-foreground mb-8 text-center">Checkout</h1>

          <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Left Side - Customer Info or Verification */}
            <div className="bg-card rounded-xl border border-border p-6">
              {showVerification ? (
                <CustomerVerification 
                  onComplete={handleVerificationComplete}
                  onBack={() => setShowVerification(false)}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-serif text-xl font-semibold">
                      {customer || verifiedCustomerId ? 'Order Details' : 'Guest Checkout'}
                    </h2>
                    {!customer && !verifiedCustomerId && (
                      <Link to="/customer-login" className="text-sm text-primary hover:underline flex items-center gap-1">
                        <LogIn className="w-4 h-4" />
                        Login
                      </Link>
                    )}
                  </div>

                  {/* Customer info display */}
                  {customer && (
                    <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{customer.fullName || customer.email}</p>
                          <p className="text-sm text-muted-foreground">{customer.phone}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Type Toggle */}
                  <div className="flex gap-4 mb-6">
                    <button
                      onClick={() => setOrderType('delivery')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all",
                        orderType === 'delivery'
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      <Truck className="w-5 h-5" />
                      <span className="font-medium">Delivery</span>
                    </button>
                    <button
                      onClick={() => setOrderType('pickup')}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition-all",
                        orderType === 'pickup'
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      <Store className="w-5 h-5" />
                      <span className="font-medium">Pickup</span>
                    </button>
                  </div>

                  {/* Location display for pickup */}
                  {orderType === 'pickup' && selectedLocation && (
                    <div className="mb-6 p-4 bg-secondary/50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="font-medium">{selectedLocation.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedLocation.address}</p>
                          <p className="text-sm text-muted-foreground">{selectedLocation.phone}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {orderType === 'delivery' && (
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                        <Textarea
                          placeholder="Delivery Address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="pl-10 min-h-[80px]"
                          required
                        />
                      </div>
                    )}

                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <Textarea
                        placeholder="Special Instructions (optional)"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="pl-10"
                      />
                    </div>

                    <Button 
                      onClick={handleCheckoutClick} 
                      variant="pizza" 
                      className="w-full" 
                      size="lg"
                      disabled={placingOrder || (orderType === 'delivery' && !formData.address)}
                    >
                      {placingOrder ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Placing Order...
                        </>
                      ) : customer || verifiedCustomerId ? (
                        `Place Order - $${grandTotal.toFixed(2)}`
                      ) : (
                        `Continue to Verification - $${grandTotal.toFixed(2)}`
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-serif text-xl font-semibold mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
                {items.map((item) => (
                  <OrderItemCard
                    key={`${item.id}-${item.selectedSize}`}
                    item={item}
                    onEditPizza={setEditingPizzaItem}
                    onEditWings={setEditingWingsItem}
                  />
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST (5%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>{orderType === 'delivery' ? 'Delivery Fee' : 'Pickup'}</span>
                  <span>{deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : 'Free'}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-foreground pt-2 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Pizza Edit Modal */}
      {editingPizzaItem && originalPizzaMenuItem && (
        <PizzaCustomizationModal
          item={originalPizzaMenuItem}
          isOpen={!!editingPizzaItem}
          onClose={() => setEditingPizzaItem(null)}
          editingCartItem={editingPizzaItem}
        />
      )}

      {/* Wings Edit Modal */}
      {editingWingsItem && originalWingsMenuItem && (
        <WingsCustomizationModal
          item={originalWingsMenuItem}
          isOpen={!!editingWingsItem}
          onClose={() => setEditingWingsItem(null)}
          editingCartItem={editingWingsItem}
        />
      )}
    </div>
  );
};

export default Checkout;

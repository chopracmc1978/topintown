import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, User, FileText, Truck, Store, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/contexts/CartContext';
import { useOrders } from '@/contexts/OrderContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CartItem } from '@/types/menu';
import PizzaCustomizationModal from '@/components/pizza/PizzaCustomizationModal';
import { useMenuItems } from '@/hooks/useMenuItems';

// Order item card with expandable details
const OrderItemCard = ({ 
  item, 
  onEdit 
}: { 
  item: CartItem; 
  onEdit: (item: CartItem) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const customization = item.pizzaCustomization;

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
            {customization && (
              <button
                onClick={() => onEdit(item)}
                className="text-primary hover:text-primary/80 transition-colors"
                title="Edit customization"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {customization 
              ? `${customization.size.name} • ${customization.crust.name} • Qty: ${item.quantity}`
              : `${item.selectedSize ? `${item.selectedSize} • ` : ''}Qty: ${item.quantity}`
            }
          </p>
        </div>
        <span className="font-semibold">${item.totalPrice.toFixed(2)}</span>
      </div>

      {/* Expandable details for customized pizzas */}
      {customization && (
        <>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide details' : 'Show details'}
          </button>

          {expanded && (
            <div className="text-xs space-y-2 p-3 bg-background/50 rounded-lg">
              {/* Cheese */}
              <div>
                <span className="font-medium text-muted-foreground">Cheese: </span>
                <span className="capitalize">{customization.cheeseType.replace('-', ' ')}</span>
                {customization.cheeseSides.length > 0 && customization.cheeseType !== 'no-cheese' && (
                  <span className="text-muted-foreground">
                    {' '}({customization.cheeseSides.map(cs => `${cs.side}: ${cs.quantity}`).join(', ')})
                  </span>
                )}
              </div>

              {/* Sauce */}
              {customization.sauceName && (
                <div>
                  <span className="font-medium text-muted-foreground">Sauce: </span>
                  <span>{customization.sauceName}</span>
                  {customization.sauceQuantity === 'extra' && (
                    <span className="text-primary"> (Extra)</span>
                  )}
                </div>
              )}

              {/* Spicy Level */}
              {(customization.spicyLevel.left !== 'none' || customization.spicyLevel.right !== 'none') && (
                <div>
                  <span className="font-medium text-muted-foreground">Spicy: </span>
                  {customization.spicyLevel.left === customization.spicyLevel.right ? (
                    <span className="capitalize">{customization.spicyLevel.left}</span>
                  ) : (
                    <span>
                      L: {customization.spicyLevel.left === 'none' ? 'No Spicy' : customization.spicyLevel.left}, 
                      R: {customization.spicyLevel.right === 'none' ? 'No Spicy' : customization.spicyLevel.right}
                    </span>
                  )}
                </div>
              )}

              {/* Free Toppings */}
              {customization.freeToppings.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">Free Add-ons: </span>
                  <span>{customization.freeToppings.join(', ')}</span>
                </div>
              )}

              {/* Default Toppings */}
              {customization.defaultToppings.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">Toppings: </span>
                  <div className="mt-1 space-y-0.5">
                    {customization.defaultToppings
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
              {customization.defaultToppings.some(t => t.quantity === 'none') && (
                <div>
                  <span className="font-medium text-destructive">Removed: </span>
                  <span className="text-muted-foreground line-through">
                    {customization.defaultToppings.filter(t => t.quantity === 'none').map(t => t.name).join(', ')}
                  </span>
                </div>
              )}

              {/* Extra Toppings */}
              {customization.extraToppings.length > 0 && (
                <div>
                  <span className="font-medium text-primary">Extra Toppings: </span>
                  <div className="mt-1 space-y-0.5">
                    {customization.extraToppings.map(t => (
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
              {customization.note && (
                <div className="border-t pt-2 mt-2">
                  <span className="font-medium text-muted-foreground">Note: </span>
                  <span className="italic">{customization.note}</span>
                </div>
              )}
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
  const { addOrder } = useOrders();
  const { data: menuItems } = useMenuItems();
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
  });

  // Find the original menu item for editing
  const originalMenuItem = editingItem?.pizzaCustomization 
    ? menuItems?.find(m => m.id === editingItem.pizzaCustomization?.originalItemId)
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('Your cart is empty!');
      return;
    }

    const order = addOrder({
      items,
      customerName: formData.name,
      customerPhone: formData.phone,
      customerAddress: orderType === 'delivery' ? formData.address : 'Pickup',
      orderType,
      status: 'pending',
      total: total + (orderType === 'delivery' ? 3.99 : 0),
      notes: formData.notes,
    });

    clearCart();
    toast.success('Order placed successfully!');
    navigate(`/order-confirmation/${order.id}`);
  };

  const deliveryFee = orderType === 'delivery' ? 3.99 : 0;
  const grandTotal = total + deliveryFee;

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
            {/* Order Form */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-serif text-xl font-semibold mb-6">Delivery Information</h2>

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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Phone Number"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>

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

                <Button type="submit" variant="pizza" className="w-full" size="lg">
                  Place Order - ${grandTotal.toFixed(2)}
                </Button>
              </form>
            </div>

            {/* Order Summary */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-serif text-xl font-semibold mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <OrderItemCard
                    key={`${item.id}-${item.selectedSize}`}
                    item={item}
                    onEdit={setEditingItem}
                  />
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
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

      {/* Edit Modal */}
      {editingItem && originalMenuItem && (
        <PizzaCustomizationModal
          item={originalMenuItem}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          editingCartItem={editingItem}
        />
      )}
    </div>
  );
};

export default Checkout;

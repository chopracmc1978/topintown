import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Phone, User, FileText, Store, Edit2, ChevronDown, ChevronUp, LogIn, Loader2, CreditCard, AlertTriangle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useCart } from '@/contexts/CartContext';
import { useLocation as useLocationContext } from '@/contexts/LocationContext';
import { useCustomer } from '@/contexts/CustomerContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CartItem } from '@/types/menu';
import PizzaCustomizationModal from '@/components/pizza/PizzaCustomizationModal';
import WingsCustomizationModal from '@/components/wings/WingsCustomizationModal';
import { CheckoutAuthOptions } from '@/components/checkout/CheckoutAuthOptions';
import { AdvanceOrderPicker } from '@/components/checkout/AdvanceOrderPicker';
import CouponField from '@/components/checkout/CouponField';
import { Coupon } from '@/hooks/useCoupons';
import { useMenuItems } from '@/hooks/useMenuItems';
import { useIsLocationOpen } from '@/hooks/useLocationHours';
import { supabase } from '@/integrations/supabase/client';

const CHECKOUT_STATE_KEY = 'checkout_state';

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
  const comboCustomization = item.comboCustomization;
  const hasCustomization = pizzaCustomization || wingsCustomization || comboCustomization;

  // Helper to render pizza customization details
  const renderPizzaDetails = (customization: CartItem['pizzaCustomization']) => {
    if (!customization) return null;
    
    return (
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
    );
  };

  return (
    <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
      <div className="flex items-center gap-4">
        {item.image && (
          <img
            src={item.image}
            alt=""
            className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
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
            {comboCustomization 
              ? `Combo Deal • ${comboCustomization.selections.length} items`
              : pizzaCustomization 
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

          {expanded && pizzaCustomization && renderPizzaDetails(pizzaCustomization)}

          {expanded && wingsCustomization && (
            <div className="text-xs space-y-2 p-3 bg-background/50 rounded-lg">
              <div>
                <span className="font-medium text-muted-foreground">Flavor: </span>
                <span>{wingsCustomization.flavor}</span>
              </div>
            </div>
          )}

          {expanded && comboCustomization && (
            <div className="text-xs space-y-3 p-3 bg-background/50 rounded-lg">
              <p className="font-semibold text-primary">Combo Contents:</p>
              
              {comboCustomization.selections.map((selection, idx) => (
                <div key={idx} className="border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="font-medium capitalize">{selection.itemType}: </span>
                      <span>{selection.itemName}</span>
                      {selection.flavor && <span className="text-muted-foreground"> ({selection.flavor})</span>}
                    </div>
                    {selection.extraCharge > 0 && (
                      <span className="text-primary font-medium">+${selection.extraCharge.toFixed(2)}</span>
                    )}
                  </div>
                  
                  {/* Show pizza customization details within combo */}
                  {selection.pizzaCustomization && (
                    <div className="mt-2 ml-4 space-y-1 text-muted-foreground">
                      <p>{selection.pizzaCustomization.size.name}, {selection.pizzaCustomization.crust.name}</p>
                      
                      {selection.pizzaCustomization.cheeseType.toLowerCase() !== 'mozzarella' && (
                        <p>Cheese: {selection.pizzaCustomization.cheeseType}</p>
                      )}
                      
                      {selection.pizzaCustomization.sauceName && (
                        <p>Sauce: {selection.pizzaCustomization.sauceName}
                          {selection.pizzaCustomization.sauceQuantity === 'extra' && ' (Extra)'}
                        </p>
                      )}
                      
                      {(selection.pizzaCustomization.spicyLevel.left !== 'none' || selection.pizzaCustomization.spicyLevel.right !== 'none') && (
                        <p>Spicy: {
                          selection.pizzaCustomization.spicyLevel.left === selection.pizzaCustomization.spicyLevel.right 
                            ? selection.pizzaCustomization.spicyLevel.left
                            : `L:${selection.pizzaCustomization.spicyLevel.left} R:${selection.pizzaCustomization.spicyLevel.right}`
                        }</p>
                      )}
                      
                      {selection.pizzaCustomization.freeToppings.length > 0 && (
                        <p>Add-ons: {selection.pizzaCustomization.freeToppings.join(', ')}</p>
                      )}
                      
                      {selection.pizzaCustomization.defaultToppings.some(t => t.quantity === 'none') && (
                        <p className="text-destructive">NO: {
                          selection.pizzaCustomization.defaultToppings
                            .filter(t => t.quantity === 'none')
                            .map(t => t.name)
                            .join(', ')
                        }</p>
                      )}
                      
                      {selection.pizzaCustomization.extraToppings.length > 0 && (
                        <p className="text-primary">Extra: {
                          selection.pizzaCustomization.extraToppings.map(t => t.name).join(', ')
                        }</p>
                      )}
                      
                      {selection.pizzaCustomization.note && (
                        <p className="italic">Note: {selection.pizzaCustomization.note}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-medium">Base Price:</span>
                <span>${comboCustomization.comboBasePrice.toFixed(2)}</span>
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
  const { items, total } = useCart();
  const { selectedLocation } = useLocationContext();
  const { customer } = useCustomer();
  const { data: menuItems } = useMenuItems();
  const { checkIfOpen } = useIsLocationOpen(selectedLocation?.id || 'calgary');
  
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('pickup');
  const [editingPizzaItem, setEditingPizzaItem] = useState<CartItem | null>(null);
  const [editingWingsItem, setEditingWingsItem] = useState<CartItem | null>(null);
  const [showAuthOptions, setShowAuthOptions] = useState(false);
  const [verifiedCustomerId, setVerifiedCustomerId] = useState<string | null>(customer?.id || null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const placeOrderLock = useRef(false);
  
  // Coupon state
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  
  // Location confirmation dialog
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);
  
  // Advance ordering state - initialize from localStorage if available
  const [scheduledDate, setScheduledDate] = useState<Date | null>(() => {
    try {
      const saved = localStorage.getItem(CHECKOUT_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.scheduledDate ? new Date(parsed.scheduledDate) : null;
      }
    } catch {}
    return null;
  });
  const [scheduledTime, setScheduledTime] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem(CHECKOUT_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.scheduledTime || null;
      }
    } catch {}
    return null;
  });
  
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(CHECKOUT_STATE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          address: parsed.address || '',
          notes: parsed.notes || '',
        };
      }
    } catch {}
    return {
      address: '',
      notes: '',
    };
  });

  // Persist checkout state to localStorage
  useEffect(() => {
    const state = {
      scheduledDate: scheduledDate?.toISOString() || null,
      scheduledTime,
      address: formData.address,
      notes: formData.notes,
    };
    localStorage.setItem(CHECKOUT_STATE_KEY, JSON.stringify(state));
  }, [scheduledDate, scheduledTime, formData]);

  // Find the original menu item for editing pizza
  const originalPizzaMenuItem = editingPizzaItem?.pizzaCustomization 
    ? menuItems?.find(m => m.id === editingPizzaItem.pizzaCustomization?.originalItemId)
    : null;

  // Find the original menu item for editing wings
  const originalWingsMenuItem = editingWingsItem?.wingsCustomization 
    ? menuItems?.find(m => m.id === editingWingsItem.wingsCustomization?.originalItemId)
    : null;

  const locationStatus = checkIfOpen();

  const handleCheckoutClick = () => {
    // If we already created a checkout session, just re-open it.
    // (This prevents creating multiple sessions and avoids getting stuck in the preview iframe.)
    if (checkoutUrl) {
      const w = window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
      if (!w) {
        toast.error('Please allow popups to open the payment page');
      }
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty!');
      return;
    }

    // If location is closed and no scheduled time, require scheduling
    if (!locationStatus.isOpen && (!scheduledDate || !scheduledTime)) {
      toast.error('Please select a pickup time');
      return;
    }

    // Show location confirmation dialog first
    setShowLocationConfirm(true);
  };

  const handleConfirmLocation = () => {
    setShowLocationConfirm(false);
    
    // If already verified or logged in, place order directly
    if (verifiedCustomerId || customer?.id) {
      handlePlaceOrder(verifiedCustomerId || customer!.id);
    } else {
      setShowAuthOptions(true);
    }
  };

  const handleGuestCheckoutComplete = (customerId: string) => {
    setVerifiedCustomerId(customerId);
    setShowAuthOptions(false);
    handlePlaceOrder(customerId);
  };

  const handlePlaceOrder = async (customerId: string) => {
    // Prevent double submits
    if (placeOrderLock.current) return;
    placeOrderLock.current = true;
    setPlacingOrder(true);

    // Open a new tab immediately (still in the click gesture) to avoid popup blockers / iframe restrictions.
    const paymentWindow = window.open('', '_blank', 'noopener,noreferrer');
    
    try {
      const locationId = selectedLocation?.id || 'calgary';
      const deliveryFee = orderType === 'delivery' ? 3.99 : 0;
      // Discount only applies to non-combo items
      const discountedNonCombo = nonComboSubtotal - appliedDiscount;
      const finalSubtotal = discountedNonCombo + comboSubtotal;
      const tax = finalSubtotal * 0.05; // 5% GST
      const grandTotal = finalSubtotal + deliveryFee + tax;

      // Get customer info
      const customerInfo = customer || { 
        email: '', 
        phone: '', 
        fullName: '' 
      };

      // Build pickup time if scheduled
      let pickupTime: string | null = null;
      if (scheduledDate && scheduledTime) {
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const pickupDate = new Date(scheduledDate);
        pickupDate.setHours(hours, minutes, 0, 0);
        pickupTime = pickupDate.toISOString();
      }

      // Call create-checkout edge function to get Stripe URL
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          items,
          subtotal: total,
          discount: appliedDiscount,
          couponCode: appliedCoupon?.code || null,
          tax,
          total: grandTotal,
          customerName: customerInfo.fullName || '',
          customerPhone: customerInfo.phone || '',
          customerEmail: customerInfo.email || '',
          customerId: customerId,
          locationId,
          notes: formData.notes || '',
          pickupTime,
        }
      });

      if (error) {
        console.error('Error creating checkout:', error);
        throw new Error('Failed to create checkout session');
      }

      if (!data?.url) {
        throw new Error('No checkout URL returned');
      }

      setCheckoutUrl(data.url);

      // Open payment in a new tab (works reliably in preview and mobile)
      if (paymentWindow) {
        paymentWindow.location.href = data.url;
        paymentWindow.focus?.();
      } else {
        const w = window.open(data.url, '_blank', 'noopener,noreferrer');
        if (!w) {
          // As a last resort, try same-tab navigation.
          window.location.href = data.url;
        }
      }

      // Don't clear cart here; clear it only after successful payment on the confirmation page.
      setPlacingOrder(false);
      
    } catch (error: any) {
      console.error('Error placing order:', error);
      toast.error(error.message || 'Failed to start checkout');
      setPlacingOrder(false);
      placeOrderLock.current = false;
    }
  };

  // Calculate subtotal for non-combo items only (coupons don't apply to combos)
  const nonComboSubtotal = items
    .filter(item => !item.comboCustomization)
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const comboSubtotal = items
    .filter(item => item.comboCustomization)
    .reduce((sum, item) => sum + item.totalPrice, 0);

  const deliveryFee = orderType === 'delivery' ? 3.99 : 0;
  // Discount only applies to non-combo items
  const discountedNonComboSubtotal = nonComboSubtotal - appliedDiscount;
  const discountedSubtotal = discountedNonComboSubtotal + comboSubtotal;
  const tax = discountedSubtotal * 0.05;
  const grandTotal = discountedSubtotal + deliveryFee + tax;

  const handleApplyCoupon = (coupon: Coupon, discount: number) => {
    setAppliedCoupon(coupon);
    setAppliedDiscount(discount);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setAppliedDiscount(0);
  };

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
            {/* Left Side - Customer Info or Auth Options */}
            <div className="bg-card rounded-xl border border-border p-6">
              {showAuthOptions ? (
                <CheckoutAuthOptions 
                  onContinueAsGuest={handleGuestCheckoutComplete}
                  onBack={() => setShowAuthOptions(false)}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-serif text-xl font-semibold">
                      {customer || verifiedCustomerId ? 'Order Details' : 'Guest Checkout'}
                    </h2>
                    {!customer && !verifiedCustomerId && (
                      <Link to="/customer-login?redirect=/checkout" className="text-sm text-primary hover:underline flex items-center gap-1">
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

                  {/* Pickup Only Notice */}
                  <div className="mb-6 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Store className="w-4 h-4 text-primary" />
                      <span className="font-medium text-primary">Pickup Only</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">All orders require prepayment via credit card</p>
                  </div>

                  {/* Location display for pickup */}
                  {selectedLocation && (
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

                  {/* Pickup Time Selection */}
                  <div className="mb-6 p-4 bg-secondary/30 rounded-lg border border-border">
                    <AdvanceOrderPicker
                      locationId={selectedLocation?.id || 'calgary'}
                      selectedDate={scheduledDate}
                      selectedTime={scheduledTime}
                      onDateTimeChange={(date, time) => {
                        setScheduledDate(date);
                        setScheduledTime(time);
                      }}
                    />
                  </div>

                  <div className="space-y-4">

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
                      disabled={placingOrder}
                    >
                      {placingOrder ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : customer || verifiedCustomerId ? (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay ${grandTotal.toFixed(2)}
                        </>
                      ) : (
                        `Continue - $${grandTotal.toFixed(2)}`
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

              {/* Coupon Field - only applies to non-combo items */}
              <div className="mb-4">
                {comboSubtotal > 0 && nonComboSubtotal === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Coupons cannot be applied to combo deals
                  </p>
                ) : (
                  <>
                    <CouponField
                      subtotal={nonComboSubtotal}
                      onApply={handleApplyCoupon}
                      onRemove={handleRemoveCoupon}
                      appliedCoupon={appliedCoupon}
                      appliedDiscount={appliedDiscount}
                    />
                    {comboSubtotal > 0 && nonComboSubtotal > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Note: Coupons apply only to non-combo items (${nonComboSubtotal.toFixed(2)})
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                {appliedDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>-${appliedDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>GST (5%)</span>
                  <span>${tax.toFixed(2)}</span>
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

      {/* Location Confirmation Dialog */}
      <AlertDialog open={showLocationConfirm} onOpenChange={setShowLocationConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Pickup Location
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Please confirm you will pick up your order from:</p>
                <div className="bg-secondary/50 rounded-lg p-4 space-y-1">
                  <p className="font-semibold text-foreground">
                    {selectedLocation?.name || 'Top In Town Pizza - Calgary'}
                  </p>
                  <p className="text-sm">
                    {selectedLocation?.address || '3250 60 ST NE, CALGARY, AB T1Y 3T5'}
                  </p>
                  <p className="text-sm text-primary font-medium">
                    {selectedLocation?.phone || '(403) 280-7373 ext 1'}
                  </p>
                </div>
                {scheduledDate && scheduledTime && (
                  <p className="text-sm">
                    <span className="font-medium">Scheduled pickup:</span>{' '}
                    {scheduledDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {scheduledTime}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Change Location</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLocation} className="bg-primary hover:bg-primary/90">
              Confirm & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Checkout;

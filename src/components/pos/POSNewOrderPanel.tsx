import { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Search, X, Utensils, Package, Truck, Edit2, History, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useMenuItems, MenuItem } from '@/hooks/useMenuItems';
import { useActiveCombos, Combo } from '@/hooks/useCombos';
import { CartItem, OrderType, OrderSource, CartPizzaCustomization, CartComboCustomization, ComboSelectionItem, Order } from '@/types/menu';
import { cn } from '@/lib/utils';
import { POSPizzaModal } from '@/components/pos/POSPizzaModal';
import { POSWingsModal } from '@/components/pos/POSWingsModal';
import { POSOrderHistoryDropdown } from '@/components/pos/POSOrderHistoryDropdown';
import { POSComboBuilderModal } from '@/components/pos/POSComboBuilderModal';
import { useCustomerLookup } from '@/hooks/useCustomerLookup';
import { toast } from 'sonner';

// Helper to format pizza customization for display (only changes from default)
const formatPizzaCustomization = (customization: CartPizzaCustomization): string[] => {
  const details: string[] = [];
  
  // Size and Crust always show
  details.push(`${customization.size.name}, ${customization.crust.name}`);
  
  // Cheese - only if changed from regular mozzarella
  if (customization.cheeseType) {
    if (customization.cheeseType.toLowerCase() === 'no cheese') {
      details.push('No Cheese');
    } else if (customization.cheeseType.toLowerCase() === 'dairy free') {
      details.push('Dairy Free');
    } else {
      // Check for quantity changes
      const hasQuantityChange = customization.cheeseSides?.some(
        cs => cs.quantity && cs.quantity !== 'regular' && cs.quantity !== 'normal'
      );
      if (hasQuantityChange) {
        const qtyParts = customization.cheeseSides
          ?.filter(cs => cs.quantity && cs.quantity !== 'regular' && cs.quantity !== 'normal')
          .map(cs => `${cs.quantity} cheese${cs.side !== 'whole' ? ` (${cs.side})` : ''}`);
        if (qtyParts?.length) details.push(qtyParts.join(', '));
      }
    }
  }
  
  // Sauce - only if no sauce or extra quantity
  if (customization.sauceName?.toLowerCase() === 'no sauce') {
    details.push('No Sauce');
  } else if (customization.sauceQuantity && customization.sauceQuantity !== 'normal') {
    details.push(`${customization.sauceQuantity} ${customization.sauceName}`);
  }
  
  // Spicy - only show if at least one side is not 'none'
  const left = customization.spicyLevel?.left;
  const right = customization.spicyLevel?.right;
  
  // Map internal values to display names
  const spicyDisplayName = (level: string) => {
    if (level === 'medium') return 'Medium Hot';
    if (level === 'hot') return 'Hot';
    if (level === 'none' || !level) return 'None';
    return level;
  };
  
  // Check if any side has spicy selected (not none)
  const hasLeft = left && left !== 'none';
  const hasRight = right && right !== 'none';
  
  if (hasLeft || hasRight) {
    // Both sides same and not none - show single level
    if (left === right) {
      details.push(`Spicy: ${spicyDisplayName(left!)}`);
    } else {
      // Different sides - show both with L/R labels
      details.push(`Spicy: L:${spicyDisplayName(left || 'none')} R:${spicyDisplayName(right || 'none')}`);
    }
  }
  
  // Free toppings - if any selected
  if (customization.freeToppings?.length) {
    details.push(`+ ${customization.freeToppings.join(', ')}`);
  }
  
  // Removed default toppings
  const removed = customization.defaultToppings?.filter(t => t.quantity === 'none');
  if (removed?.length) {
    details.push(`NO: ${removed.map(t => t.name).join(', ')}`);
  }
  
  // Modified default toppings (less/extra)
  const modified = customization.defaultToppings?.filter(
    t => t.quantity === 'less' || t.quantity === 'extra'
  );
  if (modified?.length) {
    modified.forEach(t => {
      const side = t.side && t.side !== 'whole' ? ` (${t.side})` : '';
      details.push(`${t.quantity} ${t.name}${side}`);
    });
  }
  
  // Extra toppings
  if (customization.extraToppings?.length) {
    const extras = customization.extraToppings.map(t => {
      const side = t.side && t.side !== 'whole' ? ` (${t.side})` : '';
      return `+${t.name}${side}`;
    });
    details.push(extras.join(', '));
  }
  
  // Note
  if (customization.note) {
    details.push(`Note: ${customization.note}`);
  }
  
  return details;
};
interface POSNewOrderPanelProps {
  onCreateOrder: (orderData: {
    items: CartItem[];
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    orderType: OrderType;
    source: OrderSource;
    tableNumber?: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
  editingOrder?: Order | null;
  onUpdateOrder?: (orderData: { items: CartItem[]; notes?: string }) => void;
}

const categories = [
  { id: 'combos', label: 'Combos' },
  { id: 'pizza', label: 'Pizzas' },
  { id: 'chicken_wings', label: 'Wings' },
  { id: 'baked_lasagna', label: 'Lasagna' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'dipping_sauce', label: 'Dipping' },
] as const;

const pizzaSubcategories = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'paneer', label: 'Paneer' },
  { id: 'chicken', label: 'Chicken' },
  { id: 'meat', label: 'Meat Pizza' },
  { id: 'hawaiian', label: 'Hawaiian' },
] as const;

// Items that require customization
const CUSTOMIZABLE_CATEGORIES = ['pizza', 'chicken_wings'];

export const POSNewOrderPanel = ({ onCreateOrder, onCancel, editingOrder, onUpdateOrder }: POSNewOrderPanelProps) => {
  const isEditMode = !!editingOrder;
  const { data: menuItems = [], isLoading } = useMenuItems();
  const { data: activeCombos = [], isLoading: isCombosLoading } = useActiveCombos();
  const [activeCategory, setActiveCategory] = useState<string>('combos');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('vegetarian');
  const [searchQuery, setSearchQuery] = useState('');
  // Initialize cart with editing order's items or empty
  const [cartItems, setCartItems] = useState<CartItem[]>(editingOrder?.items || []);
  
  // Customization modal state
  const [selectedPizzaItem, setSelectedPizzaItem] = useState<MenuItem | null>(null);
  const [selectedWingsItem, setSelectedWingsItem] = useState<MenuItem | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);
  
  // Customer info - initialize from editing order if available
  const [customerName, setCustomerName] = useState(editingOrder?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(editingOrder?.customerPhone || '');
  const [customerAddress, setCustomerAddress] = useState(editingOrder?.customerAddress || '');
  const [orderType, setOrderType] = useState<OrderType>(editingOrder?.orderType || 'pickup');
  const [tableNumber, setTableNumber] = useState(editingOrder?.tableNumber || '');
  const [notes, setNotes] = useState(editingOrder?.notes || '');
  
  // Discount fields
  const [couponCode, setCouponCode] = useState('');
  const [manualDiscount, setManualDiscount] = useState('');

  // Customer lookup state
  const { isSearching, orderHistory, customerInfo, searchByPhone, saveCustomer, clearSearch } = useCustomerLookup();
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const phoneDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Handle phone input with debounced search
  const handlePhoneChange = (value: string) => {
    setCustomerPhone(value);
    
    // Clear previous debounce
    if (phoneDebounceRef.current) {
      clearTimeout(phoneDebounceRef.current);
    }
    
    // Debounce search
    if (value.length >= 3) {
      phoneDebounceRef.current = setTimeout(() => {
        searchByPhone(value);
        setShowOrderHistory(true);
      }, 400);
    } else {
      clearSearch();
      setShowOrderHistory(false);
    }
  };

  // Auto-fill customer name from lookup
  useEffect(() => {
    if (customerInfo?.full_name && !customerName) {
      setCustomerName(customerInfo.full_name);
    }
  }, [customerInfo]);

  // Handle selecting order from history
  const handleSelectPastOrder = (items: CartItem[], mode: 'exact' | 'edit') => {
    // Deep clone items to avoid reference issues
    const clonedItems = JSON.parse(JSON.stringify(items));
    setCartItems(clonedItems);
    
    if (mode === 'exact') {
      toast.success('Order loaded - ready to submit!');
    } else {
      toast.info('Order loaded - you can now edit items');
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = item.category === activeCategory;
    const matchesSubcategory = activeCategory !== 'pizza' || 
      item.subcategory === activeSubcategory;
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSubcategory && matchesSearch && item.is_available;
  });

  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    setActiveSubcategory('vegetarian');
  };

  const handleItemClick = (menuItem: MenuItem) => {
    // Open customization modal for pizza and wings
    if (menuItem.category === 'pizza') {
      setSelectedPizzaItem(menuItem);
      setEditingCartItem(null);
      setEditingCartIndex(null);
    } else if (menuItem.category === 'chicken_wings') {
      setSelectedWingsItem(menuItem);
      setEditingCartItem(null);
      setEditingCartIndex(null);
    } else {
      // Direct add for non-customizable items
      addSimpleItem(menuItem);
    }
  };

  const addSimpleItem = (menuItem: MenuItem) => {
    const basePrice = menuItem.sizes?.[0]?.price ?? menuItem.base_price;
    const sizeName = menuItem.sizes?.[0]?.name;

    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        item => item.id === menuItem.id && 
          item.selectedSize === sizeName && 
          !item.pizzaCustomization && 
          !item.wingsCustomization
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
          totalPrice: (updated[existingIndex].quantity + 1) * basePrice,
        };
        return updated;
      }

      return [...prev, {
        id: menuItem.id,
        name: menuItem.name,
        description: menuItem.description || '',
        price: basePrice,
        image: menuItem.image_url || '',
        category: menuItem.category,
        quantity: 1,
        selectedSize: sizeName,
        totalPrice: basePrice,
      }];
    });
  };

  // Handle pizza added from modal
  const handlePizzaAdded = (pizzaItem: CartItem) => {
    if (editingCartIndex !== null) {
      // Update existing item
      setCartItems(prev => {
        const updated = [...prev];
        updated[editingCartIndex] = pizzaItem;
        return updated;
      });
    } else {
      // Add new item
      setCartItems(prev => [...prev, pizzaItem]);
    }
    setSelectedPizzaItem(null);
    setEditingCartItem(null);
    setEditingCartIndex(null);
  };

  // Handle wings added from modal  
  const handleWingsAdded = (wingsItem: CartItem) => {
    if (editingCartIndex !== null) {
      setCartItems(prev => {
        const updated = [...prev];
        updated[editingCartIndex] = wingsItem;
        return updated;
      });
    } else {
      setCartItems(prev => [...prev, wingsItem]);
    }
    setSelectedWingsItem(null);
    setEditingCartItem(null);
    setEditingCartIndex(null);
  };

  // Handle combo added from modal
  const handleComboAdded = (comboItem: CartItem) => {
    setCartItems(prev => [...prev, comboItem]);
    setSelectedCombo(null);
  };

  const handleEditItem = (item: CartItem, index: number) => {
    if (item.pizzaCustomization) {
      const originalItem = menuItems.find(m => m.id === item.pizzaCustomization?.originalItemId);
      if (originalItem) {
        setSelectedPizzaItem(originalItem);
        setEditingCartItem(item);
        setEditingCartIndex(index);
      }
    } else if (item.wingsCustomization) {
      const originalItem = menuItems.find(m => m.id === item.wingsCustomization?.originalItemId);
      if (originalItem) {
        setSelectedWingsItem(originalItem);
        setEditingCartItem(item);
        setEditingCartIndex(index);
      }
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    setCartItems(prev => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }

      updated[index] = {
        ...updated[index],
        quantity: newQty,
        totalPrice: newQty * (updated[index].totalPrice / updated[index].quantity),
      };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = parseFloat(manualDiscount) || 0;
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = discountedSubtotal * 0.08;
  const total = discountedSubtotal + tax;

  const handleSubmit = async () => {
    if (cartItems.length === 0) return;

    // Save customer to database if phone provided
    if (customerPhone && !isEditMode) {
      await saveCustomer(customerPhone, customerName);
    }

    if (isEditMode && onUpdateOrder) {
      onUpdateOrder({
        items: cartItems,
        notes: notes || undefined,
      });
    } else {
      onCreateOrder({
        items: cartItems,
        customerName: customerName || 'Walk-in Customer',
        customerPhone,
        customerAddress,
        orderType,
        source: 'walk-in',
        tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
        notes: notes || undefined,
      });
    }
  };

  return (
    <>
      <div className="h-full flex flex-col bg-card rounded-xl border border-border overflow-hidden">
        {/* Header - Compact single row with search */}
        <div className="bg-secondary/50 px-4 py-2.5 border-b border-border flex items-center gap-3">
          {/* Customer Name & Phone - horizontal */}
          <Input
            placeholder="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-10 text-base w-40"
          />
          <div className="relative">
            <Input
              ref={phoneInputRef}
              placeholder="Phone number"
              value={customerPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onFocus={() => orderHistory.length > 0 && setShowOrderHistory(true)}
              onBlur={() => setTimeout(() => setShowOrderHistory(false), 200)}
              className={cn(
                "h-10 text-base w-40 pr-8",
                orderHistory.length > 0 && "border-primary"
              )}
            />
            {orderHistory.length > 0 && (
              <History className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            )}
            
            {/* Order History Dropdown */}
            {showOrderHistory && (
              <POSOrderHistoryDropdown
                orders={orderHistory}
                isSearching={isSearching}
                onSelectOrder={handleSelectPastOrder}
                onClose={() => setShowOrderHistory(false)}
              />
            )}
          </div>
          
          {/* Search bar in header */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-base"
            />
          </div>
          
          {/* Title - right aligned */}
          <div className="flex-1 text-right pr-2">
            <h2 className="text-xl font-bold">{isEditMode ? `Edit Order ${editingOrder?.id}` : 'New Order'}</h2>
            {isEditMode && editingOrder && (
              <p className="text-sm text-muted-foreground">{editingOrder.customerName}</p>
            )}
          </div>
          
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-10 w-10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Menu Selection */}
          <div className="flex-1 flex flex-col border-r border-border">

            {/* Category Tabs - Larger for tablet */}
            <div className="flex gap-2 p-3 border-b border-border overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={cn(
                    "px-5 py-3 rounded-lg text-base font-medium whitespace-nowrap transition-colors",
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Pizza Subcategory Tabs */}
            {activeCategory === 'pizza' && (
              <div className="flex gap-2 p-3 border-b border-border overflow-x-auto bg-secondary/20">
                {pizzaSubcategories.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubcategory(sub.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-base font-medium whitespace-nowrap transition-colors",
                      activeSubcategory === sub.id
                        ? "bg-primary/80 text-primary-foreground"
                        : "bg-card text-foreground border border-border hover:bg-secondary"
                    )}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}

            {/* Menu Items Grid - 5 columns, ultra-compact cards to fit all without scroll */}
            <div className="flex-1 p-2 overflow-hidden">
              {activeCategory === 'combos' ? (
                // Combos Grid
                isCombosLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-lg">Loading combos...</div>
                ) : activeCombos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-lg">No active combos</div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 auto-rows-min">
                    {activeCombos.map(combo => (
                      <button
                        key={combo.id}
                        onClick={() => setSelectedCombo(combo)}
                        className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg text-left hover:from-primary/20 hover:to-primary/10 transition-colors border-l-4 border-primary"
                      >
                        <div className="flex items-start gap-2">
                          <Gift className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-sm line-clamp-2 leading-tight">{combo.name}</p>
                            {combo.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{combo.description}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-primary font-bold mt-1.5">${combo.price.toFixed(2)}</p>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                // Regular Menu Items Grid
                isLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-lg">Loading menu...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-lg">No items found</div>
                ) : (
                  <div className="grid grid-cols-5 gap-1.5 auto-rows-min">
                    {filteredItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="p-2 bg-secondary/30 rounded-md text-left hover:bg-secondary transition-colors border-l-2 border-primary/30"
                      >
                        <p className="font-medium text-xs uppercase line-clamp-2 leading-tight">{item.name}</p>
                        <p className="text-xs text-primary font-bold mt-0.5">
                          ${(item.sizes?.[0]?.price ?? item.base_price).toFixed(2)}
                          {CUSTOMIZABLE_CATEGORIES.includes(item.category) && (
                            <span className="text-[10px] text-muted-foreground font-normal ml-0.5">+</span>
                          )}
                        </p>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Order Summary - Wider for tablet */}
          <div className="w-96 flex flex-col">
            {/* Cart Items */}
            <ScrollArea className="flex-1 p-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-lg">
                  Tap items to add to order
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="p-3 bg-secondary/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-base truncate">{item.name}</p>
                          {item.selectedSize && !item.pizzaCustomization && (
                            <p className="text-sm text-muted-foreground">{item.selectedSize}</p>
                          )}
                          {item.pizzaCustomization && (
                            <div className="text-sm text-muted-foreground space-y-0.5 mt-1">
                              {formatPizzaCustomization(item.pizzaCustomization).map((line, i) => (
                                <p 
                                  key={i} 
                                  className={cn(
                                    line.startsWith('NO:') && 'text-destructive font-medium',
                                    line.startsWith('+') && 'text-green-600 font-medium',
                                    line.startsWith('Note:') && 'italic'
                                  )}
                                >
                                  {line}
                                </p>
                              ))}
                            </div>
                          )}
                          {item.wingsCustomization && (
                            <p className="text-sm text-muted-foreground">
                              {item.wingsCustomization.flavor}
                            </p>
                          )}
                        </div>
                        {(item.pizzaCustomization || item.wingsCustomization) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0"
                            onClick={() => handleEditItem(item, index)}
                          >
                            <Edit2 className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => updateQuantity(index, -1)}
                          >
                            <Minus className="w-5 h-5" />
                          </Button>
                          <span className="w-8 text-center text-lg font-medium">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => updateQuantity(index, 1)}
                          >
                            <Plus className="w-5 h-5" />
                          </Button>
                        </div>
                        <span className="text-base font-medium">
                          ${item.totalPrice.toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-destructive"
                          onClick={() => removeItem(index)}
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <Separator />

            {/* Order Notes */}
            <div className="p-4 border-t border-border">
              <Textarea
                placeholder="Order notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-base resize-none h-20"
              />
            </div>

            {/* Coupon & Discount */}
            <div className="px-4 py-2 border-t border-border flex gap-2">
              <Input
                placeholder="Coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="h-9 text-sm flex-1"
              />
              <Input
                placeholder="Discount"
                inputMode="decimal"
                value={manualDiscount}
                onChange={(e) => {
                  // Allow only numbers and decimal point
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setManualDiscount(val);
                }}
                className="h-9 text-sm w-24"
              />
            </div>

            {/* Totals & Submit */}
            <div className="px-4 py-2 border-t border-border bg-secondary/30 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-1">
                <span>Total</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
              
              <Button 
                variant="pizza" 
                className="w-full mt-2 text-base py-2 h-auto"
                disabled={cartItems.length === 0}
                onClick={handleSubmit}
              >
                {isEditMode ? 'Update Order' : 'Create Order'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Pizza Customization Modal */}
      {selectedPizzaItem && (
        <POSPizzaModal
          item={selectedPizzaItem}
          isOpen={!!selectedPizzaItem}
          onClose={() => {
            setSelectedPizzaItem(null);
            setEditingCartItem(null);
            setEditingCartIndex(null);
          }}
          onAddToOrder={(item) => {
            if (editingCartIndex !== null) {
              setCartItems(prev => {
                const updated = [...prev];
                updated[editingCartIndex] = item;
                return updated;
              });
            } else {
              setCartItems(prev => [...prev, item]);
            }
            setSelectedPizzaItem(null);
            setEditingCartItem(null);
            setEditingCartIndex(null);
          }}
          editingItem={editingCartItem}
        />
      )}

      {/* Wings Customization Modal */}
      {selectedWingsItem && (
        <POSWingsModal
          item={selectedWingsItem}
          isOpen={!!selectedWingsItem}
          onClose={() => {
            setSelectedWingsItem(null);
            setEditingCartItem(null);
            setEditingCartIndex(null);
          }}
          onAddToOrder={(item) => {
            if (editingCartIndex !== null) {
              setCartItems(prev => {
                const updated = [...prev];
                updated[editingCartIndex] = item;
                return updated;
              });
            } else {
              setCartItems(prev => [...prev, item]);
            }
            setSelectedWingsItem(null);
            setEditingCartItem(null);
            setEditingCartIndex(null);
          }}
          editingItem={editingCartItem}
        />
      )}

      {/* Combo Builder Modal */}
      {selectedCombo && (
        <POSComboBuilderModal
          combo={selectedCombo}
          isOpen={!!selectedCombo}
          onClose={() => setSelectedCombo(null)}
          onComboAdded={handleComboAdded}
        />
      )}
    </>
  );
};

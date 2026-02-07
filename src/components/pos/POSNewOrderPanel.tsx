import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Minus, Search, X, Utensils, Package, Truck, Edit2, History, Gift, Check, Delete, CalendarClock, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMenuItems, MenuItem } from '@/hooks/useMenuItems';
import { useActiveCombos, Combo } from '@/hooks/useCombos';
import { useValidateCoupon } from '@/hooks/useCoupons';
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
     discount?: number;
     couponCode?: string;
     rewardsUsed?: number;
     rewardsDiscount?: number;
     pickupTime?: Date;
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
  const [activeCategory, setActiveCategory] = useState<string>('');
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
  
  // Schedule order state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  // Discount fields
  const [couponCode, setCouponCode] = useState('');
  const [manualDiscount, setManualDiscount] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [showDiscountKeypad, setShowDiscountKeypad] = useState(false);
  
  // Reward redemption state
  const [rewardsApplied, setRewardsApplied] = useState<{ points: number; dollarValue: number } | null>(null);
  const [showRewardsSuggestion, setShowRewardsSuggestion] = useState(false);
  const [showRewardsKeypad, setShowRewardsKeypad] = useState(false);
  const [rewardsInput, setRewardsInput] = useState('');
  
  // Coupon validation
  const validateCouponMutation = useValidateCoupon();

  // Customer lookup state
  const { isSearching, orderHistory, customerInfo, rewardPoints, searchByPhone, saveCustomer, clearSearch } = useCustomerLookup();
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
    
    // Debounce search - but don't show history until Enter/Tab
    if (value.length >= 3) {
      phoneDebounceRef.current = setTimeout(() => {
        searchByPhone(value);
      }, 400);
    } else {
      clearSearch();
      setShowOrderHistory(false);
      setCustomerName('');
    }
  };

  // Show order history on Enter/Tab only
  const handlePhoneKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && customerPhone.length >= 3) {
      // Trigger search immediately and show history
      searchByPhone(customerPhone);
      setShowOrderHistory(true);
    }
  };

  // Hide order history when clicking outside
  useEffect(() => {
    if (!showOrderHistory) return;
    
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is outside phone input area and order history dropdown
      const isInsidePhone = target.closest('[data-phone-input]');
      const isInsideHistory = target.closest('[data-order-history]');
      
      if (!isInsidePhone && !isInsideHistory) {
        setShowOrderHistory(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showOrderHistory]);

  // Auto-fill customer name only when order history is explicitly shown (OK/Enter/Tab)
  useEffect(() => {
    if (showOrderHistory && customerInfo?.full_name && !customerName) {
      setCustomerName(customerInfo.full_name);
    }
  }, [showOrderHistory, customerInfo]);

  // Auto-suggest reward redemption when customer has 200+ points and cart has items
  useEffect(() => {
    if (rewardPoints >= 200 && cartItems.length > 0 && !rewardsApplied && !isEditMode) {
      setShowRewardsSuggestion(true);
    } else if (rewardPoints < 200 || cartItems.length === 0) {
      setShowRewardsSuggestion(false);
    }
  }, [rewardPoints, cartItems.length, rewardsApplied, isEditMode]);

  // Generate available dates for scheduling (next 7 days)
  const availableScheduleDates = useMemo(() => {
    const dates: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      let label = '';
      if (i === 0) label = 'Today';
      else if (i === 1) label = 'Tomorrow';
      else label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      dates.push({ value: dateStr, label });
    }
    return dates;
  }, []);

  // Generate time slots (every 30 min from now if today, else from 10am to 10pm)
  const availableScheduleTimes = useMemo(() => {
    const times: { value: string; label: string }[] = [];
    const now = new Date();
    const isToday = scheduledDate === now.toISOString().split('T')[0];
    
    let startHour = 10;
    let startMin = 0;
    
    if (isToday) {
      // Start from next 30-min slot, at least 1 hour from now
      const minTime = new Date(now.getTime() + 60 * 60 * 1000);
      startHour = minTime.getHours();
      startMin = minTime.getMinutes() >= 30 ? 30 : 0;
      if (minTime.getMinutes() >= 30) {
        startMin = 0;
        startHour += 1;
      }
    }
    
    for (let h = startHour; h <= 22; h++) {
      for (let m = (h === startHour ? startMin : 0); m < 60; m += 30) {
        if (h === 22 && m > 0) break;
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const hour12 = h % 12 || 12;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const label = `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
        times.push({ value: timeStr, label });
      }
    }
    return times;
  }, [scheduledDate]);

  // Reward redemption constants
  const REWARD_MIN_POINTS = 200;
  const REWARD_POINTS_PER_DOLLAR = 10; // 10 points = $1
  const REWARD_MIN_DOLLAR = 20; // min $20 per redemption
  const REWARD_MAX_DOLLAR = 35; // max $35 per redemption

  const handleClearRewards = () => {
    setRewardsApplied(null);
    // Re-show suggestion if still eligible
    if (rewardPoints >= REWARD_MIN_POINTS && cartItems.length > 0) {
      setShowRewardsSuggestion(true);
    }
  };

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
  // Use coupon discount if applied, otherwise manual discount
  const discountAmount = appliedCoupon ? appliedCoupon.discount : (parseFloat(manualDiscount) || 0);
  const rewardsDiscount = rewardsApplied?.dollarValue || 0;
  const totalDiscount = discountAmount + rewardsDiscount;
  const discountedSubtotal = Math.max(0, subtotal - totalDiscount);
  const tax = discountedSubtotal * 0.05; // 5% GST (Alberta)
  const total = discountedSubtotal + tax;

  // Calculate the smart redemption amount: between $20-$35, capped by order subtotal
  const availableDollarsFromPoints = Math.floor(rewardPoints / REWARD_POINTS_PER_DOLLAR);
  const subtotalAfterOtherDiscounts = Math.max(0, subtotal - discountAmount);
  const smartRedeemDollars = Math.min(availableDollarsFromPoints, REWARD_MAX_DOLLAR, Math.floor(subtotalAfterOtherDiscounts));
  const canApplyRewards = smartRedeemDollars >= REWARD_MIN_DOLLAR;

  const handleApplyRewards = (customAmount?: number) => {
    if (appliedCoupon) {
      toast.error('Cannot use rewards when a coupon is applied. Remove the coupon first.');
      return;
    }
    const dollarValue = customAmount ?? smartRedeemDollars;
    if (dollarValue < REWARD_MIN_DOLLAR || dollarValue > Math.min(availableDollarsFromPoints, REWARD_MAX_DOLLAR)) {
      toast.error(`Reward amount must be between $${REWARD_MIN_DOLLAR} and $${Math.min(availableDollarsFromPoints, REWARD_MAX_DOLLAR)}`);
      return;
    }
    const pointsUsed = dollarValue * REWARD_POINTS_PER_DOLLAR;
    setRewardsApplied({ points: pointsUsed, dollarValue });
    setShowRewardsSuggestion(false);
    setShowRewardsKeypad(false);
    setRewardsInput('');
    toast.success(`Reward applied: -$${dollarValue.toFixed(2)} (${pointsUsed} pts)`);
  };

  const handleRewardsKeyPress = (key: string) => {
    if (key === 'C') {
      setRewardsInput('');
    } else if (key === 'DEL') {
      setRewardsInput(prev => prev.slice(0, -1));
    } else {
      // Only allow digits, max 2 chars (20-35 range)
      if (rewardsInput.length < 2) {
        setRewardsInput(prev => prev + key);
      }
    }
  };

  const handleRewardsKeypadApply = () => {
    const val = parseInt(rewardsInput);
    if (isNaN(val) || val < REWARD_MIN_DOLLAR || val > Math.min(availableDollarsFromPoints, REWARD_MAX_DOLLAR)) {
      toast.error(`Enter amount between $${REWARD_MIN_DOLLAR}-$${Math.min(availableDollarsFromPoints, REWARD_MAX_DOLLAR)}`);
      return;
    }
    handleApplyRewards(val);
  };

  // Apply coupon handler
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    if (rewardsApplied) {
      toast.error('Cannot use coupon when rewards are applied. Remove rewards first.');
      return;
    }
    
    try {
      const result = await validateCouponMutation.mutateAsync({
        code: couponCode,
        subtotal,
      });
      setAppliedCoupon({
        code: result.coupon.code,
        discount: result.discount,
      });
      setManualDiscount(''); // Clear manual discount when coupon applied
      toast.success(`Coupon applied: -$${result.discount.toFixed(2)}`);
    } catch (error: any) {
      toast.error(error.message || 'Invalid coupon');
    }
  };

  // Clear coupon
  const handleClearCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  // Discount keypad handler
  const handleDiscountKeyPress = (key: string) => {
    if (appliedCoupon) return; // Don't allow manual discount when coupon is applied
    
    if (key === 'C') {
      setManualDiscount('');
    } else if (key === 'DEL') {
      setManualDiscount(prev => prev.slice(0, -1));
    } else if (key === '.') {
      if (!manualDiscount.includes('.')) {
        setManualDiscount(prev => prev + '.');
      }
    } else {
      const parts = manualDiscount.split('.');
      if (parts[1] && parts[1].length >= 2) return;
      setManualDiscount(prev => prev + key);
    }
  };

  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (cartItems.length === 0) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
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
        // Build pickupTime from scheduled date/time
        let pickupTime: Date | undefined;
        if (isScheduled && scheduledDate && scheduledTime) {
          pickupTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
        }

        onCreateOrder({
          items: cartItems,
          customerName: customerName || 'Walk-in Customer',
          customerPhone,
          customerAddress,
          orderType,
          source: 'walk-in',
          tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
          notes: notes || undefined,
           discount: totalDiscount > 0 ? totalDiscount : undefined,
           couponCode: appliedCoupon?.code || undefined,
           rewardsUsed: rewardsApplied?.points || undefined,
           rewardsDiscount: rewardsApplied?.dollarValue || undefined,
           pickupTime,
        });
      }
    } finally {
      // Re-enable after a short delay to allow state to settle
      setTimeout(() => {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }, 2000);
    }
  };

  return (
    <>
      <div className="h-full flex flex-col rounded-xl overflow-hidden" style={{ background: 'hsl(220, 26%, 14%)', border: '1px solid hsl(220, 20%, 28%)' }}>
        {/* Header - Compact single row with search */}
        <div className="px-4 py-2.5 flex items-center gap-3" style={{ background: 'hsl(220, 25%, 16%)', borderBottom: '1px solid hsl(220, 20%, 28%)' }}>
          {/* Phone & Customer Name - horizontal (phone first) */}
          <div className="relative z-10 flex items-center gap-1" data-phone-input>
            {/* Phone Input with Inline Numeric Keypad Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input
                    ref={phoneInputRef}
                    placeholder="Phone"
                    value={customerPhone}
                    readOnly
                    inputMode="none"
                    onKeyDown={handlePhoneKeyDown}
                    className={cn(
                      "h-10 text-base w-36 pr-7 cursor-pointer",
                      "outline-none focus:outline-none focus-visible:outline-none",
                      orderHistory.length > 0 && "border-primary"
                    )}
                  />
                  {orderHistory.length > 0 && (
                    <History className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent 
                className="w-56 p-3" 
                align="start" 
                style={{ backgroundColor: 'hsl(220, 25%, 18%)' }}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((key) => (
                    <Button
                      key={key}
                      variant="outline"
                      className="h-12 text-xl font-medium outline-none focus:outline-none"
                      style={{ backgroundColor: 'hsl(220, 22%, 28%)', borderColor: 'hsl(220, 20%, 35%)', color: 'hsl(210, 20%, 90%)' }}
                      onClick={() => {
                        handlePhoneChange(customerPhone + key);
                      }}
                    >
                      {key}
                    </Button>
                  ))}
                </div>
                {/* Row 4: C, 0, . */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <Button
                    variant="outline"
                    className="h-12 text-xl font-medium outline-none focus:outline-none"
                    style={{ backgroundColor: 'hsl(220, 22%, 28%)', borderColor: 'hsl(0, 70%, 50%)', color: 'hsl(0, 70%, 55%)' }}
                    onClick={() => {
                      setCustomerPhone('');
                      clearSearch();
                      setShowOrderHistory(false);
                    }}
                  >
                    C
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 text-xl font-medium outline-none focus:outline-none"
                    style={{ backgroundColor: 'hsl(220, 22%, 28%)', borderColor: 'hsl(220, 20%, 35%)', color: 'hsl(210, 20%, 90%)' }}
                    onClick={() => handlePhoneChange(customerPhone + '0')}
                  >
                    0
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 text-xl font-medium outline-none focus:outline-none"
                    style={{ backgroundColor: 'hsl(220, 22%, 28%)', borderColor: 'hsl(220, 20%, 35%)', color: 'hsl(210, 20%, 90%)' }}
                    onClick={() => {
                      if (!customerPhone.includes('.')) {
                        handlePhoneChange(customerPhone + '.');
                      }
                    }}
                  >
                    .
                  </Button>
                </div>
                {/* Row 5: Del and OK */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-12 text-base font-medium outline-none focus:outline-none"
                    style={{ backgroundColor: 'hsl(220, 22%, 28%)', borderColor: 'hsl(220, 20%, 35%)', color: 'hsl(210, 20%, 90%)' }}
                    onClick={() => {
                      const newPhone = customerPhone.slice(0, -1);
                      handlePhoneChange(newPhone);
                    }}
                  >
                    ⌫ Del
                  </Button>
                  <Button
                    className="h-12 text-base font-medium outline-none focus:outline-none"
                    style={{ backgroundColor: 'hsl(217, 91%, 60%)', color: '#ffffff' }}
                    onClick={() => {
                      // Close popover and show order history if there are results
                      (document.activeElement as HTMLElement)?.blur();
                      if (customerPhone.length >= 3 && orderHistory.length > 0) {
                        setShowOrderHistory(true);
                      }
                    }}
                  >
                    OK
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Order History Dropdown - Fixed positioned over left panel */}
            {showOrderHistory && (
              <POSOrderHistoryDropdown
                orders={orderHistory}
                isSearching={isSearching}
                onSelectOrder={handleSelectPastOrder}
                onClose={() => setShowOrderHistory(false)}
                rewardPoints={rewardPoints}
              />
            )}
          </div>
          <Input
            placeholder="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-10 text-base w-40"
          />
          
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
          
          {/* Reward Points Badge - show after search when customer has points */}
          {customerPhone.length >= 3 && rewardPoints > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0" style={{ backgroundColor: 'hsl(38, 92%, 50%, 0.15)', border: '1px solid hsl(38, 92%, 50%, 0.3)' }}>
              <Gift className="w-4 h-4" style={{ color: '#d97706' }} />
              <span className="text-sm font-bold" style={{ color: '#d97706' }}>{rewardPoints} pts</span>
            </div>
          )}
          
          {/* Title - right aligned */}
          <div className="flex-1 text-right pr-2">
            <h2 className="text-xl font-bold text-white">{isEditMode ? `Edit Order ${editingOrder?.id}` : 'Create New Order'}</h2>
            {isEditMode && editingOrder && (
              <p className="text-sm text-gray-400">{editingOrder.customerName}</p>
            )}
          </div>
          
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-10 w-10 text-gray-300 hover:text-white hover:bg-gray-700/50">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Menu Selection */}
          <div className="flex-1 flex flex-col" style={{ borderRight: '1px solid hsl(220, 20%, 28%)' }}>

            {/* Category Tabs - Larger for tablet */}
            <div className="flex gap-2 p-3 overflow-x-auto" style={{ borderBottom: '1px solid hsl(220, 20%, 28%)' }}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={cn(
                    "px-5 py-3 rounded-lg text-base font-medium whitespace-nowrap transition-colors",
                    activeCategory === cat.id
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-700"
                  )}
                  style={{ background: activeCategory === cat.id ? undefined : 'hsl(220, 22%, 22%)' }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Pizza Subcategory Tabs */}
            {activeCategory === 'pizza' && (
              <div className="flex gap-2 p-3 overflow-x-auto" style={{ borderBottom: '1px solid hsl(220, 20%, 28%)', background: 'hsl(220, 22%, 18%)' }}>
                {pizzaSubcategories.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubcategory(sub.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-base font-medium whitespace-nowrap transition-colors",
                      activeSubcategory === sub.id
                        ? "bg-blue-500 text-white"
                        : "text-gray-300 border hover:bg-gray-700"
                    )}
                    style={{ background: activeSubcategory === sub.id ? undefined : 'hsl(220, 25%, 20%)', borderColor: 'hsl(220, 20%, 30%)' }}
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
                        className="p-3 rounded-lg text-left transition-colors border-l-4 border-blue-500"
                        style={{ background: 'hsl(220, 25%, 20%)' }}
                      >
                        <div className="flex items-start gap-2">
                          <Gift className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-sm line-clamp-2 leading-tight text-white">{combo.name}</p>
                            {combo.description && (
                              <p className="text-[10px] text-gray-400 line-clamp-2 mt-0.5">{combo.description}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-blue-400 font-bold mt-1.5">${combo.price.toFixed(2)}</p>
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
                    {filteredItems.map(item => {
                      // Remove trailing "PIZZA" from pizza names to save space
                      const displayName = item.category === 'pizza' 
                        ? item.name.replace(/\s+PIZZA$/i, '').replace(/\s+Pizza$/i, '')
                        : item.name;
                      const cardHeight = item.category === 'baked_lasagna' ? 'h-[77px]' : 'h-[66px]';
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemClick(item)}
                          className={cn(
                            "p-1.5 rounded-md text-left transition-colors border-l-2 border-blue-500/50 flex flex-col justify-between text-white",
                            cardHeight
                          )}
                          style={{ background: 'hsl(220, 25%, 20%)' }}
                        >
                          <p className="font-medium text-[11px] uppercase line-clamp-3 leading-tight">{displayName}</p>
                          <p className="text-xs text-blue-400 font-bold mt-0.5">
                            ${(item.sizes?.[0]?.price ?? item.base_price).toFixed(2)}
                            {CUSTOMIZABLE_CATEGORIES.includes(item.category) && (
                              <span className="text-[10px] text-gray-400 font-normal ml-0.5">+</span>
                            )}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Order Summary - Wider for tablet */}
          <div className="w-96 flex flex-col" style={{ background: 'hsl(220, 25%, 16%)' }}>
            {/* Cart Items */}
            <ScrollArea className="flex-1 p-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-lg">
                  Tap items to add to order
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="p-3 rounded-lg" style={{ background: 'hsl(220, 25%, 20%)' }}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-base truncate text-white">{item.name}</p>
                          {item.selectedSize && !item.pizzaCustomization && (
                            <p className="text-sm text-gray-400">{item.selectedSize}</p>
                          )}
                          {item.pizzaCustomization && (
                            <div className="text-sm text-gray-400 space-y-0.5 mt-1">
                              {formatPizzaCustomization(item.pizzaCustomization).map((line, i) => (
                                <p 
                                  key={i} 
                                  className={cn(
                                    line.startsWith('NO:') && 'text-red-400 font-medium',
                                    line.startsWith('+') && 'text-green-400 font-medium',
                                    line.startsWith('Note:') && 'italic'
                                  )}
                                >
                                  {line}
                                </p>
                              ))}
                            </div>
                          )}
                          {item.wingsCustomization && (
                            <p className="text-sm text-gray-400">
                              {item.wingsCustomization.flavor}
                            </p>
                          )}
                        </div>
                        {(item.pizzaCustomization || item.wingsCustomization) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0 text-gray-300 hover:text-white hover:bg-gray-700/50"
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
                            className="h-10 w-10 text-gray-300 hover:text-white hover:bg-gray-700/50"
                            onClick={() => updateQuantity(index, -1)}
                          >
                            <Minus className="w-5 h-5" />
                          </Button>
                          <span className="w-8 text-center text-lg font-medium text-white">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-gray-300 hover:text-white hover:bg-gray-700/50"
                            onClick={() => updateQuantity(index, 1)}
                          >
                            <Plus className="w-5 h-5" />
                          </Button>
                        </div>
                        <span className="text-base font-medium text-white">
                          ${item.totalPrice.toFixed(2)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-red-400 hover:text-red-300 hover:bg-red-900/30"
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

            <Separator style={{ background: 'hsl(220, 20%, 28%)' }} />

            {/* Schedule Order Toggle */}
            {!isEditMode && (
              <div className="px-4 py-2" style={{ borderTop: '1px solid hsl(220, 20%, 28%)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => { setIsScheduled(false); setScheduledDate(''); setScheduledTime(''); }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      !isScheduled ? "bg-blue-600 text-white" : "text-gray-300"
                    )}
                    style={{ background: !isScheduled ? undefined : 'hsl(220, 22%, 22%)' }}
                  >
                    <Clock className="w-4 h-4" />
                    ASAP
                  </button>
                  <button
                    onClick={() => {
                      setIsScheduled(true);
                      if (!scheduledDate) {
                        setScheduledDate(availableScheduleDates[0]?.value || '');
                      }
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isScheduled ? "bg-blue-600 text-white" : "text-gray-300"
                    )}
                    style={{ background: isScheduled ? undefined : 'hsl(220, 22%, 22%)' }}
                  >
                    <CalendarClock className="w-4 h-4" />
                    Schedule
                  </button>
                </div>
                {isScheduled && (
                  <div className="flex gap-2">
                    <Select value={scheduledDate} onValueChange={(v) => { setScheduledDate(v); setScheduledTime(''); }}>
                      <SelectTrigger className="flex-1 h-9 text-sm" style={{ backgroundColor: 'hsl(220, 22%, 22%)', borderColor: 'hsl(220, 20%, 35%)', color: 'hsl(210, 20%, 98%)' }}>
                        <SelectValue placeholder="Date" />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: 'hsl(220, 25%, 18%)', borderColor: 'hsl(220, 20%, 35%)', color: 'hsl(210, 20%, 98%)' }}>
                        {availableScheduleDates.map(d => (
                          <SelectItem key={d.value} value={d.value} className="data-[highlighted]:bg-[hsl(220,22%,28%)] hover:!bg-[hsl(220,22%,28%)]" style={{ color: 'hsl(210, 20%, 98%)', backgroundColor: 'hsl(220, 25%, 18%)' }}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={scheduledTime} onValueChange={setScheduledTime}>
                      <SelectTrigger className="flex-1 h-9 text-sm" style={{ backgroundColor: 'hsl(220, 22%, 22%)', borderColor: 'hsl(220, 20%, 35%)', color: 'hsl(210, 20%, 98%)' }}>
                        <SelectValue placeholder="Time" />
                      </SelectTrigger>
                      <SelectContent style={{ backgroundColor: 'hsl(220, 25%, 18%)', borderColor: 'hsl(220, 20%, 35%)', color: 'hsl(210, 20%, 98%)' }}>
                        {availableScheduleTimes.map(t => (
                          <SelectItem key={t.value} value={t.value} className="data-[highlighted]:bg-[hsl(220,22%,28%)] hover:!bg-[hsl(220,22%,28%)]" style={{ color: 'hsl(210, 20%, 98%)', backgroundColor: 'hsl(220, 25%, 18%)' }}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Order Notes */}
            <div className="p-4" style={{ borderTop: '1px solid hsl(220, 20%, 28%)' }}>
              <Textarea
                placeholder="Order notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-base resize-none h-20"
              />
            </div>

            {/* Coupon, Discount & Redeem Row */}
            <div className="px-4 py-2 space-y-2" style={{ borderTop: '1px solid hsl(220, 20%, 28%)' }}>
              {/* Row 1: Coupon code + Apply + Discount - always visible */}
              <div className="flex gap-2 items-center">
                {appliedCoupon ? (
                  <div className="flex items-center gap-2 flex-1 bg-green-900/30 border border-green-700 rounded px-3 py-1.5">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-300">{appliedCoupon.code}</span>
                    <span className="text-sm text-green-400">-${appliedCoupon.discount.toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearCoupon}
                      className="ml-auto h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      placeholder="Coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="h-9 text-sm flex-1"
                      disabled={!!rewardsApplied}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={!couponCode.trim() || validateCouponMutation.isPending || !!rewardsApplied}
                      className="h-9 px-3 text-green-400 border-green-600 hover:bg-green-900/30"
                    >
                      {validateCouponMutation.isPending ? '...' : 'Apply'}
                    </Button>
                  </>
                )}
                
                {/* Discount with Keypad Popover */}
                <Popover open={showDiscountKeypad} onOpenChange={setShowDiscountKeypad}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 w-24 justify-start text-sm font-normal text-gray-300",
                        appliedCoupon && "opacity-50 cursor-not-allowed"
                      )}
                      disabled={!!appliedCoupon}
                    >
                      {manualDiscount ? `$${manualDiscount}` : 'Discount'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-2" align="end" style={{ backgroundColor: 'hsl(220, 25%, 18%)' }}>
                    <div className="space-y-2">
                      <div className="text-center p-2 rounded text-lg font-bold text-white" style={{ background: 'hsl(220, 22%, 22%)' }}>
                        ${manualDiscount || '0.00'}
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.'].map((key) => (
                          <Button
                            key={key}
                            variant="outline"
                            onClick={() => handleDiscountKeyPress(key)}
                            className={cn(
                              "h-10 text-base font-semibold text-white",
                              key === 'C' && "text-red-400 hover:bg-red-900/30"
                            )}
                            style={{ backgroundColor: 'hsl(220, 22%, 22%)' }}
                          >
                            {key}
                          </Button>
                        ))}
                        <Button
                          variant="outline"
                          onClick={() => handleDiscountKeyPress('DEL')}
                          className="col-span-2 h-10 text-orange-400 hover:bg-orange-900/30"
                          style={{ backgroundColor: 'hsl(220, 22%, 22%)' }}
                        >
                          <Delete className="w-4 h-4 mr-1" />
                          Del
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => setShowDiscountKeypad(false)}
                          className="h-10 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          OK
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Row 2: Redeem Points - only when eligible */}
              {rewardPoints >= REWARD_MIN_POINTS && !rewardsApplied && !appliedCoupon && !isEditMode && (
                <div className="flex gap-2 items-center">
                  <Popover open={showRewardsKeypad} onOpenChange={setShowRewardsKeypad}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 flex-1 text-sm font-medium"
                        style={{ borderColor: '#d97706', color: '#d97706' }}
                      >
                        <Gift className="w-4 h-4 mr-1.5" />
                        Redeem {rewardPoints} pts (${REWARD_MIN_DOLLAR}-${Math.min(availableDollarsFromPoints, REWARD_MAX_DOLLAR)})
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-52 p-2" align="end" style={{ backgroundColor: 'hsl(220, 25%, 18%)' }}>
                      <div className="space-y-2">
                        <div className="text-xs text-center" style={{ color: '#d97706' }}>
                          {rewardPoints} pts • ${REWARD_MIN_DOLLAR}-${Math.min(availableDollarsFromPoints, REWARD_MAX_DOLLAR)} range
                        </div>
                        <div className="text-center p-2 rounded text-lg font-bold text-white" style={{ background: 'hsl(220, 22%, 22%)' }}>
                          ${rewardsInput || '0'}
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.'].map((key) => (
                            <Button
                              key={key}
                              variant="outline"
                              onClick={() => handleRewardsKeyPress(key)}
                              disabled={key === '.'}
                              className={cn(
                                "h-10 text-base font-semibold text-white",
                                key === 'C' && "text-red-400 hover:bg-red-900/30",
                                key === '.' && "opacity-30"
                              )}
                              style={{ backgroundColor: 'hsl(220, 22%, 22%)' }}
                            >
                              {key}
                            </Button>
                          ))}
                          <Button
                            variant="outline"
                            onClick={() => handleRewardsKeyPress('DEL')}
                            className="col-span-2 h-10 text-orange-400 hover:bg-orange-900/30"
                            style={{ backgroundColor: 'hsl(220, 22%, 22%)' }}
                          >
                            <Delete className="w-4 h-4 mr-1" />
                            Del
                          </Button>
                          <Button
                            variant="default"
                            onClick={handleRewardsKeypadApply}
                            className="h-10 text-white"
                            style={{ backgroundColor: '#d97706' }}
                          >
                            OK
                          </Button>
                        </div>
                        {/* Quick apply smart amount */}
                        {canApplyRewards && (
                          <Button
                            variant="outline"
                            className="w-full h-8 text-sm"
                            style={{ borderColor: '#d97706', color: '#d97706' }}
                            onClick={() => handleApplyRewards(smartRedeemDollars)}
                          >
                            Quick: Use ${smartRedeemDollars}
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Applied Rewards Badge */}
            {rewardsApplied && (
              <div className="px-4 py-1.5 flex items-center gap-2" style={{ borderTop: '1px solid hsl(220, 20%, 28%)', background: 'hsl(38, 92%, 50%, 0.08)' }}>
                <Gift className="w-4 h-4" style={{ color: '#d97706' }} />
                <span className="text-sm font-medium flex-1" style={{ color: '#d97706' }}>
                  Rewards: -{rewardsApplied.points} pts (${rewardsApplied.dollarValue.toFixed(2)})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearRewards}
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Totals & Submit */}
            <div className="px-4 py-2 space-y-1" style={{ borderTop: '1px solid hsl(220, 20%, 28%)', background: 'hsl(220, 22%, 18%)' }}>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-400">
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              {rewardsDiscount > 0 && (
                <div className="flex justify-between text-sm" style={{ color: '#d97706' }}>
                  <span>Rewards ({rewardsApplied?.points} pts)</span>
                  <span>-${rewardsDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">GST (5%)</span>
                <span className="text-white">${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-1 text-white">
                <span className="text-white">Total</span>
                <span className="text-blue-400">${total.toFixed(2)}</span>
              </div>
              
              <Button 
                className="w-full mt-2 text-base py-2 h-auto bg-blue-600 hover:bg-blue-700 text-white"
                disabled={cartItems.length === 0 || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? 'Creating...' : (isEditMode ? 'Update Order' : 'Create Order')}
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

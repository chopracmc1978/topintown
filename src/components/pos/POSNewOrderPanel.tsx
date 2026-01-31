import { useState } from 'react';
import { Plus, Minus, Search, X, User, Phone, MapPin, Utensils, Package, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useMenuItems, MenuItem } from '@/hooks/useMenuItems';
import { CartItem, OrderType, OrderSource } from '@/types/menu';
import { cn } from '@/lib/utils';

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
}

const categories = [
  { id: 'pizza', label: 'Pizzas' },
  { id: 'chicken_wings', label: 'Chicken Wings' },
  { id: 'baked_lasagna', label: 'Baked Lasagna' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'dipping_sauce', label: 'Dipping Sauces' },
] as const;

export const POSNewOrderPanel = ({ onCreateOrder, onCancel }: POSNewOrderPanelProps) => {
  const { data: menuItems = [], isLoading } = useMenuItems();
  const [activeCategory, setActiveCategory] = useState<string>('pizza');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('pickup');
  const [source, setSource] = useState<OrderSource>('walk-in');
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = item.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.is_available;
  });

  const addToCart = (menuItem: MenuItem) => {
    const basePrice = menuItem.sizes?.[0]?.price ?? menuItem.base_price;
    const sizeName = menuItem.sizes?.[0]?.name;

    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        item => item.id === menuItem.id && item.selectedSize === sizeName
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
        totalPrice: newQty * updated[index].price,
      };
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleSubmit = () => {
    if (cartItems.length === 0) return;

    onCreateOrder({
      items: cartItems,
      customerName: customerName || 'Walk-in Customer',
      customerPhone,
      customerAddress,
      orderType,
      source,
      tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div className="h-full flex flex-col bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="bg-secondary/50 p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-xl font-bold">New Order</h2>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Menu Selection */}
        <div className="flex-1 flex flex-col border-r border-border">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <ScrollArea className="flex-1 p-3">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading menu...</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="p-3 bg-secondary/50 rounded-lg text-left hover:bg-secondary transition-colors"
                  >
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-sm text-primary font-bold">
                      ${(item.sizes?.[0]?.price ?? item.base_price).toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Order Summary */}
        <div className="w-80 flex flex-col">
          {/* Cart Items */}
          <ScrollArea className="flex-1 p-3">
            {cartItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tap items to add to order
              </div>
            ) : (
              <div className="space-y-2">
                {cartItems.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center gap-2 p-2 bg-secondary/30 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      {item.selectedSize && (
                        <p className="text-xs text-muted-foreground">{item.selectedSize}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(index, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => updateQuantity(index, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      ${item.totalPrice.toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeItem(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <Separator />

          {/* Customer & Order Type */}
          <div className="p-3 space-y-3 border-t border-border">
            {/* Order Type */}
            <div>
              <Label className="text-xs text-muted-foreground">Order Type</Label>
              <div className="flex gap-1 mt-1">
                {[
                  { value: 'pickup', icon: Package, label: 'Pickup' },
                  { value: 'delivery', icon: Truck, label: 'Delivery' },
                  { value: 'dine-in', icon: Utensils, label: 'Dine-in' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setOrderType(opt.value as OrderType)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors",
                      orderType === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    <opt.icon className="w-3 h-3" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Number for Dine-in */}
            {orderType === 'dine-in' && (
              <Input
                placeholder="Table #"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="h-8 text-sm"
              />
            )}

            {/* Customer Info */}
            <Input
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Phone number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="h-8 text-sm"
            />
            
            {orderType === 'delivery' && (
              <Input
                placeholder="Delivery address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="h-8 text-sm"
              />
            )}

            <Textarea
              placeholder="Order notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm resize-none h-16"
            />
          </div>

          {/* Totals & Submit */}
          <div className="p-3 border-t border-border bg-secondary/30 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
            
            <Button 
              variant="pizza" 
              className="w-full mt-2"
              disabled={cartItems.length === 0}
              onClick={handleSubmit}
            >
              Create Order
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

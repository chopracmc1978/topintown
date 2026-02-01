import { useState } from 'react';
import { Plus, Minus, Search, X, Utensils, Package, Truck, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useMenuItems, MenuItem } from '@/hooks/useMenuItems';
import { CartItem, OrderType, OrderSource, CartPizzaCustomization } from '@/types/menu';
import { cn } from '@/lib/utils';
import { POSPizzaModal } from '@/components/pos/POSPizzaModal';
import { POSWingsModal } from '@/components/pos/POSWingsModal';

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
  
  // Spicy - only if not 'none'
  const left = customization.spicyLevel?.left;
  const right = customization.spicyLevel?.right;
  if (left || right) {
    if (left === right && left !== 'none') {
      details.push(`Whole ${left}`);
    } else {
      const parts: string[] = [];
      if (left && left !== 'none') parts.push(`L:${left}`);
      if (right && right !== 'none') parts.push(`R:${right}`);
      if (parts.length) details.push(parts.join(' '));
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
}

const categories = [
  { id: 'pizza', label: 'Pizzas' },
  { id: 'chicken_wings', label: 'Chicken Wings' },
  { id: 'baked_lasagna', label: 'Baked Lasagna' },
  { id: 'drinks', label: 'Drinks' },
  { id: 'dipping_sauce', label: 'Dipping Sauces' },
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

export const POSNewOrderPanel = ({ onCreateOrder, onCancel }: POSNewOrderPanelProps) => {
  const { data: menuItems = [], isLoading } = useMenuItems();
  const [activeCategory, setActiveCategory] = useState<string>('pizza');
  const [activeSubcategory, setActiveSubcategory] = useState<string>('vegetarian');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  
  // Customization modal state
  const [selectedPizzaItem, setSelectedPizzaItem] = useState<MenuItem | null>(null);
  const [selectedWingsItem, setSelectedWingsItem] = useState<MenuItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);
  
  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('pickup');
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');

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
      source: 'walk-in',
      tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <>
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
                  onClick={() => handleCategoryChange(cat.id)}
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

            {/* Pizza Subcategory Tabs */}
            {activeCategory === 'pizza' && (
              <div className="flex gap-1 p-2 border-b border-border overflow-x-auto bg-secondary/20">
                {pizzaSubcategories.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubcategory(sub.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
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

            {/* Menu Items Grid - 3 columns, no scroll */}
            <div className="flex-1 p-3 overflow-hidden">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading menu...</div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No items found</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {filteredItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="p-2 bg-secondary/30 rounded-lg text-left hover:bg-secondary transition-colors border-l-4 border-primary/30"
                    >
                      <p className="font-medium text-xs uppercase line-clamp-2 leading-tight">{item.name}</p>
                      <p className="text-xs text-primary font-bold">
                        ${(item.sizes?.[0]?.price ?? item.base_price).toFixed(2)}
                        {CUSTOMIZABLE_CATEGORIES.includes(item.category) && (
                          <span className="text-[10px] text-muted-foreground font-normal ml-1">+</span>
                        )}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                    <div key={`${item.id}-${index}`} className="p-2 bg-secondary/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.name}</p>
                          {item.selectedSize && !item.pizzaCustomization && (
                            <p className="text-xs text-muted-foreground">{item.selectedSize}</p>
                          )}
                          {item.pizzaCustomization && (
                            <div className="text-xs text-muted-foreground space-y-0.5 mt-0.5">
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
                            <p className="text-xs text-muted-foreground">
                              {item.wingsCustomization.flavor}
                            </p>
                          )}
                        </div>
                        {(item.pizzaCustomization || item.wingsCustomization) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => handleEditItem(item, index)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
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
                        <span className="text-sm font-medium">
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
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <Separator />

            {/* Customer Info */}
            <div className="p-3 space-y-3 border-t border-border">
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
    </>
  );
};

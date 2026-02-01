import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { CartItem, MenuItem, CartPizzaCustomization, CartWingsCustomization } from '@/types/menu';

interface CartContextType {
  items: CartItem[];
  addToCart: (item: MenuItem, size?: string) => void;
  addCustomizedPizza: (item: MenuItem, customization: CartPizzaCustomization, totalPrice: number) => void;
  updateCustomizedPizza: (cartItemId: string, item: MenuItem, customization: CartPizzaCustomization, totalPrice: number) => void;
  addWingsToCart: (item: MenuItem, flavor: string) => void;
  updateWingsInCart: (cartItemId: string, item: MenuItem, flavor: string) => void;
  removeFromCart: (itemId: string, size?: string) => void;
  updateQuantity: (itemId: string, quantity: number, size?: string) => void;
  clearCart: () => void;
  setCartItems: (items: CartItem[]) => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // Check for repeat order items on mount and on storage events
  const checkRepeatOrderItems = useCallback(() => {
    const repeatOrderItems = localStorage.getItem('repeat_order_items');
    if (repeatOrderItems) {
      try {
        const parsedItems = JSON.parse(repeatOrderItems);
        setItems(parsedItems);
        localStorage.removeItem('repeat_order_items');
      } catch (error) {
        console.error('Error parsing repeat order items:', error);
        localStorage.removeItem('repeat_order_items');
      }
    }
  }, []);

  useEffect(() => {
    checkRepeatOrderItems();

    // Also check when the component receives focus (navigating back)
    const handleFocus = () => {
      checkRepeatOrderItems();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkRepeatOrderItems]);

  // Also check periodically for repeat order items (for navigation within same tab)
  useEffect(() => {
    const interval = setInterval(() => {
      const repeatOrderItems = localStorage.getItem('repeat_order_items');
      if (repeatOrderItems) {
        checkRepeatOrderItems();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [checkRepeatOrderItems]);

  const addToCart = (item: MenuItem, size?: string) => {
    setItems((prev) => {
      const existingItem = prev.find(
        (i) => i.id === item.id && i.selectedSize === size && !i.pizzaCustomization
      );

      const itemPrice = size
        ? item.sizes?.find((s) => s.name === size)?.price || item.price
        : item.price;

      if (existingItem) {
        return prev.map((i) =>
          i.id === item.id && i.selectedSize === size && !i.pizzaCustomization
            ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * itemPrice }
            : i
        );
      }

      return [
        ...prev,
        {
          ...item,
          quantity: 1,
          selectedSize: size,
          totalPrice: itemPrice,
        },
      ];
    });
  };

  const addCustomizedPizza = (item: MenuItem, customization: CartPizzaCustomization, totalPrice: number) => {
    const cartItemId = `${item.id}-${Date.now()}`;
    setItems((prev) => [
      ...prev,
      {
        id: cartItemId,
        name: item.name,
        description: `${customization.size.name}, ${customization.crust.name}`,
        price: totalPrice,
        image: item.image,
        category: 'pizza' as const,
        popular: item.popular,
        quantity: 1,
        totalPrice: totalPrice,
        pizzaCustomization: customization,
      },
    ]);
  };

  const updateCustomizedPizza = (cartItemId: string, item: MenuItem, customization: CartPizzaCustomization, totalPrice: number) => {
    setItems((prev) => prev.map((i) => 
      i.id === cartItemId 
        ? {
            ...i,
            name: item.name,
            description: `${customization.size.name}, ${customization.crust.name}`,
            price: totalPrice,
            totalPrice: totalPrice * i.quantity,
            pizzaCustomization: customization,
          }
        : i
    ));
  };

  const addWingsToCart = (item: MenuItem, flavor: string) => {
    const cartItemId = `${item.id}-${flavor}-${Date.now()}`;
    setItems((prev) => [
      ...prev,
      {
        id: cartItemId,
        name: item.name,
        description: `Flavor: ${flavor}`,
        price: item.price,
        image: item.image,
        category: item.category,
        popular: item.popular,
        quantity: 1,
        totalPrice: item.price,
        wingsCustomization: { flavor, originalItemId: item.id },
      },
    ]);
  };

  const updateWingsInCart = (cartItemId: string, item: MenuItem, flavor: string) => {
    setItems((prev) => prev.map((i) => 
      i.id === cartItemId 
        ? {
            ...i,
            name: item.name,
            description: `Flavor: ${flavor}`,
            wingsCustomization: { flavor, originalItemId: item.id },
          }
        : i
    ));
  };

  const removeFromCart = (itemId: string, size?: string) => {
    setItems((prev) => prev.filter((i) => !(i.id === itemId && i.selectedSize === size)));
  };

  const updateQuantity = (itemId: string, quantity: number, size?: string) => {
    if (quantity <= 0) {
      removeFromCart(itemId, size);
      return;
    }

    setItems((prev) =>
      prev.map((i) => {
        if (i.id === itemId && (i.selectedSize === size || i.pizzaCustomization)) {
          const itemPrice = i.pizzaCustomization 
            ? i.price 
            : (size ? i.sizes?.find((s) => s.name === size)?.price || i.price : i.price);
          return { ...i, quantity, totalPrice: quantity * itemPrice };
        }
        return i;
      })
    );
  };

  const clearCart = () => setItems([]);
  
  const setCartItems = (newItems: CartItem[]) => setItems(newItems);

  const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, addCustomizedPizza, updateCustomizedPizza, addWingsToCart, updateWingsInCart, removeFromCart, updateQuantity, clearCart, setCartItems, total, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

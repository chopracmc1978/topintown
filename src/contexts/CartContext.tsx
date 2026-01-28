import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, MenuItem, CartPizzaCustomization } from '@/types/menu';

interface CartContextType {
  items: CartItem[];
  addToCart: (item: MenuItem, size?: string) => void;
  addCustomizedPizza: (item: MenuItem, customization: CartPizzaCustomization, totalPrice: number) => void;
  updateCustomizedPizza: (cartItemId: string, item: MenuItem, customization: CartPizzaCustomization, totalPrice: number) => void;
  removeFromCart: (itemId: string, size?: string) => void;
  updateQuantity: (itemId: string, quantity: number, size?: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

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

  const total = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addToCart, addCustomizedPizza, updateCustomizedPizza, removeFromCart, updateQuantity, clearCart, total, itemCount }}
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

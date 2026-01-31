import type { PizzaCustomization, SelectedTopping, SelectedFreeTopping, SideSpicyLevel } from './pizzaCustomization';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: 'pizza' | 'sides' | 'drinks' | 'desserts' | 'dipping_sauce' | 'chicken_wings' | 'baked_lasagna';
  sizes?: { name: string; price: number }[];
  popular?: boolean;
}

// Extended pizza customization for cart storage
export interface CartPizzaCustomization {
  size: { id: string; name: string; price: number };
  crust: { id: string; name: string; price: number };
  cheeseType: string;
  cheeseSides: { side: string; quantity: string }[];
  sauceId: string | null;
  sauceName: string;
  sauceQuantity: 'normal' | 'extra';
  freeToppings: string[];
  spicyLevel: SideSpicyLevel;
  defaultToppings: SelectedTopping[];
  extraToppings: SelectedTopping[];
  note: string;
  extraAmount?: number; // Extra charge for special requests
  originalItemId: string; // Original menu item ID for re-editing
}

export interface CartWingsCustomization {
  flavor: string;
  originalItemId: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: string;
  totalPrice: number;
  pizzaCustomization?: CartPizzaCustomization;
  wingsCustomization?: CartWingsCustomization;
}

export type OrderType = 'pickup' | 'delivery' | 'dine-in';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'online';
export type OrderSource = 'online' | 'phone' | 'walk-in';

export interface Order {
  id: string;
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  orderType: OrderType;
  status: OrderStatus;
  total: number;
  subtotal: number;
  tax: number;
  createdAt: Date;
  notes?: string;
  // New POS fields
  source: OrderSource;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  tableNumber?: string;
  estimatedReadyTime?: Date;
}

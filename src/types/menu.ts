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
  originalItemId: string; // Original menu item ID for re-editing
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: string;
  totalPrice: number;
  pizzaCustomization?: CartPizzaCustomization;
  wingsCustomization?: CartWingsCustomization;
}

export interface CartWingsCustomization {
  flavor: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  orderType: 'delivery' | 'pickup';
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  total: number;
  createdAt: Date;
  notes?: string;
}

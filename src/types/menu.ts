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
  sauceQuantity: 'less' | 'normal' | 'extra';
  isDefaultSauce?: boolean;
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

export interface ComboSelectionItem {
  itemType: string;
  itemName: string;
  flavor?: string;
  pizzaCustomization?: CartPizzaCustomization;
  extraCharge: number;
}

export interface CartComboCustomization {
  comboId: string;
  comboName: string;
  comboBasePrice: number;
  selections: ComboSelectionItem[];
  totalExtraCharge: number;
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: string;
  totalPrice: number;
  pizzaCustomization?: CartPizzaCustomization;
  wingsCustomization?: CartWingsCustomization;
  comboCustomization?: CartComboCustomization;
}

export type OrderType = 'pickup' | 'delivery' | 'dine-in';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'online' | 'points' | 'split';
export type OrderSource = 'web' | 'app' | 'online' | 'phone' | 'walk-in';

export interface Order {
  id: string;
  dbId?: string; // The actual database UUID (id field may contain order_number for display)
  items: CartItem[];
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerId?: string; // For linking to verified customer record
  orderType: OrderType;
  status: OrderStatus;
  total: number;
  subtotal: number;
  tax: number;
   discount?: number;
   couponCode?: string;
  createdAt: Date;
  updatedAt?: Date;
  notes?: string;
  // New POS fields
  source: OrderSource;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  tableNumber?: string;
  estimatedReadyTime?: Date;
  pickupTime?: Date; // Scheduled pickup time for advance orders
   amountPaid?: number; // Track how much has been paid for partial payments
   cashAmount?: number; // Cash portion of split payment
   cardAmount?: number; // Card portion of split payment
}

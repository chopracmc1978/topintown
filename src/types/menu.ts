export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: 'pizza' | 'sides' | 'drinks' | 'desserts';
  sizes?: { name: string; price: number }[];
  popular?: boolean;
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedSize?: string;
  totalPrice: number;
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

import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { CustomerOrder, OrderItem } from './useCustomerOrders';
import { CartItem, CartPizzaCustomization } from '@/types/menu';

export const useRepeatOrder = () => {
  const { clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const repeatOrder = (order: CustomerOrder, setItems: React.Dispatch<React.SetStateAction<CartItem[]>>) => {
    // Clear current cart first
    clearCart();

    // Convert order items to cart items
    const cartItems: CartItem[] = order.items.map((item) => {
      const baseItem: CartItem = {
        id: `${item.id}-${Date.now()}-${Math.random()}`,
        name: item.name,
        description: '',
        price: item.unitPrice,
        image: '',
        category: 'pizza' as const,
        popular: false,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
      };

      // Check if item has pizza customization
      if (item.customizations?.size || item.customizations?.crust) {
        baseItem.pizzaCustomization = item.customizations as CartPizzaCustomization;
        baseItem.description = `${item.customizations.size?.name || ''}, ${item.customizations.crust?.name || ''}`.trim();
      }

      // Check if item has wings customization
      if (item.customizations?.flavor) {
        baseItem.wingsCustomization = {
          flavor: item.customizations.flavor,
          originalItemId: item.customizations.originalItemId || item.id,
        };
        baseItem.description = `Flavor: ${item.customizations.flavor}`;
      }

      return baseItem;
    });

    // Add items to cart by updating state directly
    setItems(cartItems);

    toast({
      title: 'Order Added to Cart',
      description: `${order.items.length} items from order #${order.orderNumber} added to your cart.`,
    });

    navigate('/cart');
  };

  return { repeatOrder };
};

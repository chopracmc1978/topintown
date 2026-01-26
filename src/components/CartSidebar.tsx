import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';

const CartSidebar = () => {
  const { items, updateQuantity, removeFromCart, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <ShoppingBag className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h3 className="font-serif text-xl font-semibold text-foreground mb-2">Your cart is empty</h3>
        <p className="text-muted-foreground mb-6">Add some delicious pizza to get started!</p>
        <Link to="/menu">
          <Button variant="pizza">Browse Menu</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {items.map((item) => (
          <div
            key={`${item.id}-${item.selectedSize}`}
            className="flex gap-4 p-4 bg-secondary/50 rounded-lg"
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate">{item.name}</h4>
              {item.selectedSize && (
                <p className="text-sm text-muted-foreground">{item.selectedSize}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedSize)}
                    className="w-7 h-7 rounded-full bg-background flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-medium w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize)}
                    className="w-7 h-7 rounded-full bg-background flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => removeFromCart(item.id, item.selectedSize)}
                  className="text-destructive hover:text-destructive/80 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-primary font-bold mt-1">${item.totalPrice.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Subtotal</span>
          <span className="text-primary">${total.toFixed(2)}</span>
        </div>
        <Link to="/checkout" className="block">
          <Button variant="pizza" className="w-full" size="lg">
            Proceed to Checkout
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default CartSidebar;

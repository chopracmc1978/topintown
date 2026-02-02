import { Link } from 'react-router-dom';
import { ShoppingCart, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LocationSelector from '@/components/LocationSelector';
import { useCart } from '@/contexts/CartContext';

const MenuLocationBar = () => {
  const { items } = useCart();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bg-muted/30 border-b border-border py-3 sticky top-16 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-4">
          <LocationSelector />
          
          <div className="flex items-center gap-2">
            <Link to="/customer-login">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <User className="w-5 h-5" />
              </Button>
            </Link>
            
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                    {itemCount}
                  </span>
                )}
              </Button>
            </Link>
            
            <Link to="/menu">
              <Button 
                className="bg-gradient-to-r from-primary to-red-700 hover:from-primary/90 hover:to-red-700/90 text-white font-semibold px-6 rounded-full"
              >
                Order Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuLocationBar;

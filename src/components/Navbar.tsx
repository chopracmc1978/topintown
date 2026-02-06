import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useCustomer } from '@/contexts/CustomerContext';
import { useLocation as useLocationContext, LOCATIONS } from '@/contexts/LocationContext';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import LocationSelector from '@/components/LocationSelector';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const { itemCount } = useCart();
  const { customer } = useCustomer();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedLocation, setSelectedLocation } = useLocationContext();

  const accountHref = customer
    ? "/my-orders"
    : location.pathname === "/checkout"
      ? "/customer-login?redirect=/checkout"
      : "/customer-login";
  const navLinks = [{
    name: 'Home',
    path: '/'
  }, {
    name: 'Menu',
    path: '/menu'
  }, {
    name: 'About',
    path: '/about'
  }, {
    name: 'Contact',
    path: '/contact'
  }];
  const isActive = (path: string) => location.pathname === path;

  const handleOrderNowClick = () => {
    // Always show location selection modal first
    setShowLocationModal(true);
  };

  const handleLocationSelect = (loc: typeof LOCATIONS[0]) => {
    setSelectedLocation(loc);
    setShowLocationModal(false);
    navigate('/menu');
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <img 
                src={logo} 
                alt="Top In Town Pizza" 
                className="h-12 w-auto group-hover:scale-105 transition-transform"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map(link => <Link key={link.path} to={link.path} className={cn("text-sm font-medium transition-colors hover:text-primary", isActive(link.path) ? "text-primary" : "text-muted-foreground")}>
                  {link.name}
                </Link>)}
            </div>

            {/* Desktop Right Section */}
            <div className="hidden md:flex items-center gap-3">
              <LocationSelector />
              
              <Link to={accountHref}>
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
              
              <Button 
                onClick={handleOrderNowClick}
                className="bg-brand-blue hover:bg-brand-blue-dark text-primary-foreground font-semibold px-6 rounded-full shadow-md"
              >
                Order Now
              </Button>
            </div>


            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <Link to="/cart" className="relative">
                <Button variant="ghost" size="icon">
                  <ShoppingCart className="w-5 h-5" />
                  {itemCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">
                      {itemCount}
                    </span>}
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isOpen && <div className="md:hidden py-4 border-t border-border animate-slide-up">
              <div className="flex flex-col gap-4">
                <LocationSelector className="w-full justify-between" />
                {navLinks.map(link => <Link key={link.path} to={link.path} onClick={() => setIsOpen(false)} className={cn("text-sm font-medium py-2 transition-colors", isActive(link.path) ? "text-primary" : "text-muted-foreground")}>
                    {link.name}
                  </Link>)}
                <Link to={accountHref} onClick={() => setIsOpen(false)} className={cn("text-sm font-medium py-2 transition-colors flex items-center gap-2", isActive('/my-orders') || isActive('/customer-login') ? "text-primary" : "text-muted-foreground")}>
                  <User className="w-4 h-4" />
                  {customer ? "My Orders" : "Login"}
                </Link>
                <Button 
                  onClick={() => {
                    setIsOpen(false);
                    handleOrderNowClick();
                  }}
                  className="w-full bg-brand-blue hover:bg-brand-blue-dark text-primary-foreground font-semibold"
                >
                  Order Now
                </Button>
              </div>
            </div>}
        </div>
      </nav>

      {/* Location Selection Modal */}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-serif">
              Select Your Location
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {LOCATIONS.map((loc) => (
              <button
                key={loc.id}
                onClick={() => handleLocationSelect(loc)}
                className={cn(
                  "w-full p-4 rounded-lg border-2 transition-all text-left",
                  selectedLocation.id === loc.id 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-foreground">{loc.name}</div>
                    <div className="text-sm text-muted-foreground">{loc.address}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
export default Navbar;
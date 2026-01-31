import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import LocationSelector from '@/components/LocationSelector';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    itemCount
  } = useCart();
  const location = useLocation();
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
  return <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
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
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => <Link key={link.path} to={link.path} className={cn("text-sm font-medium transition-colors hover:text-primary", isActive(link.path) ? "text-primary" : "text-muted-foreground")}>
                {link.name}
              </Link>)}
          </div>

          {/* Location Selector, Cart & Order Button */}
          <div className="hidden md:flex items-center gap-4">
            <LocationSelector />
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">
                    {itemCount}
                  </span>}
              </Button>
            </Link>
            <Link to="/menu">
              <Button variant="pizza">Order Now</Button>
            </Link>
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
              <Link to="/menu" onClick={() => setIsOpen(false)}>
                <Button variant="pizza" className="w-full">Order Now</Button>
              </Link>
            </div>
          </div>}
      </div>
    </nav>;
};
export default Navbar;
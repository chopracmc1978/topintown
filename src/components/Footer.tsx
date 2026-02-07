import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Instagram, Facebook, Twitter } from 'lucide-react';
import logo from '@/assets/logo.png';

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <img 
              src={logo} 
              alt="Top In Town Pizza" 
              className="h-16 w-auto"
            />
            <p className="text-sm text-background/70">
              Authentic Italian pizza made with love, fresh ingredients, and generations of tradition.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/menu" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Our Menu
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-background/70 hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/pos" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Staff Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-serif text-lg font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-background/70">
                <MapPin className="w-4 h-4 mt-0.5 text-primary" />
                <span>3250 60 ST NE<br />Calgary, AB T1Y 3T5</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-background/70">
                <MapPin className="w-4 h-4 mt-0.5 text-primary" />
                <span>272 Kinniburgh Blvd unit 103<br />Chestermere, AB T1X 0V8</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-background/70">
                <Phone className="w-4 h-4 text-primary" />
                <span>Calgary: (403) 280-7373 ext 1</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-background/70">
                <Phone className="w-4 h-4 text-primary" />
                <span>Chestermere: (403) 280-7373 ext 2</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-serif text-lg font-semibold mb-4">Hours</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-background/70">
                <Clock className="w-4 h-4 text-primary" />
                <span>Mon - Thu: 11:15am - 10:30pm</span>
              </li>
              <li className="text-sm text-background/70 pl-6">Fri - Sat: 11:15am - 11pm</li>
              <li className="text-sm text-background/70 pl-6">Sunday: 12pm - 10:30pm</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 mt-8 pt-8 text-center text-sm text-background/50">
          <p>&copy; {new Date().getFullYear()} Top In Town Pizza. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

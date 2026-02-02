import { Link } from 'react-router-dom';
import { MapPin, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StartOrderBar = () => {
  return (
    <section className="bg-amber-50 border-b-2 border-amber-200 py-4 sticky top-16 z-40">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <h2 className="font-serif text-xl md:text-2xl font-bold text-gray-800">
            Start Your Order
          </h2>
          
          <div className="flex items-center gap-3">
            <Link to="/menu">
              <Button 
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3 rounded-full shadow-md flex items-center gap-2"
              >
                <MapPin className="w-5 h-5" />
                Delivery
              </Button>
            </Link>
            
            <span className="text-gray-500 font-medium">or</span>
            
            <Link to="/menu">
              <Button 
                size="lg"
                variant="outline"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-white font-bold px-8 py-3 rounded-full shadow-md flex items-center gap-2"
              >
                <ShoppingBag className="w-5 h-5" />
                Pickup
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StartOrderBar;

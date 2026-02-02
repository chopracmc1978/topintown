import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLocation, LOCATIONS } from '@/contexts/LocationContext';

const HeroSection = () => {
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const { setSelectedLocation } = useLocation();
  const navigate = useNavigate();

  const handleLocationSelect = (location: typeof LOCATIONS[0]) => {
    setSelectedLocation(location);
    setShowLocationDialog(false);
    navigate('/menu');
  };

  return (
    <section className="relative bg-white overflow-hidden">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Left Content */}
          <div className="lg:w-1/2 text-center lg:text-left">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl italic text-[#2596be] leading-tight mb-4">
              Enjoy Our Delicious Food
            </h1>
            <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto lg:mx-0">
              Top in town is all-Canadian pizza quick-service restaurant that is located in Calgary, Alberta.
            </p>
            <Button 
              onClick={() => setShowLocationDialog(true)}
              size="lg"
              className="bg-[#5CACDB] hover:bg-[#4a9bc9] text-white font-semibold px-8 py-6 rounded-full shadow-lg text-base"
            >
              Order Now
            </Button>
          </div>

          {/* Right - Pizza Image */}
          <div className="lg:w-1/2">
            <img 
              src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80"
              alt="Delicious pizza with fresh ingredients"
              className="w-full max-w-lg mx-auto rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Location Selection Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Select Your Location</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {LOCATIONS.map((location) => (
              <button
                key={location.id}
                onClick={() => handleLocationSelect(location)}
                className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">{location.shortName}</p>
                  <p className="text-sm text-muted-foreground">{location.address}</p>
                  <p className="text-sm text-primary mt-1">{location.phone}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default HeroSection;

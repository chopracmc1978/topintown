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
import heroBanner from '@/assets/hero-banner.png';

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
    <section className="relative overflow-hidden">
      {/* Hero Banner Image */}
      <img 
        src={heroBanner}
        alt="Enjoy Our Delicious Food - Top In Town Pizza"
        className="w-full h-auto object-cover"
      />
      
      {/* Order Now Button - positioned over the image */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[8%] sm:bottom-[10%] md:bottom-[12%]">
        <Button 
          onClick={() => setShowLocationDialog(true)}
          size="lg"
          className="bg-[#5CACDB] hover:bg-[#4a9bc9] text-white font-semibold px-4 sm:px-8 py-1.5 sm:py-3 rounded-full shadow-lg text-xs sm:text-base hover:scale-105 transition-transform"
        >
          Order Now
        </Button>
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

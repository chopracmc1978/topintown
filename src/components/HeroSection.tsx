import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocation, LOCATIONS } from '@/contexts/LocationContext';
import heroBanner from '@/assets/hero-slide-2.png';

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
      <img 
        src={heroBanner}
        alt="Enjoy Our Delicious Food - Top In Town Pizza"
        className="w-full h-auto object-cover"
      />
      
      {/* Clickable overlay for Order Now button - positioned over the button in the image */}
      <button
        onClick={() => setShowLocationDialog(true)}
        className="absolute left-1/2 -translate-x-1/2 bottom-[20%] md:bottom-[25%] w-32 md:w-40 h-10 md:h-12 cursor-pointer hover:scale-105 transition-transform"
        aria-label="Order Now"
      />

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

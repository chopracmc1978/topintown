import { MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from '@/contexts/LocationContext';
import { useNavigate } from 'react-router-dom';

const LocationsSection = () => {
  const { locations, setSelectedLocation } = useLocation();
  const navigate = useNavigate();

  const handleOrderNow = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    if (location) {
      setSelectedLocation(location);
    }
    navigate('/menu');
  };

  return (
    <section 
      className="py-20 bg-cover bg-center bg-fixed relative"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.7)), url('https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1920&q=80')`
      }}
    >
      <div className="container mx-auto px-4 relative z-10">
        <h2 className="font-serif text-4xl md:text-5xl font-bold text-white text-center mb-12">
          Our Locations
        </h2>
        
        <div className={`grid gap-8 max-w-5xl mx-auto ${locations.length <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {locations.map((loc) => (
            <div 
              key={loc.id}
              className="text-center text-white"
            >
              {loc.image_url ? (
                <div className="w-32 h-32 rounded-full mx-auto mb-4 overflow-hidden border-4 border-primary">
                  <img src={loc.image_url} alt={loc.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-primary-foreground" />
                </div>
              )}
              <h3 className="font-serif text-xl font-bold mb-3">{loc.shortName}</h3>
              <p className="text-white/80 mb-2">{loc.address}</p>
              <p className="text-white/80 mb-6 flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />
                {loc.phone}
              </p>
              <Button 
                variant="default"
                className="bg-primary hover:bg-primary/90"
                onClick={() => handleOrderNow(loc.id)}
              >
                Order Now
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LocationsSection;

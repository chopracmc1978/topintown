import { MapPin, Star } from 'lucide-react';
import { useLocation } from '@/contexts/LocationContext';
import { useNavigate } from 'react-router-dom';
import { useIsLocationOpen } from '@/hooks/useLocationHours';

const LocationCard = ({ loc, onOrder }: { loc: any; onOrder: () => void }) => {
  const { checkIfOpen } = useIsLocationOpen(loc.id);
  const { isOpen } = checkIfOpen();

  return (
    <div 
      className="bg-card rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow border border-border"
      onClick={onOrder}
    >
      {/* Image area */}
      <div className="relative h-48 bg-muted">
        {loc.image_url ? (
          <img src={loc.image_url} alt={loc.shortName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <MapPin className="w-12 h-12 text-primary/40" />
          </div>
        )}
        {/* Open Now badge */}
        <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}>
          {isOpen ? 'Open Now' : 'Closed'}
        </span>
      </div>

      {/* Info area */}
      <div className="p-4">
        <h3 className="font-serif text-lg font-bold text-foreground mb-2">{loc.shortName}</h3>
        <div className="flex items-start gap-1.5 text-muted-foreground text-sm mb-2">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{loc.address}</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold text-foreground text-sm">4.7</span>
        </div>
      </div>
    </div>
  );
};

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
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <p className="text-center text-muted-foreground text-sm tracking-widest uppercase mb-2">Visit Us</p>
        <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground text-center mb-10">
          Our Locations
        </h2>
        
        <div className={`grid gap-6 max-w-5xl mx-auto ${locations.length <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {locations.map((loc) => (
            <LocationCard 
              key={loc.id} 
              loc={loc} 
              onOrder={() => handleOrderNow(loc.id)} 
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default LocationsSection;

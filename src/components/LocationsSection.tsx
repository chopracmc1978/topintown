import { MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const locations = [
  {
    name: 'CALGARY LOCATION',
    address: '3250 60 ST NE, CALGARY, AB T1Y 3T5',
    phone: '(403) 280-7373 ext 1',
    orderLink: '/menu',
  },
  {
    name: 'CHESTERMERE LOCATION',
    address: '272 Kinniburgh Blvd unit 103, Chestermere, AB T1X 0V8, Canada',
    phone: '(403) 280-7373 ext 2',
    orderLink: '/menu',
  },
];

const LocationsSection = () => {
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
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {locations.map((location) => (
            <div 
              key={location.name}
              className="text-center text-white"
            >
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">{location.name}</h3>
              <p className="text-white/80 mb-2">{location.address}</p>
              <p className="text-white/80 mb-6 flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />
                {location.phone}
              </p>
              <Button 
                variant="default"
                className="bg-primary hover:bg-primary/90"
                asChild
              >
                <a href={location.orderLink}>Order Now</a>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LocationsSection;

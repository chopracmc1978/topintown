import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useActivePromotions, Promotion, isPromotionActiveToday } from '@/hooks/usePromotions';
import { useLocation, LOCATIONS } from '@/contexts/LocationContext';

const ComboDeals = () => {
  const { data: promotions, isLoading } = useActivePromotions();
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const { setSelectedLocation } = useLocation();
  const navigate = useNavigate();

  const handleLocationSelect = (location: typeof LOCATIONS[0]) => {
    setSelectedLocation(location);
    setShowLocationDialog(false);
    navigate('/menu');
  };

  const handleOrderClick = (e: React.MouseEvent, promo: Promotion) => {
    if (promo.show_order_button) {
      e.preventDefault();
      setShowLocationDialog(true);
    }
  };

  if (isLoading) {
    return (
      <section className="py-8 bg-amber-50/50">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-96 bg-gray-200 rounded-2xl" />
            <div className="h-24 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      </section>
    );
  }

  if (!promotions || promotions.length === 0) {
    return null;
  }

  // Filter promotions that are active today based on schedule
  const activeToday = promotions.filter(isPromotionActiveToday);

  if (activeToday.length === 0) {
    return null;
  }

  // Separate promotions by layout type
  const featuredPromos = activeToday.filter(p => p.layout === 'featured');
  const cardPromos = activeToday.filter(p => p.layout === 'card');
  const horizontalPromos = activeToday.filter(p => p.layout === 'horizontal');

  return (
    <section className="py-8 bg-amber-50/50">
      <div className="container mx-auto px-4 space-y-6">
        {/* Featured + Card Grid */}
        {(featuredPromos.length > 0 || cardPromos.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Featured Promo (Large) */}
            {featuredPromos.map((promo) => (
              <div
                key={promo.id}
                className="lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-2xl group cursor-pointer"
                onClick={(e) => handleOrderClick(e, promo)}
              >
                <div 
                  className="h-full min-h-[400px] p-6 md:p-10 flex flex-col justify-between relative"
                  style={{ backgroundColor: promo.background_color }}
                >
                  <div className="relative z-10">
                    <h3 
                      className="text-3xl md:text-4xl font-black"
                      style={{ color: promo.text_color }}
                    >
                      {promo.title}
                    </h3>
                    {promo.subtitle && (
                      <p 
                        className="text-2xl md:text-4xl font-bold mt-2 whitespace-pre-line"
                        style={{ color: promo.text_color }}
                      >
                        {promo.subtitle}
                      </p>
                    )}
                  </div>
                  
                  <div className="relative z-10 flex items-end justify-between">
                    <div>
                      {promo.description && (
                        <p 
                          className="text-sm uppercase opacity-80"
                          style={{ color: promo.text_color }}
                        >
                          {promo.description}
                        </p>
                      )}
                      <div className="flex items-start" style={{ color: promo.text_color }}>
                        <span className="text-2xl font-bold">$</span>
                        <span className="text-6xl md:text-7xl font-black leading-none">
                          {Math.floor(promo.price)}
                        </span>
                        <span className="text-2xl font-bold">
                          .{(promo.price % 1).toFixed(2).split('.')[1]}
                        </span>
                        {promo.price_suffix && (
                          <span className="text-lg ml-1 self-end opacity-70">
                            {promo.price_suffix}
                          </span>
                        )}
                      </div>
                      {promo.coupon_code && (
                        <p 
                          className="text-xs mt-1 opacity-60"
                          style={{ color: promo.text_color }}
                        >
                          CODE: {promo.coupon_code}
                        </p>
                      )}
                    </div>
                    {promo.show_order_button && (
                      <Button 
                        className="bg-white text-gray-800 hover:bg-gray-100 font-bold px-6 py-3 rounded-full shadow-lg group-hover:scale-105 transition-transform"
                      >
                        ORDER NOW
                      </Button>
                    )}
                  </div>
                  
                  {/* Promo Image */}
                  {promo.image_url && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full">
                      <img 
                        src={promo.image_url} 
                        alt={promo.title} 
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-80 h-80 object-cover rounded-full shadow-2xl group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Card Promos (Side) */}
            {cardPromos.map((promo) => (
              <div
                key={promo.id}
                className="relative overflow-hidden rounded-2xl group cursor-pointer"
                onClick={(e) => handleOrderClick(e, promo)}
              >
                <div 
                  className="h-full min-h-[190px] p-5 flex flex-col justify-between relative"
                  style={{ backgroundColor: promo.background_color }}
                >
                  {promo.badge_text && (
                    <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                      {promo.badge_text}
                    </span>
                  )}
                  
                  <div className="relative z-10">
                    <h3 
                      className="text-xl font-black"
                      style={{ color: promo.text_color }}
                    >
                      {promo.title}
                    </h3>
                    {promo.subtitle && (
                      <p 
                        className="text-xs mt-1 opacity-80"
                        style={{ color: promo.text_color }}
                      >
                        {promo.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="relative z-10 flex items-end justify-between mt-4">
                    <div className="flex items-start" style={{ color: promo.text_color }}>
                      <span className="text-lg font-bold">$</span>
                      <span className="text-4xl font-black leading-none">
                        {Math.floor(promo.price)}
                      </span>
                      <span className="text-lg font-bold">
                        .{(promo.price % 1).toFixed(2).split('.')[1]}
                      </span>
                      {promo.price_suffix && (
                        <span className="text-sm ml-1 self-end opacity-70">
                          {promo.price_suffix}
                        </span>
                      )}
                    </div>
                    {promo.show_order_button && (
                      <Button 
                        size="sm"
                        className="bg-white text-gray-800 hover:bg-gray-100 font-bold px-4 py-2 rounded-full shadow group-hover:scale-105 transition-transform"
                      >
                        ORDER NOW
                      </Button>
                    )}
                  </div>
                  
                  {promo.coupon_code && (
                    <p 
                      className="text-xs mt-2 opacity-50"
                      style={{ color: promo.text_color }}
                    >
                      Code: {promo.coupon_code}
                    </p>
                  )}
                  
                  {/* Promo Image */}
                  {promo.image_url && (
                    <img 
                      src={promo.image_url} 
                      alt={promo.title}
                      className="absolute right-0 bottom-0 w-32 h-32 object-cover rounded-full opacity-90 group-hover:scale-110 transition-transform duration-300"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Horizontal Promos (Full Width Banners) */}
        {horizontalPromos.length > 0 && (
          <div className="space-y-4">
            {horizontalPromos.map((promo) => (
              <div
                key={promo.id}
                className="rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 group cursor-pointer hover:shadow-xl transition-shadow"
                style={{ backgroundColor: promo.background_color }}
                onClick={(e) => handleOrderClick(e, promo)}
              >
                <div className="flex-1">
                  <h3 
                    className="text-2xl md:text-3xl font-black"
                    style={{ color: promo.text_color }}
                  >
                    {promo.title}
                  </h3>
                  {promo.description && (
                    <p 
                      className="text-sm md:text-base mt-1 opacity-80"
                      style={{ color: promo.text_color }}
                    >
                      {promo.description}
                    </p>
                  )}
                  {promo.coupon_code && (
                    <p 
                      className="text-xs mt-2 opacity-50"
                      style={{ color: promo.text_color }}
                    >
                      CODE: {promo.coupon_code}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-start" style={{ color: promo.text_color }}>
                    <span className="text-xl font-bold">$</span>
                    <span className="text-5xl md:text-6xl font-black leading-none">
                      {Math.floor(promo.price)}
                    </span>
                    <span className="text-xl font-bold">
                      .{(promo.price % 1).toFixed(2).split('.')[1]}
                    </span>
                  </div>
                  {promo.show_order_button && (
                    <Button 
                      className="bg-white text-gray-800 hover:bg-gray-100 font-bold px-6 py-3 rounded-full shadow-lg group-hover:scale-105 transition-transform"
                    >
                      ORDER NOW
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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

export default ComboDeals;

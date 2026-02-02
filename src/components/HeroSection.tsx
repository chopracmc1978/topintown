import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import heroPizza from '@/assets/hero-pizza.jpg';

const HeroSection = () => {
  return (
    <section className="relative min-h-[50vh] md:min-h-[60vh] flex items-center overflow-hidden bg-gradient-to-br from-primary via-brand-teal to-primary">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white rounded-full" />
        <div className="absolute bottom-20 right-20 w-48 h-48 border-4 border-white rounded-full" />
        <div className="absolute top-1/2 left-1/4 w-20 h-20 border-2 border-white rounded-full" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Content - Left Side */}
          <div className="lg:w-1/2 text-center lg:text-left">
            <div className="inline-block bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold mb-4 animate-bounce">
              🔥 HOT DEALS INSIDE
            </div>
            <h1 className="font-serif text-4xl md:text-6xl font-black text-white leading-tight mb-4">
              Top In Town
              <span className="block text-yellow-400">Pizza</span>
            </h1>
            <p className="text-xl text-white/90 mb-6 max-w-md mx-auto lg:mx-0">
              Fresh, hot, and delivered to your door. Authentic Italian taste in every bite.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to="/menu">
                <Button 
                  size="lg"
                  className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-8 py-4 rounded-full shadow-lg text-lg"
                >
                  Order Now
                </Button>
              </Link>
              <Link to="/menu">
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-white hover:bg-white hover:text-primary font-bold px-8 py-4 rounded-full text-lg"
                >
                  View Menu
                </Button>
              </Link>
            </div>
          </div>

          {/* Pizza Image - Right Side */}
          <div className="lg:w-1/2 relative">
            <div className="relative">
              <img 
                src={heroPizza}
                alt="Delicious pizza"
                className="w-full max-w-md mx-auto rounded-full shadow-2xl animate-float ring-8 ring-white/20"
              />
              {/* Price Tag */}
              <div className="absolute -bottom-4 -right-4 md:bottom-4 md:right-4 bg-red-600 text-white rounded-full w-24 h-24 md:w-28 md:h-28 flex flex-col items-center justify-center shadow-xl animate-pulse">
                <span className="text-xs font-medium">FROM</span>
                <span className="text-2xl md:text-3xl font-black">$9.99</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

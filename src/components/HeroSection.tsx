import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroPizza from '@/assets/hero-pizza.jpg';

const HeroSection = () => {
  return (
    <section className="relative min-h-[70vh] flex items-center overflow-hidden bg-gradient-to-r from-primary via-brand-teal to-primary">
      {/* Decorative leaves */}
      <div className="absolute top-4 left-1/4 w-8 h-8 opacity-60">
        <svg viewBox="0 0 24 24" fill="currentColor" className="text-green-500 rotate-45">
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
        </svg>
      </div>
      <div className="absolute top-8 right-20 w-6 h-6 opacity-50">
        <svg viewBox="0 0 24 24" fill="currentColor" className="text-green-500 -rotate-12">
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
        </svg>
      </div>
      <div className="absolute bottom-20 right-10 w-10 h-10 opacity-40">
        <svg viewBox="0 0 24 24" fill="currentColor" className="text-green-500 rotate-90">
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
        </svg>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Pizza Image - Left Side */}
          <div className="lg:w-1/2 relative">
            <div className="relative">
              <img 
                src={heroPizza}
                alt="Delicious pizza"
                className="w-full max-w-lg mx-auto rounded-full shadow-2xl animate-float"
              />
              {/* Navigation Arrows */}
              <button className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-10 h-10 bg-foreground/20 hover:bg-foreground/40 rounded-full flex items-center justify-center text-primary-foreground transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-10 h-10 bg-foreground/20 hover:bg-foreground/40 rounded-full flex items-center justify-center text-primary-foreground transition-colors">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content Box - Right Side */}
          <div className="lg:w-1/2 flex justify-center lg:justify-end">
            <div className="bg-[hsl(210,70%,20%)] text-primary-foreground p-8 md:p-12 rounded-lg shadow-2xl max-w-md animate-slide-up">
              <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight mb-4">
                Top In Town Pizza
              </h1>
              <p className="text-lg uppercase tracking-widest text-primary-foreground/80 mb-6">
                Enjoy Our Delicious Food
              </p>
              <Link to="/menu">
                <Button 
                  variant="default"
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8"
                >
                  Order Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Pizza sketch decoration - bottom right */}
      <div className="absolute bottom-0 right-0 w-64 h-64 opacity-20 hidden lg:block">
        <svg viewBox="0 0 200 200" className="text-primary-foreground/30">
          <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="2"/>
          <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="1"/>
          <line x1="100" y1="5" x2="100" y2="195" stroke="currentColor" strokeWidth="1"/>
          <line x1="5" y1="100" x2="195" y2="100" stroke="currentColor" strokeWidth="1"/>
          <line x1="30" y1="30" x2="170" y2="170" stroke="currentColor" strokeWidth="1"/>
          <line x1="170" y1="30" x2="30" y2="170" stroke="currentColor" strokeWidth="1"/>
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;

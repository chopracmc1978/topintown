import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroPizza from '@/assets/hero-pizza.jpg';

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroPizza})` }}
      >
        <div className="absolute inset-0 bg-gradient-hero" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl text-primary-foreground animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-sm font-medium">Now accepting online orders</span>
          </div>

          <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight mb-6">
            Authentic Italian
            <span className="block text-accent">Pizza Perfection</span>
          </h1>

          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-lg">
            Hand-crafted pizzas made with the finest ingredients, baked to perfection in our 
            traditional wood-fired oven. Experience the taste of Naples in every bite.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link to="/menu">
              <Button variant="hero" size="xl" className="gap-2">
                Order Now <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/menu">
              <Button variant="heroOutline" size="xl">
                View Menu
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-foreground/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Free Delivery</p>
                <p className="text-sm text-primary-foreground/70">On orders over $25</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-foreground/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Quick Prep</p>
                <p className="text-sm text-primary-foreground/70">Ready in 25-30 mins</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;

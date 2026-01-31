import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const DiscoverSection = () => {
  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative order-2 md:order-1">
            <img 
              src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80"
              alt="Delicious pizza"
              className="rounded-xl shadow-2xl w-full max-w-md mx-auto"
            />
          </div>

          {/* Content */}
          <div className="order-1 md:order-2">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-6">
              Top in Town is One of The Well Known Pizzerias in Town
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              We don't sacrifice flavour in order to deliver the cheapest price. Our philosophy is to 
              deliver quality food at reasonable prices ensuring that every bite is worth it.
            </p>
            
            {/* Decorative leaf */}
            <div className="w-12 h-12 opacity-40 mb-6">
              <svg viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
                <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center mt-16">
          <h3 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-6">
            Come. Discover the best pizza in your town!
          </h3>
          <Link to="/menu">
            <Button variant="default" size="lg" className="px-10">
              Order Now
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default DiscoverSection;

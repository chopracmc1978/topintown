import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const AboutSection = () => {
  return (
    <section className="py-20 bg-gradient-warm">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Decorative leaf */}
          <div className="absolute left-4 top-1/2 w-16 h-16 opacity-30 hidden lg:block">
            <svg viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
              <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
            </svg>
          </div>

          <div className="relative">
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Top In Town About Us
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mt-2 mb-6">
              Top In Town About Us
            </h2>
            <p className="text-muted-foreground mb-6 text-lg">
              Top in town is all-Canadian pizza quick-service restaurant that is located in Calgary, Alberta. 
              We deliver the freshest, top-quality pizzas that are not just the best in taste but also are 
              the best in quality. We also customize pizzas as per your liking and preference.
            </p>
            <Link to="/about">
              <Button variant="default" size="lg">
                About More
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <img 
              src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=500&q=80"
              alt="Cheese pizza"
              className="rounded-xl shadow-lg w-full h-48 object-cover"
            />
            <img 
              src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=500&q=80"
              alt="Cheese pizza"
              className="rounded-xl shadow-lg w-full h-48 object-cover"
            />
            <img 
              src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=500&q=80"
              alt="Pizza on plate"
              className="rounded-xl shadow-lg w-full h-48 object-cover col-span-2"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;

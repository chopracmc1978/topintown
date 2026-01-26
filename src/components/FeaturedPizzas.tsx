import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MenuCard from '@/components/MenuCard';
import { menuItems } from '@/data/menu';

const FeaturedPizzas = () => {
  const featuredPizzas = menuItems.filter((item) => item.category === 'pizza').slice(0, 4);

  return (
    <section className="py-20 bg-gradient-warm">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            Our Specialties
          </span>
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mt-2 mb-4">
            Featured Pizzas
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Discover our most loved creations, each one crafted with passion and the finest ingredients
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {featuredPizzas.map((pizza) => (
            <MenuCard key={pizza.id} item={pizza} />
          ))}
        </div>

        <div className="text-center">
          <Link to="/menu">
            <Button variant="outline" size="lg" className="gap-2">
              View Full Menu <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedPizzas;

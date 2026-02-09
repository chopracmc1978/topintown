import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MenuCardDB from '@/components/MenuCardDB';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { preloadImages } from '@/components/OptimizedImage';

// Featured pizza names in the order they should appear
const FEATURED_PIZZA_NAMES = [
  'VEGETARIAN PIZZAS',
  'TANDOORI PANEER PIZZA',
  'TANDOORI CHICKEN PIZZA',
  'SUPREME PIZZA',
];

const FeaturedPizzas = () => {
  const { data: pizzas, isLoading } = useQuery({
    queryKey: ['featured-pizzas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          item_sizes (*)
        `)
        .eq('category', 'pizza')
        .eq('is_available', true)
        .in('name', FEATURED_PIZZA_NAMES);

      if (error) throw error;

      // Sort by the order defined in FEATURED_PIZZA_NAMES
      const sortedData = data?.sort((a, b) => {
        const indexA = FEATURED_PIZZA_NAMES.indexOf(a.name);
        const indexB = FEATURED_PIZZA_NAMES.indexOf(b.name);
        return indexA - indexB;
      });

      // Preload images immediately when data arrives
      if (sortedData) {
        preloadImages(sortedData.map(p => p.image_url));
      }

      return sortedData || [];
    },
  });

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
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))
          ) : (
            pizzas?.map((pizza) => (
              <MenuCardDB key={pizza.id} item={pizza} />
            ))
          )}
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

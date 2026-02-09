import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MenuCardDB from '@/components/MenuCardDB';
import { useMenuItems, type MenuCategory } from '@/hooks/useMenuItems';
import { useActiveCombos, Combo } from '@/hooks/useCombos';
import { ComboBuilderModal } from '@/components/combo/ComboBuilderModal';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import OptimizedImage from '@/components/OptimizedImage';
import { supabase } from '@/integrations/supabase/client';
import { preloadImages } from '@/components/OptimizedImage';

const mainCategories: { id: string; name: string; dbCategory?: MenuCategory }[] = [
  { id: 'pizza', name: 'Pizzas', dbCategory: 'pizza' },
  { id: 'chicken_wings', name: 'Chicken Wings', dbCategory: 'chicken_wings' },
  { id: 'baked_lasagna', name: 'Baked Lasagna', dbCategory: 'baked_lasagna' },
  { id: 'drinks', name: 'Drinks', dbCategory: 'drinks' },
  { id: 'dipping_sauce', name: 'Dipping Sauces', dbCategory: 'dipping_sauce' },
  { id: 'combos', name: 'Combos' },
];

const pizzaSubCategories = [
  { id: 'vegetarian', name: 'Vegetarian' },
  { id: 'paneer', name: 'Paneer' },
  { id: 'chicken', name: 'Chicken' },
  { id: 'meat', name: 'Meat Pizza' },
  { id: 'hawaiian', name: 'Hawaiian' },
];

const Menu = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category');
  
  const [activeCategory, setActiveCategory] = useState(() => {
    // Initialize from URL or default to 'pizza'
    const validCategories = mainCategories.map(c => c.id);
    return categoryFromUrl && validCategories.includes(categoryFromUrl) 
      ? categoryFromUrl 
      : 'pizza';
  });
  const [activePizzaSubCategory, setActivePizzaSubCategory] = useState<string | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
  const queryClient = useQueryClient();

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Prefetch ALL menu categories on mount so switching tabs is instant
  useEffect(() => {
    const allDbCategories: MenuCategory[] = ['pizza', 'chicken_wings', 'baked_lasagna', 'drinks', 'dipping_sauce'];
    allDbCategories.forEach(cat => {
      queryClient.prefetchQuery({
        queryKey: ['menu_items', cat],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('menu_items')
            .select(`
              *,
              sizes:item_sizes(*),
              default_toppings:item_default_toppings(*, topping:toppings(*)),
              default_sauces:item_default_sauces(*, sauce_option:sauce_options(*)),
              default_global_sauces:item_default_global_sauces(*, global_sauce:global_sauces(*))
            `)
            .eq('category', cat)
            .order('sort_order', { ascending: true });
          if (error) throw error;
          // Preload images immediately
          preloadImages((data || []).map((item: any) => item.image_url));
          return data;
        },
        staleTime: 5 * 60 * 1000,
      });
    });
  }, [queryClient]);

  // Sync state when URL changes
  useEffect(() => {
    if (categoryFromUrl) {
      const validCategories = mainCategories.map(c => c.id);
      if (validCategories.includes(categoryFromUrl)) {
        setActiveCategory(categoryFromUrl);
        if (categoryFromUrl !== 'pizza') {
          setActivePizzaSubCategory(null);
        }
      }
    }
  }, [categoryFromUrl]);
  
  // Only fetch menu items if not on combos tab
  const selectedCategory = activeCategory !== 'combos' ? (activeCategory as MenuCategory) : 'pizza';
  const { data: menuItems, isLoading: menuLoading } = useMenuItems(selectedCategory);
  const { data: combos, isLoading: combosLoading } = useActiveCombos();

  // Filter pizzas by sub-category field
  const filteredItems = activePizzaSubCategory && activeCategory === 'pizza'
    ? menuItems?.filter(item => 
        item.subcategory?.toLowerCase() === activePizzaSubCategory.toLowerCase()
      )
    : menuItems;

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    setSearchParams({ category: categoryId });
    // Reset pizza sub-category when switching categories
    if (categoryId !== 'pizza') {
      setActivePizzaSubCategory(null);
    }
  };

  const handlePizzaSubCategoryClick = (subCategoryId: string) => {
    // Toggle off if clicking the same sub-category
    if (activePizzaSubCategory === subCategoryId) {
      setActivePizzaSubCategory(null);
    } else {
      setActivePizzaSubCategory(subCategoryId);
    }
  };

  const isLoading = activeCategory === 'combos' ? combosLoading : menuLoading;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Fresh & Delicious
            </span>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mt-2 mb-4">
              Our Menu
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore our selection of authentic Italian pizzas, fresh sides, and refreshing beverages
            </p>
          </div>

          {/* Main Category Filter */}
          <div className="flex justify-center gap-2 mb-4 flex-wrap">
            {mainCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={cn(
                  "px-6 py-2.5 rounded-full font-medium transition-all",
                  activeCategory === category.id
                    ? "bg-[hsl(215,25%,27%)] text-white shadow-md"
                    : "bg-[hsl(215,20%,35%)] text-white/90 hover:bg-[hsl(215,25%,30%)]"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Pizza Sub-Categories - only show when Pizzas is selected */}
          {activeCategory === 'pizza' && (
            <div className="flex justify-center gap-2 mb-12 flex-wrap">
              {pizzaSubCategories.map((subCategory) => (
                <button
                  key={subCategory.id}
                  onClick={() => handlePizzaSubCategoryClick(subCategory.id)}
                className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                    activePizzaSubCategory === subCategory.id
                      ? "bg-[hsl(215,25%,27%)] text-white shadow-md"
                      : "bg-[hsl(215,20%,35%)] text-white/90 hover:bg-[hsl(215,25%,30%)]"
                  )}
                >
                  {subCategory.name}
                </button>
              ))}
            </div>
          )}

          {/* Add margin when no sub-categories shown */}
          {activeCategory !== 'pizza' && <div className="mb-8" />}

          {/* Menu Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : activeCategory === 'combos' ? (
            // Combos Grid
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {combos?.map((combo) => (
                  <div
                    key={combo.id}
                    className="bg-card rounded-xl overflow-hidden shadow-lg border hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => setSelectedCombo(combo)}
                  >
                    <OptimizedImage
                      src={combo.image_url}
                      alt={combo.name}
                      width={500}
                      containerClassName="w-full h-48"
                      className="w-full h-full object-cover"
                      fallback={
                        <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Package className="h-16 w-16 text-primary/50" />
                        </div>
                      }
                    />
                    
                    <div className="p-4">
                      <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                        {combo.name}
                      </h3>
                      {combo.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {combo.description}
                        </p>
                      )}
                      
                      {/* Show combo items */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {combo.combo_items?.map((item, i) => (
                          <span
                            key={i}
                            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                          >
                            {item.quantity}x {item.item_type.replace('_', ' ')}
                            {item.size_restriction && ` (${item.size_restriction})`}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">
                          ${combo.price.toFixed(2)}
                        </span>
                        <Button
                          variant="pizza"
                          onClick={() => setSelectedCombo(combo)}
                        >
                          Order Now
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {(!combos || combos.length === 0) && (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No combo deals available at the moment.</p>
                </div>
              )}
            </>
          ) : (
            // Regular Menu Items Grid
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems?.map((item) => (
                  <MenuCardDB key={item.id} item={item} />
                ))}
              </div>

              {(!filteredItems || filteredItems.length === 0) && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No items found in this category.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Add items from the <a href="/admin" className="text-primary hover:underline">admin dashboard</a>.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />

      {/* Combo Builder Modal */}
      {selectedCombo && (
        <ComboBuilderModal
          combo={selectedCombo}
          isOpen={!!selectedCombo}
          onClose={() => setSelectedCombo(null)}
        />
      )}
    </div>
  );
};

export default Menu;

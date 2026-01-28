import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MenuCardDB from '@/components/MenuCardDB';
import { useMenuItems, type MenuCategory } from '@/hooks/useMenuItems';
import { cn } from '@/lib/utils';

const categories: { id: string; name: string; dbCategory?: MenuCategory }[] = [
  { id: 'all', name: 'All' },
  { id: 'pizza', name: 'Pizzas', dbCategory: 'pizza' },
  { id: 'sides', name: 'Sides', dbCategory: 'sides' },
  { id: 'drinks', name: 'Drinks', dbCategory: 'drinks' },
  { id: 'desserts', name: 'Desserts', dbCategory: 'desserts' },
  { id: 'dipping_sauce', name: 'Dipping Sauces', dbCategory: 'dipping_sauce' },
];

const Menu = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  
  const selectedCategory = activeCategory === 'all' 
    ? undefined 
    : (activeCategory as MenuCategory);
  
  const { data: menuItems, isLoading } = useMenuItems(selectedCategory);

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

          {/* Category Filter */}
          <div className="flex justify-center gap-2 mb-12 flex-wrap">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "px-6 py-2 rounded-full font-medium transition-all",
                  activeCategory === category.id
                    ? "bg-primary text-primary-foreground shadow-warm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {menuItems?.map((item) => (
                  <MenuCardDB key={item.id} item={item} />
                ))}
              </div>

              {(!menuItems || menuItems.length === 0) && (
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
    </div>
  );
};

export default Menu;

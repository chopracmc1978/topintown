import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MenuCard from '@/components/MenuCard';
import { menuItems } from '@/data/menu';
import { cn } from '@/lib/utils';

const categories = [
  { id: 'all', name: 'All' },
  { id: 'pizza', name: 'Pizzas' },
  { id: 'sides', name: 'Sides' },
  { id: 'drinks', name: 'Drinks' },
  { id: 'desserts', name: 'Desserts' },
];

const Menu = () => {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredItems = activeCategory === 'all'
    ? menuItems
    : menuItems.filter((item) => item.category === activeCategory);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No items found in this category.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Menu;

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MenuCardDB from '@/components/MenuCardDB';
import MenuLocationBar from '@/components/MenuLocationBar';
import { useMenuItems, type MenuCategory } from '@/hooks/useMenuItems';
import { cn } from '@/lib/utils';

const mainCategories: { id: string; name: string; dbCategory?: MenuCategory }[] = [
  { id: 'pizza', name: 'Pizzas', dbCategory: 'pizza' },
  { id: 'chicken_wings', name: 'Chicken Wings', dbCategory: 'chicken_wings' },
  { id: 'baked_lasagna', name: 'Baked Lasagna', dbCategory: 'baked_lasagna' },
  { id: 'drinks', name: 'Drinks', dbCategory: 'drinks' },
  { id: 'dipping_sauce', name: 'Dipping Sauces', dbCategory: 'dipping_sauce' },
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

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
  
  const selectedCategory = activeCategory as MenuCategory;
  
  const { data: menuItems, isLoading } = useMenuItems(selectedCategory);

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <MenuLocationBar />
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

          {/* Pizza Sub-Categories - only show when Pizzas is selected */}
          {activeCategory === 'pizza' && (
            <div className="flex justify-center gap-2 mb-12 flex-wrap">
              {pizzaSubCategories.map((subCategory) => (
                <button
                  key={subCategory.id}
                  onClick={() => handlePizzaSubCategoryClick(subCategory.id)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
                    activePizzaSubCategory === subCategory.id
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
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
          ) : (
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
    </div>
  );
};

export default Menu;

import { Link } from 'react-router-dom';
import { Pizza, Utensils, Drumstick, Coffee, Droplets } from 'lucide-react';

const categories = [
  {
    name: 'Pizza',
    icon: Pizza,
    link: '/menu?category=pizza',
  },
  {
    name: 'Pasta',
    icon: Utensils,
    link: '/menu?category=baked_lasagna',
  },
  {
    name: 'Wings',
    icon: Drumstick,
    link: '/menu?category=chicken_wings',
  },
  {
    name: 'Beverages',
    icon: Coffee,
    link: '/menu?category=drinks',
  },
  {
    name: 'Dipping Sauces',
    icon: Droplets,
    link: '/menu?category=dipping_sauce',
  },
];

const FoodCategories = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Our Best Food Items
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={category.link}
              className="group flex flex-col items-center p-6 bg-card rounded-xl border border-border shadow-card hover:shadow-warm transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <category.icon className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FoodCategories;

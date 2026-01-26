import pizzaMargherita from '@/assets/pizza-margherita.jpg';
import pizzaPepperoni from '@/assets/pizza-pepperoni.jpg';
import pizzaQuattroFormaggi from '@/assets/pizza-quattro-formaggi.jpg';
import pizzaVeggie from '@/assets/pizza-veggie.jpg';

import { MenuItem } from '@/types/menu';

export const menuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Margherita',
    description: 'Fresh mozzarella, San Marzano tomatoes, basil, extra virgin olive oil',
    price: 14.99,
    image: pizzaMargherita,
    category: 'pizza',
    sizes: [
      { name: 'Small 10"', price: 14.99 },
      { name: 'Medium 12"', price: 18.99 },
      { name: 'Large 14"', price: 22.99 },
    ],
    popular: true,
  },
  {
    id: '2',
    name: 'Pepperoni',
    description: 'Classic pepperoni, mozzarella cheese, house-made tomato sauce',
    price: 16.99,
    image: pizzaPepperoni,
    category: 'pizza',
    sizes: [
      { name: 'Small 10"', price: 16.99 },
      { name: 'Medium 12"', price: 20.99 },
      { name: 'Large 14"', price: 24.99 },
    ],
    popular: true,
  },
  {
    id: '3',
    name: 'Quattro Formaggi',
    description: 'Mozzarella, gorgonzola, parmesan, ricotta, fresh herbs',
    price: 18.99,
    image: pizzaQuattroFormaggi,
    category: 'pizza',
    sizes: [
      { name: 'Small 10"', price: 18.99 },
      { name: 'Medium 12"', price: 22.99 },
      { name: 'Large 14"', price: 26.99 },
    ],
  },
  {
    id: '4',
    name: 'Garden Veggie',
    description: 'Bell peppers, mushrooms, olives, onions, tomatoes, fresh basil',
    price: 17.99,
    image: pizzaVeggie,
    category: 'pizza',
    sizes: [
      { name: 'Small 10"', price: 17.99 },
      { name: 'Medium 12"', price: 21.99 },
      { name: 'Large 14"', price: 25.99 },
    ],
  },
  {
    id: '5',
    name: 'Garlic Breadsticks',
    description: 'Fresh-baked breadsticks with garlic butter and herbs, served with marinara',
    price: 6.99,
    image: pizzaMargherita,
    category: 'sides',
  },
  {
    id: '6',
    name: 'Caesar Salad',
    description: 'Crisp romaine, parmesan, croutons, house-made Caesar dressing',
    price: 8.99,
    image: pizzaMargherita,
    category: 'sides',
  },
  {
    id: '7',
    name: 'Mozzarella Sticks',
    description: 'Golden-fried mozzarella with marinara dipping sauce',
    price: 7.99,
    image: pizzaMargherita,
    category: 'sides',
  },
  {
    id: '8',
    name: 'Italian Soda',
    description: 'Refreshing sparkling water with your choice of flavor',
    price: 3.49,
    image: pizzaMargherita,
    category: 'drinks',
  },
  {
    id: '9',
    name: 'Fresh Lemonade',
    description: 'House-made lemonade with fresh lemons and mint',
    price: 3.99,
    image: pizzaMargherita,
    category: 'drinks',
  },
  {
    id: '10',
    name: 'Tiramisu',
    description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone',
    price: 7.99,
    image: pizzaMargherita,
    category: 'desserts',
  },
];

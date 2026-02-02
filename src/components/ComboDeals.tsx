import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import pizzaMargherita from '@/assets/pizza-margherita.jpg';
import pizzaPepperoni from '@/assets/pizza-pepperoni.jpg';
import pizzaVeggie from '@/assets/pizza-veggie.jpg';

const deals = [
  {
    id: 'best-deal',
    type: 'hero',
    title: 'BEST DEAL',
    highlight: 'EVER',
    subtitle: 'ANY PIZZA.\nANY TOPPINGS.',
    price: '13.99',
    pricePrefix: 'ONLINE ONLY. STARTING AT',
    code: 'BEST13',
    image: pizzaMargherita,
    bgColor: 'bg-gradient-to-br from-red-600 via-red-700 to-red-800',
  },
  {
    id: 'mix-match',
    type: 'side',
    title: 'MIX &',
    highlight: 'MATCH',
    subtitle: 'PIZZAS, WINGS, GARLIC TOAST AND MORE.',
    price: '8.99',
    pricePrefix: 'each',
    code: 'MIX8',
    image: pizzaPepperoni,
    bgColor: 'bg-gradient-to-br from-amber-50 to-amber-100',
    textDark: true,
  },
  {
    id: 'pickup-deal',
    type: 'side',
    badge: 'PICKUP ONLY',
    title: 'LARGE',
    highlight: '2-TOPPING\nPIZZA',
    price: '12.99',
    code: 'PICK12',
    image: pizzaVeggie,
    bgColor: 'bg-gradient-to-br from-blue-600 to-blue-800',
  },
];

const combos = [
  {
    id: 'best-bundle',
    title: 'BEST',
    highlight: 'BUNDLE',
    description: 'ANY PIZZA, ANY TOPPINGS + 10 WINGS + 2 CANS OF POP.',
    price: '24.99',
    code: 'BUNDLE24',
    bgColor: 'bg-gradient-to-r from-red-600 to-red-700',
  },
  {
    id: 'perfect-combo',
    title: 'THE PERFECT',
    highlight: 'COMBO',
    description: '2 MEDIUM 1-TOPPING PIZZAS, 10 WINGS & GARLIC TOAST.',
    price: '29.99',
    code: 'COMBO29',
    bgColor: 'bg-gradient-to-r from-amber-500 to-orange-600',
  },
  {
    id: 'family-feast',
    title: 'FAMILY',
    highlight: 'FEAST',
    description: '2 LARGE PIZZAS, 20 WINGS, GARLIC TOAST & 2L POP.',
    price: '49.99',
    code: 'FAMILY49',
    bgColor: 'bg-gradient-to-r from-green-600 to-teal-600',
  },
];

const ComboDeals = () => {
  return (
    <section className="py-8 bg-amber-50/50">
      <div className="container mx-auto px-4 space-y-6">
        {/* Hero Deal Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Large Hero Deal */}
          <Link 
            to="/menu?category=pizza" 
            className="lg:col-span-2 lg:row-span-2 relative overflow-hidden rounded-2xl group cursor-pointer"
          >
            <div className={`${deals[0].bgColor} h-full min-h-[400px] p-6 md:p-10 flex flex-col justify-between relative`}>
              <div className="relative z-10">
                <h3 className="text-white text-3xl md:text-4xl font-black">
                  {deals[0].title} <span className="text-yellow-400">{deals[0].highlight}</span>
                </h3>
                <p className="text-white text-2xl md:text-4xl font-bold mt-2 whitespace-pre-line">
                  {deals[0].subtitle}
                </p>
              </div>
              
              <div className="relative z-10 flex items-end justify-between">
                <div>
                  <p className="text-white/80 text-sm uppercase">{deals[0].pricePrefix}</p>
                  <div className="flex items-start text-white">
                    <span className="text-2xl font-bold">$</span>
                    <span className="text-6xl md:text-7xl font-black leading-none">{deals[0].price.split('.')[0]}</span>
                    <span className="text-2xl font-bold">.{deals[0].price.split('.')[1]}</span>
                  </div>
                  <p className="text-white/60 text-xs mt-1">CODE: {deals[0].code}</p>
                </div>
                <Button className="bg-white text-red-600 hover:bg-gray-100 font-bold px-6 py-3 rounded-full shadow-lg group-hover:scale-105 transition-transform">
                  ORDER NOW
                </Button>
              </div>
              
              {/* Pizza Image */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full">
                <img 
                  src={deals[0].image} 
                  alt="Pizza deal" 
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-80 h-80 object-cover rounded-full shadow-2xl group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </Link>

          {/* Side Deals */}
          {deals.slice(1).map((deal) => (
            <Link 
              key={deal.id}
              to="/menu?category=pizza"
              className="relative overflow-hidden rounded-2xl group cursor-pointer"
            >
              <div className={`${deal.bgColor} h-full min-h-[190px] p-5 flex flex-col justify-between relative`}>
                {deal.badge && (
                  <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {deal.badge}
                  </span>
                )}
                
                <div className="relative z-10">
                  <h3 className={`text-xl font-black ${deal.textDark ? 'text-red-600' : 'text-white'}`}>
                    {deal.title} <span className={deal.textDark ? 'text-red-500' : 'text-yellow-400'}>{deal.highlight}</span>
                  </h3>
                  {deal.subtitle && (
                    <p className={`text-xs mt-1 ${deal.textDark ? 'text-gray-600' : 'text-white/80'}`}>
                      {deal.subtitle}
                    </p>
                  )}
                </div>

                <div className="relative z-10 flex items-end justify-between mt-4">
                  <div className={`flex items-start ${deal.textDark ? 'text-red-600' : 'text-white'}`}>
                    <span className="text-lg font-bold">$</span>
                    <span className="text-4xl font-black leading-none">{deal.price.split('.')[0]}</span>
                    <span className="text-lg font-bold">.{deal.price.split('.')[1]}</span>
                    {deal.pricePrefix && (
                      <span className={`text-sm ml-1 self-end ${deal.textDark ? 'text-gray-500' : 'text-white/70'}`}>
                        {deal.pricePrefix}
                      </span>
                    )}
                  </div>
                  <Button 
                    size="sm"
                    className={`${deal.textDark ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-white text-blue-600 hover:bg-gray-100'} font-bold px-4 py-2 rounded-full shadow group-hover:scale-105 transition-transform`}
                  >
                    ORDER NOW
                  </Button>
                </div>
                
                <p className={`text-xs mt-2 ${deal.textDark ? 'text-gray-400' : 'text-white/50'}`}>
                  Code: {deal.code}
                </p>
                
                {/* Pizza Image */}
                <img 
                  src={deal.image} 
                  alt={deal.title}
                  className="absolute right-0 bottom-0 w-32 h-32 object-cover rounded-full opacity-90 group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </Link>
          ))}
        </div>

        {/* Combo Banners */}
        <div className="space-y-4">
          {combos.map((combo) => (
            <Link 
              key={combo.id}
              to="/menu"
              className={`${combo.bgColor} rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 group cursor-pointer hover:shadow-xl transition-shadow`}
            >
              <div className="flex-1">
                <h3 className="text-white text-2xl md:text-3xl font-black">
                  {combo.title} <span className="text-yellow-300">{combo.highlight}</span>
                </h3>
                <p className="text-white/80 text-sm md:text-base mt-1">{combo.description}</p>
                <p className="text-white/50 text-xs mt-2">CODE: {combo.code}</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-white flex items-start">
                  <span className="text-xl font-bold">$</span>
                  <span className="text-5xl md:text-6xl font-black leading-none">{combo.price.split('.')[0]}</span>
                  <span className="text-xl font-bold">.{combo.price.split('.')[1]}</span>
                </div>
                <Button className="bg-white text-gray-800 hover:bg-gray-100 font-bold px-6 py-3 rounded-full shadow-lg group-hover:scale-105 transition-transform">
                  ORDER NOW
                </Button>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ComboDeals;

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import aboutPizza from '@/assets/about-pizza.png';

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {/* Hero Banner */}
        <section className="relative h-[280px] md:h-[350px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1920&q=60"
              alt="Pizza background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60" />
          </div>
          <h1 className="relative z-10 font-serif text-4xl md:text-6xl font-bold text-white text-center">
            About Us
          </h1>
        </section>

        {/* WHO WE ARE Section */}
        <section className="py-16 md:py-24 bg-background relative overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Pizza Image */}
              <div className="flex justify-center">
                <img
                  src={aboutPizza}
                  alt="Delicious Top In Town Pizza"
                  className="w-full max-w-md md:max-w-lg object-contain drop-shadow-2xl"
                  loading="eager"
                />
              </div>

              {/* Content */}
              <div>
                <h2 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-6">
                  WHO WE ARE
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  The secret to success is much like the secret to making a better Top in Town pizza – the more you put into it, the more you get out of it. We're as hungry for perfection today as we were when we first opened our doors in 2014. And we're driven to be the best at making innovative new products and recipes.
                </p>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  Top in Town is an all-Canadian pizza quick-service restaurant located in Calgary, Alberta. We deliver the freshest, top-quality pizzas that are not just the best in taste but also the best in quality. We also customize pizzas as per your liking and preference.
                </p>
                <Button
                  onClick={() => navigate('/menu')}
                  size="lg"
                  className="bg-brand-blue hover:bg-brand-blue-dark text-white font-semibold px-8 rounded-full shadow-md"
                >
                  Order Now
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="py-16 bg-gradient-warm">
          <div className="container mx-auto px-4">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
              Why Choose Us
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: '🍕',
                  title: 'Fresh Ingredients',
                  description: 'We use only the freshest, highest-quality ingredients in every pizza we make.',
                },
                {
                  icon: '⭐',
                  title: 'Quality First',
                  description: 'Every pizza is crafted with care and attention to deliver the best taste experience.',
                },
                {
                  icon: '🎨',
                  title: 'Customizable',
                  description: 'Build your perfect pizza with our wide selection of toppings, crusts, and sauces.',
                },
                {
                  icon: '🚀',
                  title: 'Fast Delivery',
                  description: 'Hot and fresh pizza delivered to your door in record time.',
                },
                {
                  icon: '💰',
                  title: 'Great Value',
                  description: 'Amazing combo deals and promotions to give you the best value for your money.',
                },
                {
                  icon: '❤️',
                  title: 'Made with Love',
                  description: 'Since 2014, we have been passionate about serving our community the best pizza in town.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-card rounded-xl p-6 shadow-card text-center hover:shadow-warm transition-shadow"
                >
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="font-serif text-xl font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;

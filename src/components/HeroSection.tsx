import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroPizzaSteam from '@/assets/hero-pizza-steam.png';
import heroSlide2 from '@/assets/hero-slide-2.png';

const slides = [
  {
    id: 1,
    type: 'blue',
    image: heroPizzaSteam,
  },
  {
    id: 2,
    type: 'white',
    image: heroSlide2,
  },
];

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="relative min-h-[500px] md:min-h-[600px] overflow-hidden">
      {/* Slides */}
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {slide.type === 'blue' ? (
              <BlueSlide image={slide.image} />
            ) : (
              <WhiteSlide image={slide.image} />
            )}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button 
        onClick={goToPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 transition-colors shadow-lg"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button 
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-700 transition-colors shadow-lg"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentSlide ? 'bg-primary' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </section>
  );
};

// Blue slide component (original style)
const BlueSlide = ({ image }: { image: string }) => (
  <div className="h-full min-h-[500px] md:min-h-[600px] flex items-center bg-[#0a4a7c]">
    {/* Floating Basil Leaves */}
    <div className="absolute top-12 left-[20%] w-8 h-8 animate-float" style={{ animationDelay: '0s' }}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="text-green-500 rotate-45 drop-shadow-lg">
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
      </svg>
    </div>
    <div className="absolute top-24 right-[15%] w-6 h-6 animate-float" style={{ animationDelay: '0.5s' }}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="text-green-500 -rotate-12 drop-shadow-lg">
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
      </svg>
    </div>
    <div className="absolute bottom-32 left-[10%] w-7 h-7 animate-float" style={{ animationDelay: '1.5s' }}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="text-green-500 rotate-180 drop-shadow-lg">
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
      </svg>
    </div>

    {/* Pizza Sketch - Bottom Right */}
    <div className="absolute bottom-0 right-0 w-72 h-72 opacity-20 hidden lg:block">
      <svg viewBox="0 0 200 200" className="text-white/30">
        <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="1"/>
        <line x1="100" y1="5" x2="100" y2="195" stroke="currentColor" strokeWidth="1"/>
        <line x1="5" y1="100" x2="195" y2="100" stroke="currentColor" strokeWidth="1"/>
        <line x1="30" y1="30" x2="170" y2="170" stroke="currentColor" strokeWidth="1"/>
        <line x1="170" y1="30" x2="30" y2="170" stroke="currentColor" strokeWidth="1"/>
      </svg>
    </div>

    <div className="container mx-auto px-4 relative z-10">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Pizza Image - Left Side */}
        <div className="lg:w-1/2 relative">
          <img 
            src={image}
            alt="Delicious pizza"
            className="w-full max-w-lg mx-auto rounded-3xl shadow-2xl animate-float"
          />
        </div>

        {/* Content Box - Right Side */}
        <div className="lg:w-1/2 flex justify-center lg:justify-end">
          <div className="bg-[#063a5f] text-white p-8 md:p-12 rounded-xl shadow-2xl max-w-md animate-slide-up border border-white/10">
            <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight mb-4">
              Top In Town Pizza
            </h1>
            <p className="text-lg uppercase tracking-widest text-white/80 mb-6">
              Enjoy Our Delicious Food
            </p>
            <Link to="/menu">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 rounded-full shadow-lg"
              >
                Order Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// White slide component - full-width image background matching reference
const WhiteSlide = ({ image }: { image: string }) => (
  <div className="h-full min-h-[500px] md:min-h-[600px] relative overflow-hidden">
    <img 
      src={image}
      alt="Enjoy Our Delicious Food - Top In Town Pizza"
      className="w-full h-full min-h-[500px] md:min-h-[600px] object-cover object-center"
    />
  </div>
);

export default HeroSection;

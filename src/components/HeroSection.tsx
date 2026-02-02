import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroPizza from '@/assets/hero-pizza-steam.png';

const HeroSection = () => {
  return (
    <section className="relative min-h-[500px] md:min-h-[600px] flex items-center overflow-hidden bg-[#0a4a7c]">
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
      <div className="absolute top-8 right-[30%] w-5 h-5 animate-float" style={{ animationDelay: '1s' }}>
        <svg viewBox="0 0 24 24" fill="currentColor" className="text-green-400 rotate-90 drop-shadow-lg">
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
        </svg>
      </div>
      <div className="absolute bottom-32 left-[10%] w-7 h-7 animate-float" style={{ animationDelay: '1.5s' }}>
        <svg viewBox="0 0 24 24" fill="currentColor" className="text-green-500 rotate-180 drop-shadow-lg">
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
        </svg>
      </div>
      <div className="absolute bottom-20 right-[25%] w-6 h-6 animate-float" style={{ animationDelay: '2s' }}>
        <svg viewBox="0 0 24 24" fill="currentColor" className="text-green-400 -rotate-45 drop-shadow-lg">
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
        </svg>
      </div>
      <div className="absolute top-40 left-[5%] w-5 h-5 animate-float" style={{ animationDelay: '0.7s' }}>
        <svg viewBox="0 0 24 24" fill="currentColor" className="text-green-500 rotate-[135deg] drop-shadow-lg">
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
          <circle cx="60" cy="60" r="8" fill="currentColor" opacity="0.5"/>
          <circle cx="130" cy="70" r="6" fill="currentColor" opacity="0.5"/>
          <circle cx="80" cy="130" r="7" fill="currentColor" opacity="0.5"/>
          <circle cx="140" cy="140" r="5" fill="currentColor" opacity="0.5"/>
        </svg>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Pizza Image - Left Side */}
          <div className="lg:w-1/2 relative">
            <div className="relative">
              <img 
                src={heroPizza}
                alt="Delicious pizza"
                className="w-full max-w-lg mx-auto rounded-3xl shadow-2xl animate-float"
              />
              {/* Navigation Arrows */}
              <button className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors shadow-lg">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors shadow-lg">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
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
    </section>
  );
};

export default HeroSection;

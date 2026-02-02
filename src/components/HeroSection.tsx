import heroBanner from '@/assets/hero-slide-2.png';

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden">
      <img 
        src={heroBanner}
        alt="Enjoy Our Delicious Food - Top In Town Pizza"
        className="w-full h-auto object-cover"
      />
    </section>
  );
};

export default HeroSection;

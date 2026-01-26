import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import FeaturedPizzas from '@/components/FeaturedPizzas';
import AboutSection from '@/components/AboutSection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturedPizzas />
        <AboutSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

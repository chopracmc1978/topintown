import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import LocationsSection from '@/components/LocationsSection';
import FoodCategories from '@/components/FoodCategories';
import AboutSection from '@/components/AboutSection';
import DiscoverSection from '@/components/DiscoverSection';
import FeaturedPizzas from '@/components/FeaturedPizzas';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <LocationsSection />
        <FoodCategories />
        <AboutSection />
        <DiscoverSection />
        <FeaturedPizzas />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import StartOrderBar from '@/components/StartOrderBar';
import ComboDeals from '@/components/ComboDeals';
import LocationsSection from '@/components/LocationsSection';
import FoodCategories from '@/components/FoodCategories';
import FeaturedPizzas from '@/components/FeaturedPizzas';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <StartOrderBar />
        <ComboDeals />
        <FoodCategories />
        <FeaturedPizzas />
        <LocationsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

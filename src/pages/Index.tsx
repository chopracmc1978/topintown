import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import PromoBar from '@/components/PromoBar';
import ComboDeals from '@/components/ComboDeals';
import CombosSection from '@/components/CombosSection';
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
        <PromoBar />
        <ComboDeals />
        <CombosSection />
        <FoodCategories />
        <FeaturedPizzas />
        <LocationsSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

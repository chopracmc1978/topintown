import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartSidebar from '@/components/CartSidebar';

const Cart = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="font-serif text-3xl font-bold text-foreground mb-8">Your Cart</h1>
          <div className="bg-card rounded-xl border border-border p-6">
            <CartSidebar />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;

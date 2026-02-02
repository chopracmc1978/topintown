import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { OrderProvider } from "@/contexts/OrderContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { CustomerProvider } from "@/contexts/CustomerContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { toast } from "sonner";
import Index from "./pages/Index";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import POS from "./pages/POS";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import CustomerLogin from "./pages/CustomerLogin";
import MyOrders from "./pages/MyOrders";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60,
    },
  },
});

/**
 * IMPORTANT (native stability):
 * The POS app (opened directly at /pos in a Capacitor WebView) must NOT mount
 * customer/location providers since they use browser APIs (localStorage + IP detection)
 * that can hard-crash some WebView environments and produce a white screen.
 */
const PublicProvidersLayout = () => {
  return (
    <LocationProvider>
      <CustomerProvider>
        <CartProvider>
          <OrderProvider>
            <Outlet />
          </OrderProvider>
        </CartProvider>
      </CustomerProvider>
    </LocationProvider>
  );
};

const App = () => {
  // Global unhandled rejection handler to prevent white screen crashes
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      toast.error("An error occurred. Please try again.");
      event.preventDefault(); // Prevent the default crash behavior
    };

    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error:", event.error);
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);
    
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* POS is isolated for native stability */}
              <Route path="/pos" element={<POS />} />

              {/* Public site + admin routes */}
              <Route element={<PublicProvidersLayout />}>
                <Route index element={<Index />} />
                <Route path="menu" element={<Menu />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="order-confirmation/:orderId" element={<OrderConfirmation />} />
                <Route path="order-confirmation" element={<OrderConfirmation />} />
                <Route path="auth" element={<Auth />} />
                <Route path="admin" element={<Admin />} />
                <Route path="customer-login" element={<CustomerLogin />} />
                <Route path="my-orders" element={<MyOrders />} />
                <Route path="profile" element={<Profile />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

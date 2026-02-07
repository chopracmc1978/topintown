import { useEffect, lazy, Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { OrderProvider } from "@/contexts/OrderContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { CustomerProvider } from "@/contexts/CustomerContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Lazy load pages for code-splitting
const Index = lazy(() => import("./pages/Index"));
const Menu = lazy(() => import("./pages/Menu"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const POS = lazy(() => import("./pages/POS"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const CustomerLogin = lazy(() => import("./pages/CustomerLogin"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const Profile = lazy(() => import("./pages/Profile"));
const Rewards = lazy(() => import("./pages/Rewards"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60,
    },
  },
});

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

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
            {/* Notifications enabled for the public site/admin only (NOT for /pos) */}
            <Toaster />
            <Sonner />
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
      // POS requested: no UI notifications. Keep console error only.
      if (!window.location.pathname.startsWith("/pos")) {
        toast.error("An error occurred. Please try again.");
      }
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
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
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
                  <Route path="rewards" element={<Rewards />} />
                  <Route path="about" element={<About />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

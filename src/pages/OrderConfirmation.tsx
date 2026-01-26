import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, MapPin, Phone } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/contexts/OrderContext';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const { getOrderById } = useOrders();
  const order = orderId ? getOrderById(orderId) : undefined;

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-serif text-3xl font-bold text-foreground mb-4">Order Not Found</h1>
            <p className="text-muted-foreground mb-6">We couldn't find this order.</p>
            <Link to="/menu">
              <Button variant="pizza">Browse Menu</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>

            <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
              Order Confirmed!
            </h1>
            <p className="text-muted-foreground mb-6">
              Thank you for your order. We're preparing your delicious pizza now!
            </p>

            <div className="bg-secondary/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">Order Number</p>
              <p className="font-mono text-xl font-bold text-primary">{order.id}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-8 text-left">
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Estimated Time</span>
                </div>
                <p className="font-semibold">25-30 minutes</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  {order.orderType === 'delivery' ? (
                    <MapPin className="w-4 h-4" />
                  ) : (
                    <Phone className="w-4 h-4" />
                  )}
                  <span className="text-sm">
                    {order.orderType === 'delivery' ? 'Delivering to' : 'Contact'}
                  </span>
                </div>
                <p className="font-semibold text-sm">
                  {order.orderType === 'delivery' ? order.customerAddress : order.customerPhone}
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="font-serif text-lg font-semibold mb-4 text-left">Order Details</h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={`${item.id}-${item.selectedSize}`}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.name}
                      {item.selectedSize && ` (${item.selectedSize})`}
                    </span>
                    <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-lg pt-3 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Link to="/menu" className="flex-1">
                <Button variant="outline" className="w-full">Order More</Button>
              </Link>
              <Link to="/" className="flex-1">
                <Button variant="pizza" className="w-full">Back to Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderConfirmation;

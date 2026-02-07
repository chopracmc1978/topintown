import { Gift, Star, ArrowLeft } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCustomer } from '@/contexts/CustomerContext';
import { useRewardsByPhone, MIN_POINTS_TO_REDEEM, MAX_REDEEM_DOLLAR, MIN_REDEEM_DOLLAR, POINTS_TO_DOLLAR_RATIO } from '@/hooks/useRewards';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const Rewards = () => {
  const { customer } = useCustomer();
  const { data: rewards, isLoading } = useRewardsByPhone(customer?.phone);

  // Redirect to login if not logged in
  if (!customer) {
    return <Navigate to="/customer-login?redirect=/rewards" replace />;
  }

  const currentPoints = rewards?.points || 0;
  const lifetimePoints = rewards?.lifetime_points || 0;
  const pointsToNextReward = Math.max(0, MIN_POINTS_TO_REDEEM - (currentPoints % MIN_POINTS_TO_REDEEM));
  const progressPercent = currentPoints >= MIN_POINTS_TO_REDEEM 
    ? 100 
    : (currentPoints / MIN_POINTS_TO_REDEEM) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Back button */}
        <Link to="/my-orders" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to My Orders
        </Link>

        <Card className="max-w-xl mx-auto">
          <CardContent className="p-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Gift className="w-6 h-6" />
                My Rewards
              </h1>
              <p className="text-muted-foreground mt-1">
                Earn 1 point for every $2 spent. Redeem 200–350 points for $20–$35 off!
              </p>
            </div>

            {/* Current Points */}
            {isLoading ? (
              <div className="animate-pulse h-20 bg-muted rounded" />
            ) : (
              <div className="flex items-center gap-3">
                <Star className="w-10 h-10 text-amber-500 fill-amber-500" />
                <div>
                  <div className="text-4xl font-bold">{currentPoints}</div>
                  <div className="text-muted-foreground">Current Points</div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progressPercent} className="h-3" />
              <p className="text-sm text-muted-foreground">
                {currentPoints >= MIN_POINTS_TO_REDEEM 
                  ? `You can redeem $${MIN_REDEEM_DOLLAR}–$${Math.min(Math.floor(currentPoints / POINTS_TO_DOLLAR_RATIO), MAX_REDEEM_DOLLAR)} at checkout!`
                  : `${pointsToNextReward} more points until your next $${MIN_REDEEM_DOLLAR} reward`
                }
              </p>
            </div>

            {/* Lifetime Points */}
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-muted-foreground">Lifetime Points Earned</span>
              <span className="font-semibold">{lifetimePoints}</span>
            </div>

            {/* How it works */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">How it works:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Earn 1 point for every $2 you spend</li>
                <li>• Points are added when your order is completed</li>
                <li>• Redeem 200 points for $20 off at checkout</li>
                <li>• Maximum redemption: 350 points for $35 off per order</li>
              </ul>
            </div>

            {/* Order Now CTA */}
            <Link to="/menu" className="block">
              <Button className="w-full" size="lg">
                Start Earning Points - Order Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Rewards;

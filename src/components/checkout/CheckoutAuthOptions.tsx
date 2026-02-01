import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, UserPlus, ArrowRight, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerVerification } from './CustomerVerification';

interface CheckoutAuthOptionsProps {
  onContinueAsGuest: (customerId: string) => void;
  onBack?: () => void;
}

type Step = 'options' | 'guest-verify' | 'create-account';

export const CheckoutAuthOptions = ({ onContinueAsGuest }: CheckoutAuthOptionsProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('options');
  const [wantsAccount, setWantsAccount] = useState(false);

  const handleGuestContinue = () => {
    setWantsAccount(false);
    setStep('guest-verify');
  };

  const handleCreateAccount = () => {
    setWantsAccount(true);
    setStep('guest-verify');
  };

  const handleVerificationComplete = (customerId: string) => {
    if (wantsAccount) {
      // Redirect to set password after verification
      navigate('/customer-login?action=set-password&redirect=/checkout');
    } else {
      // Continue as guest
      onContinueAsGuest(customerId);
    }
  };

  if (step === 'guest-verify') {
    return (
      <div>
        <CustomerVerification 
          onComplete={handleVerificationComplete}
          onBack={() => setStep('options')}
          createAccount={wantsAccount}
        />
        {wantsAccount && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            After verification, you'll set a password for your account
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-serif text-xl font-semibold mb-2">How would you like to checkout?</h2>
        <p className="text-sm text-muted-foreground">
          Choose an option to continue with your order
        </p>
      </div>

      <div className="space-y-3">
        {/* Already have account - Login */}
        <Link to="/customer-login?redirect=/checkout" className="block">
          <Button 
            variant="outline" 
            className="w-full h-auto py-4 justify-between group hover:border-primary hover:bg-primary/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <LogIn className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">Login to My Account</p>
                <p className="text-xs text-muted-foreground">Already have an account? Sign in</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </Button>
        </Link>

        {/* Continue as Guest */}
        <Button 
          variant="outline" 
          className="w-full h-auto py-4 justify-between group hover:border-primary hover:bg-primary/5"
          onClick={handleGuestContinue}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="font-medium">Continue as Guest</p>
              <p className="text-xs text-muted-foreground">Quick checkout without account</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Button>

        {/* Create Account */}
        <Button 
          variant="outline" 
          className="w-full h-auto py-4 justify-between group hover:border-primary hover:bg-primary/5"
          onClick={handleCreateAccount}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="font-medium">Create an Account</p>
              <p className="text-xs text-muted-foreground">Save info for faster checkout next time</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </Button>
      </div>

      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          All payment is processed securely via credit card
        </p>
      </div>
    </div>
  );
};

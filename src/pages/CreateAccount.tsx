import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CustomerVerification } from '@/components/checkout/CustomerVerification';
import { useCustomer } from '@/contexts/CustomerContext';
import { Loader2 } from 'lucide-react';

const CreateAccount = () => {
  const navigate = useNavigate();
  const { customer } = useCustomer();

  if (customer) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Redirecting...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-2xl">Create Account</CardTitle>
            <CardDescription>Sign up to track orders & earn rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerVerification
              onComplete={() => navigate('/my-orders')}
              onBack={() => navigate('/customer-login')}
              createAccount={true}
            />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default CreateAccount;

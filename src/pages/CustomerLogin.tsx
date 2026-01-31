import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomer } from '@/contexts/CustomerContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { OtpInput } from '@/components/checkout/OtpInput';

type ViewMode = 'login' | 'forgot-email' | 'forgot-otp' | 'forgot-newpassword';

const CustomerLogin = () => {
  const navigate = useNavigate();
  const { login, customer } = useCustomer();
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot password state
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Redirect if already logged in
  if (customer) {
    navigate('/my-orders');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      
      if (result.success) {
        toast.success('Welcome back!');
        navigate('/my-orders');
      } else {
        // Show user-friendly error for wrong password
        if (result.error?.toLowerCase().includes('invalid') || result.error?.toLowerCase().includes('password')) {
          toast.error('Wrong password. Try again or use forgot password.', {
            action: {
              label: 'Forgot password?',
              onClick: () => setViewMode('forgot-email'),
            },
          });
        } else {
          toast.error(result.error || 'Login failed');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email: resetEmail.toLowerCase().trim(), type: 'email' }
      });

      if (error) throw error;

      toast.success('Verification code sent to your email');
      setViewMode('forgot-otp');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { email: resetEmail.toLowerCase().trim(), code: otp, type: 'email' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Code verified! Set your new password');
      setViewMode('forgot-newpassword');
    } catch (error: any) {
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error('Please enter and confirm your new password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { email: resetEmail.toLowerCase().trim(), newPassword }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Password updated successfully! Please sign in.');
      setViewMode('login');
      setEmail(resetEmail);
      setResetEmail('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setViewMode('login');
    setResetEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const renderLoginForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="text-right">
        <button
          type="button"
          onClick={() => setViewMode('forgot-email')}
          className="text-sm text-primary hover:underline"
        >
          Forgot password?
        </button>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </Button>
    </form>
  );

  const renderForgotEmailForm = () => (
    <form onSubmit={handleSendResetOtp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="reset-email"
            type="email"
            placeholder="you@example.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
        <p className="text-sm text-muted-foreground">
          We'll send a verification code to this email
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Sending code...
          </>
        ) : (
          'Send Verification Code'
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={handleBackToLogin}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to login
      </Button>
    </form>
  );

  const renderOtpForm = () => (
    <form onSubmit={handleVerifyOtp} className="space-y-4">
      <div className="space-y-2">
        <Label>Verification Code</Label>
        <OtpInput value={otp} onChange={setOtp} />
        <p className="text-sm text-muted-foreground text-center">
          Enter the 6-digit code sent to {resetEmail}
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Verifying...
          </>
        ) : (
          'Verify Code'
        )}
      </Button>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => setViewMode('forgot-email')}
        >
          Change email
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={handleSendResetOtp}
          disabled={loading}
        >
          Resend code
        </Button>
      </div>
    </form>
  );

  const renderNewPasswordForm = () => (
    <form onSubmit={handleResetPassword} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="new-password"
            type={showNewPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="pl-10 pr-10"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-10 pr-10"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Updating password...
          </>
        ) : (
          'Update Password'
        )}
      </Button>
    </form>
  );

  const getCardTitle = () => {
    switch (viewMode) {
      case 'forgot-email':
        return 'Forgot Password';
      case 'forgot-otp':
        return 'Verify Email';
      case 'forgot-newpassword':
        return 'Set New Password';
      default:
        return 'Customer Login';
    }
  };

  const getCardDescription = () => {
    switch (viewMode) {
      case 'forgot-email':
        return 'Enter your email to receive a verification code';
      case 'forgot-otp':
        return 'Enter the code we sent to your email';
      case 'forgot-newpassword':
        return 'Create a new password for your account';
      default:
        return 'Sign in to view your order history';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-2xl">{getCardTitle()}</CardTitle>
            <CardDescription>{getCardDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            {viewMode === 'login' && renderLoginForm()}
            {viewMode === 'forgot-email' && renderForgotEmailForm()}
            {viewMode === 'forgot-otp' && renderOtpForm()}
            {viewMode === 'forgot-newpassword' && renderNewPasswordForm()}

            {viewMode === 'login' && (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>
                  Don't have an account?{' '}
                  <Link to="/checkout" className="text-primary hover:underline">
                    Create one during checkout
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default CustomerLogin;

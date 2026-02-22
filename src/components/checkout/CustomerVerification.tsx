import { useState } from 'react';
import { Mail, Phone, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OtpInput } from './OtpInput';
import { supabase } from '@/integrations/supabase/client';
import { useCustomer } from '@/contexts/CustomerContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type VerificationStep = 'info' | 'email-otp' | 'phone-otp' | 'password' | 'complete';

export interface CustomerVerificationProps {
  onComplete: (customerId: string) => void;
  onBack: () => void;
  /** If true, will require password setup. If false (guest mode), skips password step */
  createAccount?: boolean;
}

// Password is now hashed server-side via the set-password edge function

export const CustomerVerification = ({ onComplete, onBack, createAccount = true }: CustomerVerificationProps) => {
  const { setCustomer } = useCustomer();
  const [step, setStep] = useState<VerificationStep>('info');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Form data
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // OTP data
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  
  // Customer data
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [existingCustomer, setExistingCustomer] = useState(false);

  // Cooldown timer
  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleInfoSubmit = async () => {
    if (!email || !phone || !fullName) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate phone number (minimum 10 digits)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      // Check if customer exists via edge function (avoids public SELECT on customers table)
      const { data: profileData, error: profileError } = await supabase.functions.invoke('customer-profile', {
        body: { email: email.toLowerCase().trim() },
      });

      if (profileError) throw profileError;
      if (profileData?.error) throw new Error(profileData.error);

      const existingCustomers = profileData?.customers || [];

      let custId: string;

      if (existingCustomers && existingCustomers.length > 0) {
        // Existing customer
        const existing = existingCustomers[0];
        custId = existing.id;
        setCustomerId(custId);
        setExistingCustomer(true);

        // If already fully verified and creating account, redirect to login
        if (createAccount && existing.email_verified && existing.phone_verified) {
          toast.info('Account exists. Please login to continue.');
          onBack();
          return;
        }

        // Update phone if different via edge function
        if (existing.phone !== phone) {
          const { data: updateData, error: updateError } = await supabase.functions.invoke('customer-profile', {
            body: { action: 'update', customerId: custId, phone, full_name: fullName },
          });
          if (updateError || updateData?.error) {
            console.warn('Failed to update customer phone:', updateData?.error || updateError?.message);
          }
        }
      } else {
        // Create new customer via edge function
        const { data: regData, error: regError } = await supabase.functions.invoke('customer-profile', {
          body: { action: 'register', email: email.toLowerCase().trim(), phone, fullName },
        });

        if (regError) throw regError;
        if (regData?.error) {
          if (regData.code === '23505') {
            toast.error('This email is already registered');
            return;
          }
          throw new Error(regData.error);
        }

        custId = regData.customer.id;
        setCustomerId(custId);
      }

      // Guest mode: skip OTP, just save info and continue
      if (!createAccount) {
        setCustomer({
          id: custId,
          email: email.toLowerCase().trim(),
          phone,
          fullName,
          emailVerified: false,
          phoneVerified: false,
        });
        onComplete(custId);
        return;
      }

      // Account creation: Send email OTP
      const { error: otpError } = await supabase.functions.invoke('send-otp', {
        body: { email: email.toLowerCase().trim(), type: 'email', customerId: custId },
      });

      if (otpError) throw otpError;

      toast.success('Verification code sent to your email');
      startCooldown();
      setStep('email-otp');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailOtpSubmit = async () => {
    if (emailOtp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { email: email.toLowerCase().trim(), code: emailOtp, type: 'email' },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Email verified!');
      
      // If guest mode (no account creation), complete now
      if (!createAccount) {
        // Update customer as verified (email only for guest) via edge function
        await supabase.functions.invoke('customer-profile', {
          body: { action: 'update', customerId, email_verified: true },
        });
        
        // Set customer in context (partial - no password)
        setCustomer({
          id: customerId!,
          email: email.toLowerCase().trim(),
          phone,
          fullName,
          emailVerified: true,
          phoneVerified: false,
        });
        
        onComplete(customerId!);
        return;
      }
      
      // Send phone OTP
      const { error: phoneOtpError } = await supabase.functions.invoke('send-otp', {
        body: { phone, type: 'phone', customerId },
      });

      if (phoneOtpError) {
        console.warn('Phone OTP not sent (SMS not implemented):', phoneOtpError);
      }

      startCooldown();
      setStep('phone-otp');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneOtpSubmit = async () => {
    // For now, since SMS is not implemented, we'll accept the OTP or skip
    if (phoneOtp.length !== 6) {
      // Auto-skip phone verification for now since SMS is not implemented
      toast.info('Phone verification skipped (SMS coming soon)');
      setStep('password');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone, code: phoneOtp, type: 'phone' },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Phone verified!');
      setStep('password');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Hash password server-side via edge function (pass OTP for verification)
      const { data, error } = await supabase.functions.invoke('set-password', {
        body: { customerId, password, otpCode: emailOtp || phoneOtp },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Set customer in context
      setCustomer({
        id: customerId!,
        email: email.toLowerCase().trim(),
        phone,
        fullName,
        emailVerified: true,
        phoneVerified: true,
      });

      toast.success('Account created successfully!');

      // Handle rewards account for the new customer
      const cleanPhone = phone.replace(/\D/g, '');
      const { data: existingRewards } = await supabase
        .from('customer_rewards')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existingRewards) {
        // Walk-in rewards record exists — reset balance to 0 and link to new account
        // Walk-in points do NOT carry over to the online account
        await supabase
          .from('customer_rewards')
          .update({
            customer_id: customerId,
            points: 0,
            lifetime_points: 0,
          })
          .eq('id', existingRewards.id);
      } else {
        // No walk-in record — create fresh rewards account
        await supabase
          .from('customer_rewards')
          .insert({
            phone: cleanPhone,
            customer_id: customerId,
            points: 0,
            lifetime_points: 0,
          });
      }

      setStep('complete');
      onComplete(customerId!);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async (type: 'email' | 'phone') => {
    if (resendCooldown > 0) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-otp', {
        body: {
          email: type === 'email' ? email.toLowerCase().trim() : undefined,
          phone: type === 'phone' ? phone : undefined,
          type,
          customerId,
        },
      });

      if (error) throw error;

      toast.success(`Verification code resent to your ${type}`);
      startCooldown();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  // Calculate steps for progress indicator
  const steps = createAccount 
    ? ['info', 'email-otp', 'phone-otp', 'password'] 
    : ['info'];

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, index) => (
          <div
            key={s}
            className={cn(
              'w-3 h-3 rounded-full transition-colors',
              step === s
                ? 'bg-primary'
                : steps.indexOf(step) > index
                ? 'bg-primary/50'
                : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Step: Customer Info */}
      {step === 'info' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold">
              {createAccount ? 'Create Your Account' : 'Guest Checkout'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {createAccount ? 'Enter your details to get started' : 'Enter your details to continue'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

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
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="(403) 555-1234"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleInfoSubmit} disabled={loading} className="flex-1">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Email OTP */}
      {step === 'email-otp' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold">Verify Your Email</h3>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to <strong>{email}</strong>
            </p>
          </div>

          <OtpInput value={emailOtp} onChange={setEmailOtp} disabled={loading} />

          <div className="text-center">
            <button
              onClick={() => handleResendOtp('email')}
              disabled={resendCooldown > 0 || loading}
              className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setStep('info')} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleEmailOtpSubmit} disabled={loading || emailOtp.length !== 6} className="flex-1">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Verify
                  <Check className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Phone OTP */}
      {step === 'phone-otp' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold">Verify Your Phone</h3>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to <strong>{phone}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-1">(SMS not yet available - you can skip this step)</p>
          </div>

          <OtpInput value={phoneOtp} onChange={setPhoneOtp} disabled={loading} />

          <div className="text-center">
            <button
              onClick={() => handleResendOtp('phone')}
              disabled={resendCooldown > 0 || loading}
              className="text-sm text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setStep('email-otp')} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handlePhoneOtpSubmit} disabled={loading} className="flex-1">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {phoneOtp.length === 6 ? 'Verify' : 'Skip'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Password */}
      {step === 'password' && (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold">Create Password</h3>
            <p className="text-sm text-muted-foreground">
              Set a password to access your order history next time
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setStep('phone-otp')} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handlePasswordSubmit} disabled={loading} className="flex-1">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Complete
                  <Check className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

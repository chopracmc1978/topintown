import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Lock, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomer } from '@/contexts/CustomerContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OtpInput } from '@/components/checkout/OtpInput';

const Profile = () => {
  const navigate = useNavigate();
  const { customer, loading: customerLoading, refreshCustomer, logout } = useCustomer();
  const { toast } = useToast();

  // Phone change state
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneStep, setPhoneStep] = useState<'idle' | 'otp' | 'success'>('idle');
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Redirect if not logged in
  if (!customerLoading && !customer) {
    navigate('/customer-login');
    return null;
  }

  if (customerLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  const handleSendPhoneOtp = async () => {
    if (!newPhone || newPhone.length < 10) {
      toast({ title: 'Error', description: 'Please enter a valid phone number', variant: 'destructive' });
      return;
    }

    setPhoneLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone: newPhone, type: 'phone', customerId: customer?.id },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to send OTP');
      }

      setPhoneStep('otp');
      toast({ title: 'OTP Sent', description: 'A verification code has been sent to your new phone number.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.length !== 6) {
      toast({ title: 'Error', description: 'Please enter the 6-digit code', variant: 'destructive' });
      return;
    }

    setPhoneLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone: newPhone, code: phoneOtp, type: 'phone' },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Invalid verification code');
      }

      // Update customer phone in database
      const { error: updateError } = await supabase
        .from('customers')
        .update({ phone: newPhone, phone_verified: true })
        .eq('id', customer?.id);

      if (updateError) {
        throw new Error('Failed to update phone number');
      }

      await refreshCustomer();
      setPhoneStep('success');
      toast({ title: 'Success', description: 'Your phone number has been updated!' });
      
      // Reset after success
      setTimeout(() => {
        setPhoneStep('idle');
        setNewPhone('');
        setPhoneOtp('');
      }, 2000);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Error', description: 'New password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setPasswordLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { email: customer?.email, newPassword },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Failed to change password');
      }

      toast({ title: 'Success', description: 'Your password has been updated!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate('/my-orders')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-serif text-3xl font-bold text-foreground">My Profile</h1>
              <p className="text-muted-foreground">{customer?.email}</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{customer?.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Current Phone</Label>
                  <p className="font-medium">{customer?.phone || 'Not set'}</p>
                  {customer?.phoneVerified && (
                    <span className="text-xs text-green-600 flex items-center gap-1 mt-1">
                      <CheckCircle className="w-3 h-3" /> Verified
                    </span>
                  )}
                </div>
                {customer?.fullName && (
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="font-medium">{customer.fullName}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Change Phone */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Change Phone Number
                </CardTitle>
                <CardDescription>
                  Update your phone number with verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {phoneStep === 'idle' && (
                  <>
                    <div>
                      <Label htmlFor="newPhone">New Phone Number</Label>
                      <Input
                        id="newPhone"
                        type="tel"
                        placeholder="Enter new phone number"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleSendPhoneOtp} disabled={phoneLoading || !newPhone}>
                      {phoneLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Send Verification Code
                    </Button>
                  </>
                )}

                {phoneStep === 'otp' && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code sent to {newPhone}
                    </p>
                    <OtpInput value={phoneOtp} onChange={setPhoneOtp} disabled={phoneLoading} />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setPhoneStep('idle')} disabled={phoneLoading}>
                        Cancel
                      </Button>
                      <Button onClick={handleVerifyPhoneOtp} disabled={phoneLoading || phoneOtp.length !== 6}>
                        {phoneLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Verify
                      </Button>
                    </div>
                  </>
                )}

                {phoneStep === 'success' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    Phone number updated successfully!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your account password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleChangePassword} 
                  disabled={passwordLoading || !newPassword || !confirmPassword}
                >
                  {passwordLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Password
                </Button>
              </CardContent>
            </Card>

            {/* Logout */}
            <Card>
              <CardContent className="pt-6">
                <Button 
                  variant="outline" 
                  className="w-full text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                >
                  Log Out
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;

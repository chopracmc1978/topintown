import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, Lock, ArrowLeft, Loader2, CheckCircle, Gift, Star, History } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCustomer } from '@/contexts/CustomerContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OtpInput } from '@/components/checkout/OtpInput';
import { 
  useRewardsByPhone, 
  useRewardsHistory, 
  MIN_POINTS_TO_REDEEM, 
  canRedeemRewards,
  calculateRewardDollarValue,
  POINTS_PER_DOLLAR
} from '@/hooks/useRewards';

const Profile = () => {
  const navigate = useNavigate();
  const { customer, loading: customerLoading, refreshCustomer, logout } = useCustomer();
  const { toast } = useToast();

  // Rewards data
  const { data: rewards, isLoading: rewardsLoading } = useRewardsByPhone(customer?.phone);
  const { data: rewardsHistory } = useRewardsHistory(customer?.phone);

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
      // Use set-password for authenticated profile password changes (no OTP needed)
      const { data, error } = await supabase.functions.invoke('set-password', {
        body: { customerId: customer?.id, password: newPassword },
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

  const currentPoints = rewards?.points || 0;
  const lifetimePoints = rewards?.lifetime_points || 0;
  const progressToReward = Math.min((currentPoints / MIN_POINTS_TO_REDEEM) * 100, 100);
  const pointsNeeded = Math.max(0, MIN_POINTS_TO_REDEEM - currentPoints);
  const canRedeem = canRedeemRewards(currentPoints);
  const redeemableValue = calculateRewardDollarValue(currentPoints);

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
            {/* Rewards Card */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Gift className="w-5 h-5" />
                  My Rewards
                </CardTitle>
                <CardDescription>
                  Earn 1 point for every $2 spent. Redeem 200 points for $20 off!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {rewardsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Points Display */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
                        <div>
                          <p className="text-3xl font-bold text-foreground">{currentPoints}</p>
                          <p className="text-sm text-muted-foreground">Current Points</p>
                        </div>
                      </div>
                      {canRedeem && (
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg text-sm font-medium">
                          ${redeemableValue} Available!
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <Progress value={progressToReward} className="h-3" />
                      {!canRedeem ? (
                        <p className="text-sm text-muted-foreground">
                          {pointsNeeded} more points until your next $20 reward
                        </p>
                      ) : (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          🎉 You can redeem your rewards at checkout!
                        </p>
                      )}
                    </div>

                    {/* Lifetime Stats */}
                    <div className="flex justify-between pt-2 border-t border-border text-sm">
                      <span className="text-muted-foreground">Lifetime Points Earned</span>
                      <span className="font-medium">{lifetimePoints}</span>
                    </div>

                    {/* How it works */}
                    <div className="bg-background/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">How it works:</p>
                      <p>• Earn 1 point for every $2 you spend</p>
                      <p>• Points are added when your order is completed</p>
                      <p>• Redeem 200 points for $20 off at checkout</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Rewards History */}
            {rewardsHistory && rewardsHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="w-4 h-4" />
                    Recent Rewards Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {rewardsHistory.slice(0, 10).map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={item.points_change > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {item.points_change > 0 ? '+' : ''}{item.points_change}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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

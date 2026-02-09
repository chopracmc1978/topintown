import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/logo.png';

interface POSLoginScreenProps {
  onLoginSuccess: () => void;
}

export const POSLoginScreen = ({ onLoginSuccess }: POSLoginScreenProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password) {
      toast({
        title: 'Error',
        description: 'Please enter username and password',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('username-login', {
        body: {
          username: username.trim(),
          password,
        },
      });

      if (error) {
        throw new Error(error.message || 'Login failed');
      }

      const accessToken = data?.session?.access_token as string | undefined;
      const refreshToken = data?.session?.refresh_token as string | undefined;
      
      if (!accessToken || !refreshToken) {
        throw new Error('Invalid username or password');
      }

      // Save location ID for POS
      if (data?.locationId) {
        localStorage.setItem('pos_location_id', data.locationId);
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (setSessionError) throw setSessionError;

      toast({ title: 'Welcome!', description: 'Successfully logged in.' });
      onLoginSuccess();
    } catch (error: unknown) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : 'Invalid credentials';
      toast({
        title: 'Login Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 pos-no-focus-ring" style={{ backgroundColor: '#0891b2' }}>
      <Card className="w-full max-w-md relative overflow-hidden" style={{ backgroundColor: '#e8f4fc' }}>
        {/* Shield layer for legacy Android WebView opacity */}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#e8f4fc', zIndex: 0 }} />
        <CardHeader className="text-center relative" style={{ zIndex: 1, backgroundColor: '#e8f4fc' }}>
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Top In Town Pizza" className="w-20 h-20 object-contain" />
          </div>
          <CardTitle className="font-serif text-2xl">Top In Town Pizza POS</CardTitle>
          <CardDescription>
            Sign in with your staff account to access the point of sale
          </CardDescription>
        </CardHeader>
        <CardContent className="relative" style={{ zIndex: 1, backgroundColor: '#e8f4fc' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

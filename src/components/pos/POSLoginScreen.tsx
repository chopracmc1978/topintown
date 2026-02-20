import { useState, useRef } from 'react';
import { Loader2, Delete } from 'lucide-react';
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
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

  // Numeric keypad handler
  const handleKeyPress = (key: string) => {
    if (key === 'C') {
      setPassword('');
    } else if (key === 'DEL') {
      setPassword(prev => prev.slice(0, -1));
    } else if (key === 'OK') {
      handleSubmit();
    } else {
      setPassword(prev => prev + key);
    }
  };

  const KEYPAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.'];

  return (
    <div className="fixed inset-0 flex items-start justify-center p-4 pt-8 pos-no-focus-ring overflow-auto" style={{ backgroundColor: '#0891b2' }}>
      <Card className="w-full max-w-md relative overflow-hidden" style={{ backgroundColor: '#e8f4fc' }}>
        {/* Shield layer for legacy Android WebView opacity */}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#e8f4fc', zIndex: 0 }} />
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
              <Label htmlFor="password-display">Password</Label>
              {/* Read-only display so native keyboard doesn't open */}
              <div
                className="flex items-center w-full rounded-md border px-3 py-2 text-base min-h-[40px]"
                style={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
              >
                {password ? '•'.repeat(password.length) : <span style={{ color: '#9ca3af' }}>••••••••</span>}
              </div>
            </div>

            {/* Built-in numeric keypad */}
            <div className="rounded-lg p-2 space-y-1.5" style={{ backgroundColor: 'hsl(220, 25%, 18%)' }}>
              <div className="grid grid-cols-3 gap-1.5">
                {KEYPAD_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeyPress(key)}
                    className="h-12 rounded-md text-lg font-semibold transition-colors"
                    style={{
                      backgroundColor: 'hsl(220, 22%, 28%)',
                      color: key === 'C' ? '#ef4444' : '#e2e8f0',
                      border: key === 'C' ? '1px solid #ef4444' : '1px solid hsl(220, 20%, 35%)',
                    }}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleKeyPress('DEL')}
                  className="h-12 rounded-md text-base font-medium flex items-center justify-center gap-1"
                  style={{ backgroundColor: 'hsl(220, 22%, 28%)', color: '#fb923c', border: '1px solid hsl(220, 20%, 35%)' }}
                >
                  <Delete className="w-4 h-4" />
                  Del
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress('OK')}
                  disabled={loading}
                  className="col-span-2 h-12 rounded-md text-base font-bold transition-colors"
                  style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                >
                  {loading ? 'Signing in...' : 'OK'}
                </button>
              </div>
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
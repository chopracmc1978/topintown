import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      backgroundColor: '#1a8ccc'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        padding: '32px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img 
            src={logo} 
            alt="Top In Town Pizza" 
            style={{ width: '80px', height: '80px', objectFit: 'contain', margin: '0 auto 16px' }} 
          />
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: '#1a1a1a',
            fontFamily: 'Playfair Display, serif',
            marginBottom: '8px'
          }}>
            Top In Town Pizza POS
          </h1>
          <p style={{ fontSize: '14px', color: '#666666' }}>
            Sign in with your staff account to access the point of sale
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="username" 
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '6px' }}
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label 
              htmlFor="password" 
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#333', marginBottom: '6px' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#ffffff',
              backgroundColor: loading ? '#6bb8de' : '#1a8ccc',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <Loader2 style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

import { useState } from 'react';
import { Delete, Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png';
import type { POSStaffMember } from '@/hooks/usePOSStaff';

interface POSStaffPinScreenProps {
  locationName: string;
  onPinVerified: (staff: POSStaffMember) => void;
  onBack: () => void;
  verifyPin: (pin: string) => Promise<POSStaffMember | null>;
}

const KEYPAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.'];

export const POSStaffPinScreen = ({ locationName, onPinVerified, onBack, verifyPin }: POSStaffPinScreenProps) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleKeyPress = async (key: string) => {
    setError('');
    if (key === 'C') {
      setPin('');
    } else if (key === 'DEL') {
      setPin(prev => prev.slice(0, -1));
    } else if (key === 'OK') {
      if (!pin) {
        setError('Enter your PIN');
        return;
      }
      setLoading(true);
      try {
        const staff = await verifyPin(pin);
        if (staff) {
          onPinVerified(staff);
        } else {
          setError('Invalid PIN');
          setPin('');
        }
      } finally {
        setLoading(false);
      }
    } else {
      setPin(prev => prev + key);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'hsl(220, 26%, 14%)' }}>
      <div className="w-full max-w-xs space-y-4 text-center">
        {/* Logo & Location */}
        <div className="space-y-2">
          <img src={logo} alt="Logo" className="w-16 h-16 mx-auto object-contain" />
          <h2 className="text-lg font-serif font-bold" style={{ color: '#e2e8f0' }}>{locationName}</h2>
          <p className="text-sm" style={{ color: '#94a3b8' }}>Enter your PIN to clock in</p>
        </div>

        {/* PIN Display */}
        <div
          className="flex items-center justify-center w-full rounded-md border px-3 py-3 text-2xl tracking-[0.5em] min-h-[48px] font-mono"
          style={{ backgroundColor: 'hsl(220, 22%, 22%)', borderColor: 'hsl(220, 20%, 35%)', color: '#e2e8f0' }}
        >
          {pin ? '•'.repeat(pin.length) : <span style={{ color: '#64748b' }}>----</span>}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm font-medium" style={{ color: '#ef4444' }}>{error}</p>
        )}

        {/* Keypad */}
        <div className="rounded-lg p-2 space-y-1.5" style={{ backgroundColor: 'hsl(220, 25%, 18%)' }}>
          <div className="grid grid-cols-3 gap-1.5">
            {KEYPAD_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyPress(key)}
                className="h-14 rounded-md text-xl font-semibold transition-colors active:scale-95"
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
              className="h-14 rounded-md text-base font-medium flex items-center justify-center gap-1"
              style={{ backgroundColor: 'hsl(220, 22%, 28%)', color: '#fb923c', border: '1px solid hsl(220, 20%, 35%)' }}
            >
              <Delete className="w-5 h-5" />
              Del
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('OK')}
              disabled={loading}
              className="col-span-2 h-14 rounded-md text-lg font-bold transition-colors active:scale-95"
              style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'OK'}
            </button>
          </div>
        </div>

        {/* Back / Logout */}
        <button
          onClick={onBack}
          className="text-sm underline"
          style={{ color: '#64748b' }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

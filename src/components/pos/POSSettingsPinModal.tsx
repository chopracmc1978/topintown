import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Settings, Lock } from 'lucide-react';

interface POSSettingsPinModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin: string;
}

export const POSSettingsPinModal = ({ open, onClose, onSuccess, correctPin }: POSSettingsPinModalProps) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (open) {
      setPin('');
      setError(false);
    }
  }, [open]);

  const handleKeyPress = (key: string) => {
    setError(false);
    if (key === 'C') {
      setPin('');
    } else if (key === 'DEL') {
      setPin(prev => prev.slice(0, -1));
    } else if (key === 'OK') {
      if (pin === correctPin) {
        onSuccess();
      } else {
        setError(true);
        setPin('');
      }
    } else {
      if (pin.length < 8) {
        setPin(prev => prev + key);
      }
    }
  };

  const keys = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['C', '0', '.'],
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="sm:max-w-[340px] p-0 border-0 overflow-hidden"
        style={{ backgroundColor: 'hsl(220, 26%, 14%)', color: '#e2e8f0' }}
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-center text-lg font-bold flex items-center justify-center gap-2" style={{ color: '#e2e8f0' }}>
            <Lock className="w-5 h-5" />
            Settings PIN
          </DialogTitle>
          <DialogDescription className="text-center text-sm" style={{ color: '#94a3b8' }}>
            Enter PIN to access settings
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-4">
          {/* PIN display */}
          <div
            className="text-center py-3 rounded-lg text-2xl font-mono tracking-[0.5em] min-h-[52px] flex items-center justify-center"
            style={{
              backgroundColor: 'hsl(220, 25%, 18%)',
              border: error ? '2px solid #ef4444' : '2px solid hsl(220, 20%, 28%)',
              color: '#e2e8f0',
            }}
          >
            {pin ? '•'.repeat(pin.length) : ''}
          </div>

          {error && (
            <p className="text-center text-sm font-medium" style={{ color: '#ef4444' }}>
              Incorrect PIN
            </p>
          )}

          {/* Numeric keypad */}
          <div className="space-y-2">
            {keys.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-3 gap-2">
                {row.map(key => (
                  <button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className="h-14 rounded-lg text-xl font-semibold transition-all active:scale-95"
                    style={{
                      backgroundColor: key === 'C'
                        ? 'hsl(220, 25%, 20%)'
                        : 'hsl(220, 25%, 20%)',
                      color: key === 'C' ? '#ef4444' : '#e2e8f0',
                      border: key === 'C' ? '1px solid #ef4444' : '1px solid hsl(220, 20%, 28%)',
                    }}
                  >
                    {key}
                  </button>
                ))}
              </div>
            ))}

            {/* Bottom row: Del + OK */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleKeyPress('DEL')}
                className="h-14 rounded-lg text-lg font-semibold transition-all active:scale-95 flex items-center justify-center gap-1"
                style={{
                  backgroundColor: 'hsl(220, 25%, 20%)',
                  color: '#e2e8f0',
                  border: '1px solid hsl(220, 20%, 28%)',
                }}
              >
                ⌫ Del
              </button>
              <button
                onClick={() => handleKeyPress('OK')}
                className="h-14 rounded-lg text-lg font-bold transition-all active:scale-95"
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: '1px solid #3b82f6',
                }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

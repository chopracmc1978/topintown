import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';

const CAPTCHA_LENGTH = 5;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const COLORS = [
  'hsl(25, 80%, 50%)',   // orange
  'hsl(160, 60%, 40%)',  // teal
  'hsl(270, 60%, 50%)',  // purple
  'hsl(200, 70%, 45%)',  // blue
  'hsl(340, 70%, 50%)',  // pink
  'hsl(45, 80%, 45%)',   // gold
];

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

interface CaptchaWidgetProps {
  onVerify: (isValid: boolean) => void;
  error?: string;
}

const CaptchaWidget = ({ onVerify, error }: CaptchaWidgetProps) => {
  const [code, setCode] = useState(generateCode);
  const [userInput, setUserInput] = useState('');

  const refresh = useCallback(() => {
    setCode(generateCode());
    setUserInput('');
    onVerify(false);
  }, [onVerify]);

  useEffect(() => {
    onVerify(userInput.length === CAPTCHA_LENGTH && userInput === code);
  }, [userInput, code, onVerify]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Captcha display */}
      <div
        className="flex items-center justify-center gap-0.5 px-4 py-2.5 rounded-lg bg-muted/50 border border-border select-none min-w-[140px]"
        aria-hidden="true"
        style={{ letterSpacing: '3px', fontFamily: 'monospace' }}
      >
        {code.split('').map((char, i) => (
          <span
            key={i}
            className="text-xl font-bold"
            style={{
              color: COLORS[i % COLORS.length],
              transform: `rotate(${Math.floor(Math.random() * 20 - 10)}deg)`,
              display: 'inline-block',
            }}
          >
            {char}
          </span>
        ))}
      </div>

      {/* Refresh */}
      <button
        type="button"
        onClick={refresh}
        className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
        aria-label="Refresh captcha"
      >
        <RefreshCw className="w-5 h-5" />
      </button>

      {/* Input */}
      <Input
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="CODE"
        maxLength={CAPTCHA_LENGTH}
        className={`w-[120px] uppercase tracking-widest ${error ? 'border-destructive' : ''}`}
        autoComplete="off"
      />
    </div>
  );
};

export default CaptchaWidget;

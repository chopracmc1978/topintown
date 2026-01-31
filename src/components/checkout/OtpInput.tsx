import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const OtpInput = ({ length = 6, value, onChange, disabled = false }: OtpInputProps) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [localValues, setLocalValues] = useState<string[]>(value.split('').concat(Array(length - value.length).fill('')));

  useEffect(() => {
    const newValues = value.split('').concat(Array(length - value.length).fill(''));
    setLocalValues(newValues.slice(0, length));
  }, [value, length]);

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return; // Only allow digits

    const newValues = [...localValues];
    newValues[index] = char.slice(-1); // Take only the last character
    setLocalValues(newValues);
    onChange(newValues.join(''));

    // Move to next input if character was entered
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !localValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const newValues = pastedData.split('').concat(Array(length - pastedData.length).fill(''));
    setLocalValues(newValues);
    onChange(newValues.join(''));
    
    // Focus the appropriate input after paste
    const focusIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }, (_, index) => (
        <Input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={localValues[index]}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-12 h-12 text-center text-xl font-bold"
        />
      ))}
    </div>
  );
};

import { useState } from 'react';
import { Tag, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useValidateCoupon, Coupon } from '@/hooks/useCoupons';

interface CouponFieldProps {
  subtotal: number;
  onApply: (coupon: Coupon, discount: number) => void;
  onRemove: () => void;
  appliedCoupon: Coupon | null;
  appliedDiscount: number;
  disabledByRewards?: boolean;
}

const CouponField = ({ 
  subtotal, 
  onApply, 
  onRemove, 
  appliedCoupon, 
  appliedDiscount,
  disabledByRewards = false,
}: CouponFieldProps) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const validateCoupon = useValidateCoupon();

  const handleApply = async () => {
    if (!code.trim()) return;
    
    setError('');
    try {
      const result = await validateCoupon.mutateAsync({ 
        code: code.trim(), 
        subtotal 
      });
      onApply(result.coupon, result.discount);
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid coupon');
    }
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <span className="font-mono font-semibold text-green-700">
            {appliedCoupon.code}
          </span>
          <span className="text-sm text-green-600">
            (-${appliedDiscount.toFixed(2)})
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-green-600 hover:text-red-600 hover:bg-red-50"
          onClick={onRemove}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (disabledByRewards) {
    return (
      <div className="p-3 bg-secondary/50 border border-border rounded-lg">
        <p className="text-sm text-muted-foreground">
          Coupons cannot be used when reward points are applied. Remove rewards first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Enter coupon code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className="pl-9 font-mono"
          />
        </div>
        <Button 
          onClick={handleApply}
          disabled={!code.trim() || validateCoupon.isPending}
          variant="outline"
        >
          {validateCoupon.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Apply'
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};

export default CouponField;

import { Tag, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useHomepageCoupons } from '@/hooks/useCoupons';
import { toast } from 'sonner';

const PromoBar = () => {
  const { data: coupons, isLoading } = useHomepageCoupons();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (isLoading || !coupons || coupons.length === 0) {
    return null;
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied code: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="bg-gradient-to-r from-primary to-[hsl(200,70%,45%)] text-white py-3">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm md:text-base">
          {coupons.map((coupon) => (
            <button
              key={coupon.id}
              onClick={() => handleCopy(coupon.code)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors group"
            >
              <Tag className="w-4 h-4" />
              <span>
                {coupon.description || 
                  (coupon.discount_type === 'percentage' 
                    ? `${coupon.discount_value}% OFF` 
                    : `$${coupon.discount_value} OFF`
                  )
                }
              </span>
              <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
                {coupon.code}
              </span>
              {copiedCode === coupon.code ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromoBar;

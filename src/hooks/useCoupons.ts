import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  show_on_homepage: boolean;
  created_at: string;
  updated_at: string;
}

export const useCoupons = () => {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Coupon[];
    },
  });
};

export const useHomepageCoupons = () => {
  return useQuery({
    queryKey: ['homepage-coupons'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('is_active', true)
        .eq('show_on_homepage', true)
        .lte('starts_at', now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Coupon[];
    },
  });
};

export const useValidateCoupon = () => {
  return useMutation({
    mutationFn: async ({ code, subtotal }: { code: string; subtotal: number }) => {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('is_active', true)
        .lte('starts_at', now)
        .single();
      
      if (error || !data) {
        throw new Error('Invalid coupon code');
      }
      
      const coupon = data as Coupon;
      
      // Check expiry
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        throw new Error('This coupon has expired');
      }
      
      // Check usage limit
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        throw new Error('This coupon has reached its usage limit');
      }
      
      // Check minimum order amount
      if (subtotal < coupon.min_order_amount) {
        throw new Error(`Minimum order of $${coupon.min_order_amount.toFixed(2)} required`);
      }
      
      // Calculate discount
      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = (subtotal * coupon.discount_value) / 100;
        if (coupon.max_discount_amount && discount > coupon.max_discount_amount) {
          discount = coupon.max_discount_amount;
        }
      } else {
        discount = coupon.discount_value;
      }
      
      // Don't allow discount greater than subtotal
      if (discount > subtotal) {
        discount = subtotal;
      }
      
      return { coupon, discount };
    },
  });
};

export const useCreateCoupon = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (coupon: Partial<Coupon>) => {
      const insertData = {
        code: coupon.code?.toUpperCase().trim() || '',
        description: coupon.description,
        discount_type: coupon.discount_type || 'percentage',
        discount_value: coupon.discount_value || 0,
        min_order_amount: coupon.min_order_amount,
        max_discount_amount: coupon.max_discount_amount,
        usage_limit: coupon.usage_limit,
        is_active: coupon.is_active,
        show_on_homepage: coupon.show_on_homepage,
        expires_at: coupon.expires_at,
      };
      
      const { data, error } = await supabase
        .from('coupons')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useUpdateCoupon = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Coupon> & { id: string }) => {
      const { data, error } = await supabase
        .from('coupons')
        .update({
          ...updates,
          code: updates.code?.toUpperCase().trim(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useDeleteCoupon = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success('Coupon deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

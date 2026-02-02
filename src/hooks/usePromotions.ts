import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Promotion {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  price_suffix: string | null;
  coupon_code: string | null;
  image_url: string | null;
  background_color: string;
  text_color: string;
  badge_text: string | null;
  layout: 'horizontal' | 'card' | 'featured';
  show_order_button: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const usePromotions = () => {
  return useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Promotion[];
    },
  });
};

export const useActivePromotions = () => {
  return useQuery({
    queryKey: ['active-promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Promotion[];
    },
  });
};

export const useCreatePromotion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (promotion: Partial<Promotion>) => {
      const { data, error } = await supabase
        .from('promotions')
        .insert({
          title: promotion.title || '',
          subtitle: promotion.subtitle,
          description: promotion.description,
          price: promotion.price || 0,
          price_suffix: promotion.price_suffix,
          coupon_code: promotion.coupon_code?.toUpperCase().trim(),
          image_url: promotion.image_url,
          background_color: promotion.background_color || '#dc2626',
          text_color: promotion.text_color || '#ffffff',
          badge_text: promotion.badge_text,
          layout: promotion.layout || 'horizontal',
          show_order_button: promotion.show_order_button ?? true,
          is_active: promotion.is_active ?? true,
          sort_order: promotion.sort_order || 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      toast.success('Promotion created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useUpdatePromotion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Promotion> & { id: string }) => {
      const { data, error } = await supabase
        .from('promotions')
        .update({
          ...updates,
          coupon_code: updates.coupon_code?.toUpperCase().trim(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      toast.success('Promotion updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useDeletePromotion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['active-promotions'] });
      toast.success('Promotion deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const uploadPromotionImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  
  const { error: uploadError } = await supabase.storage
    .from('promotion-images')
    .upload(fileName, file);
  
  if (uploadError) throw uploadError;
  
  const { data } = supabase.storage
    .from('promotion-images')
    .getPublicUrl(fileName);
  
  return data.publicUrl;
};

export const deletePromotionImage = async (imageUrl: string) => {
  const fileName = imageUrl.split('/').pop();
  if (!fileName) return;
  
  await supabase.storage
    .from('promotion-images')
    .remove([fileName]);
};

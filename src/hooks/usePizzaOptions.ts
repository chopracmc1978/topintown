import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CrustOption {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
}

export interface SizeCrustAvailability {
  id: string;
  size_name: string;
  crust_id: string;
  crust?: CrustOption;
}

export interface CheeseOption {
  id: string;
  name: string;
  price_regular: number;
  price_extra: number;
  is_default: boolean;
  is_available: boolean;
  sort_order: number;
}

export interface FreeTopping {
  id: string;
  name: string;
  is_available: boolean;
  sort_order: number;
}

export interface SauceOption {
  id: string;
  sauce_group_id: string;
  name: string;
  is_free: boolean;
  price: number;
  has_spicy_option: boolean;
  is_available: boolean;
  sort_order: number;
}

export const useCrustOptions = () => {
  return useQuery({
    queryKey: ['crust_options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crust_options')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as CrustOption[];
    },
  });
};

export const useSizeCrustAvailability = () => {
  return useQuery({
    queryKey: ['size_crust_availability'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('size_crust_availability')
        .select(`
          *,
          crust:crust_options(*)
        `);

      if (error) throw error;
      return data as SizeCrustAvailability[];
    },
  });
};

export const useCheeseOptions = () => {
  return useQuery({
    queryKey: ['cheese_options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cheese_options')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as CheeseOption[];
    },
  });
};

export const useFreeToppings = () => {
  return useQuery({
    queryKey: ['free_toppings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('free_toppings')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as FreeTopping[];
    },
  });
};

export const useAllSauces = () => {
  return useQuery({
    queryKey: ['all_sauces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sauce_options')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as SauceOption[];
    },
  });
};

// Get available crusts for a specific size
export const getCrustsForSize = (
  sizeCrustAvailability: SizeCrustAvailability[] | undefined,
  sizeName: string
): CrustOption[] => {
  if (!sizeCrustAvailability) return [];
  
  return sizeCrustAvailability
    .filter((sca) => sca.size_name === sizeName && sca.crust)
    .map((sca) => sca.crust!)
    .sort((a, b) => a.sort_order - b.sort_order);
};

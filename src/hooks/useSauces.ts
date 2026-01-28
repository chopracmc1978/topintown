import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SpicyLevel = 'none' | 'mild' | 'medium' | 'hot';

export interface SauceGroup {
  id: string;
  menu_item_id: string;
  name: string;
  min_selection: number;
  max_selection: number;
  sort_order: number;
  created_at: string;
  sauce_options?: SauceOption[];
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
  created_at: string;
}

export const useSauceGroups = (menuItemId?: string) => {
  return useQuery({
    queryKey: ['sauce_groups', menuItemId],
    queryFn: async () => {
      let query = supabase
        .from('sauce_groups')
        .select(`
          *,
          sauce_options(*)
        `)
        .order('sort_order', { ascending: true });

      if (menuItemId) {
        query = query.eq('menu_item_id', menuItemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SauceGroup[];
    },
    enabled: menuItemId !== undefined || menuItemId === undefined,
  });
};

export const useCreateSauceGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (group: Omit<SauceGroup, 'id' | 'created_at' | 'sauce_options'>) => {
      const { data, error } = await supabase
        .from('sauce_groups')
        .insert(group)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sauce_groups'] });
      toast({ title: 'Success', description: 'Sauce group created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateSauceGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SauceGroup> & { id: string }) => {
      const { data, error } = await supabase
        .from('sauce_groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sauce_groups'] });
      toast({ title: 'Success', description: 'Sauce group updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteSauceGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sauce_groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sauce_groups'] });
      toast({ title: 'Success', description: 'Sauce group deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useCreateSauceOption = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (option: Omit<SauceOption, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('sauce_options')
        .insert(option)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sauce_groups'] });
      toast({ title: 'Success', description: 'Sauce option created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateSauceOption = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SauceOption> & { id: string }) => {
      const { data, error } = await supabase
        .from('sauce_options')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sauce_groups'] });
      toast({ title: 'Success', description: 'Sauce option updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteSauceOption = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sauce_options').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sauce_groups'] });
      toast({ title: 'Success', description: 'Sauce option deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const SPICY_LEVELS: { value: SpicyLevel; label: string }[] = [
  { value: 'none', label: 'No Spicy' },
  { value: 'mild', label: 'Mild' },
  { value: 'medium', label: 'Medium' },
  { value: 'hot', label: 'Hot' },
];

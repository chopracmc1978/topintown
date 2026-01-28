import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GlobalSauce {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
  created_at: string;
}

export const useGlobalSauces = () => {
  return useQuery({
    queryKey: ['global_sauces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_sauces')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as GlobalSauce[];
    },
  });
};

export const useCreateGlobalSauce = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sauce: Omit<GlobalSauce, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('global_sauces')
        .insert(sauce)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global_sauces'] });
      toast({ title: 'Success', description: 'Sauce created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateGlobalSauce = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GlobalSauce> & { id: string }) => {
      const { data, error } = await supabase
        .from('global_sauces')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global_sauces'] });
      toast({ title: 'Success', description: 'Sauce updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteGlobalSauce = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('global_sauces').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global_sauces'] });
      toast({ title: 'Success', description: 'Sauce deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

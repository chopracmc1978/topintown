import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LocationRow {
  id: string;
  name: string;
  short_name: string;
  address: string;
  city: string;
  phone: string;
  lat: number;
  lng: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useLocations = () => {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      // Use rpc or raw query to get all locations for admin (including inactive)
      const { data, error } = await supabase
        .from('locations' as any)
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data as any[]) as LocationRow[];
    },
  });
};

export const useActiveLocations = () => {
  return useQuery({
    queryKey: ['locations', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data as any[]) as LocationRow[];
    },
  });
};

export const useCreateLocation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (location: Partial<LocationRow> & { id: string; name: string; short_name: string; address: string }) => {
      const { error } = await supabase
        .from('locations' as any)
        .insert(location as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'Location created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

export const useUpdateLocation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LocationRow> & { id: string }) => {
      const { error } = await supabase
        .from('locations' as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'Location updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

export const useDeleteLocation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('locations' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast({ title: 'Location deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
};

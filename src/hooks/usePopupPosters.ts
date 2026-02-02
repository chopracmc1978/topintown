import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PopupPoster {
  id: string;
  title: string | null;
  image_url: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Check if poster is currently visible based on dates
export const isPosterVisible = (poster: PopupPoster): boolean => {
  if (!poster.is_active) return false;
  
  const now = new Date();
  
  if (poster.start_date && new Date(poster.start_date) > now) {
    return false;
  }
  
  if (poster.end_date && new Date(poster.end_date) < now) {
    return false;
  }
  
  return true;
};

export const usePopupPosters = () => {
  return useQuery({
    queryKey: ['popup-posters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('popup_posters')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as PopupPoster[];
    },
  });
};

export const useActivePopupPosters = () => {
  return useQuery({
    queryKey: ['active-popup-posters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('popup_posters')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      // Filter by dates
      return (data as PopupPoster[]).filter(isPosterVisible);
    },
  });
};

export const useCreatePopupPoster = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (poster: Omit<PopupPoster, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('popup_posters')
        .insert(poster)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popup-posters'] });
      queryClient.invalidateQueries({ queryKey: ['active-popup-posters'] });
      toast.success('Poster added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add poster: ' + error.message);
    },
  });
};

export const useUpdatePopupPoster = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PopupPoster> & { id: string }) => {
      const { error } = await supabase
        .from('popup_posters')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popup-posters'] });
      queryClient.invalidateQueries({ queryKey: ['active-popup-posters'] });
      toast.success('Poster updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update poster: ' + error.message);
    },
  });
};

export const useDeletePopupPoster = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('popup_posters')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popup-posters'] });
      queryClient.invalidateQueries({ queryKey: ['active-popup-posters'] });
      toast.success('Poster deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete poster: ' + error.message);
    },
  });
};

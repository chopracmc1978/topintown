import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RewardSettings {
  id: string;
  is_enabled: boolean;
  dollars_per_point: number;
  points_per_dollar: number;
  min_points_to_redeem: number;
  max_points_per_order: number;
  created_at: string;
  updated_at: string;
}

export const useRewardSettings = () => {
  return useQuery({
    queryKey: ['reward-settings'],
    queryFn: async (): Promise<RewardSettings> => {
      const { data, error } = await supabase
        .from('reward_settings' as any)
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as any as RewardSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUpdateRewardSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<RewardSettings> & { id: string }) => {
      const { id, created_at, updated_at, ...updateData } = settings as any;
      const { error } = await supabase
        .from('reward_settings' as any)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reward-settings'] });
      toast.success('Rewards settings saved!');
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
};

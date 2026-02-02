import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ComboItem {
  id: string;
  combo_id: string;
  item_type: 'pizza' | 'wings' | 'drinks' | 'dipping_sauce';
  quantity: number;
  size_restriction: string | null;
  is_required: boolean;
  is_chargeable: boolean;
  sort_order: number;
}

export interface Combo {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  schedule_type: string | null;
  schedule_days: number[] | null;
  schedule_dates: number[] | null;
  created_at: string;
  updated_at: string;
  combo_items?: ComboItem[];
}

// Check if combo is active today based on schedule
export const isComboActiveToday = (combo: Combo): boolean => {
  if (!combo.schedule_type || combo.schedule_type === 'always') {
    return true;
  }

  const today = new Date();
  
  if (combo.schedule_type === 'days_of_week') {
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    return combo.schedule_days?.includes(dayOfWeek) ?? true;
  }
  
  if (combo.schedule_type === 'dates_of_month') {
    const dateOfMonth = today.getDate(); // 1-31
    return combo.schedule_dates?.includes(dateOfMonth) ?? true;
  }
  
  return true;
};

export const useCombos = () => {
  return useQuery({
    queryKey: ['combos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('combos')
        .select('*, combo_items(*)')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Combo[];
    },
  });
};

export const useActiveCombos = () => {
  return useQuery({
    queryKey: ['active-combos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('combos')
        .select('*, combo_items(*)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      // Filter by schedule
      return (data as Combo[]).filter(isComboActiveToday);
    },
  });
};

export const useCreateCombo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (combo: Omit<Combo, 'id' | 'created_at' | 'updated_at' | 'combo_items'> & { items: Omit<ComboItem, 'id' | 'combo_id' | 'created_at'>[] }) => {
      const { items, ...comboData } = combo;
      
      // Insert combo
      const { data: newCombo, error: comboError } = await supabase
        .from('combos')
        .insert(comboData)
        .select()
        .single();

      if (comboError) throw comboError;

      // Insert combo items
      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from('combo_items')
          .insert(items.map(item => ({ ...item, combo_id: newCombo.id })));

        if (itemsError) throw itemsError;
      }

      return newCombo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      queryClient.invalidateQueries({ queryKey: ['active-combos'] });
      toast.success('Combo created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create combo: ' + error.message);
    },
  });
};

export const useUpdateCombo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, items, ...comboData }: Partial<Combo> & { id: string; items?: Omit<ComboItem, 'id' | 'combo_id' | 'created_at'>[] }) => {
      // Update combo
      const { error: comboError } = await supabase
        .from('combos')
        .update({ ...comboData, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (comboError) throw comboError;

      // If items provided, replace all items
      if (items) {
        // Delete existing items
        await supabase.from('combo_items').delete().eq('combo_id', id);
        
        // Insert new items
        if (items.length > 0) {
          const { error: itemsError } = await supabase
            .from('combo_items')
            .insert(items.map(item => ({ ...item, combo_id: id })));

          if (itemsError) throw itemsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      queryClient.invalidateQueries({ queryKey: ['active-combos'] });
      toast.success('Combo updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update combo: ' + error.message);
    },
  });
};

export const useDeleteCombo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('combos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] });
      queryClient.invalidateQueries({ queryKey: ['active-combos'] });
      toast.success('Combo deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete combo: ' + error.message);
    },
  });
};

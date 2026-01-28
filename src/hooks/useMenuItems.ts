import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type MenuCategory = 'pizza' | 'sides' | 'drinks' | 'desserts' | 'dipping_sauce';

export interface MenuItemSize {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  sort_order: number;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
}

export interface ItemDefaultTopping {
  id: string;
  menu_item_id: string;
  topping_id: string;
  is_removable: boolean;
  topping?: Topping;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  category: MenuCategory;
  is_available: boolean;
  is_popular: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  sizes?: MenuItemSize[];
  default_toppings?: ItemDefaultTopping[];
}

export const useMenuItems = (category?: MenuCategory) => {
  return useQuery({
    queryKey: ['menu_items', category],
    queryFn: async () => {
      let query = supabase
        .from('menu_items')
        .select(`
          *,
          sizes:item_sizes(*),
          default_toppings:item_default_toppings(*, topping:toppings(*))
        `)
        .order('sort_order', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MenuItem[];
    },
  });
};

export const useToppings = () => {
  return useQuery({
    queryKey: ['toppings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('toppings')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Topping[];
    },
  });
};

export const useCreateMenuItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at' | 'sizes' | 'default_toppings'>) => {
      const { data, error } = await supabase
        .from('menu_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu_items'] });
      toast({ title: 'Success', description: 'Menu item created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateMenuItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MenuItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu_items'] });
      toast({ title: 'Success', description: 'Menu item updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteMenuItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu_items'] });
      toast({ title: 'Success', description: 'Menu item deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useCreateTopping = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (topping: Omit<Topping, 'id'>) => {
      const { data, error } = await supabase
        .from('toppings')
        .insert(topping)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toppings'] });
      toast({ title: 'Success', description: 'Topping created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateTopping = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Topping> & { id: string }) => {
      const { data, error } = await supabase
        .from('toppings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toppings'] });
      toast({ title: 'Success', description: 'Topping updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteTopping = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('toppings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toppings'] });
      toast({ title: 'Success', description: 'Topping deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
};

export const useManageItemSizes = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addSize = useMutation({
    mutationFn: async (size: Omit<MenuItemSize, 'id'>) => {
      const { data, error } = await supabase
        .from('item_sizes')
        .insert(size)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu_items'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateSize = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MenuItemSize> & { id: string }) => {
      const { data, error } = await supabase
        .from('item_sizes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu_items'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteSize = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('item_sizes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu_items'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { addSize, updateSize, deleteSize };
};

export const useManageDefaultToppings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addDefaultTopping = useMutation({
    mutationFn: async (data: { menu_item_id: string; topping_id: string; is_removable?: boolean }) => {
      const { data: result, error } = await supabase
        .from('item_default_toppings')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu_items'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const removeDefaultTopping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('item_default_toppings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu_items'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return { addDefaultTopping, removeDefaultTopping };
};

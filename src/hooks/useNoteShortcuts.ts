import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NoteShortcut {
  id: string;
  location_id: string;
  shortcut_key: string;
  replacement_text: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useNoteShortcuts = (locationId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryKey = ['note_shortcuts', locationId];

  const { data: shortcuts = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('note_shortcuts')
        .select('*')
        .eq('location_id', locationId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as NoteShortcut[];
    },
  });

  const addShortcut = useMutation({
    mutationFn: async (shortcut: { shortcut_key: string; replacement_text: string }) => {
      const maxSort = shortcuts.length > 0 ? Math.max(...shortcuts.map(s => s.sort_order)) + 1 : 0;
      const { data, error } = await supabase
        .from('note_shortcuts')
        .insert({
          location_id: locationId,
          shortcut_key: shortcut.shortcut_key,
          replacement_text: shortcut.replacement_text,
          sort_order: maxSort,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Shortcut added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateShortcut = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NoteShortcut> & { id: string }) => {
      const { data, error } = await supabase
        .from('note_shortcuts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Shortcut updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteShortcut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('note_shortcuts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Shortcut deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Build a lookup map: key -> replacement text
  const shortcutMap = shortcuts.reduce<Record<string, string>>((acc, s) => {
    acc[s.shortcut_key] = s.replacement_text;
    return acc;
  }, {});

  return {
    shortcuts,
    shortcutMap,
    isLoading,
    addShortcut,
    updateShortcut,
    deleteShortcut,
  };
};

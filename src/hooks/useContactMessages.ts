import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const useContactMessages = () => {
  return useQuery({
    queryKey: ['contact-messages'],
    queryFn: async (): Promise<ContactMessage[]> => {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContactMessage[];
    },
  });
};

export const useMarkMessageRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_read }: { id: string; is_read: boolean }) => {
      const { error } = await supabase
        .from('contact_messages')
        .update({ is_read } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact-messages'] }),
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact-messages'] }),
  });
};

export const useSubmitContactMessage = () => {
  return useMutation({
    mutationFn: async (msg: { name: string; email: string; subject: string; message: string }) => {
      const { error } = await supabase
        .from('contact_messages')
        .insert(msg as any);
      if (error) throw error;
    },
  });
};

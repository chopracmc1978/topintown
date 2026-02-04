import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Printer {
  id: string;
  location_id: string;
  name: string;
  ip_address: string;
  port: number;
  station: string;
  paper_width: number;
  auto_cut: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PrinterInsert = Omit<Printer, 'id' | 'created_at' | 'updated_at'>;

export const PRINTER_STATIONS = ['Kitchen', 'Bar', 'Counter', 'Prep', 'Expo', 'Drive-Thru'] as const;
export const PAPER_WIDTHS = [58, 80] as const;

export const usePrinters = (locationId: string) => {
  const queryClient = useQueryClient();

  const { data: printers, isLoading } = useQuery({
    queryKey: ['printers', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('printers')
        .select('*')
        .eq('location_id', locationId)
        .order('name');
      
      if (error) throw error;
      return data as Printer[];
    },
    enabled: !!locationId,
  });

  const addPrinter = useMutation({
    mutationFn: async (printer: PrinterInsert) => {
      const { error } = await supabase
        .from('printers')
        .insert(printer);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers', locationId] });
      toast.success('Printer added');
    },
    onError: () => {
      toast.error('Failed to add printer');
    },
  });

  const updatePrinter = useMutation({
    mutationFn: async (updates: Partial<Printer> & { id: string }) => {
      const { id, ...data } = updates;
      const { error } = await supabase
        .from('printers')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers', locationId] });
      toast.success('Printer updated');
    },
    onError: () => {
      toast.error('Failed to update printer');
    },
  });

  const deletePrinter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('printers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers', locationId] });
      toast.success('Printer removed');
    },
    onError: () => {
      toast.error('Failed to remove printer');
    },
  });

  return {
    printers: printers || [],
    isLoading,
    addPrinter: addPrinter.mutate,
    updatePrinter: updatePrinter.mutate,
    deletePrinter: deletePrinter.mutate,
  };
};

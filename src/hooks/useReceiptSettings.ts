import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReceiptSettings {
  id: string;
  location_id: string;
  logo_url: string | null;
  footer_text: string;
  
  // Custom Header/Footer Text per Location
  header_line1: string;
  header_line2: string;
  header_line3: string;
  header_address: string;
  header_phone: string;
  header_email: string;
  header_website: string;
  footer_line1: string;
  footer_line2: string;
  footer_line3: string;
  footer_gst: string;
  footer_social: string;
  
  // Per-field font settings (size 1-4, bold boolean)
  store_name_size: number;
  store_name_bold: boolean;
  store_address_size: number;
  store_address_bold: boolean;
  store_phone_size: number;
  store_phone_bold: boolean;
  order_id_size: number;
  order_id_bold: boolean;
  order_date_size: number;
  order_date_bold: boolean;
  order_type_size: number;
  order_type_bold: boolean;
  customer_name_size: number;
  customer_name_bold: boolean;
  customer_phone_size: number;
  customer_phone_bold: boolean;
  item_name_size: number;
  item_name_bold: boolean;
  item_details_size: number;
  item_details_bold: boolean;
  item_price_size: number;
  item_price_bold: boolean;
  totals_size: number;
  totals_bold: boolean;
  footer_size: number;
  footer_bold: boolean;
  
  // Customer Receipt Header
  customer_header_font_height: number;
  customer_header_font_width: number;
  customer_show_logo: boolean;
  customer_show_store_name: boolean;
  customer_show_store_phone: boolean;
  customer_show_store_email: boolean;
  customer_show_store_address: boolean;
  customer_show_printed_on: boolean;
  
  // Customer Receipt Order Detail
  customer_detail_font_height: number;
  customer_detail_font_width: number;
  customer_show_order_id: boolean;
  customer_show_order_date: boolean;
  customer_show_customer_name: boolean;
  customer_show_customer_phone: boolean;
  customer_show_order_type: boolean;
  customer_show_payment_method: boolean;
  customer_show_notes: boolean;
  
  // Kitchen Ticket Header
  kitchen_header_font_height: number;
  kitchen_header_font_width: number;
  kitchen_show_order_id: boolean;
  kitchen_show_order_date: boolean;
  kitchen_show_customer_name: boolean;
  kitchen_show_customer_phone: boolean;
  kitchen_show_order_type: boolean;
  kitchen_show_cashier: boolean;
  kitchen_show_notes: boolean;
  
  // Kitchen Ticket Order Detail
  kitchen_detail_font_height: number;
  kitchen_detail_font_width: number;
  kitchen_show_prep_time: boolean;
  kitchen_show_order_number: boolean;
  
  created_at: string;
  updated_at: string;
}

export const DEFAULT_RECEIPT_SETTINGS: Omit<ReceiptSettings, 'id' | 'created_at' | 'updated_at'> = {
  location_id: '',
  logo_url: null,
  footer_text: 'Thanks For Ordering!',
  
  // Custom Header/Footer Text
  header_line1: 'TOP IN TOWN PIZZA LTD.',
  header_line2: '',
  header_line3: '',
  header_address: '',
  header_phone: '',
  header_email: '',
  header_website: 'www.topintownpizza.com',
  footer_line1: 'Thank You!',
  footer_line2: '',
  footer_line3: '',
  footer_gst: '',
  footer_social: '',
  
  // Per-field font settings
  store_name_size: 2,
  store_name_bold: true,
  store_address_size: 1,
  store_address_bold: false,
  store_phone_size: 1,
  store_phone_bold: false,
  order_id_size: 2,
  order_id_bold: true,
  order_date_size: 1,
  order_date_bold: false,
  order_type_size: 2,
  order_type_bold: true,
  customer_name_size: 2,
  customer_name_bold: true,
  customer_phone_size: 1,
  customer_phone_bold: false,
  item_name_size: 2,
  item_name_bold: true,
  item_details_size: 1,
  item_details_bold: false,
  item_price_size: 1,
  item_price_bold: false,
  totals_size: 2,
  totals_bold: true,
  footer_size: 1,
  footer_bold: false,
  
  customer_header_font_height: 1,
  customer_header_font_width: 1,
  customer_show_logo: true,
  customer_show_store_name: true,
  customer_show_store_phone: true,
  customer_show_store_email: false,
  customer_show_store_address: true,
  customer_show_printed_on: true,
  
  customer_detail_font_height: 1,
  customer_detail_font_width: 1,
  customer_show_order_id: true,
  customer_show_order_date: true,
  customer_show_customer_name: true,
  customer_show_customer_phone: true,
  customer_show_order_type: true,
  customer_show_payment_method: true,
  customer_show_notes: true,
  
  kitchen_header_font_height: 1,
  kitchen_header_font_width: 1,
  kitchen_show_order_id: true,
  kitchen_show_order_date: true,
  kitchen_show_customer_name: true,
  kitchen_show_customer_phone: true,
  kitchen_show_order_type: true,
  kitchen_show_cashier: false,
  kitchen_show_notes: true,
  
  kitchen_detail_font_height: 1,
  kitchen_detail_font_width: 2,
  kitchen_show_prep_time: false,
  kitchen_show_order_number: true,
};

export const useReceiptSettings = (locationId: string) => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['receipt-settings', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipt_settings')
        .select('*')
        .eq('location_id', locationId)
        .single();
      
      if (error) {
        // If no settings exist, create default
        if (error.code === 'PGRST116') {
          const { data: newData, error: insertError } = await supabase
            .from('receipt_settings')
            .insert({ location_id: locationId })
            .select()
            .single();
          
          if (insertError) throw insertError;
          return newData as ReceiptSettings;
        }
        throw error;
      }
      return data as ReceiptSettings;
    },
    enabled: !!locationId,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<ReceiptSettings>) => {
      const { error } = await supabase
        .from('receipt_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('location_id', locationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipt-settings', locationId] });
      toast.success('Receipt settings saved');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  return {
    settings: settings || { ...DEFAULT_RECEIPT_SETTINGS, location_id: locationId } as ReceiptSettings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isSaving: updateSettings.isPending,
  };
};

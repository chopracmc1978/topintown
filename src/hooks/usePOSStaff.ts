import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface POSStaffMember {
  id: string;
  location_id: string;
  name: string;
  pin: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const usePOSStaff = (locationId: string) => {
  const [staff, setStaff] = useState<POSStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStaff = useCallback(async () => {
    if (!locationId) return;
    try {
      const { data, error } = await supabase
        .from('pos_staff')
        .select('*')
        .eq('location_id', locationId)
        .order('name');

      if (error) throw error;
      setStaff((data || []) as POSStaffMember[]);
    } catch (err) {
      console.error('Error fetching POS staff:', err);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const addStaff = async (data: { name: string; pin: string; role: string }) => {
    try {
      const { error } = await supabase
        .from('pos_staff')
        .insert({
          location_id: locationId,
          name: data.name,
          pin: data.pin,
          role: data.role,
        });

      if (error) {
        if (error.message.includes('pos_staff_location_pin_unique')) {
          toast({ title: 'Error', description: 'This PIN is already in use at this location', variant: 'destructive' });
          return false;
        }
        throw error;
      }

      toast({ title: 'Success', description: `${data.name} added successfully` });
      await fetchStaff();
      return true;
    } catch (err: any) {
      console.error('Error adding staff:', err);
      toast({ title: 'Error', description: err.message || 'Failed to add staff', variant: 'destructive' });
      return false;
    }
  };

  const updateStaff = async (id: string, data: { name?: string; pin?: string; role?: string; is_active?: boolean }) => {
    try {
      const { error } = await supabase
        .from('pos_staff')
        .update(data)
        .eq('id', id);

      if (error) {
        if (error.message.includes('pos_staff_location_pin_unique')) {
          toast({ title: 'Error', description: 'This PIN is already in use at this location', variant: 'destructive' });
          return false;
        }
        throw error;
      }

      toast({ title: 'Success', description: 'Staff updated successfully' });
      await fetchStaff();
      return true;
    } catch (err: any) {
      console.error('Error updating staff:', err);
      toast({ title: 'Error', description: err.message || 'Failed to update staff', variant: 'destructive' });
      return false;
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pos_staff')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Staff removed successfully' });
      await fetchStaff();
      return true;
    } catch (err: any) {
      console.error('Error deleting staff:', err);
      toast({ title: 'Error', description: err.message || 'Failed to remove staff', variant: 'destructive' });
      return false;
    }
  };

  const verifyPin = async (pin: string): Promise<POSStaffMember | null> => {
    const match = staff.find(s => s.pin === pin && s.is_active);
    return match || null;
  };

  return {
    staff,
    loading,
    addStaff,
    updateStaff,
    deleteStaff,
    verifyPin,
    refetch: fetchStaff,
  };
};

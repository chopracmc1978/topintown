import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LocationHours {
  id: string;
  location_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  is_open: boolean;
  open_time: string; // HH:MM:SS format
  close_time: string;
  created_at: string;
  updated_at: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const getDayName = (dayOfWeek: number) => DAY_NAMES[dayOfWeek];

export const useLocationHours = (locationId: string) => {
  const queryClient = useQueryClient();

  const { data: hours, isLoading } = useQuery({
    queryKey: ['location-hours', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('location_hours')
        .select('*')
        .eq('location_id', locationId)
        .order('day_of_week');
      
      if (error) throw error;
      return data as LocationHours[];
    },
    enabled: !!locationId,
  });

  const updateHours = useMutation({
    mutationFn: async (updates: Partial<LocationHours> & { id: string }) => {
      const { id, ...data } = updates;
      const { error } = await supabase
        .from('location_hours')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-hours', locationId] });
      toast.success('Hours updated');
    },
    onError: () => {
      toast.error('Failed to update hours');
    },
  });

  return {
    hours: hours || [],
    isLoading,
    updateHours: updateHours.mutate,
  };
};

// Check if location is currently open
export const useIsLocationOpen = (locationId: string) => {
  const { hours } = useLocationHours(locationId);

  const checkIfOpen = (date: Date = new Date()): { isOpen: boolean; opensAt?: string; closesAt?: string } => {
    if (!hours || hours.length === 0) {
      return { isOpen: true }; // Default to open if no hours configured
    }

    // Convert to Mountain Time
    const mtDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Edmonton' }));
    const dayOfWeek = mtDate.getDay();
    const currentTime = mtDate.toTimeString().slice(0, 8); // HH:MM:SS

    const todayHours = hours.find(h => h.day_of_week === dayOfWeek);
    
    if (!todayHours || !todayHours.is_open) {
      // Find next open day
      for (let i = 1; i <= 7; i++) {
        const nextDay = (dayOfWeek + i) % 7;
        const nextHours = hours.find(h => h.day_of_week === nextDay);
        if (nextHours?.is_open) {
          return { 
            isOpen: false, 
            opensAt: `${getDayName(nextDay)} at ${formatTime(nextHours.open_time)}` 
          };
        }
      }
      return { isOpen: false };
    }

    const isWithinHours = currentTime >= todayHours.open_time && currentTime <= todayHours.close_time;
    
    if (!isWithinHours) {
      if (currentTime < todayHours.open_time) {
        return { isOpen: false, opensAt: `Today at ${formatTime(todayHours.open_time)}` };
      } else {
        // After closing, find next open time
        for (let i = 1; i <= 7; i++) {
          const nextDay = (dayOfWeek + i) % 7;
          const nextHours = hours.find(h => h.day_of_week === nextDay);
          if (nextHours?.is_open) {
            return { 
              isOpen: false, 
              opensAt: `${getDayName(nextDay)} at ${formatTime(nextHours.open_time)}` 
            };
          }
        }
        return { isOpen: false };
      }
    }

    return { isOpen: true, closesAt: formatTime(todayHours.close_time) };
  };

  return { checkIfOpen, hours };
};

// Get available pickup times for a given date
export const getAvailablePickupTimes = (hours: LocationHours[], date: Date): string[] => {
  const mtDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Edmonton' }));
  const dayOfWeek = mtDate.getDay();
  const dayHours = hours.find(h => h.day_of_week === dayOfWeek);
  
  if (!dayHours || !dayHours.is_open) return [];

  const times: string[] = [];
  const [openH, openM] = dayHours.open_time.split(':').map(Number);
  const [closeH, closeM] = dayHours.close_time.split(':').map(Number);
  
  // Round up to next 15-minute slot
  let hour = openH;
  let minute = Math.ceil(openM / 15) * 15;
  if (minute >= 60) {
    minute = 0;
    hour++;
  }

  const now = new Date();
  const isToday = mtDate.toDateString() === new Date(now.toLocaleString('en-US', { timeZone: 'America/Edmonton' })).toDateString();
  const currentMT = new Date(now.toLocaleString('en-US', { timeZone: 'America/Edmonton' }));
  const currentHour = currentMT.getHours();
  const currentMinute = currentMT.getMinutes();

  while (hour < closeH || (hour === closeH && minute <= closeM - 15)) {
    // Skip past times if today
    if (isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute + 30))) {
      minute += 15;
      if (minute >= 60) {
        minute = 0;
        hour++;
      }
      continue;
    }

    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    times.push(timeStr);
    
    minute += 15;
    if (minute >= 60) {
      minute = 0;
      hour++;
    }
  }

  return times;
};

export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const formatTimeFor24h = (time12h: string): string => {
  // Convert "2:30 PM" to "14:30:00"
  const match = time12h.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return time12h;
  
  let [, hours, minutes, period] = match;
  let h = parseInt(hours);
  if (period.toUpperCase() === 'PM' && h !== 12) h += 12;
  if (period.toUpperCase() === 'AM' && h === 12) h = 0;
  
  return `${h.toString().padStart(2, '0')}:${minutes}:00`;
};

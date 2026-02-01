import { useState, useMemo } from 'react';
import { CalendarDays, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocationHours, getAvailablePickupTimes, formatTime, useIsLocationOpen } from '@/hooks/useLocationHours';
import { cn } from '@/lib/utils';

interface AdvanceOrderPickerProps {
  locationId: string;
  selectedDate: Date | null;
  selectedTime: string | null;
  onDateTimeChange: (date: Date | null, time: string | null) => void;
}

export const AdvanceOrderPicker = ({
  locationId,
  selectedDate,
  selectedTime,
  onDateTimeChange,
}: AdvanceOrderPickerProps) => {
  const { hours } = useLocationHours(locationId);
  const { checkIfOpen } = useIsLocationOpen(locationId);
  const [orderTiming, setOrderTiming] = useState<'now' | 'later'>(selectedDate ? 'later' : 'now');

  const locationStatus = checkIfOpen();

  // Generate next 7 days for selection
  const availableDates = useMemo(() => {
    const dates: { value: string; label: string; date: Date }[] = [];
    const now = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      
      // Check if location is open on this day
      const dayOfWeek = date.getDay();
      const dayHours = hours.find(h => h.day_of_week === dayOfWeek);
      
      if (dayHours?.is_open) {
        const dateStr = date.toISOString().split('T')[0];
        let label = '';
        if (i === 0) label = 'Today';
        else if (i === 1) label = 'Tomorrow';
        else label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        
        dates.push({ value: dateStr, label, date });
      }
    }
    
    return dates;
  }, [hours]);

  // Get available times for selected date
  const availableTimes = useMemo(() => {
    if (!selectedDate) return [];
    return getAvailablePickupTimes(hours, selectedDate);
  }, [hours, selectedDate]);

  const handleTimingChange = (timing: 'now' | 'later') => {
    setOrderTiming(timing);
    if (timing === 'now') {
      onDateTimeChange(null, null);
    } else if (availableDates.length > 0) {
      onDateTimeChange(availableDates[0].date, null);
    }
  };

  const handleDateChange = (dateStr: string) => {
    const dateEntry = availableDates.find(d => d.value === dateStr);
    if (dateEntry) {
      onDateTimeChange(dateEntry.date, null); // Reset time when date changes
    }
  };

  const handleTimeChange = (time: string) => {
    onDateTimeChange(selectedDate, time);
  };

  // If location is closed, force advance ordering
  const forceLater = !locationStatus.isOpen;

  return (
    <div className="space-y-4">
      {/* Location Status Banner */}
      {!locationStatus.isOpen && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">We're currently closed</p>
            <p className="text-sm text-amber-700">
              {locationStatus.opensAt ? `Opens ${locationStatus.opensAt}` : 'Check back later'}
            </p>
          </div>
        </div>
      )}

      {/* Timing Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">When would you like to pick up?</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={orderTiming === 'now' && !forceLater ? 'default' : 'outline'}
            onClick={() => handleTimingChange('now')}
            disabled={forceLater}
            className="flex-1"
          >
            <Clock className="w-4 h-4 mr-2" />
            ASAP
          </Button>
          <Button
            type="button"
            variant={orderTiming === 'later' || forceLater ? 'default' : 'outline'}
            onClick={() => handleTimingChange('later')}
            className="flex-1"
          >
            <CalendarDays className="w-4 h-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      {/* Date and Time Pickers */}
      {(orderTiming === 'later' || forceLater) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Date</Label>
            <Select
              value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
              onValueChange={handleDateChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select date" />
              </SelectTrigger>
              <SelectContent>
                {availableDates.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Time</Label>
            <Select
              value={selectedTime || ''}
              onValueChange={handleTimeChange}
              disabled={!selectedDate || availableTimes.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {availableTimes.map((time) => (
                  <SelectItem key={time} value={time}>
                    {formatTime(time + ':00')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Current selection display */}
      {orderTiming === 'now' && locationStatus.isOpen && (
        <div className="text-sm text-muted-foreground p-3 bg-secondary/30 rounded-lg">
          Your order will be ready as soon as possible (typically 15-25 minutes)
        </div>
      )}

      {selectedDate && selectedTime && (
        <div className="text-sm text-primary font-medium p-3 bg-primary/5 rounded-lg flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Pickup scheduled for {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(selectedTime + ':00')}
        </div>
      )}
    </div>
  );
};

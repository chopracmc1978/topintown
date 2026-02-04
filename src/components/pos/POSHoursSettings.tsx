import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocationHours, getDayName, formatTime, formatTimeFor24h } from '@/hooks/useLocationHours';
import { cn } from '@/lib/utils';

interface POSHoursSettingsProps {
  locationId: string;
}

export const POSHoursSettings = ({ locationId }: POSHoursSettingsProps) => {
  const { hours, isLoading, updateHours } = useLocationHours(locationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleTimeChange = (id: string, field: 'open_time' | 'close_time', value: string) => {
    // Convert to 24h format with seconds
    const time24h = `${value}:00`;
    updateHours({ id, [field]: time24h });
  };

  const handleOpenToggle = (id: string, isOpen: boolean) => {
    updateHours({ id, is_open: isOpen });
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Set your operating hours for each day. Customers can only place orders during these hours.
      </div>

      <div className="space-y-3">
        {hours.map((dayHours) => (
          <div 
            key={dayHours.id} 
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg border transition-colors"
            )}
            style={
              dayHours.is_open
                ? { backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsla(240, 5%, 10%, 0.12)' }
                : { backgroundColor: 'hsl(0, 0%, 98%)', borderColor: 'hsla(240, 5%, 10%, 0.08)' }
            }
          >
            {/* Day Name */}
            <div className="w-28 font-medium">
              {getDayName(dayHours.day_of_week)}
            </div>

            {/* Open/Closed Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={dayHours.is_open}
                onCheckedChange={(checked) => handleOpenToggle(dayHours.id, checked)}
              />
              <span className={cn(
                "text-sm",
                dayHours.is_open ? "text-green-600" : "text-muted-foreground"
              )}>
                {dayHours.is_open ? 'Open' : 'Closed'}
              </span>
            </div>

            {/* Time Inputs */}
            {dayHours.is_open && (
              <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Open:</Label>
                  <Input
                    type="time"
                    value={dayHours.open_time.slice(0, 5)}
                    onChange={(e) => handleTimeChange(dayHours.id, 'open_time', e.target.value)}
                    className="w-32"
                  />
                </div>
                <span className="text-muted-foreground">—</span>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Close:</Label>
                  <Input
                    type="time"
                    value={dayHours.close_time.slice(0, 5)}
                    onChange={(e) => handleTimeChange(dayHours.id, 'close_time', e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>
            )}

            {!dayHours.is_open && (
              <div className="flex-1 text-sm text-muted-foreground italic">
                Not accepting orders
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className="text-xs text-muted-foreground mt-4 p-3 rounded-lg"
        style={{ backgroundColor: 'hsl(0, 0%, 98%)' }}
      >
        <strong>Note:</strong> All times are in Mountain Time (MST/MDT). Changes are saved automatically.
      </div>
    </div>
  );
};

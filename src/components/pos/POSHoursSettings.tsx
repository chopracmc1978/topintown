import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useLocationHours, getDayName } from '@/hooks/useLocationHours';

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
      <div className="text-sm mb-4" style={{ color: 'hsl(0, 0%, 45%)' }}>
        Set your operating hours for each day. Customers can only place orders during these hours.
      </div>

      <div className="space-y-3">
        {hours.map((dayHours) => (
          <div 
            key={dayHours.id} 
            className="flex items-center gap-4 p-4 rounded-lg border transition-colors"
            style={{
              backgroundColor: dayHours.is_open ? 'hsl(0, 0%, 100%)' : 'hsl(0, 0%, 97%)',
              borderColor: 'hsl(0, 0%, 85%)',
              color: 'hsl(0, 0%, 15%)',
            }}
          >
            {/* Day Name */}
            <div className="w-28 font-medium" style={{ color: 'hsl(0, 0%, 15%)' }}>
              {getDayName(dayHours.day_of_week)}
            </div>

            {/* Open/Closed Toggle */}
            <div className="flex items-center gap-2 min-w-[100px]">
              <Switch
                checked={dayHours.is_open}
                onCheckedChange={(checked) => handleOpenToggle(dayHours.id, checked)}
              />
              <span
                className="text-sm font-medium"
                style={{ color: dayHours.is_open ? 'hsl(142, 71%, 35%)' : 'hsl(0, 0%, 55%)' }}
              >
                {dayHours.is_open ? 'Open' : 'Closed'}
              </span>
            </div>

            {/* Time Inputs */}
            {dayHours.is_open && (
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm" style={{ color: 'hsl(0, 0%, 45%)' }}>Open:</label>
                  <input
                    type="time"
                    value={dayHours.open_time.slice(0, 5)}
                    onChange={(e) => handleTimeChange(dayHours.id, 'open_time', e.target.value)}
                    className="rounded-md border px-3 py-2 text-sm"
                    style={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cccccc',
                      color: '#222222',
                      colorScheme: 'light',
                      width: '130px',
                      WebkitAppearance: 'none',
                    }}
                  />
                </div>
                <span style={{ color: 'hsl(0, 0%, 60%)' }}>—</span>
                <div className="flex items-center gap-2">
                  <label className="text-sm" style={{ color: 'hsl(0, 0%, 45%)' }}>Close:</label>
                  <input
                    type="time"
                    value={dayHours.close_time.slice(0, 5)}
                    onChange={(e) => handleTimeChange(dayHours.id, 'close_time', e.target.value)}
                    className="rounded-md border px-3 py-2 text-sm"
                    style={{
                      backgroundColor: '#ffffff',
                      borderColor: '#cccccc',
                      color: '#222222',
                      colorScheme: 'light',
                      width: '130px',
                      WebkitAppearance: 'none',
                    }}
                  />
                </div>
              </div>
            )}

            {!dayHours.is_open && (
              <div className="flex-1 text-sm italic" style={{ color: 'hsl(0, 0%, 55%)' }}>
                Not accepting orders
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className="text-xs mt-4 p-3 rounded-lg"
        style={{ backgroundColor: 'hsl(0, 0%, 96%)', color: 'hsl(0, 0%, 45%)' }}
      >
        <strong style={{ color: 'hsl(0, 0%, 25%)' }}>Note:</strong> All times are in Mountain Time (MST/MDT). Changes are saved automatically.
      </div>
    </div>
  );
};

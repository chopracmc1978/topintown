import { X, Clock, Printer, History, BarChart3, Volume2, VolumeX, FileText, Volume1, Play, CalendarClock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { POSHoursSettings } from './POSHoursSettings';
import { POSPrinterSettings } from './POSPrinterSettings';
import { POSReceiptSettings } from './POSReceiptSettings';
import { POSOrderHistory } from './POSOrderHistory';
import { POSReportsPanel } from './POSReportsPanel';
import { POSStaffManager } from './POSStaffManager';

interface POSSettingsPanelProps {
  locationId: string;
  onClose: () => void;
  onEndDay?: () => void;
  isAudioEnabled?: boolean;
  volume?: number;
  onToggleAudio?: (enabled: boolean) => void;
  onVolumeChange?: (volume: number) => void;
  onTestSound?: () => void;
}

export const POSSettingsPanel = ({ locationId, onClose, onEndDay, isAudioEnabled = false, volume = 0.8, onToggleAudio, onVolumeChange, onTestSound }: POSSettingsPanelProps) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'hsla(0, 0%, 0%, 0.5)' }}
    >
      <div
        className="pos-light-panel rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col relative overflow-hidden"
        style={{ backgroundColor: '#ffffff', colorScheme: 'light', color: '#222222', borderColor: '#e5e5e5', borderWidth: '1px', borderStyle: 'solid' }}
      >
        {/* Shield layer for legacy Android WebView opacity */}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'hsl(0, 0%, 100%)', zIndex: 0 }} />
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 relative"
          style={{ zIndex: 1, backgroundColor: '#ffffff', borderBottom: '1px solid #e5e5e5' }}
        >
          <h2 className="font-serif text-xl font-bold" style={{ color: '#222222' }}>Settings</h2>
          <div className="flex items-center gap-2">
            {onEndDay && (
              <Button
                variant="outline"
                onClick={() => { onClose(); onEndDay(); }}
                className="text-orange-600 border-orange-400 hover:bg-orange-50 text-sm px-3 py-2 h-auto"
              >
                <CalendarClock className="w-4 h-4 mr-1" />
                End Day
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} style={{ color: '#222222' }}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto relative" style={{ zIndex: 1, backgroundColor: '#ffffff' }}>
          <Tabs defaultValue="hours" className="w-full">
            <div className="px-4" style={{ borderBottom: '1px solid #e5e5e5' }}>
              <TabsList className="h-12 bg-transparent flex-wrap">
                <TabsTrigger 
                  value="hours" 
                  className="pos-solid-tabs-trigger gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Hours
                </TabsTrigger>
                <TabsTrigger 
                  value="printers" 
                  className="pos-solid-tabs-trigger gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Printers
                </TabsTrigger>
                <TabsTrigger 
                  value="receipts" 
                  className="pos-solid-tabs-trigger gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Receipts
                </TabsTrigger>
                <TabsTrigger
                  value="history" 
                  className="pos-solid-tabs-trigger gap-2"
                >
                  <History className="w-4 h-4" />
                  History
                </TabsTrigger>
                <TabsTrigger 
                  value="reports" 
                  className="pos-solid-tabs-trigger gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Reports
                </TabsTrigger>
                <TabsTrigger 
                  value="sound" 
                  className="pos-solid-tabs-trigger gap-2"
                >
                  {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  Sound
                </TabsTrigger>
                <TabsTrigger 
                  value="staff" 
                  className="pos-solid-tabs-trigger gap-2"
                >
                  <Users className="w-4 h-4" />
                  Staff
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="hours" className="p-4 mt-0">
              <POSHoursSettings locationId={locationId} />
            </TabsContent>

            <TabsContent value="printers" className="p-4 mt-0">
              <POSPrinterSettings locationId={locationId} />
            </TabsContent>

            <TabsContent value="receipts" className="p-4 mt-0">
              <POSReceiptSettings locationId={locationId} />
            </TabsContent>

            <TabsContent value="history" className="p-4 mt-0">
              <POSOrderHistory locationId={locationId} />
            </TabsContent>

            <TabsContent value="reports" className="p-4 mt-0">
              <POSReportsPanel locationId={locationId} onClose={() => {}} embedded />
            </TabsContent>

            <TabsContent value="sound" className="p-4 mt-0">
              <div className="max-w-md space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: '#222' }}>Notification Sound</h3>
                  <p className="text-sm mb-4" style={{ color: '#666' }}>
                    Enable sound notifications to hear alerts when new online orders arrive. Volume can be boosted up to 200%.
                  </p>
                </div>
                
                {/* Enable/Disable Toggle */}
                <div
                  className="flex items-center justify-between p-4 border rounded-lg"
                  style={{ backgroundColor: 'hsl(0, 0%, 98%)' }}
                >
                  <div className="flex items-center gap-3">
                    {isAudioEnabled ? (
                      <Volume2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <VolumeX className="w-6 h-6 text-muted-foreground" />
                    )}
                    <div>
                      <Label className="text-base font-medium">Sound Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        {isAudioEnabled ? 'Sound is enabled' : 'Sound is disabled'}
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={isAudioEnabled} 
                    onCheckedChange={(checked) => {
                      if (onToggleAudio) {
                        onToggleAudio(checked);
                      }
                    }}
                  />
                </div>

                {/* Volume Control */}
                <div
                  className="p-4 border rounded-lg space-y-4"
                  style={{ backgroundColor: 'hsl(0, 0%, 98%)' }}
                >
                  <div className="flex items-center gap-3">
                    <Volume1 className="w-6 h-6 text-muted-foreground" />
                    <div>
                      <Label className="text-base font-medium">Volume Level</Label>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(volume * 100)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <VolumeX className="w-5 h-5" style={{ color: '#999' }} />
                    <Slider
                      value={[volume * 100]}
                      onValueChange={(values) => {
                        if (onVolumeChange) {
                          onVolumeChange(values[0] / 100);
                        }
                      }}
                      max={200}
                      min={0}
                      step={5}
                      className="flex-1"
                    />
                    <Volume2 className="w-5 h-5" style={{ color: '#999' }} />
                  </div>
                  {volume > 1 && (
                    <p className="text-xs font-medium" style={{ color: '#d97706' }}>
                      ⚠️ Volume above 100% — sound will be amplified
                    </p>
                  )}
                </div>

                {/* Test Sound Button */}
                <Button 
                  onClick={onTestSound}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Test Sound
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="staff" className="p-4 mt-0">
              <POSStaffManager locationId={locationId} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

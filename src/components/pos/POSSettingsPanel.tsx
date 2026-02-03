import { X, Clock, Printer, History, BarChart3, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { POSHoursSettings } from './POSHoursSettings';
import { POSPrinterSettings } from './POSPrinterSettings';
import { POSOrderHistory } from './POSOrderHistory';
import { POSReportsPanel } from './POSReportsPanel';

interface POSSettingsPanelProps {
  locationId: string;
  onClose: () => void;
  isAudioEnabled?: boolean;
  onEnableAudio?: () => void;
}

export const POSSettingsPanel = ({ locationId, onClose, isAudioEnabled = false, onEnableAudio }: POSSettingsPanelProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-serif text-xl font-bold">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="hours" className="w-full">
            <div className="border-b border-border px-4">
              <TabsList className="h-12 bg-transparent flex-wrap">
                <TabsTrigger 
                  value="hours" 
                  className="data-[state=active]:bg-primary/10 gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Hours
                </TabsTrigger>
                <TabsTrigger 
                  value="printers" 
                  className="data-[state=active]:bg-primary/10 gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Printers
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="data-[state=active]:bg-primary/10 gap-2"
                >
                  <History className="w-4 h-4" />
                  History
                </TabsTrigger>
                <TabsTrigger 
                  value="reports" 
                  className="data-[state=active]:bg-primary/10 gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Reports
                </TabsTrigger>
                <TabsTrigger 
                  value="sound" 
                  className="data-[state=active]:bg-primary/10 gap-2"
                >
                  {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  Sound
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="hours" className="p-4 mt-0">
              <POSHoursSettings locationId={locationId} />
            </TabsContent>

            <TabsContent value="printers" className="p-4 mt-0">
              <POSPrinterSettings locationId={locationId} />
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
                  <h3 className="text-lg font-semibold mb-2">Notification Sound</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enable sound notifications to hear alerts when new online orders arrive.
                  </p>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
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
                    onCheckedChange={() => {
                      if (!isAudioEnabled && onEnableAudio) {
                        onEnableAudio();
                      }
                    }}
                  />
                </div>

                {!isAudioEnabled && (
                  <Button 
                    onClick={onEnableAudio}
                    className="w-full"
                    size="lg"
                  >
                    <Volume2 className="w-5 h-5 mr-2" />
                    Enable Sound Notifications
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

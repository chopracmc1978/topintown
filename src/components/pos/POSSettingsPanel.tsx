import { X, Clock, Printer, History, BarChart3, Volume2, VolumeX, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { POSHoursSettings } from './POSHoursSettings';
import { POSPrinterSettings } from './POSPrinterSettings';
import { POSReceiptSettings } from './POSReceiptSettings';
import { POSOrderHistory } from './POSOrderHistory';
import { POSReportsPanel } from './POSReportsPanel';

interface POSSettingsPanelProps {
  locationId: string;
  onClose: () => void;
  isAudioEnabled?: boolean;
  onToggleAudio?: (enabled: boolean) => void;
}

export const POSSettingsPanel = ({ locationId, onClose, isAudioEnabled = false, onToggleAudio }: POSSettingsPanelProps) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'hsla(0, 0%, 0%, 0.5)' }}
    >
      <div
        className="rounded-xl border border-border shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col relative overflow-hidden"
        style={{ backgroundColor: 'hsl(0, 0%, 100%)' }}
      >
        {/* Shield layer for legacy Android WebView opacity */}
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'hsl(0, 0%, 100%)', zIndex: 0 }} />
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b border-border relative"
          style={{ zIndex: 1, backgroundColor: 'hsl(0, 0%, 100%)' }}
        >
          <h2 className="font-serif text-xl font-bold">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto relative" style={{ zIndex: 1, backgroundColor: 'hsl(0, 0%, 100%)' }}>
          <Tabs defaultValue="hours" className="w-full">
            <div className="border-b border-border px-4">
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
                  <h3 className="text-lg font-semibold mb-2">Notification Sound</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enable sound notifications to hear alerts when new online orders arrive.
                  </p>
                </div>
                
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
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

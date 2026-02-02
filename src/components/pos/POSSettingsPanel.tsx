import { X, Clock, Printer, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { POSHoursSettings } from './POSHoursSettings';
import { POSPrinterSettings } from './POSPrinterSettings';
import { POSOrderHistory } from './POSOrderHistory';

interface POSSettingsPanelProps {
  locationId: string;
  onClose: () => void;
}

export const POSSettingsPanel = ({ locationId, onClose }: POSSettingsPanelProps) => {
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
              <TabsList className="h-12 bg-transparent">
                <TabsTrigger 
                  value="hours" 
                  className="data-[state=active]:bg-primary/10 gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Operating Hours
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
                  Order History
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
          </Tabs>
        </div>
      </div>
    </div>
  );
};

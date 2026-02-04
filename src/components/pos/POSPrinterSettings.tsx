import { useState } from 'react';
import { Plus, Trash2, Edit2, Loader2, Printer as PrinterIcon, Check, X, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrinters, PRINTER_STATIONS, PAPER_WIDTHS, type Printer } from '@/hooks/usePrinters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { sendToPrinterDirect, isNativePlatform } from '@/utils/directPrint';

interface POSPrinterSettingsProps {
  locationId: string;
}

export const POSPrinterSettings = ({ locationId }: POSPrinterSettingsProps) => {
  const { printers, isLoading, addPrinter, updatePrinter, deletePrinter } = usePrinters(locationId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    location_id: locationId,
    name: '',
    ip_address: '',
    port: 9100,
    station: 'Kitchen',
    paper_width: 80,
    auto_cut: true,
    is_active: true,
  });

  const handleTestPrint = async (printer: Printer) => {
    if (!isNativePlatform()) {
      toast.error('Printing only works in native app');
      return;
    }

    const loadingToast = toast.loading('Sending test print...');
    
    try {
      const testData = `
\x1B@
\x1Ba\x01
\x1BE\x01TEST PRINT\x1BE\x00

\x1Ba\x00
Printer: ${printer.name}
IP: ${printer.ip_address}
Port: ${printer.port}
Station: ${printer.station}
Time: ${new Date().toLocaleTimeString()}
--------------------------------
If you see this, printing works!
--------------------------------

\x1Bd\x03
\x1DVA
`;
      
      const result = await sendToPrinterDirect(
        { ip: printer.ip_address, port: printer.port, name: printer.name },
        testData
      );

      toast.dismiss(loadingToast);
      
      if (result.success) {
        toast.success('Test print sent!');
      } else {
        toast.error(`Print failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Could not connect to printer');
    }
  };

  const resetForm = () => {
    setFormData({
      location_id: locationId,
      name: '',
      ip_address: '',
      port: 9100,
      station: 'Kitchen',
      paper_width: 80,
      auto_cut: true,
      is_active: true,
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!formData.ip_address) {
      toast.error('IP Address is required');
      return;
    }

    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(formData.ip_address)) {
      toast.error('Invalid IP address format');
      return;
    }

    // Use IP as name if name is empty
    const printerData = {
      ...formData,
      name: formData.name || formData.ip_address,
    };

    if (editingId) {
      updatePrinter({ id: editingId, ...printerData });
    } else {
      addPrinter(printerData);
    }
    resetForm();
  };

  const handleEdit = (printer: Printer) => {
    setFormData({
      location_id: printer.location_id,
      name: printer.name,
      ip_address: printer.ip_address,
      port: printer.port,
      station: printer.station,
      paper_width: printer.paper_width,
      auto_cut: printer.auto_cut,
      is_active: printer.is_active,
    });
    setEditingId(printer.id);
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this printer?')) {
      deletePrinter(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Platform Info */}
      <div className={cn(
        "p-3 rounded-lg text-sm",
        isNativePlatform() 
          ? "bg-green-100 text-green-800" 
          : "bg-yellow-100 text-yellow-800"
      )}>
        {isNativePlatform() 
          ? "✓ Running in native app - Direct printing enabled"
          : "⚠ Running in browser - Printing requires native app"
        }
      </div>

      <div className="text-sm text-muted-foreground">
        Add thermal printers by entering their IP address and port. Default port is 9100.
      </div>

      {/* Printer List */}
      {printers.length > 0 && (
        <div className="space-y-2">
          {printers.map((printer) => (
            <div 
              key={printer.id}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border",
                printer.is_active 
                  ? "bg-card border-border" 
                  : "bg-secondary/50 border-secondary opacity-60"
              )}
              style={{ backgroundColor: 'white' }}
            >
              <PrinterIcon className={cn(
                "w-8 h-8",
                printer.is_active ? "text-primary" : "text-muted-foreground"
              )} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{printer.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                    {printer.station}
                  </span>
                  {!printer.is_active && (
                    <span className="text-xs px-2 py-0.5 bg-destructive/20 text-destructive rounded-full">
                      Disabled
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-3">
                  <span>{printer.ip_address}:{printer.port}</span>
                  <span>•</span>
                  <span>{printer.paper_width}mm</span>
                  <span>•</span>
                  <span>{printer.auto_cut ? 'Auto-cut' : 'No cut'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleTestPrint(printer)}
                  title="Test print"
                  style={{ backgroundColor: 'white' }}
                >
                  <TestTube className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleEdit(printer)}
                  style={{ backgroundColor: 'white' }}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleDelete(printer.id)}
                  className="text-destructive hover:text-destructive"
                  style={{ backgroundColor: 'white' }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {printers.length === 0 && !showAddForm && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <PrinterIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No printers configured</p>
          <p className="text-sm">Add a thermal printer to print order tickets</p>
        </div>
      )}

      {/* Add/Edit Form - Simplified like the screenshot */}
      {showAddForm && (
        <div className="p-4 border border-border rounded-lg bg-card space-y-4" style={{ backgroundColor: 'white' }}>
          <div className="font-medium text-center text-lg">
            {editingId ? 'Edit Printer' : 'Add Printer'}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter Name (Optional)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-0 border-b border-border rounded-none focus-visible:ring-0 px-0"
                style={{ backgroundColor: 'white' }}
              />
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Enter IP Address"
                value={formData.ip_address}
                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                className="border-0 border-b border-border rounded-none focus-visible:ring-0 px-0"
                style={{ backgroundColor: 'white' }}
              />
            </div>

            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Enter Port"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 9100 })}
                className="border-0 border-b border-border rounded-none focus-visible:ring-0 px-0"
                style={{ backgroundColor: 'white' }}
              />
            </div>

            {/* Advanced options - collapsed by default */}
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Advanced Options</summary>
              <div className="mt-3 space-y-3 pl-2">
                <div className="space-y-2">
                  <Label>Station</Label>
                  <Select
                    value={formData.station}
                    onValueChange={(value) => setFormData({ ...formData, station: value })}
                  >
                    <SelectTrigger style={{ backgroundColor: 'white' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRINTER_STATIONS.map((station) => (
                        <SelectItem key={station} value={station}>
                          {station}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Paper Width</Label>
                  <Select
                    value={formData.paper_width.toString()}
                    onValueChange={(value) => setFormData({ ...formData, paper_width: parseInt(value) })}
                  >
                    <SelectTrigger style={{ backgroundColor: 'white' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAPER_WIDTHS.map((width) => (
                        <SelectItem key={width} value={width.toString()}>
                          {width}mm
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.auto_cut}
                      onCheckedChange={(checked) => setFormData({ ...formData, auto_cut: checked })}
                    />
                    <Label className="text-sm">Auto-cut paper</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label className="text-sm">Active</Label>
                  </div>
                </div>
              </div>
            </details>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button 
              variant="ghost" 
              onClick={resetForm}
              className="text-destructive"
              style={{ backgroundColor: 'white' }}
            >
              Close
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.ip_address}
              className="bg-green-600 hover:bg-green-700 text-white px-6"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Add Button */}
      {!showAddForm && (
        <Button 
          onClick={() => setShowAddForm(true)}
          variant="outline"
          className="w-full"
          style={{ backgroundColor: 'white' }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Printer
        </Button>
      )}
    </div>
  );
};

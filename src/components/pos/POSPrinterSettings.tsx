import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Loader2, Printer as PrinterIcon, Check, X, Server, ExternalLink, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrinters, PRINTER_STATIONS, PAPER_WIDTHS, type PrinterInsert, type Printer } from '@/hooks/usePrinters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface POSPrinterSettingsProps {
  locationId: string;
}

export const POSPrinterSettings = ({ locationId }: POSPrinterSettingsProps) => {
  const { printers, isLoading, addPrinter, updatePrinter, deletePrinter } = usePrinters(locationId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [printServerUrl, setPrintServerUrl] = useState(
    localStorage.getItem('print_server_url') || 'http://localhost:3001'
  );
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const [formData, setFormData] = useState<PrinterInsert>({
    location_id: locationId,
    name: '',
    ip_address: '',
    station: 'Kitchen',
    paper_width: 80,
    auto_cut: true,
    is_active: true,
  });

  // Check print server status
  const checkServerStatus = async () => {
    setServerStatus('checking');
    try {
      const response = await fetch(`${printServerUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch {
      setServerStatus('offline');
    }
  };

  useEffect(() => {
    checkServerStatus();
  }, [printServerUrl]);

  const handleSavePrintServerUrl = () => {
    localStorage.setItem('print_server_url', printServerUrl);
    toast.success('Print server URL saved');
    checkServerStatus();
  };

  const handleTestPrint = async (printer: Printer) => {
    const loadingToast = toast.loading('Sending test print...');
    
    try {
      const testData = `
\x1B@
\x1Ba\x01
\x1BE\x01TEST PRINT\x1BE\x00

\x1Ba\x00
Printer: ${printer.name}
IP: ${printer.ip_address}
Station: ${printer.station}
Time: ${new Date().toLocaleTimeString()}
--------------------------------
If you see this, printing works!
--------------------------------

\x1Bd\x03
\x1DVA
`;
      
      const response = await fetch(`${printServerUrl}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printer_ip: printer.ip_address,
          port: 9100,
          data: testData,
          auto_cut: printer.auto_cut,
        }),
      });

      toast.dismiss(loadingToast);
      
      if (response.ok) {
        toast.success('Test print sent!');
      } else {
        const error = await response.json();
        toast.error(`Print failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Could not reach print server');
    }
  };

  const resetForm = () => {
    setFormData({
      location_id: locationId,
      name: '',
      ip_address: '',
      station: 'Kitchen',
      paper_width: 80,
      auto_cut: true,
      is_active: true,
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.ip_address) return;

    if (editingId) {
      updatePrinter({ id: editingId, ...formData });
    } else {
      addPrinter(formData);
    }
    resetForm();
  };

  const handleEdit = (printer: Printer) => {
    setFormData({
      location_id: printer.location_id,
      name: printer.name,
      ip_address: printer.ip_address,
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
      {/* Print Server Configuration */}
      <div className="p-4 border border-border rounded-lg bg-secondary/30 space-y-3">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          <span className="font-medium">Print Server</span>
          <div className={cn(
            "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
            serverStatus === 'online' && "bg-green-100 text-green-700",
            serverStatus === 'offline' && "bg-red-100 text-red-700",
            serverStatus === 'checking' && "bg-yellow-100 text-yellow-700",
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              serverStatus === 'online' && "bg-green-500",
              serverStatus === 'offline' && "bg-red-500",
              serverStatus === 'checking' && "bg-yellow-500 animate-pulse",
            )} />
            {serverStatus === 'online' ? 'Connected' : serverStatus === 'offline' ? 'Offline' : 'Checking...'}
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Run the print server on a computer on your local network to forward print jobs to your thermal printers.
        </p>
        
        <div className="flex gap-2">
          <Input
            placeholder="http://localhost:3001"
            value={printServerUrl}
            onChange={(e) => setPrintServerUrl(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" onClick={handleSavePrintServerUrl}>
            Save
          </Button>
          <Button variant="outline" onClick={checkServerStatus}>
            Test
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
          Download print-server.js from /print-server.js and run with Node.js
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Configure thermal printers for order tickets. Add printers for kitchen, counter, or any station.
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
                  <span>IP: {printer.ip_address}</span>
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
                >
                  <TestTube className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleEdit(printer)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleDelete(printer.id)}
                  className="text-destructive hover:text-destructive"
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

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="p-4 border border-border rounded-lg bg-secondary/30 space-y-4">
          <div className="font-medium">
            {editingId ? 'Edit Printer' : 'Add New Printer'}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Printer Name</Label>
              <Input
                placeholder="e.g., Kitchen Main"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>IP Address</Label>
              <Input
                placeholder="e.g., 192.168.1.100"
                value={formData.ip_address}
                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Station</Label>
              <Select
                value={formData.station}
                onValueChange={(value) => setFormData({ ...formData, station: value })}
              >
                <SelectTrigger>
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
                <SelectTrigger>
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
          </div>

          <div className="flex items-center justify-between">
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

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.name || !formData.ip_address}
              >
                <Check className="w-4 h-4 mr-1" />
                {editingId ? 'Save Changes' : 'Add Printer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Button */}
      {!showAddForm && (
        <Button 
          onClick={() => setShowAddForm(true)}
          variant="outline"
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Printer
        </Button>
      )}
    </div>
  );
};

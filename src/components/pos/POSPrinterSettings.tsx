import { useState } from 'react';
import { Plus, Trash2, Edit2, Loader2, Printer as PrinterIcon, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrinters, PRINTER_STATIONS, PAPER_WIDTHS, type PrinterInsert, type Printer } from '@/hooks/usePrinters';
import { cn } from '@/lib/utils';

interface POSPrinterSettingsProps {
  locationId: string;
}

export const POSPrinterSettings = ({ locationId }: POSPrinterSettingsProps) => {
  const { printers, isLoading, addPrinter, updatePrinter, deletePrinter } = usePrinters(locationId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<PrinterInsert>({
    location_id: locationId,
    name: '',
    ip_address: '',
    station: 'Kitchen',
    paper_width: 80,
    auto_cut: true,
    is_active: true,
  });

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
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
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

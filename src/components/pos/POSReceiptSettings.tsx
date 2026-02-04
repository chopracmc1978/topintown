import { useState, useRef } from 'react';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReceiptSettings, ReceiptSettings } from '@/hooks/useReceiptSettings';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface POSReceiptSettingsProps {
  locationId: string;
}

const FONT_SIZES = [
  { value: '1', label: 'Size 1 (Small)' },
  { value: '2', label: 'Size 2 (Normal)' },
  { value: '3', label: 'Size 3 (Large)' },
  { value: '4', label: 'Size 4 (X-Large)' },
];

export const POSReceiptSettings = ({ locationId }: POSReceiptSettingsProps) => {
  const { settings, isLoading, updateSettings, isSaving } = useReceiptSettings(locationId);
  const [localSettings, setLocalSettings] = useState<Partial<ReceiptSettings>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Merge local changes with fetched settings
  const currentSettings = { ...settings, ...localSettings };

  const handleChange = (key: keyof ReceiptSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setLocalSettings({});
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.includes('png')) {
      toast.error('Logo must be a PNG file');
      return;
    }

    if (file.size > 1024 * 1024) {
      toast.error('Logo must be under 1MB');
      return;
    }

    setUploading(true);
    try {
      const fileName = `receipt-logo-${locationId}-${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName);

      handleChange('logo_url', urlData.publicUrl);
      toast.success('Logo uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
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
      {/* Logo Section */}
      <div className="p-4 border border-border rounded-lg space-y-4" style={{ backgroundColor: 'white' }}>
        <h3 className="font-medium">Printer Logo</h3>
        
        <div className="flex items-start gap-6">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>1. Logo should be 200x125 pixel in size</p>
            <p>2. Logo should be Black & White in color</p>
            <p>3. Logo should be in PNG file format</p>
          </div>
          
          <div className="flex-1 flex justify-center">
            {currentSettings.logo_url ? (
              <img 
                src={currentSettings.logo_url} 
                alt="Receipt Logo" 
                className="max-w-[200px] max-h-[125px] object-contain border border-border rounded"
              />
            ) : (
              <div className="w-[200px] h-[125px] border-2 border-dashed border-border rounded flex items-center justify-center text-muted-foreground">
                <ImageIcon className="w-12 h-12 opacity-50" />
              </div>
            )}
          </div>
          
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ backgroundColor: 'white' }}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload Logo
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Footer Text</Label>
          <Input
            placeholder="Thanks For Ordering!"
            value={currentSettings.footer_text}
            onChange={(e) => handleChange('footer_text', e.target.value)}
            style={{ backgroundColor: 'white' }}
          />
        </div>
      </div>

      {/* Tabs for Customer Receipt and Kitchen Ticket */}
      <Tabs defaultValue="customer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customer">Customer Receipt</TabsTrigger>
          <TabsTrigger value="kitchen">Kitchen Ticket</TabsTrigger>
        </TabsList>

        {/* Customer Receipt Settings */}
        <TabsContent value="customer" className="space-y-4">
          {/* Header Section */}
          <div className="p-4 border border-border rounded-lg space-y-4" style={{ backgroundColor: 'white' }}>
            <h4 className="font-medium">Header</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Font Height</Label>
                <Select
                  value={currentSettings.customer_header_font_height?.toString()}
                  onValueChange={(v) => handleChange('customer_header_font_height', parseInt(v))}
                >
                  <SelectTrigger style={{ backgroundColor: 'white' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map(size => (
                      <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Font Width</Label>
                <Select
                  value={currentSettings.customer_header_font_width?.toString()}
                  onValueChange={(v) => handleChange('customer_header_font_width', parseInt(v))}
                >
                  <SelectTrigger style={{ backgroundColor: 'white' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map(size => (
                      <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <CheckboxField label="Store Logo" checked={currentSettings.customer_show_logo} onChange={(v) => handleChange('customer_show_logo', v)} />
              <CheckboxField label="Store Name" checked={currentSettings.customer_show_store_name} onChange={(v) => handleChange('customer_show_store_name', v)} />
              <CheckboxField label="Store Phone" checked={currentSettings.customer_show_store_phone} onChange={(v) => handleChange('customer_show_store_phone', v)} />
              <CheckboxField label="Store Email" checked={currentSettings.customer_show_store_email} onChange={(v) => handleChange('customer_show_store_email', v)} />
              <CheckboxField label="Store Address" checked={currentSettings.customer_show_store_address} onChange={(v) => handleChange('customer_show_store_address', v)} />
              <CheckboxField label="Printed On" checked={currentSettings.customer_show_printed_on} onChange={(v) => handleChange('customer_show_printed_on', v)} />
            </div>
          </div>

          {/* Order Detail Section */}
          <div className="p-4 border border-border rounded-lg space-y-4" style={{ backgroundColor: 'white' }}>
            <h4 className="font-medium">Order Detail</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Font Height</Label>
                <Select
                  value={currentSettings.customer_detail_font_height?.toString()}
                  onValueChange={(v) => handleChange('customer_detail_font_height', parseInt(v))}
                >
                  <SelectTrigger style={{ backgroundColor: 'white' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map(size => (
                      <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Font Width</Label>
                <Select
                  value={currentSettings.customer_detail_font_width?.toString()}
                  onValueChange={(v) => handleChange('customer_detail_font_width', parseInt(v))}
                >
                  <SelectTrigger style={{ backgroundColor: 'white' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map(size => (
                      <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <CheckboxField label="Order Id" checked={currentSettings.customer_show_order_id} onChange={(v) => handleChange('customer_show_order_id', v)} />
              <CheckboxField label="Order Date" checked={currentSettings.customer_show_order_date} onChange={(v) => handleChange('customer_show_order_date', v)} />
              <CheckboxField label="Customer Name" checked={currentSettings.customer_show_customer_name} onChange={(v) => handleChange('customer_show_customer_name', v)} />
              <CheckboxField label="Customer Phone" checked={currentSettings.customer_show_customer_phone} onChange={(v) => handleChange('customer_show_customer_phone', v)} />
              <CheckboxField label="Order Type" checked={currentSettings.customer_show_order_type} onChange={(v) => handleChange('customer_show_order_type', v)} />
              <CheckboxField label="Payment Method" checked={currentSettings.customer_show_payment_method} onChange={(v) => handleChange('customer_show_payment_method', v)} />
              <CheckboxField label="Notes" checked={currentSettings.customer_show_notes} onChange={(v) => handleChange('customer_show_notes', v)} />
            </div>
          </div>
        </TabsContent>

        {/* Kitchen Ticket Settings */}
        <TabsContent value="kitchen" className="space-y-4">
          {/* Header Section */}
          <div className="p-4 border border-border rounded-lg space-y-4" style={{ backgroundColor: 'white' }}>
            <h4 className="font-medium">Header</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Font Height</Label>
                <Select
                  value={currentSettings.kitchen_header_font_height?.toString()}
                  onValueChange={(v) => handleChange('kitchen_header_font_height', parseInt(v))}
                >
                  <SelectTrigger style={{ backgroundColor: 'white' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map(size => (
                      <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Font Width</Label>
                <Select
                  value={currentSettings.kitchen_header_font_width?.toString()}
                  onValueChange={(v) => handleChange('kitchen_header_font_width', parseInt(v))}
                >
                  <SelectTrigger style={{ backgroundColor: 'white' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map(size => (
                      <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <CheckboxField label="Order Id" checked={currentSettings.kitchen_show_order_id} onChange={(v) => handleChange('kitchen_show_order_id', v)} />
              <CheckboxField label="Order Date" checked={currentSettings.kitchen_show_order_date} onChange={(v) => handleChange('kitchen_show_order_date', v)} />
              <CheckboxField label="Customer Name" checked={currentSettings.kitchen_show_customer_name} onChange={(v) => handleChange('kitchen_show_customer_name', v)} />
              <CheckboxField label="Customer Phone" checked={currentSettings.kitchen_show_customer_phone} onChange={(v) => handleChange('kitchen_show_customer_phone', v)} />
              <CheckboxField label="Order Type" checked={currentSettings.kitchen_show_order_type} onChange={(v) => handleChange('kitchen_show_order_type', v)} />
              <CheckboxField label="Cashier" checked={currentSettings.kitchen_show_cashier} onChange={(v) => handleChange('kitchen_show_cashier', v)} />
              <CheckboxField label="Notes" checked={currentSettings.kitchen_show_notes} onChange={(v) => handleChange('kitchen_show_notes', v)} />
            </div>
          </div>

          {/* Order Detail Section */}
          <div className="p-4 border border-border rounded-lg space-y-4" style={{ backgroundColor: 'white' }}>
            <h4 className="font-medium">Order Detail</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Font Height</Label>
                <Select
                  value={currentSettings.kitchen_detail_font_height?.toString()}
                  onValueChange={(v) => handleChange('kitchen_detail_font_height', parseInt(v))}
                >
                  <SelectTrigger style={{ backgroundColor: 'white' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map(size => (
                      <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Font Width</Label>
                <Select
                  value={currentSettings.kitchen_detail_font_width?.toString()}
                  onValueChange={(v) => handleChange('kitchen_detail_font_width', parseInt(v))}
                >
                  <SelectTrigger style={{ backgroundColor: 'white' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map(size => (
                      <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <CheckboxField label="Prep Time" checked={currentSettings.kitchen_show_prep_time} onChange={(v) => handleChange('kitchen_show_prep_time', v)} />
              <CheckboxField label="Order Number" checked={currentSettings.kitchen_show_order_number} onChange={(v) => handleChange('kitchen_show_order_number', v)} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      {Object.keys(localSettings).length > 0 && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 px-8"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Settings
          </Button>
        </div>
      )}
    </div>
  );
};

// Checkbox field component
const CheckboxField = ({ 
  label, 
  checked, 
  onChange 
}: { 
  label: string; 
  checked: boolean; 
  onChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center gap-3">
    <Checkbox 
      checked={checked} 
      onCheckedChange={onChange}
      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
    />
    <Label className="text-sm cursor-pointer" onClick={() => onChange(!checked)}>
      {label}
    </Label>
  </div>
);

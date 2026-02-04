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
  { value: '1', label: 'Size 1' },
  { value: '2', label: 'Size 2' },
  { value: '3', label: 'Size 3' },
  { value: '4', label: 'Size 4' },
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
      <div className="p-4 border border-border rounded-lg space-y-4" style={{ backgroundColor: '#ffffff' }}>
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
              style={{ backgroundColor: '#ffffff' }}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload Logo
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs for Receipt Sections */}
      <Tabs defaultValue="header" className="w-full">
        <TabsList className="grid w-full grid-cols-4" style={{ backgroundColor: '#f1f5f9' }}>
          <TabsTrigger value="header">Header Text</TabsTrigger>
          <TabsTrigger value="footer">Footer Text</TabsTrigger>
          <TabsTrigger value="fonts">Font Settings</TabsTrigger>
          <TabsTrigger value="fields">Show/Hide Fields</TabsTrigger>
        </TabsList>

        {/* Header Text Customization */}
        <TabsContent value="header" className="space-y-4">
          <div className="p-4 border border-border rounded-lg space-y-4" style={{ backgroundColor: '#ffffff' }}>
            <h4 className="font-medium">Receipt Header (Per Store)</h4>
            <p className="text-sm text-muted-foreground">Customize the header text that appears on receipts for this location.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Line 1 (Store Name)</Label>
                <Input
                  placeholder="TOP IN TOWN PIZZA LTD."
                  value={currentSettings.header_line1 || ''}
                  onChange={(e) => handleChange('header_line1', e.target.value)}
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="space-y-2">
                <Label>Line 2</Label>
                <Input
                  placeholder="Optional second line"
                  value={currentSettings.header_line2 || ''}
                  onChange={(e) => handleChange('header_line2', e.target.value)}
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="space-y-2">
                <Label>Line 3</Label>
                <Input
                  placeholder="Optional third line"
                  value={currentSettings.header_line3 || ''}
                  onChange={(e) => handleChange('header_line3', e.target.value)}
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="3250 60 ST NE, CALGARY, AB T1Y 3T5"
                  value={currentSettings.header_address || ''}
                  onChange={(e) => handleChange('header_address', e.target.value)}
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="(403) 280-7373"
                  value={currentSettings.header_phone || ''}
                  onChange={(e) => handleChange('header_phone', e.target.value)}
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  placeholder="info@topintownpizza.com"
                  value={currentSettings.header_email || ''}
                  onChange={(e) => handleChange('header_email', e.target.value)}
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Website</Label>
                <Input
                  placeholder="www.topintownpizza.com"
                  value={currentSettings.header_website || ''}
                  onChange={(e) => handleChange('header_website', e.target.value)}
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Footer Text Customization */}
        <TabsContent value="footer" className="space-y-4">
          <div className="p-4 border border-border rounded-lg space-y-4" style={{ backgroundColor: '#ffffff' }}>
            <h4 className="font-medium">Receipt Footer (Per Store)</h4>
            <p className="text-sm text-muted-foreground">Customize the footer text that appears on receipts for this location.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Footer Line 1 (Thank You Message)</Label>
                <Input
                  placeholder="Thank You!"
                  value={currentSettings.footer_line1 || ''}
                  onChange={(e) => handleChange('footer_line1', e.target.value)}
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="space-y-2">
                <Label>Footer Line 2</Label>
                <Input
                  placeholder="Please visit us again"
                  value={currentSettings.footer_line2 || ''}
                  onChange={(e) => handleChange('footer_line2', e.target.value)}
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="space-y-2">
                <Label>Footer Line 3</Label>
                <Input
                  placeholder="Optional third line"
                  value={currentSettings.footer_line3 || ''}
                  onChange={(e) => handleChange('footer_line3', e.target.value)}
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="space-y-2">
                <Label>GST Number</Label>
                <Input
                  placeholder="GST# 123456789"
                  value={currentSettings.footer_gst || ''}
                  onChange={(e) => handleChange('footer_gst', e.target.value)}
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Social/Contact Info</Label>
                <Input
                  placeholder="WhatsApp: 403-XXX-XXXX | FB: topintownpizza"
                  value={currentSettings.footer_social || ''}
                  onChange={(e) => handleChange('footer_social', e.target.value)}
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Per-Field Font Settings */}
        <TabsContent value="fonts" className="space-y-4">
          <div className="p-4 border border-border rounded-lg space-y-4" style={{ backgroundColor: '#ffffff' }}>
            <h4 className="font-medium">Font Settings (Per Field)</h4>
            <p className="text-sm text-muted-foreground">Set size (1-4) and bold for each receipt element.</p>
            
            <div className="space-y-3">
              <FontFieldRow 
                label="Store Name" 
                sizeValue={currentSettings.store_name_size?.toString() || '2'}
                boldValue={currentSettings.store_name_bold ?? true}
                onSizeChange={(v) => handleChange('store_name_size', parseInt(v))}
                onBoldChange={(v) => handleChange('store_name_bold', v)}
              />
              <FontFieldRow 
                label="Store Address" 
                sizeValue={currentSettings.store_address_size?.toString() || '1'}
                boldValue={currentSettings.store_address_bold ?? false}
                onSizeChange={(v) => handleChange('store_address_size', parseInt(v))}
                onBoldChange={(v) => handleChange('store_address_bold', v)}
              />
              <FontFieldRow 
                label="Store Phone" 
                sizeValue={currentSettings.store_phone_size?.toString() || '1'}
                boldValue={currentSettings.store_phone_bold ?? false}
                onSizeChange={(v) => handleChange('store_phone_size', parseInt(v))}
                onBoldChange={(v) => handleChange('store_phone_bold', v)}
              />
              <FontFieldRow 
                label="Order ID" 
                sizeValue={currentSettings.order_id_size?.toString() || '2'}
                boldValue={currentSettings.order_id_bold ?? true}
                onSizeChange={(v) => handleChange('order_id_size', parseInt(v))}
                onBoldChange={(v) => handleChange('order_id_bold', v)}
              />
              <FontFieldRow 
                label="Order Date/Time" 
                sizeValue={currentSettings.order_date_size?.toString() || '1'}
                boldValue={currentSettings.order_date_bold ?? false}
                onSizeChange={(v) => handleChange('order_date_size', parseInt(v))}
                onBoldChange={(v) => handleChange('order_date_bold', v)}
              />
              <FontFieldRow 
                label="Order Type" 
                sizeValue={currentSettings.order_type_size?.toString() || '2'}
                boldValue={currentSettings.order_type_bold ?? true}
                onSizeChange={(v) => handleChange('order_type_size', parseInt(v))}
                onBoldChange={(v) => handleChange('order_type_bold', v)}
              />
              <FontFieldRow 
                label="Customer Name" 
                sizeValue={currentSettings.customer_name_size?.toString() || '2'}
                boldValue={currentSettings.customer_name_bold ?? true}
                onSizeChange={(v) => handleChange('customer_name_size', parseInt(v))}
                onBoldChange={(v) => handleChange('customer_name_bold', v)}
              />
              <FontFieldRow 
                label="Customer Phone" 
                sizeValue={currentSettings.customer_phone_size?.toString() || '1'}
                boldValue={currentSettings.customer_phone_bold ?? false}
                onSizeChange={(v) => handleChange('customer_phone_size', parseInt(v))}
                onBoldChange={(v) => handleChange('customer_phone_bold', v)}
              />
              <FontFieldRow 
                label="Item Name" 
                sizeValue={currentSettings.item_name_size?.toString() || '2'}
                boldValue={currentSettings.item_name_bold ?? true}
                onSizeChange={(v) => handleChange('item_name_size', parseInt(v))}
                onBoldChange={(v) => handleChange('item_name_bold', v)}
              />
              <FontFieldRow 
                label="Item Details" 
                sizeValue={currentSettings.item_details_size?.toString() || '1'}
                boldValue={currentSettings.item_details_bold ?? false}
                onSizeChange={(v) => handleChange('item_details_size', parseInt(v))}
                onBoldChange={(v) => handleChange('item_details_bold', v)}
              />
              <FontFieldRow 
                label="Item Price" 
                sizeValue={currentSettings.item_price_size?.toString() || '1'}
                boldValue={currentSettings.item_price_bold ?? false}
                onSizeChange={(v) => handleChange('item_price_size', parseInt(v))}
                onBoldChange={(v) => handleChange('item_price_bold', v)}
              />
              <FontFieldRow 
                label="Totals" 
                sizeValue={currentSettings.totals_size?.toString() || '2'}
                boldValue={currentSettings.totals_bold ?? true}
                onSizeChange={(v) => handleChange('totals_size', parseInt(v))}
                onBoldChange={(v) => handleChange('totals_bold', v)}
              />
              <FontFieldRow 
                label="Footer" 
                sizeValue={currentSettings.footer_size?.toString() || '1'}
                boldValue={currentSettings.footer_bold ?? false}
                onSizeChange={(v) => handleChange('footer_size', parseInt(v))}
                onBoldChange={(v) => handleChange('footer_bold', v)}
              />
            </div>
          </div>
        </TabsContent>

        {/* Show/Hide Fields */}
        <TabsContent value="fields" className="space-y-4">
          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="grid w-full grid-cols-2" style={{ backgroundColor: '#f1f5f9' }}>
              <TabsTrigger value="customer">Customer Receipt</TabsTrigger>
              <TabsTrigger value="kitchen">Kitchen Ticket</TabsTrigger>
            </TabsList>

            <TabsContent value="customer" className="space-y-4">
              <div className="p-4 border border-border rounded-lg space-y-4" style={{ backgroundColor: '#ffffff' }}>
                <h4 className="font-medium">Header Fields</h4>
                <div className="grid grid-cols-3 gap-3">
                  <CheckboxField label="Store Logo" checked={currentSettings.customer_show_logo} onChange={(v) => handleChange('customer_show_logo', v)} />
                  <CheckboxField label="Store Name" checked={currentSettings.customer_show_store_name} onChange={(v) => handleChange('customer_show_store_name', v)} />
                  <CheckboxField label="Store Phone" checked={currentSettings.customer_show_store_phone} onChange={(v) => handleChange('customer_show_store_phone', v)} />
                  <CheckboxField label="Store Email" checked={currentSettings.customer_show_store_email} onChange={(v) => handleChange('customer_show_store_email', v)} />
                  <CheckboxField label="Store Address" checked={currentSettings.customer_show_store_address} onChange={(v) => handleChange('customer_show_store_address', v)} />
                  <CheckboxField label="Printed On" checked={currentSettings.customer_show_printed_on} onChange={(v) => handleChange('customer_show_printed_on', v)} />
                </div>
              </div>
              <div className="p-4 border border-border rounded-lg space-y-4" style={{ backgroundColor: '#ffffff' }}>
                <h4 className="font-medium">Order Detail Fields</h4>
                <div className="grid grid-cols-3 gap-3">
                  <CheckboxField label="Order ID" checked={currentSettings.customer_show_order_id} onChange={(v) => handleChange('customer_show_order_id', v)} />
                  <CheckboxField label="Order Date" checked={currentSettings.customer_show_order_date} onChange={(v) => handleChange('customer_show_order_date', v)} />
                  <CheckboxField label="Customer Name" checked={currentSettings.customer_show_customer_name} onChange={(v) => handleChange('customer_show_customer_name', v)} />
                  <CheckboxField label="Customer Phone" checked={currentSettings.customer_show_customer_phone} onChange={(v) => handleChange('customer_show_customer_phone', v)} />
                  <CheckboxField label="Order Type" checked={currentSettings.customer_show_order_type} onChange={(v) => handleChange('customer_show_order_type', v)} />
                  <CheckboxField label="Payment Method" checked={currentSettings.customer_show_payment_method} onChange={(v) => handleChange('customer_show_payment_method', v)} />
                  <CheckboxField label="Notes" checked={currentSettings.customer_show_notes} onChange={(v) => handleChange('customer_show_notes', v)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="kitchen" className="space-y-4">
              <div className="p-4 border border-border rounded-lg space-y-4" style={{ backgroundColor: '#ffffff' }}>
                <h4 className="font-medium">Header Fields</h4>
                <div className="grid grid-cols-3 gap-3">
                  <CheckboxField label="Order ID" checked={currentSettings.kitchen_show_order_id} onChange={(v) => handleChange('kitchen_show_order_id', v)} />
                  <CheckboxField label="Order Date" checked={currentSettings.kitchen_show_order_date} onChange={(v) => handleChange('kitchen_show_order_date', v)} />
                  <CheckboxField label="Customer Name" checked={currentSettings.kitchen_show_customer_name} onChange={(v) => handleChange('kitchen_show_customer_name', v)} />
                  <CheckboxField label="Customer Phone" checked={currentSettings.kitchen_show_customer_phone} onChange={(v) => handleChange('kitchen_show_customer_phone', v)} />
                  <CheckboxField label="Order Type" checked={currentSettings.kitchen_show_order_type} onChange={(v) => handleChange('kitchen_show_order_type', v)} />
                  <CheckboxField label="Cashier" checked={currentSettings.kitchen_show_cashier} onChange={(v) => handleChange('kitchen_show_cashier', v)} />
                  <CheckboxField label="Notes" checked={currentSettings.kitchen_show_notes} onChange={(v) => handleChange('kitchen_show_notes', v)} />
                </div>
              </div>
              <div className="p-4 border border-border rounded-lg space-y-4" style={{ backgroundColor: '#ffffff' }}>
                <h4 className="font-medium">Order Detail Fields</h4>
                <div className="grid grid-cols-3 gap-3">
                  <CheckboxField label="Prep Time" checked={currentSettings.kitchen_show_prep_time} onChange={(v) => handleChange('kitchen_show_prep_time', v)} />
                  <CheckboxField label="Order Number" checked={currentSettings.kitchen_show_order_number} onChange={(v) => handleChange('kitchen_show_order_number', v)} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
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

// Font field row component with size dropdown and bold checkbox
const FontFieldRow = ({ 
  label, 
  sizeValue, 
  boldValue, 
  onSizeChange, 
  onBoldChange 
}: { 
  label: string;
  sizeValue: string;
  boldValue: boolean;
  onSizeChange: (value: string) => void;
  onBoldChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center gap-4 py-2 border-b border-gray-100">
    <div className="w-40 font-medium text-sm">{label}</div>
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground w-10">Size:</Label>
      <Select value={sizeValue} onValueChange={onSizeChange}>
        <SelectTrigger className="w-24" style={{ backgroundColor: '#ffffff' }}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZES.map(size => (
            <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="flex items-center gap-2">
      <Checkbox 
        checked={boldValue} 
        onCheckedChange={onBoldChange}
        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      <Label className="text-sm cursor-pointer" onClick={() => onBoldChange(!boldValue)}>
        Bold
      </Label>
    </div>
  </div>
);

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

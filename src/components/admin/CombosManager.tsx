import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Package, X, Upload, Image } from 'lucide-react';
import { useCombos, useCreateCombo, useUpdateCombo, useDeleteCombo, Combo, ComboItem } from '@/hooks/useCombos';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

type ItemType = 'pizza' | 'wings' | 'drinks' | 'dipping_sauce' | 'baked_lasagna';

interface EditableComboItem {
  item_type: ItemType;
  quantity: number;
  size_restriction: string;
  is_required: boolean;
  is_chargeable: boolean;
  sort_order: number;
}

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: 'pizza', label: 'Pizza' },
  { value: 'wings', label: 'Wings' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'dipping_sauce', label: 'Dipping Sauce' },
  { value: 'baked_lasagna', label: 'Baked Lasagna' },
];

const SIZE_OPTIONS: Record<ItemType, string[]> = {
  pizza: ['Small 10"', 'Medium 12"', 'Large 14"'],
  wings: ['6 Pieces', '12 Pieces', '24 Pieces'],
  drinks: ['Can', '500ml Bottle', '2 Litre'],
  dipping_sauce: [],
  baked_lasagna: [],
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CombosManager = () => {
  const { data: combos, isLoading } = useCombos();
  const createCombo = useCreateCombo();
  const updateCombo = useUpdateCombo();
  const deleteCombo = useDeleteCombo();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [scheduleType, setScheduleType] = useState<string>('always');
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [scheduleDates, setScheduleDates] = useState<number[]>([]);
  const [items, setItems] = useState<EditableComboItem[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setIsActive(true);
    setScheduleType('always');
    setScheduleDays([]);
    setScheduleDates([]);
    setItems([]);
    setImageUrl(null);
    setEditingCombo(null);
  };

  const openEditDialog = (combo: Combo) => {
    setEditingCombo(combo);
    setName(combo.name);
    setDescription(combo.description || '');
    setPrice(combo.price.toString());
    setIsActive(combo.is_active);
    setScheduleType(combo.schedule_type || 'always');
    setScheduleDays(combo.schedule_days || []);
    setScheduleDates(combo.schedule_dates || []);
    setImageUrl(combo.image_url || null);
    setItems(
      (combo.combo_items || []).map(item => ({
        item_type: item.item_type as ItemType,
        quantity: item.quantity,
        size_restriction: item.size_restriction || '',
        is_required: item.is_required,
        is_chargeable: item.is_chargeable,
        sort_order: item.sort_order,
      }))
    );
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Max 5MB.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `combo-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const comboData = {
      name,
      description: description || null,
      price: parseFloat(price) || 0,
      is_active: isActive,
      sort_order: editingCombo?.sort_order || 0,
      schedule_type: scheduleType,
      schedule_days: scheduleType === 'days_of_week' ? scheduleDays : null,
      schedule_dates: scheduleType === 'dates_of_month' ? scheduleDates : null,
      image_url: imageUrl,
    };

    const formattedItems = items.map((item, index) => ({
      item_type: item.item_type,
      quantity: item.quantity,
      size_restriction: item.size_restriction || null,
      is_required: item.is_required,
      is_chargeable: item.is_chargeable,
      sort_order: index + 1,
    }));

    if (editingCombo) {
      await updateCombo.mutateAsync({ id: editingCombo.id, ...comboData, items: formattedItems });
    } else {
      await createCombo.mutateAsync({ ...comboData, items: formattedItems });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this combo?')) {
      await deleteCombo.mutateAsync(id);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        item_type: 'pizza',
        quantity: 1,
        size_restriction: '',
        is_required: true,
        is_chargeable: false,
        sort_order: items.length + 1,
      },
    ]);
  };

  const updateItem = (index: number, updates: Partial<EditableComboItem>) => {
    setItems(items.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const toggleDay = (day: number) => {
    setScheduleDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleDate = (date: number) => {
    setScheduleDates(prev => 
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    );
  };

  const getScheduleDisplay = (combo: Combo) => {
    if (!combo.schedule_type || combo.schedule_type === 'always') {
      return <Badge variant="outline">Always</Badge>;
    }
    if (combo.schedule_type === 'days_of_week' && combo.schedule_days?.length) {
      return (
        <Badge variant="secondary">
          {combo.schedule_days.map(d => DAY_NAMES[d]).join(', ')}
        </Badge>
      );
    }
    if (combo.schedule_type === 'dates_of_month' && combo.schedule_dates?.length) {
      return (
        <Badge variant="secondary">
          Dates: {combo.schedule_dates.slice(0, 5).join(', ')}{combo.schedule_dates.length > 5 ? '...' : ''}
        </Badge>
      );
    }
    return null;
  };

  if (isLoading) {
    return <div className="p-4">Loading combos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Combo Deals</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Combo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCombo ? 'Edit Combo' : 'Create Combo'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Family Special Combo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="64.99" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Any 2 Large Pizzas + 24 Wings + 2L Drink" />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Combo Image</Label>
                <div className="flex items-start gap-4">
                  {imageUrl ? (
                    <div className="relative">
                      <img src={imageUrl} alt="Combo" className="w-24 h-24 object-cover rounded-lg border" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                        onClick={() => setImageUrl(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                      <div className={cn(
                        "flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-secondary/50 transition-colors",
                        uploading && "opacity-50 cursor-not-allowed"
                      )}>
                        <Upload className="h-4 w-4" />
                        {uploading ? 'Uploading...' : 'Upload Image'}
                      </div>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">Max 5MB. JPG, PNG, WebP</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="active">Active</Label>
              </div>

              {/* Schedule Section */}
              <div className="border-t pt-4">
                <Label>Schedule</Label>
                <Select value={scheduleType} onValueChange={setScheduleType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Always Available</SelectItem>
                    <SelectItem value="days_of_week">Specific Days of Week</SelectItem>
                    <SelectItem value="dates_of_month">Specific Dates of Month</SelectItem>
                  </SelectContent>
                </Select>

                {scheduleType === 'days_of_week' && (
                  <div className="flex gap-2 mt-3">
                    {DAY_NAMES.map((day, i) => (
                      <button
                        key={i}
                        onClick={() => toggleDay(i)}
                        className={cn(
                          "w-10 h-10 rounded-full border text-xs font-medium transition-colors",
                          scheduleDays.includes(i)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                )}

                {scheduleType === 'dates_of_month' && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                      <button
                        key={date}
                        onClick={() => toggleDate(date)}
                        className={cn(
                          "w-8 h-8 rounded border text-xs font-medium transition-colors",
                          scheduleDates.includes(date)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        {date}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Combo Items */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <Label>Combo Items</Label>
                  <Button variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>

                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No items added yet. Click "Add Item" to start.</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Item {index + 1}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Type</Label>
                            <Select value={item.item_type} onValueChange={(v) => updateItem(index, { item_type: v as ItemType, size_restriction: '' })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ITEM_TYPES.map(type => (
                                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {SIZE_OPTIONS[item.item_type].length > 0 && (
                            <div>
                              <Label className="text-xs">Size Restriction</Label>
                              <Select value={item.size_restriction || 'any'} onValueChange={(v) => updateItem(index, { size_restriction: v === 'any' ? '' : v })}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Any size" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="any">Any size</SelectItem>
                                  {SIZE_OPTIONS[item.item_type].map(size => (
                                    <SelectItem key={size} value={size}>{size}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="flex items-end gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`required-${index}`}
                                checked={item.is_required}
                                onCheckedChange={(v) => updateItem(index, { is_required: v })}
                              />
                              <Label htmlFor={`required-${index}`} className="text-xs">Required</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`chargeable-${index}`}
                                checked={item.is_chargeable}
                                onCheckedChange={(v) => updateItem(index, { is_chargeable: v })}
                              />
                              <Label htmlFor={`chargeable-${index}`} className="text-xs">Extra $</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!name || !price || items.length === 0}>
                  {editingCombo ? 'Update' : 'Create'} Combo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {combos?.map((combo) => (
            <TableRow key={combo.id}>
              <TableCell className="font-medium">{combo.name}</TableCell>
              <TableCell>${combo.price.toFixed(2)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {combo.combo_items?.map((item, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {item.quantity}x {item.item_type} {item.size_restriction && `(${item.size_restriction})`}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>{getScheduleDisplay(combo)}</TableCell>
              <TableCell>
                <Badge variant={combo.is_active ? 'default' : 'secondary'}>
                  {combo.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(combo)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(combo.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {(!combos || combos.length === 0) && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No combos yet. Create your first combo deal!
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default CombosManager;

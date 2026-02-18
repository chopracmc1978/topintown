import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Upload, MapPin } from 'lucide-react';
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation, LocationRow } from '@/hooks/useLocations';
import { supabase } from '@/integrations/supabase/client';

const emptyForm = {
  id: '',
  name: '',
  short_name: '',
  address: '',
  city: '',
  phone: '',
  lat: 0,
  lng: 0,
  image_url: '' as string | null,
  is_active: true,
  sort_order: 0,
};

const LocationsManager = () => {
  const { data: locations, isLoading } = useLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: (locations?.length ?? 0) });
    setDialogOpen(true);
  };

  const openEdit = (loc: LocationRow) => {
    setEditing(loc.id);
    setForm({
      id: loc.id,
      name: loc.name,
      short_name: loc.short_name,
      address: loc.address,
      city: loc.city,
      phone: loc.phone,
      lat: Number(loc.lat),
      lng: Number(loc.lng),
      image_url: loc.image_url,
      is_active: loc.is_active,
      sort_order: loc.sort_order,
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `location-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('location-images').upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('location-images').getPublicUrl(fileName);
      setForm(f => ({ ...f, image_url: publicUrl }));
    } catch (err: any) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.short_name || !form.address) return;
    const payload = {
      id: form.id || form.short_name.toLowerCase().replace(/\s+/g, '-'),
      name: form.name,
      short_name: form.short_name,
      address: form.address,
      city: form.city,
      phone: form.phone,
      lat: form.lat,
      lng: form.lng,
      image_url: form.image_url || null,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };
    if (editing) {
      await updateLocation.mutateAsync(payload);
    } else {
      await createLocation.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this location?')) return;
    await deleteLocation.mutateAsync(id);
  };

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl font-bold">Locations Manager</h2>
          <p className="text-muted-foreground text-sm">Manage your store locations</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Location</Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations?.map(loc => (
              <TableRow key={loc.id}>
                <TableCell>
                  {loc.image_url ? (
                    <img src={loc.image_url} alt={loc.name} className="w-16 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {loc.name}
                  </div>
                </TableCell>
                <TableCell>{loc.address}</TableCell>
                <TableCell>{loc.city}</TableCell>
                <TableCell>{loc.phone}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${loc.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {loc.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(loc)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(loc.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Location' : 'Add Location'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Top In Town Pizza - Calgary" />
              </div>
              <div>
                <Label>Short Name *</Label>
                <Input value={form.short_name} onChange={e => setForm(f => ({ ...f, short_name: e.target.value }))} placeholder="Calgary" />
              </div>
            </div>
            {!editing && (
              <div>
                <Label>Location ID</Label>
                <Input value={form.id} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} placeholder="auto-generated from short name" />
                <p className="text-xs text-muted-foreground mt-1">Leave empty to auto-generate</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Address *</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="3250 60 ST NE" />
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Calgary, AB" />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(403) 280-7373 ext 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Latitude</Label>
                <Input type="number" step="any" value={form.lat} onChange={e => setForm(f => ({ ...f, lat: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input type="number" step="any" value={form.lng} onChange={e => setForm(f => ({ ...f, lng: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <Label>Image</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.image_url && <img src={form.image_url} alt="Location" className="w-20 h-14 object-cover rounded" />}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Upload'}
                </Button>
                {form.image_url && (
                  <Button variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, image_url: null }))}>Remove</Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createLocation.isPending || updateLocation.isPending}>
                {editing ? 'Save Changes' : 'Create Location'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocationsManager;

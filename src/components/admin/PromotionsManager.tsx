import { useState, useRef } from 'react';
import { Plus, Edit, Trash2, Megaphone, Upload, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  usePromotions,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
  uploadPromotionImage,
  deletePromotionImage,
  Promotion,
} from '@/hooks/usePromotions';
import { toast } from 'sonner';

const colorPresets = [
  { name: 'Red', value: '#dc2626' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Green', value: '#059669' },
  { name: 'Yellow', value: '#ca8a04' },
  { name: 'Cream', value: '#fef3c7' },
  { name: 'Teal', value: '#0d9488' },
];

const PromotionsManager = () => {
  const { data: promotions, isLoading } = usePromotions();
  const createPromotion = useCreatePromotion();
  const updatePromotion = useUpdatePromotion();
  const deletePromotion = useDeletePromotion();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    price: 0,
    price_suffix: '',
    coupon_code: '',
    image_url: '',
    background_color: '#dc2626',
    text_color: '#ffffff',
    badge_text: '',
    layout: 'horizontal' as 'horizontal' | 'card' | 'featured',
    show_order_button: true,
    is_active: true,
    sort_order: 0,
  });

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      price: 0,
      price_suffix: '',
      coupon_code: '',
      image_url: '',
      background_color: '#dc2626',
      text_color: '#ffffff',
      badge_text: '',
      layout: 'horizontal',
      show_order_button: true,
      is_active: true,
      sort_order: promotions?.length || 0,
    });
    setEditingPromotion(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (promo: Promotion) => {
    setEditingPromotion(promo);
    setFormData({
      title: promo.title,
      subtitle: promo.subtitle || '',
      description: promo.description || '',
      price: promo.price,
      price_suffix: promo.price_suffix || '',
      coupon_code: promo.coupon_code || '',
      image_url: promo.image_url || '',
      background_color: promo.background_color,
      text_color: promo.text_color,
      badge_text: promo.badge_text || '',
      layout: promo.layout,
      show_order_button: promo.show_order_button,
      is_active: promo.is_active,
      sort_order: promo.sort_order,
    });
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    
    setUploading(true);
    try {
      const url = await uploadPromotionImage(file);
      setFormData({ ...formData, image_url: url });
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (formData.image_url) {
      try {
        await deletePromotionImage(formData.image_url);
      } catch {
        // Ignore deletion errors
      }
      setFormData({ ...formData, image_url: '' });
    }
  };

  const handleSubmit = async () => {
    const payload = {
      title: formData.title,
      subtitle: formData.subtitle || null,
      description: formData.description || null,
      price: formData.price,
      price_suffix: formData.price_suffix || null,
      coupon_code: formData.coupon_code || null,
      image_url: formData.image_url || null,
      background_color: formData.background_color,
      text_color: formData.text_color,
      badge_text: formData.badge_text || null,
      layout: formData.layout,
      show_order_button: formData.show_order_button,
      is_active: formData.is_active,
      sort_order: formData.sort_order,
    };

    if (editingPromotion) {
      await updatePromotion.mutateAsync({ id: editingPromotion.id, ...payload });
    } else {
      await createPromotion.mutateAsync(payload);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (promo: Promotion) => {
    if (confirm('Are you sure you want to delete this promotion?')) {
      if (promo.image_url) {
        try {
          await deletePromotionImage(promo.image_url);
        } catch {
          // Ignore deletion errors
        }
      }
      await deletePromotion.mutateAsync(promo.id);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading promotions...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="w-5 h-5" />
          Promotions & Combo Deals
        </CardTitle>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Promotion
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {promotions?.map((promo) => (
            <div
              key={promo.id}
              className="flex items-center gap-4 p-4 border rounded-lg"
              style={{ backgroundColor: promo.background_color + '20' }}
            >
              <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
              
              {promo.image_url && (
                <img
                  src={promo.image_url}
                  alt={promo.title}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{promo.title}</h3>
                  {promo.badge_text && (
                    <Badge variant="secondary" className="text-xs">
                      {promo.badge_text}
                    </Badge>
                  )}
                  {!promo.is_active && (
                    <Badge variant="outline" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {promo.description || promo.subtitle}
                </p>
                <div className="flex items-center gap-4 mt-1 text-sm">
                  <span className="font-bold">${promo.price.toFixed(2)}{promo.price_suffix}</span>
                  {promo.coupon_code && (
                    <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                      {promo.coupon_code}
                    </span>
                  )}
                  {promo.show_order_button && (
                    <Badge variant="outline" className="text-xs text-green-600">
                      Order Button
                    </Badge>
                  )}
                </div>
              </div>
              
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: promo.background_color }}
              />
              
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(promo)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(promo)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          
          {(!promotions || promotions.length === 0) && (
            <div className="text-center text-muted-foreground py-8">
              No promotions created yet. Click "Add Promotion" to create one.
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPromotion ? 'Edit Promotion' : 'Create Promotion'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. BEST DEAL EVER"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  placeholder="e.g. ANY PIZZA. ANY TOPPINGS."
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="e.g. 2 MEDIUM 1-TOPPING PIZZAS, 10 WINGS & GARLIC TOAST"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price_suffix">Price Suffix</Label>
                <Input
                  id="price_suffix"
                  placeholder="e.g. each, /person"
                  value={formData.price_suffix}
                  onChange={(e) => setFormData({ ...formData, price_suffix: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="coupon_code">Coupon Code</Label>
                <Input
                  id="coupon_code"
                  placeholder="e.g. BEST13"
                  value={formData.coupon_code}
                  onChange={(e) => setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() })}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Image</Label>
              <div className="flex items-center gap-4">
                {formData.image_url ? (
                  <div className="relative">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleRemoveImage}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Background Color</Label>
                <div className="flex flex-wrap gap-2">
                  {colorPresets.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        formData.background_color === color.value
                          ? 'border-foreground scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setFormData({ 
                        ...formData, 
                        background_color: color.value,
                        text_color: color.value === '#fef3c7' ? '#000000' : '#ffffff'
                      })}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Layout</Label>
                <Select
                  value={formData.layout}
                  onValueChange={(v) => setFormData({ ...formData, layout: v as 'horizontal' | 'card' | 'featured' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured (Large)</SelectItem>
                    <SelectItem value="card">Card (Side)</SelectItem>
                    <SelectItem value="horizontal">Horizontal (Full Width)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="badge_text">Badge Text</Label>
                <Input
                  id="badge_text"
                  placeholder="e.g. PICKUP ONLY"
                  value={formData.badge_text}
                  onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="show_order_button"
                  checked={formData.show_order_button}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_order_button: checked })}
                />
                <Label htmlFor="show_order_button">Show "Order Now" Button</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.title || formData.price <= 0}
            >
              {editingPromotion ? 'Save Changes' : 'Create Promotion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PromotionsManager;

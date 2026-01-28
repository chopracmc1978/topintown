import { useState, useEffect } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCreateMenuItem,
  useUpdateMenuItem,
  useManageItemSizes,
  useManageDefaultToppings,
  useToppings,
  type MenuItem,
  type MenuCategory,
} from '@/hooks/useMenuItems';

interface MenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
  category: MenuCategory;
}

interface SizeInput {
  id?: string;
  name: string;
  price: string;
}

const MenuItemDialog = ({ open, onOpenChange, item, category }: MenuItemDialogProps) => {
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const { addSize, deleteSize } = useManageItemSizes();
  const { addDefaultTopping, removeDefaultTopping } = useManageDefaultToppings();
  const { data: allToppings } = useToppings();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [sizes, setSizes] = useState<SizeInput[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [newToppingId, setNewToppingId] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || '');
      setBasePrice(item.base_price.toString());
      setImageUrl(item.image_url || '');
      setIsAvailable(item.is_available);
      setIsPopular(item.is_popular);
      setSizes(
        item.sizes?.map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price.toString(),
        })) || []
      );
      setSelectedToppings(
        item.default_toppings?.map((t) => t.topping_id) || []
      );
    } else {
      resetForm();
    }
  }, [item, open]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setBasePrice('');
    setImageUrl('');
    setIsAvailable(true);
    setIsPopular(false);
    setSizes([]);
    setSelectedToppings([]);
    setNewToppingId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      base_price: parseFloat(basePrice) || 0,
      image_url: imageUrl.trim() || null,
      category,
      is_available: isAvailable,
      is_popular: isPopular,
      sort_order: 0,
    };

    try {
      if (item) {
        await updateItem.mutateAsync({ id: item.id, ...data });

        // Handle sizes
        const existingSizeIds = item.sizes?.map((s) => s.id) || [];
        const newSizeIds = sizes.filter((s) => s.id).map((s) => s.id!);

        // Delete removed sizes
        for (const sizeId of existingSizeIds) {
          if (!newSizeIds.includes(sizeId)) {
            await deleteSize.mutateAsync(sizeId);
          }
        }

        // Add or update sizes
        for (const size of sizes) {
          if (!size.id) {
            await addSize.mutateAsync({
              menu_item_id: item.id,
              name: size.name,
              price: parseFloat(size.price) || 0,
              sort_order: sizes.indexOf(size),
            });
          }
        }

        // Handle toppings
        const existingToppingIds = item.default_toppings?.map((t) => t.topping_id) || [];
        
        for (const toppingId of existingToppingIds) {
          if (!selectedToppings.includes(toppingId)) {
            const dt = item.default_toppings?.find((t) => t.topping_id === toppingId);
            if (dt) await removeDefaultTopping.mutateAsync(dt.id);
          }
        }

        for (const toppingId of selectedToppings) {
          if (!existingToppingIds.includes(toppingId)) {
            await addDefaultTopping.mutateAsync({
              menu_item_id: item.id,
              topping_id: toppingId,
            });
          }
        }
      } else {
        const newItem = await createItem.mutateAsync(data);

        // Add sizes for new item
        for (const size of sizes) {
          await addSize.mutateAsync({
            menu_item_id: newItem.id,
            name: size.name,
            price: parseFloat(size.price) || 0,
            sort_order: sizes.indexOf(size),
          });
        }

        // Add toppings for new item
        for (const toppingId of selectedToppings) {
          await addDefaultTopping.mutateAsync({
            menu_item_id: newItem.id,
            topping_id: toppingId,
          });
        }
      }

      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation hooks
    }
  };

  const addSizeRow = () => {
    setSizes([...sizes, { name: '', price: '' }]);
  };

  const updateSizeRow = (index: number, field: 'name' | 'price', value: string) => {
    const updated = [...sizes];
    updated[index][field] = value;
    setSizes(updated);
  };

  const removeSizeRow = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index));
  };

  const addTopping = () => {
    if (newToppingId && !selectedToppings.includes(newToppingId)) {
      setSelectedToppings([...selectedToppings, newToppingId]);
      setNewToppingId('');
    }
  };

  const removeTopping = (toppingId: string) => {
    setSelectedToppings(selectedToppings.filter((id) => id !== toppingId));
  };

  const availableToppings = allToppings?.filter(
    (t) => !selectedToppings.includes(t.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {item ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Item name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price *</Label>
              <Input
                id="basePrice"
                type="number"
                step="0.01"
                min="0"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Item description..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="isAvailable"
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
              />
              <Label htmlFor="isAvailable">Available</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isPopular"
                checked={isPopular}
                onCheckedChange={setIsPopular}
              />
              <Label htmlFor="isPopular">Popular</Label>
            </div>
          </div>

          {/* Sizes Section */}
          {(category === 'pizza' || category === 'drinks') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Sizes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSizeRow}>
                  <Plus className="w-3 h-3 mr-1" /> Add Size
                </Button>
              </div>
              {sizes.map((size, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Size name (e.g., Small 10&quot;)"
                    value={size.name}
                    onChange={(e) => updateSizeRow(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={size.price}
                    onChange={(e) => updateSizeRow(index, 'price', e.target.value)}
                    className="w-24"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSizeRow(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Default Toppings Section */}
          <div className="space-y-3">
            <Label>Default Toppings</Label>
            <div className="flex gap-2">
              <Select value={newToppingId} onValueChange={setNewToppingId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a topping" />
                </SelectTrigger>
                <SelectContent>
                  {availableToppings?.map((topping) => (
                    <SelectItem key={topping.id} value={topping.id}>
                      {topping.name} (+${topping.price.toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={addTopping} disabled={!newToppingId}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedToppings.map((toppingId) => {
                const topping = allToppings?.find((t) => t.id === toppingId);
                return topping ? (
                  <Badge key={toppingId} variant="secondary" className="gap-1">
                    {topping.name}
                    <button
                      type="button"
                      onClick={() => removeTopping(toppingId)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
              {item ? 'Update Item' : 'Create Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MenuItemDialog;

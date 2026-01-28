import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useToppings,
  useCreateTopping,
  useUpdateTopping,
  useDeleteTopping,
  type Topping,
} from '@/hooks/useMenuItems';

const ToppingsManager = () => {
  const { data: toppings, isLoading } = useToppings();
  const createTopping = useCreateTopping();
  const updateTopping = useUpdateTopping();
  const deleteTopping = useDeleteTopping();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopping, setEditingTopping] = useState<Topping | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  const handleEdit = (topping: Topping) => {
    setEditingTopping(topping);
    setName(topping.name);
    setPrice(topping.price.toString());
    setIsAvailable(topping.is_available);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingTopping(null);
    setName('');
    setPrice('');
    setIsAvailable(true);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this topping?')) {
      deleteTopping.mutate(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: name.trim(),
      price: parseFloat(price) || 0,
      is_available: isAvailable,
      sort_order: 0,
    };

    try {
      if (editingTopping) {
        await updateTopping.mutateAsync({ id: editingTopping.id, ...data });
      } else {
        await createTopping.mutateAsync(data);
      }
      setDialogOpen(false);
    } catch (error) {
      // Error handled by mutation hooks
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-serif">Toppings</CardTitle>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Topping
          </Button>
        </CardHeader>
        <CardContent>
          {toppings && toppings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {toppings.map((topping) => (
                  <TableRow key={topping.id}>
                    <TableCell className="font-medium">{topping.name}</TableCell>
                    <TableCell>${topping.price.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          topping.is_available
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {topping.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(topping)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(topping.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No toppings yet.</p>
              <Button onClick={handleCreate} variant="outline" className="mt-4">
                Add your first topping
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingTopping ? 'Edit Topping' : 'Add New Topping'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="toppingName">Name *</Label>
              <Input
                id="toppingName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Pepperoni"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toppingPrice">Price *</Label>
              <Input
                id="toppingPrice"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="toppingAvailable"
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
              />
              <Label htmlFor="toppingAvailable">Available</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTopping.isPending || updateTopping.isPending}
              >
                {editingTopping ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ToppingsManager;

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  useGlobalSauces,
  useCreateGlobalSauce,
  useUpdateGlobalSauce,
  useDeleteGlobalSauce,
  type GlobalSauce,
} from '@/hooks/useGlobalSauces';

export const GlobalSauceManager = () => {
  const { data: sauces = [], isLoading } = useGlobalSauces();
  const createSauce = useCreateGlobalSauce();
  const updateSauce = useUpdateGlobalSauce();
  const deleteSauce = useDeleteGlobalSauce();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSauce, setEditingSauce] = useState<GlobalSauce | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0');
  const [isAvailable, setIsAvailable] = useState(true);

  const handleOpenDialog = (sauce?: GlobalSauce) => {
    if (sauce) {
      setEditingSauce(sauce);
      setName(sauce.name);
      setPrice(sauce.price.toString());
      setIsAvailable(sauce.is_available);
    } else {
      setEditingSauce(null);
      setName('');
      setPrice('0');
      setIsAvailable(true);
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    const data = {
      name: name.trim(),
      price: parseFloat(price) || 0,
      is_available: isAvailable,
      sort_order: editingSauce?.sort_order ?? sauces.length,
    };

    if (editingSauce) {
      updateSauce.mutate({ id: editingSauce.id, ...data });
    } else {
      createSauce.mutate(data);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this sauce?')) {
      deleteSauce.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sauce Management</h2>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Sauce
        </Button>
      </div>

      {sauces.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No sauces configured. Add one to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sauces.map((sauce) => (
              <TableRow key={sauce.id}>
                <TableCell className="font-medium">{sauce.name}</TableCell>
                <TableCell>
                  {sauce.price === 0 ? (
                    <span className="text-green-600 font-medium">Free</span>
                  ) : (
                    `$${sauce.price.toFixed(2)}`
                  )}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      sauce.is_available
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {sauce.is_available ? 'Available' : 'Unavailable'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDialog(sauce)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(sauce.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSauce ? 'Edit Sauce' : 'Add Sauce'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sauceName">Sauce Name</Label>
              <Input
                id="sauceName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marinara Sauce"
              />
            </div>

            <div>
              <Label htmlFor="saucePrice">Price (0 = Free)</Label>
              <Input
                id="saucePrice"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="sauceAvailable"
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
              />
              <Label htmlFor="sauceAvailable">Available</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!name.trim()}>
                {editingSauce ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

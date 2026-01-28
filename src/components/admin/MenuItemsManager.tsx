import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useMenuItems,
  useDeleteMenuItem,
  type MenuCategory,
  type MenuItem,
} from '@/hooks/useMenuItems';
import MenuItemCard from './MenuItemCard';
import MenuItemDialog from './MenuItemDialog';

interface MenuItemsManagerProps {
  category: MenuCategory;
}

const categoryLabels: Record<MenuCategory, string> = {
  pizza: 'Pizzas',
  sides: 'Sides',
  drinks: 'Drinks',
  desserts: 'Desserts',
  dipping_sauce: 'Dipping Sauces',
};

const MenuItemsManager = ({ category }: MenuItemsManagerProps) => {
  const { data: items, isLoading } = useMenuItems(category);
  const deleteItem = useDeleteMenuItem();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteItem.mutate(id);
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif">{categoryLabels[category]}</CardTitle>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add {category === 'pizza' ? 'Pizza' : 'Item'}
        </Button>
      </CardHeader>
      <CardContent>
        {items && items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No items in this category yet.</p>
            <Button onClick={handleCreate} variant="outline" className="mt-4">
              Add your first item
            </Button>
          </div>
        )}
      </CardContent>

      <MenuItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        category={category}
      />
    </Card>
  );
};

export default MenuItemsManager;

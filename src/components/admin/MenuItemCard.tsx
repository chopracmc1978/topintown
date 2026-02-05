import { Pencil, Trash2, Star, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MenuItem } from '@/hooks/useMenuItems';

interface MenuItemCardProps {
  item: MenuItem;
  onEdit: () => void;
  onDelete: () => void;
}

const MenuItemCard = ({ item, onEdit, onDelete }: MenuItemCardProps) => {
  const handleEditClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Edit clicked for:', item.name);
    onEdit();
  };

  const handleDeleteClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Delete clicked for:', item.name);
    onDelete();
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-muted">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          {item.is_popular && (
            <Badge variant="default" className="gap-1">
              <Star className="w-3 h-3" /> Popular
            </Badge>
          )}
          {!item.is_available && (
            <Badge variant="secondary" className="gap-1">
              <EyeOff className="w-3 h-3" /> Hidden
            </Badge>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {item.description || 'No description'}
            </p>
          </div>
          <span className="text-lg font-bold text-primary">
            ${item.base_price.toFixed(2)}
          </span>
        </div>

        {item.sizes && item.sizes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.sizes.map((size) => (
              <Badge key={size.id} variant="outline" className="text-xs">
                {size.name}: ${size.price.toFixed(2)}
              </Badge>
            ))}
          </div>
        )}

        {item.default_toppings && item.default_toppings.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">
              Toppings: {item.default_toppings.map((t) => t.topping?.name).join(', ')}
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={handleEditClick}
            className="flex-1 gap-1 relative z-10 touch-manipulation"
          >
            <Pencil className="w-3 h-3" /> Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeleteClick}
            className="text-destructive hover:text-destructive relative z-10 touch-manipulation"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuItemCard;

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { CartItem } from '@/types/menu';
import PizzaCustomizationModal from './pizza/PizzaCustomizationModal';
import { useMenuItems } from '@/hooks/useMenuItems';

interface CartItemCardProps {
  item: CartItem;
  onEdit: (item: CartItem) => void;
}

const CartItemCard = ({ item, onEdit }: CartItemCardProps) => {
  const { updateQuantity, removeFromCart } = useCart();
  const [expanded, setExpanded] = useState(false);
  const customization = item.pizzaCustomization;

  return (
    <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
      <div className="flex gap-4">
        <img
          src={item.image}
          alt={item.name}
          className="w-20 h-20 object-cover rounded-lg"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-foreground truncate">{item.name}</h4>
          {customization ? (
            <p className="text-sm text-muted-foreground">
              {customization.size.name} • {customization.crust.name}
            </p>
          ) : item.selectedSize && (
            <p className="text-sm text-muted-foreground">{item.selectedSize}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedSize)}
                className="w-7 h-7 rounded-full bg-background flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-medium w-6 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize)}
                className="w-7 h-7 rounded-full bg-background flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {customization && (
                <button
                  onClick={() => onEdit(item)}
                  className="text-primary hover:text-primary/80 transition-colors"
                  title="Edit customization"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => removeFromCart(item.id, item.selectedSize)}
                className="text-destructive hover:text-destructive/80 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-primary font-bold mt-1">${item.totalPrice.toFixed(2)}</p>
        </div>
      </div>

      {/* Expandable details for customized pizzas */}
      {customization && (
        <>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide details' : 'Show details'}
          </button>

          {expanded && (
            <div className="text-xs space-y-2 p-3 bg-background/50 rounded-lg">
              {/* Cheese */}
              <div>
                <span className="font-medium text-muted-foreground">Cheese: </span>
                <span className="capitalize">{customization.cheeseType.replace('-', ' ')}</span>
                {customization.cheeseSides.length > 0 && customization.cheeseType !== 'no-cheese' && (
                  <span className="text-muted-foreground">
                    {' '}({customization.cheeseSides.map(cs => `${cs.side}: ${cs.quantity}`).join(', ')})
                  </span>
                )}
              </div>

              {/* Sauce */}
              {customization.sauceName && (
                <div>
                  <span className="font-medium text-muted-foreground">Sauce: </span>
                  <span>{customization.sauceName}</span>
                  {customization.sauceQuantity === 'extra' && (
                    <span className="text-primary"> (Extra)</span>
                  )}
                </div>
              )}

              {/* Spicy Level */}
              {(customization.spicyLevel.left !== 'none' || customization.spicyLevel.right !== 'none') && (
                <div>
                  <span className="font-medium text-muted-foreground">Spicy: </span>
                  {customization.spicyLevel.left === customization.spicyLevel.right ? (
                    <span className="capitalize">{customization.spicyLevel.left}</span>
                  ) : (
                    <span>
                      L: {customization.spicyLevel.left === 'none' ? 'No Spicy' : customization.spicyLevel.left}, 
                      R: {customization.spicyLevel.right === 'none' ? 'No Spicy' : customization.spicyLevel.right}
                    </span>
                  )}
                </div>
              )}

              {/* Free Toppings */}
              {customization.freeToppings.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">Free Add-ons: </span>
                  <span>{customization.freeToppings.join(', ')}</span>
                </div>
              )}

              {/* Default Toppings */}
              {customization.defaultToppings.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">Toppings: </span>
                  <div className="mt-1 space-y-0.5">
                    {customization.defaultToppings
                      .filter(t => t.quantity !== 'none')
                      .map(t => (
                        <div key={t.id} className="flex justify-between text-muted-foreground">
                          <span>{t.name}</span>
                          <span>
                            {t.quantity !== 'regular' && <span className="capitalize">{t.quantity}</span>}
                            {t.side !== 'whole' && <span className="ml-1">({t.side === 'left' ? 'L' : 'R'})</span>}
                          </span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Removed Toppings */}
              {customization.defaultToppings.some(t => t.quantity === 'none') && (
                <div>
                  <span className="font-medium text-destructive">Removed: </span>
                  <span className="text-muted-foreground line-through">
                    {customization.defaultToppings.filter(t => t.quantity === 'none').map(t => t.name).join(', ')}
                  </span>
                </div>
              )}

              {/* Extra Toppings */}
              {customization.extraToppings.length > 0 && (
                <div>
                  <span className="font-medium text-primary">Extra Toppings: </span>
                  <div className="mt-1 space-y-0.5">
                    {customization.extraToppings.map(t => (
                      <div key={t.id} className="flex justify-between text-muted-foreground">
                        <span>{t.name}</span>
                        <span>
                          +${t.price.toFixed(2)}
                          {t.side !== 'whole' && <span className="ml-1">({t.side === 'left' ? 'L' : 'R'})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note */}
              {customization.note && (
                <div className="border-t pt-2 mt-2">
                  <span className="font-medium text-muted-foreground">Note: </span>
                  <span className="italic">{customization.note}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const CartSidebar = () => {
  const { items, total } = useCart();
  const { data: menuItems } = useMenuItems();
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  // Find the original menu item for editing
  const originalMenuItem = editingItem?.pizzaCustomization 
    ? menuItems?.find(m => m.id === editingItem.pizzaCustomization?.originalItemId)
    : null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <ShoppingBag className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h3 className="font-serif text-xl font-semibold text-foreground mb-2">Your cart is empty</h3>
        <p className="text-muted-foreground mb-6">Add some delicious pizza to get started!</p>
        <Link to="/menu">
          <Button variant="pizza">Browse Menu</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {items.map((item) => (
          <CartItemCard 
            key={`${item.id}-${item.selectedSize}`} 
            item={item} 
            onEdit={setEditingItem}
          />
        ))}
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Subtotal</span>
          <span className="text-primary">${total.toFixed(2)}</span>
        </div>
        <Link to="/checkout" className="block">
          <Button variant="pizza" className="w-full" size="lg">
            Proceed to Checkout
          </Button>
        </Link>
      </div>

      {/* Edit Modal */}
      {editingItem && originalMenuItem && (
        <PizzaCustomizationModal
          item={originalMenuItem}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          editingCartItem={editingItem}
        />
      )}
    </div>
  );
};

export default CartSidebar;
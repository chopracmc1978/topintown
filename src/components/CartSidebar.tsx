import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { CartItem } from '@/types/menu';
import PizzaCustomizationModal from './pizza/PizzaCustomizationModal';
import WingsCustomizationModal from './wings/WingsCustomizationModal';
import { useMenuItems } from '@/hooks/useMenuItems';

interface CartItemCardProps {
  item: CartItem;
  onEditPizza: (item: CartItem) => void;
  onEditWings: (item: CartItem) => void;
}

const CartItemCard = ({ item, onEditPizza, onEditWings }: CartItemCardProps) => {
  const { updateQuantity, removeFromCart } = useCart();
  const [expanded, setExpanded] = useState(false);
  const pizzaCustomization = item.pizzaCustomization;
  const wingsCustomization = item.wingsCustomization;
  const comboCustomization = item.comboCustomization;
  const hasCustomization = pizzaCustomization || wingsCustomization || comboCustomization;

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
          {comboCustomization ? (
            <p className="text-sm text-muted-foreground">
              Combo Deal • {comboCustomization.selections.length} items
            </p>
          ) : pizzaCustomization ? (
            <p className="text-sm text-muted-foreground">
              {pizzaCustomization.size.name} • {pizzaCustomization.crust.name}
            </p>
          ) : wingsCustomization ? (
            <p className="text-sm text-muted-foreground">
              Flavor: {wingsCustomization.flavor}
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
              {pizzaCustomization && !comboCustomization && (
                <button
                  onClick={() => onEditPizza(item)}
                  className="text-primary hover:text-primary/80 transition-colors"
                  title="Edit customization"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {wingsCustomization && !comboCustomization && (
                <button
                  onClick={() => onEditWings(item)}
                  className="text-primary hover:text-primary/80 transition-colors"
                  title="Edit flavor"
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

      {/* Expandable details for customized items */}
      {hasCustomization && (
        <>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide details' : 'Show details'}
          </button>

          {expanded && pizzaCustomization && (
            <div className="text-xs space-y-2 p-3 bg-background/50 rounded-lg">
              {/* Cheese */}
              <div>
                <span className="font-medium text-muted-foreground">Cheese: </span>
                <span className="capitalize">{pizzaCustomization.cheeseType.replace('-', ' ')}</span>
                {pizzaCustomization.cheeseSides.length > 0 && pizzaCustomization.cheeseType !== 'no-cheese' && (
                  <span className="text-muted-foreground">
                    {' '}({pizzaCustomization.cheeseSides.map(cs => `${cs.side}: ${cs.quantity}`).join(', ')})
                  </span>
                )}
              </div>

              {/* Sauce - only show if changed from default */}
              {pizzaCustomization.sauceName?.toLowerCase() === 'no sauce' && (
                <div><span className="font-medium text-muted-foreground">No Sauce</span></div>
              )}
              {pizzaCustomization.sauceName && pizzaCustomization.sauceName.toLowerCase() !== 'no sauce' && (!(pizzaCustomization as any).isDefaultSauce || pizzaCustomization.sauceQuantity === 'extra') && (
                <div>
                  <span className="font-medium text-muted-foreground">Sauce: </span>
                  <span>{pizzaCustomization.sauceName}</span>
                  {pizzaCustomization.sauceQuantity === 'extra' && (
                    <span className="text-primary"> (Extra)</span>
                  )}
                </div>
              )}

              {/* Spicy Level */}
              {(pizzaCustomization.spicyLevel.left !== 'none' || pizzaCustomization.spicyLevel.right !== 'none') && (
                <div>
                  <span className="font-medium text-muted-foreground">Spicy: </span>
                  {pizzaCustomization.spicyLevel.left === pizzaCustomization.spicyLevel.right ? (
                    <span className="capitalize">{pizzaCustomization.spicyLevel.left}</span>
                  ) : (
                    <span>
                      L: {pizzaCustomization.spicyLevel.left === 'none' ? 'No Spicy' : pizzaCustomization.spicyLevel.left}, 
                      R: {pizzaCustomization.spicyLevel.right === 'none' ? 'No Spicy' : pizzaCustomization.spicyLevel.right}
                    </span>
                  )}
                </div>
              )}

              {/* Free Toppings */}
              {pizzaCustomization.freeToppings.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">Free Add-ons: </span>
                  <span>{pizzaCustomization.freeToppings.join(', ')}</span>
                </div>
              )}

              {/* Default Toppings */}
              {pizzaCustomization.defaultToppings.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">Toppings: </span>
                  <div className="mt-1 space-y-0.5">
                    {pizzaCustomization.defaultToppings
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
              {pizzaCustomization.defaultToppings.some(t => t.quantity === 'none') && (
                <div>
                  <span className="font-medium text-destructive">Removed: </span>
                  <span className="text-muted-foreground line-through">
                    {pizzaCustomization.defaultToppings.filter(t => t.quantity === 'none').map(t => t.name).join(', ')}
                  </span>
                </div>
              )}

              {/* Extra Toppings */}
              {pizzaCustomization.extraToppings.length > 0 && (
                <div>
                  <span className="font-medium text-primary">Extra Toppings: </span>
                  <div className="mt-1 space-y-0.5">
                    {pizzaCustomization.extraToppings.map(t => (
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
              {pizzaCustomization.note && (
                <div className="border-t pt-2 mt-2">
                  <span className="font-medium text-muted-foreground">Note: </span>
                  <span className="italic">{pizzaCustomization.note}</span>
                </div>
              )}
            </div>
          )}

          {expanded && wingsCustomization && !comboCustomization && (
            <div className="text-xs space-y-2 p-3 bg-background/50 rounded-lg">
              <div>
                <span className="font-medium text-muted-foreground">Flavor: </span>
                <span>{wingsCustomization.flavor}</span>
              </div>
            </div>
          )}

          {expanded && comboCustomization && (
            <div className="text-xs space-y-2 p-3 bg-background/50 rounded-lg">
              <div className="font-medium text-primary mb-2">Combo Contents:</div>
              {comboCustomization.selections.map((selection, idx) => (
                <div key={idx} className="py-1 border-b border-border/50 last:border-0">
                  <div className="flex justify-between">
                    <div>
                      <span className="capitalize text-muted-foreground">{selection.itemType.replace('_', ' ')}: </span>
                      <span className="font-medium">{selection.itemName}</span>
                      {selection.flavor && <span className="text-muted-foreground"> ({selection.flavor})</span>}
                    </div>
                    {selection.extraCharge > 0 && (
                      <span className="text-primary">+${selection.extraCharge.toFixed(2)}</span>
                    )}
                  </div>
                  
                  {/* Show pizza customization details for combo pizzas */}
                  {selection.pizzaCustomization && (
                    <div className="mt-1 ml-4 space-y-0.5 text-muted-foreground">
                      <div>{selection.pizzaCustomization.size.name} • {selection.pizzaCustomization.crust.name}</div>
                      
                      {/* Cheese changes */}
                      {selection.pizzaCustomization.cheeseType !== 'mozzarella' && (
                        <div>Cheese: {selection.pizzaCustomization.cheeseType.replace('-', ' ')}</div>
                      )}
                      
                      {/* Sauce changes */}
                      {selection.pizzaCustomization.sauceName?.toLowerCase() === 'no sauce' && (
                        <div>No Sauce</div>
                      )}
                      {selection.pizzaCustomization.sauceQuantity === 'extra' && selection.pizzaCustomization.sauceName && (
                        <div>Extra {selection.pizzaCustomization.sauceName}</div>
                      )}
                      
                      {/* Spicy level */}
                      {(selection.pizzaCustomization.spicyLevel?.left !== 'none' || selection.pizzaCustomization.spicyLevel?.right !== 'none') && (
                        <div>
                          Spicy: {selection.pizzaCustomization.spicyLevel.left === selection.pizzaCustomization.spicyLevel.right 
                            ? selection.pizzaCustomization.spicyLevel.left 
                            : `L:${selection.pizzaCustomization.spicyLevel.left} R:${selection.pizzaCustomization.spicyLevel.right}`}
                        </div>
                      )}
                      
                      {/* Free toppings */}
                      {selection.pizzaCustomization.freeToppings?.length > 0 && (
                        <div>Add: {selection.pizzaCustomization.freeToppings.join(', ')}</div>
                      )}
                      
                      {/* Removed toppings */}
                      {selection.pizzaCustomization.defaultToppings?.some(t => t.quantity === 'none') && (
                        <div className="text-destructive">
                          NO: {selection.pizzaCustomization.defaultToppings.filter(t => t.quantity === 'none').map(t => t.name).join(', ')}
                        </div>
                      )}
                      
                      {/* Modified default toppings */}
                      {selection.pizzaCustomization.defaultToppings?.filter(t => t.quantity === 'less' || t.quantity === 'extra').map(t => (
                        <div key={t.id}>{t.quantity} {t.name}{t.side !== 'whole' ? ` (${t.side === 'left' ? 'L' : 'R'})` : ''}</div>
                      ))}
                      
                      {/* Extra toppings */}
                      {selection.pizzaCustomization.extraToppings?.length > 0 && (
                        <div>+{selection.pizzaCustomization.extraToppings.map(t => `${t.name}${t.side !== 'whole' ? ` (${t.side === 'left' ? 'L' : 'R'})` : ''}`).join(', ')}</div>
                      )}
                      
                      {/* Note */}
                      {selection.pizzaCustomization.note && (
                        <div className="italic">Note: {selection.pizzaCustomization.note}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {comboCustomization.totalExtraCharge > 0 && (
                <div className="pt-2 mt-2 border-t flex justify-between font-medium">
                  <span>Base Price:</span>
                  <span>${comboCustomization.comboBasePrice.toFixed(2)}</span>
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
  const [editingPizzaItem, setEditingPizzaItem] = useState<CartItem | null>(null);
  const [editingWingsItem, setEditingWingsItem] = useState<CartItem | null>(null);

  // Find the original menu item for editing pizza
  const originalPizzaMenuItem = editingPizzaItem?.pizzaCustomization 
    ? menuItems?.find(m => m.id === editingPizzaItem.pizzaCustomization?.originalItemId)
    : null;

  // Find the original menu item for editing wings
  const originalWingsMenuItem = editingWingsItem?.wingsCustomization 
    ? menuItems?.find(m => m.id === editingWingsItem.wingsCustomization?.originalItemId)
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
            onEditPizza={setEditingPizzaItem}
            onEditWings={setEditingWingsItem}
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

      {/* Pizza Edit Modal */}
      {editingPizzaItem && originalPizzaMenuItem && (
        <PizzaCustomizationModal
          item={originalPizzaMenuItem}
          isOpen={!!editingPizzaItem}
          onClose={() => setEditingPizzaItem(null)}
          editingCartItem={editingPizzaItem}
        />
      )}

      {/* Wings Edit Modal */}
      {editingWingsItem && originalWingsMenuItem && (
        <WingsCustomizationModal
          item={originalWingsMenuItem}
          isOpen={!!editingWingsItem}
          onClose={() => setEditingWingsItem(null)}
          editingCartItem={editingWingsItem}
        />
      )}
    </div>
  );
};

export default CartSidebar;

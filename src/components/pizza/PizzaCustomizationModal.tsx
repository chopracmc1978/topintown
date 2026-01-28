import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/contexts/CartContext';
import type { MenuItem } from '@/hooks/useMenuItems';
import { useSizeCrustAvailability, useCheeseOptions, useFreeToppings, getCrustsForSize } from '@/hooks/usePizzaOptions';
import { useToppings, useSauceOptions } from '@/hooks/useMenuItems';
import type { SideSpicyLevel, ToppingQuantity, SelectedSauce, SelectedTopping, PizzaSide } from '@/types/pizzaCustomization';
import { cn } from '@/lib/utils';
import { Flame } from 'lucide-react';

interface PizzaCustomizationModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
}

const GLUTEN_FREE_PRICE = 2.5;

const PizzaCustomizationModal = ({ item, isOpen, onClose }: PizzaCustomizationModalProps) => {
  const { addToCart } = useCart();
  const { data: sizeCrustAvailability } = useSizeCrustAvailability();
  const { data: cheeseOptions } = useCheeseOptions();
  const { data: freeToppingsData } = useFreeToppings();
  const { data: allSauces } = useSauceOptions();
  const { data: allToppings } = useToppings();

  const defaultSauceIds = useMemo(() => item.default_sauces?.map(ds => ds.sauce_option_id) || [], [item.default_sauces]);
  const defaultSize = item.sizes?.[1] || item.sizes?.[0];
  const defaultCheese = cheeseOptions?.find(c => c.is_default);

  const [selectedSize, setSelectedSize] = useState<{ id: string; name: string; price: number } | null>(null);
  const [selectedCrust, setSelectedCrust] = useState<{ id: string; name: string; price: number } | null>(null);
  const [selectedSauces, setSelectedSauces] = useState<SelectedSauce[]>([]);
  const [selectedCheese, setSelectedCheese] = useState<{ id: string; name: string; quantity: 'regular' | 'extra'; price: number } | null>(null);
  const [selectedFreeToppings, setSelectedFreeToppings] = useState<string[]>([]);
  const [spicyLevel, setSpicyLevel] = useState<SideSpicyLevel>({ left: 'none', right: 'none' });
  const [defaultToppings, setDefaultToppings] = useState<SelectedTopping[]>([]);
  const [extraToppings, setExtraToppings] = useState<SelectedTopping[]>([]);
  const [note, setNote] = useState('');

  const isGlutenFree = selectedCrust?.name.toLowerCase().includes('gluten free') || false;

  useEffect(() => {
    if (defaultSize && !selectedSize) setSelectedSize({ id: defaultSize.id, name: defaultSize.name, price: defaultSize.price });
  }, [defaultSize, selectedSize]);

  useEffect(() => {
    if (selectedSize && sizeCrustAvailability && !selectedCrust) {
      const crusts = getCrustsForSize(sizeCrustAvailability, selectedSize.name);
      if (crusts.length > 0) {
        const reg = crusts.find(c => c.name.toLowerCase() === 'regular') || crusts[0];
        setSelectedCrust({ id: reg.id, name: reg.name, price: 0 });
      }
    }
  }, [selectedSize, sizeCrustAvailability, selectedCrust]);

  useEffect(() => {
    if (defaultCheese && !selectedCheese) setSelectedCheese({ id: defaultCheese.id, name: defaultCheese.name, quantity: 'regular', price: 0 });
  }, [defaultCheese, selectedCheese]);

  useEffect(() => {
    if (item.default_toppings && defaultToppings.length === 0) {
      setDefaultToppings(item.default_toppings.map(dt => ({
        id: dt.topping_id, name: dt.topping?.name || '', quantity: 'regular' as ToppingQuantity,
        price: 0, isDefault: true, isVeg: dt.topping?.is_veg, side: 'whole' as PizzaSide,
      })));
    }
  }, [item.default_toppings, defaultToppings.length]);

  useEffect(() => {
    if (!isOpen || !allSauces || defaultSauceIds.length === 0) return;
    const sauce = allSauces.find(s => defaultSauceIds.includes(s.id));
    if (sauce) setSelectedSauces([{ id: sauce.id, name: sauce.name, quantity: 'regular', price: sauce.price, isDefault: true }]);
  }, [isOpen, item.id, allSauces, defaultSauceIds]);

  const availableCrusts = useMemo(() => {
    if (!selectedSize || !sizeCrustAvailability) return [];
    return getCrustsForSize(sizeCrustAvailability, selectedSize.name);
  }, [selectedSize, sizeCrustAvailability]);

  useEffect(() => {
    if (selectedSize && availableCrusts.length > 0 && !availableCrusts.find(c => c.id === selectedCrust?.id)) {
      const reg = availableCrusts.find(c => c.name.toLowerCase() === 'regular') || availableCrusts[0];
      setSelectedCrust({ id: reg.id, name: reg.name, price: 0 });
    }
  }, [selectedSize, availableCrusts, selectedCrust?.id]);

  const toppingPrice = selectedSize?.name.includes('Small') ? 2 : selectedSize?.name.includes('Large') ? 3 : 2.5;

  const totalPrice = useMemo(() => {
    let t = (selectedSize?.price || 0) + (selectedCrust?.price || 0) + (selectedCheese?.price || 0);
    selectedSauces.forEach(s => { if (!s.isDefault) t += s.price; if (s.quantity === 'extra') t += s.price; });
    defaultToppings.forEach(tp => { if (tp.quantity === 'extra') t += tp.price; });
    extraToppings.forEach(tp => t += tp.price);
    return t;
  }, [selectedSize, selectedCrust, selectedSauces, selectedCheese, defaultToppings, extraToppings]);

  const handleAddToCart = () => {
    if (!selectedSize || !selectedCrust || !selectedCheese) return;
    addToCart({ id: `${item.id}-${Date.now()}`, name: `${item.name} (Customized)`, description: `${selectedSize.name}, ${selectedCrust.name}${note ? ` | Note: ${note}` : ''}`, price: totalPrice, image: item.image_url || '/placeholder.svg', category: 'pizza' as const, popular: item.is_popular });
    onClose();
  };

  const isNoSpicy = spicyLevel.left === 'none' && spicyLevel.right === 'none';
  const isWholeMed = spicyLevel.left === 'medium' && spicyLevel.right === 'medium';
  const isWholeHot = spicyLevel.left === 'hot' && spicyLevel.right === 'hot';
  const medSide = spicyLevel.left === 'medium' && spicyLevel.right !== 'medium' ? 'left' : spicyLevel.right === 'medium' && spicyLevel.left !== 'medium' ? 'right' : isWholeMed ? 'whole' : null;
  const hotSide = spicyLevel.left === 'hot' && spicyLevel.right !== 'hot' ? 'left' : spicyLevel.right === 'hot' && spicyLevel.left !== 'hot' ? 'right' : isWholeHot ? 'whole' : null;

  const setMed = (s: PizzaSide) => s === 'whole' ? setSpicyLevel({ left: 'medium', right: 'medium' }) : s === 'left' ? setSpicyLevel({ left: 'medium', right: hotSide === 'right' ? 'hot' : 'none' }) : setSpicyLevel({ left: hotSide === 'left' ? 'hot' : 'none', right: 'medium' });
  const setHot = (s: PizzaSide) => s === 'whole' ? setSpicyLevel({ left: 'hot', right: 'hot' }) : s === 'left' ? setSpicyLevel({ left: 'hot', right: medSide === 'right' ? 'medium' : 'none' }) : setSpicyLevel({ left: medSide === 'left' ? 'medium' : 'none', right: 'hot' });

  const Chip = ({ sel, onClick, children, variant = 'default' }: { sel?: boolean; onClick: () => void; children: React.ReactNode; variant?: 'default' | 'primary' | 'success' }) => (
    <button onClick={onClick} className={cn(
      "px-2 py-1 text-xs rounded border transition-all whitespace-nowrap",
      sel 
        ? variant === 'primary' ? "bg-primary text-primary-foreground border-primary" 
        : variant === 'success' ? "bg-green-600 text-white border-green-600"
        : "bg-primary text-primary-foreground border-primary"
        : "border-border bg-background hover:border-primary/50"
    )}>{children}</button>
  );

  const MiniBtn = ({ sel, onClick, children, variant = 'default' }: { sel?: boolean; onClick: () => void; children: React.ReactNode; variant?: 'default' | 'remove' }) => (
    <button onClick={onClick} className={cn(
      "w-5 h-5 text-[10px] rounded border flex items-center justify-center transition-all",
      sel 
        ? variant === 'remove' ? "bg-destructive text-white border-destructive" : "bg-primary text-primary-foreground border-primary"
        : "border-border hover:border-primary/50"
    )}>{children}</button>
  );

  const updateTop = (id: string, q: ToppingQuantity, s: PizzaSide, p: number, extra: boolean) => {
    extra ? setExtraToppings(prev => prev.map(t => t.id === id ? { ...t, quantity: q, side: s, price: p } : t)) : setDefaultToppings(prev => prev.map(t => t.id === id ? { ...t, quantity: q, side: s, price: p } : t));
  };

  const vegTops = (allToppings || []).filter(t => t.is_veg && !defaultToppings.some(d => d.id === t.id) && !extraToppings.some(e => e.id === t.id));
  const nonVegTops = (allToppings || []).filter(t => !t.is_veg && !defaultToppings.some(d => d.id === t.id) && !extraToppings.some(e => e.id === t.id));

  const addExtra = (t: { id: string; name: string; is_veg: boolean }) => setExtraToppings(p => [...p, { id: t.id, name: t.name, quantity: 'regular', price: toppingPrice, isDefault: false, isVeg: t.is_veg, side: 'whole' }]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <img src={item.image_url || '/placeholder.svg'} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
            <h2 className="font-serif text-lg font-bold">{item.name}</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-primary">${totalPrice.toFixed(2)}</span>
            <Button variant="pizza" onClick={handleAddToCart}>Add to Cart</Button>
          </div>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Row 1: SIZE, CRUST, CHEESE */}
          <div className="flex gap-6 items-start">
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1">SIZE</p>
              <div className="flex gap-1">
                {(item.sizes || []).map(s => (
                  <Chip key={s.id} sel={selectedSize?.id === s.id} onClick={() => setSelectedSize({ id: s.id, name: s.name, price: s.price })} variant="primary">
                    {s.name} ${s.price}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1">CRUST</p>
              <div className="flex gap-1">
                {availableCrusts.map(c => {
                  const gf = c.name.toLowerCase().includes('gluten');
                  return <Chip key={c.id} sel={selectedCrust?.id === c.id} onClick={() => setSelectedCrust({ id: c.id, name: c.name, price: gf ? GLUTEN_FREE_PRICE : 0 })} variant="primary">{c.name}</Chip>;
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1">CHEESE</p>
              <div className="flex gap-1">
                {(cheeseOptions || []).map(c => <Chip key={c.id} sel={selectedCheese?.id === c.id} onClick={() => setSelectedCheese({ id: c.id, name: c.name, quantity: 'regular', price: 0 })} variant="primary">{c.name}</Chip>)}
              </div>
              <div className="flex gap-1 mt-1">
                <Chip sel={selectedCheese?.quantity === 'regular'} onClick={() => selectedCheese && setSelectedCheese({ ...selectedCheese, quantity: 'regular', price: 0 })}>Regular</Chip>
                <Chip sel={selectedCheese?.quantity === 'extra'} onClick={() => selectedCheese && setSelectedCheese({ ...selectedCheese, quantity: 'extra', price: 2 })}>Extra +$2</Chip>
              </div>
            </div>
          </div>

          {/* Row 2: SAUCE */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1">SAUCE</p>
            <div className="flex flex-wrap gap-1">
              {(allSauces || []).map(s => (
                <Chip key={s.id} sel={selectedSauces[0]?.id === s.id} onClick={() => setSelectedSauces([{ id: s.id, name: s.name, quantity: 'regular', price: s.price, isDefault: defaultSauceIds.includes(s.id) }])} variant="primary">
                  {s.name.replace(' Sauce', '')}{!defaultSauceIds.includes(s.id) && ` +$${s.price}`}
                </Chip>
              ))}
            </div>
            {selectedSauces[0] && (
              <div className="flex gap-1 mt-1">
                <Chip sel={selectedSauces[0].quantity === 'regular'} onClick={() => setSelectedSauces([{ ...selectedSauces[0], quantity: 'regular' }])}>Regular</Chip>
                <Chip sel={selectedSauces[0].quantity === 'extra'} onClick={() => setSelectedSauces([{ ...selectedSauces[0], quantity: 'extra' }])}>Extra +${selectedSauces[0].price}</Chip>
              </div>
            )}
          </div>

          {/* Row 3: SPICY LEVEL & FREE ADD-ON */}
          <div className="flex gap-8">
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1">SPICY LEVEL</p>
              <div className="flex items-center gap-2">
                <Chip sel={isNoSpicy} onClick={() => setSpicyLevel({ left: 'none', right: 'none' })} variant="primary">No Spicy</Chip>
                <div className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span className="text-xs">Medium</span>
                  {(['left', 'right', 'whole'] as PizzaSide[]).map(s => (
                    <MiniBtn key={s} sel={medSide === s} onClick={() => setMed(s)}>{s === 'left' ? 'L' : s === 'right' ? 'R' : 'W'}</MiniBtn>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-500" />
                  <span className="text-xs">Hot</span>
                  {(['left', 'right', 'whole'] as PizzaSide[]).map(s => (
                    <MiniBtn key={s} sel={hotSide === s} onClick={() => setHot(s)}>{s === 'left' ? 'L' : s === 'right' ? 'R' : 'W'}</MiniBtn>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1">FREE ADD-ON</p>
              <div className="flex gap-1">
                {(freeToppingsData || []).map(f => (
                  <Chip key={f.id} sel={selectedFreeToppings.includes(f.id)} onClick={() => setSelectedFreeToppings(p => p.includes(f.id) ? p.filter(x => x !== f.id) : [...p, f.id])} variant="success">
                    {f.name}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4: DEFAULT TOPPINGS */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1">DEFAULT TOPPINGS <span className="font-normal">(X=Remove -=Less ○=Reg +=Extra)</span></p>
            <div className="grid grid-cols-4 gap-x-4 gap-y-1">
              {defaultToppings.map(t => (
                <div key={t.id} className={cn("flex items-center gap-1", t.quantity === 'none' && "opacity-40")}>
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", t.isVeg ? "bg-green-500" : "bg-red-500")} />
                  <span className={cn("text-xs flex-1 truncate max-w-[50px]", t.quantity === 'none' && "line-through")}>{t.name.slice(0, 6)}...</span>
                  <MiniBtn sel={t.quantity === 'none'} variant="remove" onClick={() => updateTop(t.id, 'none', 'whole', 0, false)}>X</MiniBtn>
                  <MiniBtn sel={t.quantity === 'less'} onClick={() => updateTop(t.id, 'less', t.side || 'whole', 0, false)}>-</MiniBtn>
                  <MiniBtn sel={t.quantity === 'regular'} onClick={() => updateTop(t.id, 'regular', t.side || 'whole', 0, false)}>○</MiniBtn>
                  <MiniBtn sel={t.quantity === 'extra'} onClick={() => updateTop(t.id, 'extra', t.side || 'whole', toppingPrice, false)}>+</MiniBtn>
                  {t.quantity !== 'none' && (
                    <>
                      <MiniBtn sel={(t.side || 'whole') === 'left'} onClick={() => updateTop(t.id, t.quantity, 'left', t.price, false)}>L</MiniBtn>
                      <MiniBtn sel={(t.side || 'whole') === 'right'} onClick={() => updateTop(t.id, t.quantity, 'right', t.price, false)}>R</MiniBtn>
                      <MiniBtn sel={(t.side || 'whole') === 'whole'} onClick={() => updateTop(t.id, t.quantity, 'whole', t.price, false)}>W</MiniBtn>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Row 5: EXTRA TOPPINGS */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1">ADD EXTRA TOPPINGS <span className="text-primary">+${toppingPrice}/ea</span></p>
            
            {/* Selected extras */}
            {extraToppings.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b">
                {extraToppings.map(t => (
                  <div key={t.id} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                    <span className={cn("w-2 h-2 rounded-full", t.isVeg ? "bg-green-500" : "bg-red-500")} />
                    <span className="text-xs">{t.name}</span>
                    <MiniBtn sel={t.quantity === 'less'} onClick={() => updateTop(t.id, 'less', t.side || 'whole', toppingPrice, true)}>-</MiniBtn>
                    <MiniBtn sel={t.quantity === 'regular'} onClick={() => updateTop(t.id, 'regular', t.side || 'whole', toppingPrice, true)}>○</MiniBtn>
                    <MiniBtn sel={t.quantity === 'extra'} onClick={() => updateTop(t.id, 'extra', t.side || 'whole', toppingPrice * 1.5, true)}>+</MiniBtn>
                    <MiniBtn sel={(t.side || 'whole') === 'left'} onClick={() => updateTop(t.id, t.quantity, 'left', t.price, true)}>L</MiniBtn>
                    <MiniBtn sel={(t.side || 'whole') === 'right'} onClick={() => updateTop(t.id, t.quantity, 'right', t.price, true)}>R</MiniBtn>
                    <MiniBtn sel={(t.side || 'whole') === 'whole'} onClick={() => updateTop(t.id, t.quantity, 'whole', t.price, true)}>W</MiniBtn>
                    <button onClick={() => setExtraToppings(p => p.filter(x => x.id !== t.id))} className="text-destructive text-xs ml-1">×</button>
                  </div>
                ))}
              </div>
            )}

            {/* VEG */}
            <div className="mb-2">
              <p className="text-[10px] text-green-600 font-bold flex items-center gap-1 mb-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />VEG
              </p>
              <div className="flex flex-wrap gap-1">
                {vegTops.map(t => (
                  <button key={t.id} onClick={() => addExtra(t)} className="text-xs px-2 py-0.5 border border-border rounded hover:border-green-500 hover:bg-green-50 flex items-center gap-1">
                    <span className="text-green-600">+</span>{t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* NON-VEG */}
            <div>
              <p className="text-[10px] text-red-600 font-bold flex items-center gap-1 mb-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />NON-VEG
              </p>
              <div className="flex flex-wrap gap-1">
                {nonVegTops.map(t => (
                  <button key={t.id} onClick={() => addExtra(t)} className="text-xs px-2 py-0.5 border border-border rounded hover:border-red-500 hover:bg-red-50 flex items-center gap-1">
                    <span className="text-red-600">+</span>{t.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 6: NOTE */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-1">Note:</p>
            <Textarea 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              placeholder="Any special instructions? (e.g., extra crispy, light sauce...)"
              className="h-16 text-sm resize-none"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PizzaCustomizationModal;

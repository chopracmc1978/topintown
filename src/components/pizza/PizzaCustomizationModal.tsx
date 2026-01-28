import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import type { MenuItem } from '@/hooks/useMenuItems';
import { useSizeCrustAvailability, useCheeseOptions, useFreeToppings, getCrustsForSize } from '@/hooks/usePizzaOptions';
import { useToppings, useSauceOptions } from '@/hooks/useMenuItems';
import type { SideSpicyLevel, ToppingQuantity, SelectedSauce, SelectedTopping, PizzaSide } from '@/types/pizzaCustomization';
import { cn } from '@/lib/utils';
import { Check, Flame, Plus, X } from 'lucide-react';

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
    addToCart({ id: `${item.id}-${Date.now()}`, name: `${item.name} (Customized)`, description: `${selectedSize.name}, ${selectedCrust.name}`, price: totalPrice, image: item.image_url || '/placeholder.svg', category: 'pizza' as const, popular: item.is_popular });
    onClose();
  };

  const isNoSpicy = spicyLevel.left === 'none' && spicyLevel.right === 'none';
  const isWholeMed = spicyLevel.left === 'medium' && spicyLevel.right === 'medium';
  const isWholeHot = spicyLevel.left === 'hot' && spicyLevel.right === 'hot';
  const medSide = spicyLevel.left === 'medium' && spicyLevel.right !== 'medium' ? 'left' : spicyLevel.right === 'medium' && spicyLevel.left !== 'medium' ? 'right' : isWholeMed ? 'whole' : null;
  const hotSide = spicyLevel.left === 'hot' && spicyLevel.right !== 'hot' ? 'left' : spicyLevel.right === 'hot' && spicyLevel.left !== 'hot' ? 'right' : isWholeHot ? 'whole' : null;

  const setMed = (s: PizzaSide) => s === 'whole' ? setSpicyLevel({ left: 'medium', right: 'medium' }) : s === 'left' ? setSpicyLevel({ left: 'medium', right: hotSide === 'right' ? 'hot' : 'none' }) : setSpicyLevel({ left: hotSide === 'left' ? 'hot' : 'none', right: 'medium' });
  const setHot = (s: PizzaSide) => s === 'whole' ? setSpicyLevel({ left: 'hot', right: 'hot' }) : s === 'left' ? setSpicyLevel({ left: 'hot', right: medSide === 'right' ? 'medium' : 'none' }) : setSpicyLevel({ left: medSide === 'left' ? 'medium' : 'none', right: 'hot' });

  const Btn = ({ sel, onClick, children, v = 'd', dis = false, sm = false }: { sel?: boolean; onClick: () => void; children: React.ReactNode; v?: 'd' | 'r' | 'g' | 'o' | 'h'; dis?: boolean; sm?: boolean }) => (
    <button onClick={onClick} disabled={dis} className={cn("rounded border transition-all", sm ? "px-1 py-0.5 text-[9px]" : "px-2 py-1 text-xs", dis && "opacity-30 cursor-not-allowed", sel ? v === 'r' ? "border-destructive bg-destructive text-white" : v === 'g' ? "border-green-500 bg-green-500 text-white" : v === 'o' ? "border-orange-500 bg-orange-500 text-white" : v === 'h' ? "border-red-600 bg-red-600 text-white" : "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50")}>{children}</button>
  );

  const updateTop = (id: string, q: ToppingQuantity, s: PizzaSide, p: number, extra: boolean) => {
    extra ? setExtraToppings(prev => prev.map(t => t.id === id ? { ...t, quantity: q, side: s, price: p } : t)) : setDefaultToppings(prev => prev.map(t => t.id === id ? { ...t, quantity: q, side: s, price: p } : t));
  };

  const vegTops = (allToppings || []).filter(t => t.is_veg && !defaultToppings.some(d => d.id === t.id) && !extraToppings.some(e => e.id === t.id));
  const nonVegTops = (allToppings || []).filter(t => !t.is_veg && !defaultToppings.some(d => d.id === t.id) && !extraToppings.some(e => e.id === t.id));

  const addExtra = (t: { id: string; name: string; is_veg: boolean }) => setExtraToppings(p => [...p, { id: t.id, name: t.name, quantity: 'regular', price: toppingPrice, isDefault: false, isVeg: t.is_veg, side: 'whole' }]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full p-4 bg-card">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b">
          <img src={item.image_url || '/placeholder.svg'} alt={item.name} className="w-14 h-14 rounded-lg object-cover" />
          <div className="flex-1">
            <h2 className="font-serif text-lg font-semibold">{item.name}</h2>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">${totalPrice.toFixed(2)}</p>
            <Button variant="pizza" size="sm" onClick={handleAddToCart} className="mt-1">Add to Cart</Button>
          </div>
        </div>

        {/* Row 1: Size, Crust, Sauce */}
        <div className="grid grid-cols-3 gap-4 py-3 border-b">
          <div>
            <p className="text-xs font-bold mb-2">SIZE</p>
            <div className="flex flex-wrap gap-1">
              {(item.sizes || []).map(s => <Btn key={s.id} sel={selectedSize?.id === s.id} onClick={() => setSelectedSize({ id: s.id, name: s.name, price: s.price })}>{s.name} ${s.price}</Btn>)}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold mb-2">CRUST</p>
            <div className="flex flex-wrap gap-1">
              {availableCrusts.map(c => { const gf = c.name.toLowerCase().includes('gluten'); return <Btn key={c.id} sel={selectedCrust?.id === c.id} onClick={() => setSelectedCrust({ id: c.id, name: c.name, price: gf ? GLUTEN_FREE_PRICE : 0 })}>{c.name}{gf && ` +$${GLUTEN_FREE_PRICE}`}</Btn>; })}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold mb-2">SAUCE</p>
            <div className="flex flex-wrap gap-1">
              {(allSauces || []).map(s => <Btn key={s.id} sel={selectedSauces[0]?.id === s.id} onClick={() => setSelectedSauces([{ id: s.id, name: s.name, quantity: 'regular', price: s.price, isDefault: defaultSauceIds.includes(s.id) }])}>{s.name.replace(' Sauce', '')}{!defaultSauceIds.includes(s.id) && ` +$${s.price}`}</Btn>)}
            </div>
            {selectedSauces[0] && <div className="flex gap-1 mt-1"><Btn sel={selectedSauces[0].quantity === 'regular'} onClick={() => setSelectedSauces([{ ...selectedSauces[0], quantity: 'regular' }])} sm>Regular</Btn><Btn sel={selectedSauces[0].quantity === 'extra'} onClick={() => setSelectedSauces([{ ...selectedSauces[0], quantity: 'extra' }])} sm>Extra +${selectedSauces[0].price}</Btn></div>}
          </div>
        </div>

        {/* Row 2: Cheese, Free Add-ons, Spicy Level */}
        <div className="grid grid-cols-3 gap-4 py-3 border-b">
          <div>
            <p className="text-xs font-bold mb-2">CHEESE</p>
            <div className="flex flex-wrap gap-1">
              {(cheeseOptions || []).map(c => <Btn key={c.id} sel={selectedCheese?.id === c.id} onClick={() => setSelectedCheese({ id: c.id, name: c.name, quantity: 'regular', price: 0 })}>{c.name}</Btn>)}
            </div>
            <div className="flex gap-1 mt-1">
              <Btn sel={selectedCheese?.quantity === 'regular'} onClick={() => selectedCheese && setSelectedCheese({ ...selectedCheese, quantity: 'regular', price: 0 })} sm>Regular</Btn>
              <Btn sel={selectedCheese?.quantity === 'extra'} onClick={() => selectedCheese && setSelectedCheese({ ...selectedCheese, quantity: 'extra', price: 2 })} sm>Extra +$2</Btn>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold mb-2">FREE ADD-ONS</p>
            <div className="flex flex-wrap gap-1">
              {(freeToppingsData || []).map(f => <Btn key={f.id} sel={selectedFreeToppings.includes(f.id)} v="g" onClick={() => setSelectedFreeToppings(p => p.includes(f.id) ? p.filter(x => x !== f.id) : [...p, f.id])}>{selectedFreeToppings.includes(f.id) && <Check className="w-3 h-3 mr-1 inline" />}{f.name}</Btn>)}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold mb-2">SPICY LEVEL</p>
            <div className="space-y-1">
              <Btn sel={isNoSpicy} onClick={() => setSpicyLevel({ left: 'none', right: 'none' })}>No Spicy</Btn>
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-400" /><span className="text-xs w-12">Medium</span>
                {(['left', 'right', 'whole'] as PizzaSide[]).map(s => <Btn key={s} sel={medSide === s} v="o" dis={isWholeHot} onClick={() => setMed(s)} sm>{s === 'left' ? 'L' : s === 'right' ? 'R' : 'W'}</Btn>)}
              </div>
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-red-500" /><span className="text-xs w-12">Hot</span>
                {(['left', 'right', 'whole'] as PizzaSide[]).map(s => <Btn key={s} sel={hotSide === s} v="h" dis={isWholeMed || isNoSpicy} onClick={() => setHot(s)} sm>{s === 'left' ? 'L' : s === 'right' ? 'R' : 'W'}</Btn>)}
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Toppings - 2 columns */}
        <div className="grid grid-cols-2 gap-4 pt-3">
          {/* Default Toppings */}
          <div>
            <p className="text-xs font-bold mb-2">DEFAULT TOPPINGS <span className="font-normal text-muted-foreground">(✕=Remove -=Less ○=Reg +=Extra)</span></p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              {defaultToppings.map(t => (
                <div key={t.id} className={cn("flex items-center gap-1", t.quantity === 'none' && "opacity-40")}>
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0", t.isVeg ? "bg-green-500" : "bg-red-500")} />
                  <span className={cn("text-xs flex-1 truncate", t.quantity === 'none' && "line-through")}>{t.name}</span>
                  <div className="flex gap-0.5">
                    <Btn sel={t.quantity === 'none'} v="r" onClick={() => updateTop(t.id, 'none', 'whole', 0, false)} sm>✕</Btn>
                    <Btn sel={t.quantity === 'less'} onClick={() => updateTop(t.id, 'less', t.side || 'whole', 0, false)} sm>-</Btn>
                    <Btn sel={t.quantity === 'regular'} onClick={() => updateTop(t.id, 'regular', t.side || 'whole', 0, false)} sm>○</Btn>
                    <Btn sel={t.quantity === 'extra'} onClick={() => updateTop(t.id, 'extra', t.side || 'whole', toppingPrice, false)} sm>+</Btn>
                  </div>
                  {t.quantity !== 'none' && <div className="flex gap-0.5">{(['left', 'right', 'whole'] as PizzaSide[]).map(s => <Btn key={s} sel={(t.side || 'whole') === s} onClick={() => updateTop(t.id, t.quantity, s, t.price, false)} sm>{s[0].toUpperCase()}</Btn>)}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Extra Toppings */}
          <div>
            <p className="text-xs font-bold mb-2">ADD EXTRA TOPPINGS <span className="text-primary">+${toppingPrice}/ea</span></p>
            {extraToppings.length > 0 && (
              <div className="space-y-1 mb-2 pb-2 border-b">
                {extraToppings.map(t => (
                  <div key={t.id} className="flex items-center gap-1">
                    <span className={cn("w-2 h-2 rounded-full", t.isVeg ? "bg-green-500" : "bg-red-500")} />
                    <span className="text-xs flex-1 truncate">{t.name}</span>
                    <Btn sel={t.quantity === 'less'} onClick={() => updateTop(t.id, 'less', t.side || 'whole', toppingPrice, true)} sm>-</Btn>
                    <Btn sel={t.quantity === 'regular'} onClick={() => updateTop(t.id, 'regular', t.side || 'whole', toppingPrice, true)} sm>○</Btn>
                    <Btn sel={t.quantity === 'extra'} onClick={() => updateTop(t.id, 'extra', t.side || 'whole', toppingPrice * 1.5, true)} sm>+50%</Btn>
                    {(['left', 'right', 'whole'] as PizzaSide[]).map(s => <Btn key={s} sel={(t.side || 'whole') === s} onClick={() => updateTop(t.id, t.quantity, s, t.price, true)} sm>{s[0].toUpperCase()}</Btn>)}
                    <button onClick={() => setExtraToppings(p => p.filter(x => x.id !== t.id))} className="text-destructive"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-green-600 font-medium flex items-center gap-1 mb-1"><span className="w-2 h-2 rounded-full bg-green-500" />VEG</p>
                <div className="flex flex-wrap gap-1">
                  {vegTops.map(t => <button key={t.id} onClick={() => addExtra(t)} className="text-[10px] px-1.5 py-0.5 border border-border rounded hover:border-green-500 hover:bg-green-50 flex items-center gap-0.5"><Plus className="w-2 h-2" />{t.name}</button>)}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-red-600 font-medium flex items-center gap-1 mb-1"><span className="w-2 h-2 rounded-full bg-red-500" />NON-VEG</p>
                <div className="flex flex-wrap gap-1">
                  {nonVegTops.map(t => <button key={t.id} onClick={() => addExtra(t)} className="text-[10px] px-1.5 py-0.5 border border-border rounded hover:border-red-500 hover:bg-red-50 flex items-center gap-0.5"><Plus className="w-2 h-2" />{t.name}</button>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PizzaCustomizationModal;

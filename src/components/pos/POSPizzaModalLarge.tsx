/**
 * POSPizzaModal layout for LARGE TABLETS (>= 1366px width, e.g. 15.5" screens).
 * NO SCROLLING — everything fits in one screen.
 * Edit this file freely — it will NOT affect the small-screen modal.
 */
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  usePOSPizzaModal, POSPizzaModalProps,
  SIDE_OPTIONS, blueStyle, darkStyle, disabledStyle, removedStyle,
  getExtraToppingPrice,
} from '@/hooks/usePOSPizzaModal';
import type { PizzaSide } from '@/types/pizzaCustomization';
import { cn } from '@/lib/utils';

const btn = "h-[30px] px-3 text-[11px] rounded border font-medium transition-colors text-foreground inline-flex items-center justify-center text-center leading-tight whitespace-nowrap min-w-0";
const labelBox = "h-[30px] px-3 text-[11px] font-semibold rounded grid place-items-center text-center leading-tight whitespace-normal min-w-0";

export const POSPizzaModalLarge = (props: POSPizzaModalProps) => {
  const { item, isOpen, onClose, editingItem } = props;
  const m = usePOSPizzaModal(props);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[1100px] w-[96vw] p-4 pt-3 overflow-hidden max-h-[98vh] text-slate-900 !duration-300 !animate-in !fade-in-0 !zoom-in-100 data-[state=closed]:!zoom-out-100 !gap-0"
        style={{ backgroundColor: '#c5dbe8', background: '#c5dbe8', textRendering: 'optimizeLegibility', WebkitFontSmoothing: 'antialiased' as any, display: 'flex', flexDirection: 'column', height: 'auto', maxHeight: '98vh', overflow: 'hidden' }}
      >
        {/* ROW 1: Pizza Name | Sizes | Crust */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-300 pr-12 flex-shrink-0">
          <span className="font-serif text-[11px] font-bold px-4 py-1.5 rounded whitespace-nowrap uppercase" style={{ ...blueStyle, minWidth: 120 }}>{item.name}</span>
          {item.sizes?.map(size => (
            <button key={size.id} onClick={() => m.setSelectedSize({ id: size.id, name: size.name, price: size.price })} className={cn(btn)} style={m.selectedSize?.id === size.id ? blueStyle : darkStyle}>
              {size.name} {size.price.toFixed(2)}
            </button>
          ))}
          {m.availableCrusts.map(crust => {
            const isGluten = crust.name.toLowerCase().includes('gluten');
            const disabled = isGluten && !m.isGlutenFreeAllowed;
            return (
              <button key={crust.id} onClick={() => !disabled && m.setSelectedCrust(crust)} disabled={disabled} className={cn(btn)} style={disabled ? { ...darkStyle, opacity: 0.4 } : m.selectedCrust?.id === crust.id ? blueStyle : darkStyle}>
                {isGluten ? 'Gluten' : 'Regular'}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-h-0 pt-2 overflow-hidden" style={{ flex: '1 1 0%' }}>
          {/* ROW 2: Cheese */}
          <div className="flex items-center gap-2">
            <span className={cn(labelBox, "whitespace-nowrap")} style={m.selectedCheese !== 'No Cheese' ? blueStyle : darkStyle}>Cheese</span>
            <button onClick={() => { m.setSelectedCheese('No Cheese'); m.setCheeseQuantity('normal'); }} className={btn} style={m.selectedCheese === 'No Cheese' ? blueStyle : darkStyle}>None</button>
            <button onClick={() => m.setSelectedCheese('Mozzarella')} className={btn} style={m.selectedCheese === 'Mozzarella' ? blueStyle : darkStyle}>Mozzarella</button>
            <button onClick={() => { m.setSelectedCheese('Dairy Free'); m.setCheeseQuantity('normal'); }} className={cn(btn, "whitespace-nowrap")} style={m.selectedCheese === 'Dairy Free' ? blueStyle : darkStyle}>Dairy Free +{m.cheeseExtraPrice}</button>
            <span className="w-10" />
            {(['less', 'normal', 'extra'] as const).map(qty => {
              const isDisabled = m.selectedCheese === 'No Cheese';
              return (
                <button key={qty} onClick={() => !isDisabled && m.setCheeseQuantity(qty)} disabled={isDisabled} className={cn(btn, "whitespace-nowrap")} style={isDisabled ? disabledStyle : m.cheeseQuantity === qty ? blueStyle : darkStyle}>
                  {qty === 'less' ? 'Less' : qty === 'normal' ? 'Normal' : `Extra +${m.cheeseExtraPrice}`}
                </button>
              );
            })}
          </div>

          {/* ROW 3: Spicy Level */}
          <div className="flex items-center gap-2">
            <span className={cn(labelBox)} style={(m.mediumHotSelection !== 'none' || m.hotSelection !== 'none') ? blueStyle : darkStyle}>Spicy Level</span>
            <button onClick={() => { m.setMediumHotSelection('none'); m.setHotSelection('none'); }} className={btn} style={(m.mediumHotSelection === 'none' && m.hotSelection === 'none') ? blueStyle : darkStyle}>None</button>
            <span className="text-[11px] font-semibold text-slate-800 mx-1">Medium Hot</span>
            <div className="flex gap-1">
              {(['left', 'whole', 'right'] as const).map(side => {
                const isActive = m.mediumHotSelection === side;
                const isDisabled = m.spicyBtnStates.mediumHot[side];
                return (
                  <button key={side} disabled={isDisabled} onClick={() => m.setMediumHotSelection(m.mediumHotSelection === side ? 'none' : side)} className={btn} style={isDisabled ? { ...darkStyle, opacity: 0.4, cursor: 'not-allowed' } : isActive ? blueStyle : darkStyle}>
                    {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] font-semibold text-slate-800 mx-1">Hot</span>
            <div className="flex gap-1">
              {(['left', 'whole', 'right'] as const).map(side => {
                const isActive = m.hotSelection === side;
                const isDisabled = m.spicyBtnStates.hot[side];
                return (
                  <button key={side} disabled={isDisabled} onClick={() => m.setHotSelection(m.hotSelection === side ? 'none' : side)} className={btn} style={isDisabled ? { ...darkStyle, opacity: 0.4, cursor: 'not-allowed' } : isActive ? blueStyle : darkStyle}>
                    {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ROW 4: Free Toppings */}
          {m.freeToppings.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {m.freeToppings.map((topping, idx) => {
                const sel = m.freeToppingSelections.find(f => f.name === topping.name);
                const isSelected = !!sel;
                return (
                  <div key={topping.id} className="flex items-center gap-1">
                    {idx > 0 && <div style={{ width: 20 }} />}
                    <button onClick={() => m.toggleFreeTopping(topping.name)} className={btn} style={isSelected ? blueStyle : darkStyle}>{topping.name}</button>
                    <div className="flex gap-1">
                      {(['left', 'whole', 'right'] as const).map(side => {
                        const isSideDisabled = !m.isLargePizza && side !== 'whole';
                        const isSideActive = isSelected && sel?.side === side;
                        return (
                          <button key={side} disabled={isSideDisabled} onClick={() => { if (!isSelected) m.toggleFreeTopping(topping.name); m.updateFreeToppingSide(topping.name, side); }} className={btn} style={isSideDisabled ? disabledStyle : isSideActive ? blueStyle : darkStyle}>
                            {side === 'left' ? 'Left' : side === 'whole' ? 'Whole' : 'Right'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ROW 5: Sauces */}
          <div className="flex gap-2 items-center">
            <button onClick={() => m.setSelectedSauceId(null)} className={btn} style={m.selectedSauceId === null ? blueStyle : darkStyle}>No Sauce</button>
            {m.availableSauces.map(sauce => (
              <button key={sauce.id} onClick={() => m.setSelectedSauceId(sauce.id)} className={btn} style={m.selectedSauceId === sauce.id ? blueStyle : darkStyle}>
                {sauce.name.replace(/ Sauce$/i, '')}
              </button>
            ))}
          </div>

          {/* ROW 6: Sauce Quantity */}
          <div className="flex gap-2 items-center">
            {(['less', 'normal', 'extra'] as const).map(qty => {
              const isDisabled = !m.selectedSauceId;
              const isSelected = m.sauceQuantity === qty;
              return (
                <button key={qty} onClick={() => m.selectedSauceId && m.setSauceQuantity(qty === 'less' ? 'normal' : qty)} disabled={isDisabled} className={btn} style={isDisabled ? disabledStyle : isSelected ? blueStyle : darkStyle}>
                  {qty === 'less' ? 'Less' : qty === 'normal' ? 'Normal' : 'Extra'}
                </button>
              );
            })}
          </div>

          <div className="h-1" />

          {/* DEFAULT TOPPINGS */}
          {m.pizzaDefaultToppings.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {m.defaultToppings.map(topping => {
                const isRemoved = topping.quantity === 'none';
                return (
                  <div key={topping.id} className="flex flex-col items-stretch">
                    <button onClick={() => m.toggleDefaultTopping(topping.id)} className={cn(btn, "rounded-b-none text-center justify-center px-4")} style={isRemoved ? removedStyle : blueStyle}>
                      <span className={isRemoved ? "line-through" : ""}>{topping.name}</span>
                    </button>
                    <div className="flex gap-px" style={{ marginTop: 3 }}>
                      {SIDE_OPTIONS.map(side => {
                        const isSideDisabled = !m.isLargePizza && side.value !== 'whole';
                        const isSideActive = !isRemoved && (topping.side === side.value || (!m.isLargePizza && side.value === 'whole'));
                        return (
                          <button key={side.value} onClick={() => { if (isRemoved) m.toggleDefaultTopping(topping.id); m.updateDefaultToppingSide(topping.id, side.value as PizzaSide); }} disabled={isRemoved || isSideDisabled} className={cn(btn, "flex-1 rounded-t-none justify-center")} style={(isRemoved || isSideDisabled) ? disabledStyle : isSideActive ? blueStyle : darkStyle}>
                            {side.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="h-1" />

          {/* EXTRA TOPPINGS - 3 column grid, full names, gap between name & L/W/R */}
          {m.availableExtraToppings.length > 0 && (
            <div className="grid gap-x-3 gap-y-1 grid-cols-3">
              {m.availableExtraToppings.map(topping => {
                const selected = m.extraToppings.find(t => t.id === topping.id);
                const isSelected = !!selected;
                return (
                  <div key={topping.id} className="flex items-center gap-1.5">
                    <button onClick={() => m.toggleExtraTopping(topping)} className="flex items-center justify-start px-3 h-[30px] rounded border font-medium" style={{ ...(isSelected ? blueStyle : darkStyle), flex: '1 1 0%', minWidth: 0 }}>
                      <span className="text-[11px]">{topping.name}</span>
                    </button>
                    {m.isLargePizza ? (
                      <div className="flex gap-0.5">
                        {SIDE_OPTIONS.map(side => {
                          const isThisSideActive = isSelected && ((selected?.side || 'whole') === side.value);
                          return (
                            <button key={side.value} type="button" onClick={() => {
                              if (isThisSideActive) m.toggleExtraTopping(topping);
                              else if (!isSelected) { m.toggleExtraTopping(topping); setTimeout(() => m.updateExtraToppingSide(topping.id, side.value as PizzaSide), 0); }
                              else m.updateExtraToppingSide(topping.id, side.value as PizzaSide);
                            }} className="h-[30px] px-2.5 text-[11px] rounded border font-medium text-center whitespace-nowrap" style={isThisSideActive ? blueStyle : darkStyle}>
                              {side.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <button type="button" onClick={() => m.toggleExtraTopping(topping)} className="h-[30px] px-3 text-[11px] rounded border font-medium text-center whitespace-nowrap" style={isSelected ? blueStyle : darkStyle}>
                        Whole
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center gap-2 flex-shrink-0" style={{ borderTop: '2px solid #9ab8c8', paddingTop: 8, marginTop: 6 }}>
          <input type="text" value={m.note} onChange={(e) => m.handleNoteChange(e.target.value)} placeholder={m.shortcutPlaceholder} className="flex-[2] px-3 py-2 text-[11px] border border-slate-800 rounded bg-white text-slate-800 placeholder:text-slate-400" />
          <input type="text" inputMode="decimal" value={m.extraAmount || ''} onChange={(e) => m.handleExtraAmountChange(e.target.value)} placeholder="0.00" className="w-[90px] px-3 py-2 text-[11px] border border-slate-800 rounded bg-white text-center text-slate-800" />
          <span className="text-lg font-bold text-slate-900 whitespace-nowrap min-w-[70px] text-center">${m.totalPrice.toFixed(2)}</span>
          <Button variant="outline" onClick={onClose} className="text-xs px-5 py-2 h-auto font-semibold" style={{ backgroundColor: '#f4a27a', borderColor: '#f4a27a', color: '#1a1a1a' }}>Cancel</Button>
          <Button variant="default" onClick={m.handleAddToOrder} disabled={!m.selectedSize || !m.selectedCrust} className="text-xs px-7 py-2 h-auto font-bold bg-slate-900 text-white hover:bg-slate-800">
            {editingItem ? 'Update' : 'ADD'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

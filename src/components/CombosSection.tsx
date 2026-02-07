import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useActiveCombos, Combo } from '@/hooks/useCombos';
import { ComboBuilderModal } from '@/components/combo/ComboBuilderModal';
import { Package } from 'lucide-react';
import OptimizedImage from '@/components/OptimizedImage';

const CombosSection = () => {
  const { data: combos, isLoading } = useActiveCombos();
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);

  if (isLoading || !combos || combos.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-2">
            Combo Deals
          </h2>
          <p className="text-muted-foreground">
            Save big with our family-sized combo meals
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {combos.map((combo) => (
            <div
              key={combo.id}
              className="bg-card rounded-xl overflow-hidden shadow-lg border hover:shadow-xl transition-shadow cursor-pointer flex flex-col h-full"
              onClick={() => setSelectedCombo(combo)}
            >
              <OptimizedImage
                src={combo.image_url}
                alt={combo.name}
                width={500}
                containerClassName="w-full h-48"
                className="w-full h-full object-cover"
                fallback={
                  <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Package className="h-16 w-16 text-primary/50" />
                  </div>
                }
              />
              
              <div className="p-4 flex flex-col flex-1">
                <div className="flex-1">
                  <h3 className="font-serif text-xl font-bold text-foreground mb-2">
                    {combo.name}
                  </h3>
                  {combo.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {combo.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {combo.combo_items?.map((item, i) => (
                      <span
                        key={i}
                        className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                      >
                        {item.quantity}x {item.item_type.replace('_', ' ')}
                        {item.size_restriction && ` (${item.size_restriction})`}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                  <span className="text-2xl font-bold text-primary">
                    ${combo.price.toFixed(2)}
                  </span>
                  <Button
                    variant="pizza"
                    onClick={(e) => { e.stopPropagation(); setSelectedCombo(combo); }}
                  >
                    Order Now
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedCombo && (
        <ComboBuilderModal
          combo={selectedCombo}
          isOpen={!!selectedCombo}
          onClose={() => setSelectedCombo(null)}
        />
      )}
    </section>
  );
};

export default CombosSection;

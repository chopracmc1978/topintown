import { useState } from 'react';
import { useLocations, LocationRow } from '@/hooks/useLocations';
import { MapPin, ArrowLeft, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StoreLiveDashboard from './StoreLiveDashboard';

const StoresDashboard = () => {
  const { data: locations, isLoading } = useLocations();
  const [selectedStore, setSelectedStore] = useState<LocationRow | null>(null);

  if (isLoading) return <p className="text-muted-foreground">Loading stores...</p>;

  if (selectedStore) {
    return (
      <div>
        <Button variant="ghost" onClick={() => setSelectedStore(null)} className="mb-4 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Stores
        </Button>
        <StoreLiveDashboard location={selectedStore} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold">Stores Overview</h2>
        <p className="text-muted-foreground text-sm">Click a store to view live dashboard</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations?.map(loc => (
          <button
            key={loc.id}
            onClick={() => setSelectedStore(loc)}
            className="bg-card border rounded-xl p-6 text-left hover:border-primary/50 hover:shadow-lg transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${loc.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                {loc.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">{loc.name}</h3>
            <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
              <MapPin className="w-3.5 h-3.5" />
              {loc.address}, {loc.city}
            </div>
            {loc.phone && <p className="text-muted-foreground text-sm mt-1">{loc.phone}</p>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StoresDashboard;

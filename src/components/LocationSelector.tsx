import { MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocation, LOCATIONS } from '@/contexts/LocationContext';
import { cn } from '@/lib/utils';

interface LocationSelectorProps {
  className?: string;
  compact?: boolean;
}

const LocationSelector = ({ className, compact = false }: LocationSelectorProps) => {
  const { selectedLocation, setSelectedLocation } = useLocation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "gap-2 border-border",
            compact ? "px-2" : "px-3",
            className
          )}
        >
          <MapPin className="w-4 h-4 text-primary" />
          <span className={cn("text-sm", compact && "hidden sm:inline")}>
            {selectedLocation.name}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Select Restaurant
        </div>
        {LOCATIONS.map((location) => (
          <DropdownMenuItem
            key={location.id}
            onClick={() => setSelectedLocation(location)}
            className={cn(
              "flex flex-col items-start gap-1 cursor-pointer py-3",
              selectedLocation.id === location.id && "bg-primary/10"
            )}
          >
            <div className="flex items-center gap-2 w-full">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-medium">{location.name}</span>
            </div>
            <span className="text-xs text-muted-foreground ml-6">
              {location.address}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LocationSelector;

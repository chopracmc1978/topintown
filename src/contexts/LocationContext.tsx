import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { useActiveLocations, LocationRow } from '@/hooks/useLocations';

export interface Location {
  id: string;
  name: string;
  shortName: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  image_url?: string | null;
}

// Keep hardcoded fallback for when DB hasn't loaded yet
const FALLBACK_LOCATIONS: Location[] = [
  {
    id: 'calgary',
    name: 'Top In Town Pizza - Calgary',
    shortName: 'Calgary',
    address: '3250 60 ST NE, CALGARY, AB T1Y 3T5',
    phone: '(403) 280-7373 ext 1',
    lat: 51.0855,
    lng: -113.9577,
  },
  {
    id: 'chestermere',
    name: 'Top In Town Pizza - Kinniburgh',
    shortName: 'Chestermere',
    address: '272 Kinniburgh Blvd unit 103, Chestermere, AB T1X 0V8',
    phone: '(403) 280-7373 ext 2',
    lat: 51.0501,
    lng: -113.8227,
  },
];

// Export for backward compatibility
export const LOCATIONS = FALLBACK_LOCATIONS;

interface LocationContextType {
  selectedLocation: Location;
  setSelectedLocation: (location: Location) => void;
  isDetecting: boolean;
  locations: Location[];
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedLocationId';
const IP_DETECTION_KEY = 'ipLocationDetected';

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const findClosestLocation = (lat: number, lng: number, locs: Location[]): Location => {
  let closest = locs[0];
  let minDist = Infinity;
  for (const loc of locs) {
    const d = calculateDistance(lat, lng, loc.lat, loc.lng);
    if (d < minDist) { minDist = d; closest = loc; }
  }
  return closest;
};

const mapRowToLocation = (row: LocationRow): Location => ({
  id: row.id,
  name: row.name,
  shortName: row.short_name,
  address: `${row.address}${row.city ? ', ' + row.city : ''}`,
  phone: row.phone,
  lat: Number(row.lat),
  lng: Number(row.lng),
  image_url: row.image_url,
});

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const { data: dbLocations } = useActiveLocations();
  const [isDetecting, setIsDetecting] = useState(false);

  const locations: Location[] = useMemo(() => 
    dbLocations && dbLocations.length > 0
      ? dbLocations.map(mapRowToLocation)
      : FALLBACK_LOCATIONS,
    [dbLocations]
  );

  const [selectedLocation, setSelectedLocationState] = useState<Location>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    const found = FALLBACK_LOCATIONS.find(l => l.id === savedId);
    return found || FALLBACK_LOCATIONS[0];
  });

  // Sync selected location when DB locations load
  useEffect(() => {
    if (locations.length > 0) {
      const savedId = localStorage.getItem(STORAGE_KEY);
      const found = locations.find(l => l.id === savedId);
      if (found) {
        setSelectedLocationState(found);
      } else if (!locations.find(l => l.id === selectedLocation.id)) {
        setSelectedLocationState(locations[0]);
      }
    }
  }, [locations]);

  useEffect(() => {
    const detectLocation = async () => {
      const hasManualSelection = localStorage.getItem(STORAGE_KEY);
      const hasDetected = localStorage.getItem(IP_DETECTION_KEY);
      if (hasManualSelection || hasDetected) return;
      if (window.location.pathname.startsWith('/pos')) {
        localStorage.setItem(IP_DETECTION_KEY, 'true');
        return;
      }
      setIsDetecting(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();
        if (data.latitude && data.longitude) {
          const closest = findClosestLocation(data.latitude, data.longitude, locations);
          setSelectedLocationState(closest);
          localStorage.setItem(STORAGE_KEY, closest.id);
        }
      } catch (error) {
        console.log('IP detection skipped:', error instanceof Error ? error.message : 'Network error');
      } finally {
        localStorage.setItem(IP_DETECTION_KEY, 'true');
        setIsDetecting(false);
      }
    };
    detectLocation();
  }, []);

  const setSelectedLocation = (location: Location) => {
    setSelectedLocationState(location);
    localStorage.setItem(STORAGE_KEY, location.id);
  };

  return (
    <LocationContext.Provider value={{ selectedLocation, setSelectedLocation, isDetecting, locations }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

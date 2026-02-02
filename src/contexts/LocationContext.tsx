import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Location {
  id: string;
  name: string;
  shortName: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
}

export const LOCATIONS: Location[] = [
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

interface LocationContextType {
  selectedLocation: Location;
  setSelectedLocation: (location: Location) => void;
  isDetecting: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedLocationId';
const IP_DETECTION_KEY = 'ipLocationDetected';

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Find closest location based on coordinates
const findClosestLocation = (lat: number, lng: number): Location => {
  let closestLocation = LOCATIONS[0];
  let minDistance = Infinity;

  for (const location of LOCATIONS) {
    const distance = calculateDistance(lat, lng, location.lat, location.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestLocation = location;
    }
  }

  return closestLocation;
};

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedLocation, setSelectedLocationState] = useState<Location>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    const found = LOCATIONS.find(l => l.id === savedId);
    return found || LOCATIONS[0];
  });

  // IP-based location detection on first visit
  useEffect(() => {
    const detectLocation = async () => {
      // Only detect if user hasn't manually selected and we haven't detected before
      const hasManualSelection = localStorage.getItem(STORAGE_KEY);
      const hasDetected = localStorage.getItem(IP_DETECTION_KEY);
      
      if (hasManualSelection || hasDetected) return;

      setIsDetecting(true);
      try {
        // Using ipapi.co (free HTTPS endpoint)
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.latitude && data.longitude) {
          const closestLocation = findClosestLocation(data.latitude, data.longitude);
          setSelectedLocationState(closestLocation);
          localStorage.setItem(STORAGE_KEY, closestLocation.id);
        }
      } catch (error) {
        console.log('IP detection failed, using default location');
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
    <LocationContext.Provider value={{ selectedLocation, setSelectedLocation, isDetecting }}>
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

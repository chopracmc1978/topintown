import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Location {
  id: string;
  name: string;
  shortName: string;
  address: string;
  phone: string;
}

export const LOCATIONS: Location[] = [
  {
    id: 'calgary',
    name: 'Top In Town Pizza - Calgary',
    shortName: 'Calgary',
    address: '3250 60 ST NE, CALGARY, AB T1Y 3T5',
    phone: '(403) 280-7373 ext 1',
  },
  {
    id: 'chestermere',
    name: 'Top In Town Pizza - Kinniburgh',
    shortName: 'Chestermere',
    address: '272 Kinniburgh Blvd unit 103, Chestermere, AB T1X 0V8',
    phone: '(403) 280-7373 ext 2',
  },
];

interface LocationContextType {
  selectedLocation: Location;
  setSelectedLocation: (location: Location) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedLocationId';

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [selectedLocation, setSelectedLocationState] = useState<Location>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    const found = LOCATIONS.find(l => l.id === savedId);
    return found || LOCATIONS[0];
  });

  const setSelectedLocation = (location: Location) => {
    setSelectedLocationState(location);
    localStorage.setItem(STORAGE_KEY, location.id);
  };

  return (
    <LocationContext.Provider value={{ selectedLocation, setSelectedLocation }}>
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

/**
 * POSPizzaModal wrapper — picks the correct layout based on screen width.
 * < 1366px  → POSPizzaModalSmall  (tight spacing for small tablets)
 * >= 1366px → POSPizzaModalLarge  (comfortable spacing for 15.5" screens)
 *
 * All business logic lives in usePOSPizzaModal hook.
 * Each layout file can be edited independently without affecting the other.
 */
import { useState, useEffect } from 'react';
import type { MenuItem } from '@/hooks/useMenuItems';
import type { CartItem } from '@/types/menu';
import { POSPizzaModalSmall } from './POSPizzaModalSmall';
import { POSPizzaModalLarge } from './POSPizzaModalLarge';

const LARGE_BREAKPOINT = 1366;

interface POSPizzaModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToOrder: (item: CartItem) => void;
  editingItem?: CartItem | null;
}

export const POSPizzaModal = (props: POSPizzaModalProps) => {
  const [isLarge, setIsLarge] = useState(() => window.innerWidth >= LARGE_BREAKPOINT);

  useEffect(() => {
    const handler = () => setIsLarge(window.innerWidth >= LARGE_BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  if (isLarge) return <POSPizzaModalLarge {...props} />;
  return <POSPizzaModalSmall {...props} />;
};

// ESC/POS command constants for thermal printers
export const ESC = '\x1B';
export const GS = '\x1D';
export const LF = '\x0A';

export const ESCPOS = {
  // Initialize printer
  INIT: `${ESC}@`,
  
  // Text formatting
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_HEIGHT_ON: `${GS}!\x10`,
  DOUBLE_WIDTH_ON: `${GS}!\x20`,
  DOUBLE_SIZE_ON: `${GS}!\x30`,
  NORMAL_SIZE: `${GS}!\x00`,
  UNDERLINE_ON: `${ESC}-\x01`,
  UNDERLINE_OFF: `${ESC}-\x00`,
  
  // Alignment
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  
  // Paper
  CUT: `${GS}V\x00`,
  PARTIAL_CUT: `${GS}V\x01`,
  FEED_LINES: (n: number) => `${ESC}d${String.fromCharCode(n)}`,
  
  // Line
  LINE: '--------------------------------',
  DASHED_LINE: '- - - - - - - - - - - - - - - - ',
};

// Build ESC/POS kitchen ticket
export const buildKitchenTicket = (order: {
  id: string;
  createdAt: Date | string;
  orderType: string;
  tableNumber?: string;
  pickupTime?: string;
  customerName?: string;
  notes?: string;
  items: Array<{
    quantity: number;
    name: string;
    selectedSize?: string;
    pizzaCustomization?: any;
    wingsCustomization?: any;
  }>;
}): string => {
  const { INIT, BOLD_ON, BOLD_OFF, DOUBLE_HEIGHT_ON, NORMAL_SIZE, ALIGN_CENTER, ALIGN_LEFT, LINE, CUT, FEED_LINES } = ESCPOS;
  
  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateFull = (date: Date | string) => {
    const d = new Date(date);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate().toString().padStart(2, '0');
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const year = d.getFullYear();
    return `${month} ${day} - ${weekday} - ${year}`;
  };

  const formatPickupDateTime = (date: Date | string) => {
    const d = new Date(date);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate().toString().padStart(2, '0');
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const year = d.getFullYear();
    const time = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return { date: `${month} ${day} ${weekday} ${year}`, time };
  };

  let receipt = INIT;
  
  // Header - Line 1: KITCHEN ORDER (double height only, not double width - fits on one line)
  receipt += ALIGN_CENTER;
  receipt += DOUBLE_HEIGHT_ON + BOLD_ON + 'KITCHEN ORDER' + BOLD_OFF + NORMAL_SIZE + LF;
  
  // Line 2: Order No
  receipt += ALIGN_LEFT;
  receipt += `Order No: ${order.id}${LF}`;
  
  // Line 3: Date and Time
  receipt += `Date: ${formatDateFull(order.createdAt)}, Time: ${formatTime(order.createdAt)}${LF}`;
  
  // Line 4: Type
  receipt += `Type: ${order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)}${LF}`;
  
  // Line 5: For advance orders, show scheduled pickup date/time
  if (order.pickupTime) {
    const pickup = formatPickupDateTime(order.pickupTime);
    receipt += BOLD_ON + `Pickup: ${pickup.date} Time: ${pickup.time}` + BOLD_OFF + LF;
  }
  
  if (order.tableNumber) {
    receipt += `Table: ${order.tableNumber}${LF}`;
  }
  
  receipt += LINE + LF;
  
  // Items
  for (const item of order.items) {
    receipt += BOLD_ON + `${item.quantity}x ${item.name.toUpperCase()}` + BOLD_OFF + LF;
    
    // Show size for non-pizza items
    if (item.selectedSize && !item.pizzaCustomization) {
      receipt += `   ${item.selectedSize}${LF}`;
    }
    
    // Pizza customization details (for standalone pizzas)
    if (item.pizzaCustomization && !(item as any).comboCustomization) {
      const details = formatPizzaDetailsForPrint(item.pizzaCustomization);
      for (const detail of details) {
        receipt += `   ${detail}${LF}`;
      }
    }
    
    // Combo customization details - show each selection with pizza details
    if ((item as any).comboCustomization) {
      const combo = (item as any).comboCustomization;
      for (const selection of combo.selections) {
        // Print each combo item
        let selectionLine = `   - ${selection.itemName}`;
        if (selection.flavor) {
          selectionLine += ` (${selection.flavor})`;
        }
        receipt += selectionLine + LF;
        
        // If this combo selection has pizza customization, print the details
        if (selection.pizzaCustomization) {
          const pizzaDetails = formatPizzaDetailsForPrint(selection.pizzaCustomization);
          for (const detail of pizzaDetails) {
            receipt += `      ${detail}${LF}`;
          }
        }
      }
    }
    
    // Wings/chicken customization - show flavor if selected (for standalone items)
    if (item.wingsCustomization?.flavor && !(item as any).comboCustomization) {
      receipt += `   ${item.wingsCustomization.flavor}${LF}`;
    }
    
    // Generic sauce selection (for items with sauce groups like dipping sauces)
    if ((item as any).selectedSauces?.length > 0) {
      receipt += `   ${(item as any).selectedSauces.join(', ')}${LF}`;
    }
    
    // Any custom notes on the item
    if ((item as any).itemNote) {
      receipt += `   Note: ${(item as any).itemNote}${LF}`;
    }
    
    receipt += LF;
  }
  
  // Notes
  if (order.notes) {
    receipt += LINE + LF;
    receipt += BOLD_ON + 'ORDER NOTE:' + BOLD_OFF + LF;
    receipt += order.notes + LF;
  }
  
  // Customer
  if (order.customerName) {
    receipt += LINE + LF;
    receipt += ALIGN_CENTER;
    receipt += `Customer: ${order.customerName}${LF}`;
  }
  
  receipt += FEED_LINES(3);
  receipt += CUT;
  
  return receipt;
};

// Build ESC/POS customer receipt
export const buildCustomerReceipt = (order: {
  id: string;
  createdAt: Date | string;
  orderType: string;
  customerName?: string;
  customerPhone?: string;
  paymentStatus: string;
  paymentMethod?: string;
  subtotal?: number;
  tax?: number;
  total: number;
  items: Array<{
    quantity: number;
    name: string;
    totalPrice: number;
  }>;
}, location?: {
  name?: string;
  address?: string;
  phone?: string;
}): string => {
  const { INIT, BOLD_ON, BOLD_OFF, NORMAL_SIZE, ALIGN_CENTER, ALIGN_LEFT, LINE, CUT, FEED_LINES } = ESCPOS;
  const RECEIPT_WIDTH = 32; // Standard 80mm receipt width in characters
  
  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDateShort = (date: Date | string) => {
    const d = new Date(date);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const year = d.getFullYear();
    return `${month} ${day} ${weekday} ${year}`;
  };

  // Helper to format a line with left and right aligned text
  const formatLine = (left: string, right: string): string => {
    const padding = RECEIPT_WIDTH - left.length - right.length;
    if (padding < 1) return left + ' ' + right;
    return left + ' '.repeat(padding) + right;
  };

  // Helper to format item line - separates variant info to next line if needed
  const formatItemLine = (itemName: string, price: string): string => {
    // Check if item has variant info in parentheses
    const parenMatch = itemName.match(/^(.+?)(\s*\([^)]+\))$/);
    
    if (parenMatch) {
      // Has variant info - put main name + price on line 1, variant indented on line 2
      const mainName = parenMatch[1].trim();
      const variant = parenMatch[2].trim();
      const line1 = formatLine(mainName, price);
      const line2 = '   ' + variant; // Indented variant
      return line1 + LF + line2;
    }
    
    // No variant - check if it fits on one line
    const minGap = 2;
    const available = RECEIPT_WIDTH - price.length - minGap;
    
    if (itemName.length <= available) {
      return formatLine(itemName, price);
    } else {
      // Too long - put price on next line, right-aligned
      const pricePadding = RECEIPT_WIDTH - price.length;
      return itemName + LF + ' '.repeat(pricePadding) + price;
    }
  };

  // Extract just city from address (remove AB and postal code)
  const getShortAddress = (address?: string): string => {
    if (!address) return '';
    // Remove postal code pattern and province
    const parts = address.split(',').map(p => p.trim());
    // Return just street and city (first two parts typically)
    if (parts.length >= 2) {
      return parts.slice(0, 2).join(', ');
    }
    return parts[0] || '';
  };

  let receipt = INIT;
  
  // Line 1: TOP IN TOWN PIZZA (centered, normal size - smaller font)
  receipt += ALIGN_CENTER;
  receipt += BOLD_ON + 'TOP IN TOWN PIZZA' + BOLD_OFF + LF;
  
  // Line 2: Short address (no AB, no postal code)
  const shortAddress = getShortAddress(location?.address);
  if (shortAddress) {
    receipt += shortAddress + LF;
  }
  
  // Line 3: Phone
  if (location?.phone) {
    receipt += location.phone + LF;
  }
  
  receipt += LINE + LF;
  receipt += ALIGN_LEFT;
  
  // Line 4: Order number
  receipt += `Order: ${order.id}${LF}`;
  
  // Line 5: Date and Time in one line
  receipt += `Date: ${formatDateShort(order.createdAt)} Time: ${formatTime(order.createdAt)}${LF}`;
  
  // Line 6: Type
  receipt += `Type: ${order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)}${LF}`;
  
  // Line 7: Customer
  if (order.customerName) {
    receipt += `Customer: ${order.customerName}${LF}`;
  }
  
  receipt += LINE + LF;
  
  // Items with right-aligned prices (split to 2 lines if too long)
  for (const item of order.items) {
    const itemName = `${item.quantity}x ${item.name}`;
    const price = `$${item.totalPrice.toFixed(2)}`;
    receipt += formatItemLine(itemName, price) + LF;
  }
  
  receipt += LINE + LF;
  
  // Totals with right-aligned amounts
  const subtotal = order.subtotal || order.total * 0.95;
  const tax = order.tax || order.total * 0.05;
  
  receipt += formatLine('Subtotal:', `$${subtotal.toFixed(2)}`) + LF;
  receipt += formatLine('GST (5%):', `$${tax.toFixed(2)}`) + LF;
  receipt += BOLD_ON + formatLine('TOTAL:', `$${order.total.toFixed(2)}`) + BOLD_OFF + LF;
  
  receipt += LINE + LF;
  
  // Payment
  receipt += ALIGN_CENTER;
  if (order.paymentStatus === 'paid') {
    receipt += BOLD_ON + `PAID - ${(order.paymentMethod || 'Card').toUpperCase()}` + BOLD_OFF + LF;
  } else {
    receipt += BOLD_ON + 'PAYMENT DUE' + BOLD_OFF + LF;
  }
  
  receipt += LF + 'Thank you for your order!' + LF;
  receipt += FEED_LINES(3);
  receipt += CUT;
  
  return receipt;
};

// Helper to format pizza customization for print (only show non-default changes)
const formatPizzaDetailsForPrint = (customization: any): string[] => {
  const details: string[] = [];
  
  // Size and Crust (always show)
  const sizeName = typeof customization.size === 'object' ? customization.size?.name : customization.size;
  const crustName = typeof customization.crust === 'object' ? customization.crust?.name : customization.crust;
  if (sizeName || crustName) {
    details.push(`${sizeName || 'Standard'}, ${crustName || 'Regular'}`);
  }
  
  // Cheese - only show if NOT regular/normal
  if (customization.cheeseType) {
    const cheeseChanges: string[] = [];
    if (customization.cheeseType.toLowerCase() === 'no cheese') {
      cheeseChanges.push('No Cheese');
    } else if (customization.cheeseType.toLowerCase() === 'dairy free') {
      cheeseChanges.push('Dairy Free Cheese');
    } else {
      // Check for quantity changes on cheese sides
      const hasQuantityChange = customization.cheeseSides?.some(
        (cs: any) => cs.quantity && cs.quantity !== 'regular' && cs.quantity !== 'normal'
      );
      if (hasQuantityChange) {
        const quantities = customization.cheeseSides
          ?.filter((cs: any) => cs.quantity && cs.quantity !== 'regular' && cs.quantity !== 'normal')
          .map((cs: any) => `${cs.side}: ${cs.quantity} cheese`)
          .join(', ');
        if (quantities) cheeseChanges.push(quantities);
      }
    }
    if (cheeseChanges.length > 0) {
      details.push(cheeseChanges.join(', '));
    }
  }
  
  // Sauce - only show if changed from default or quantity is not normal
  if (customization.sauceName?.toLowerCase() === 'no sauce') {
    details.push('No Sauce');
  } else if (customization.sauceQuantity && customization.sauceQuantity !== 'normal' && customization.sauceQuantity !== 'regular') {
    details.push(`${customization.sauceQuantity} ${customization.sauceName || 'Sauce'}`);
  }
  
  // Spicy Level - only show if not 'none'
  const leftSpicy = customization.spicyLevel?.left;
  const rightSpicy = customization.spicyLevel?.right;
  
  const spicyDisplayName = (level: string) => {
    if (level === 'medium') return 'Medium Hot';
    if (level === 'hot') return 'Hot';
    return level;
  };
  
  const hasLeftSpicy = leftSpicy && leftSpicy !== 'none';
  const hasRightSpicy = rightSpicy && rightSpicy !== 'none';
  
  if (hasLeftSpicy || hasRightSpicy) {
    if (leftSpicy === rightSpicy) {
      details.push(`Spicy: ${spicyDisplayName(leftSpicy!)}`);
    } else {
      const parts: string[] = [];
      if (hasLeftSpicy) parts.push(`L:${spicyDisplayName(leftSpicy!)}`);
      if (hasRightSpicy) parts.push(`R:${spicyDisplayName(rightSpicy!)}`);
      details.push(`Spicy: ${parts.join(' ')}`);
    }
  }
  
  // Free Toppings - only show if any selected
  if (customization.freeToppings?.length > 0) {
    details.push(`Add: ${customization.freeToppings.join(', ')}`);
  }
  
  // Default Toppings - only show removed (none) or modified (less/extra)
  const removedToppings = customization.defaultToppings?.filter((t: any) => t.quantity === 'none');
  if (removedToppings?.length > 0) {
    details.push(`NO: ${removedToppings.map((t: any) => t.name).join(', ')}`);
  }
  
  const modifiedDefaults = customization.defaultToppings?.filter(
    (t: any) => t.quantity === 'less' || t.quantity === 'extra'
  );
  if (modifiedDefaults?.length > 0) {
    modifiedDefaults.forEach((t: any) => {
      const sideInfo = t.side && t.side !== 'whole' ? ` (${t.side})` : '';
      details.push(`${t.quantity} ${t.name}${sideInfo}`);
    });
  }
  
  // Extra Toppings - only show if any added
  if (customization.extraToppings?.length > 0) {
    const extraList = customization.extraToppings.map((t: any) => {
      const sideInfo = t.side && t.side !== 'whole' ? ` (${t.side})` : '';
      return `+${t.name}${sideInfo}`;
    });
    details.push(extraList.join(', '));
  }
  
  // Note - only show if present
  if (customization.note) {
    details.push(`Note: ${customization.note}`);
  }
  
  return details;
};

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
  const { INIT, BOLD_ON, BOLD_OFF, DOUBLE_HEIGHT_ON, DOUBLE_SIZE_ON, NORMAL_SIZE, ALIGN_CENTER, ALIGN_LEFT, LINE, CUT, FEED_LINES } = ESCPOS;
  
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
  
  // ===== HEADER: KITCHEN ORDER (double size, bold, centered) =====
  receipt += ALIGN_CENTER;
  receipt += DOUBLE_SIZE_ON + BOLD_ON + 'KITCHEN ORDER' + BOLD_OFF + NORMAL_SIZE + LF;
  receipt += LF; // Gap after header
  
  // ===== ORDER INFO SECTION (double height for larger text) =====
  receipt += ALIGN_LEFT;
  
  // Order No - double height, bold
  receipt += DOUBLE_HEIGHT_ON + BOLD_ON + `Order No: ${order.id}` + BOLD_OFF + NORMAL_SIZE + LF;
  receipt += LF; // Gap after order no
  
  // Date and Time - double height
  receipt += DOUBLE_HEIGHT_ON + `Date: ${formatDateFull(order.createdAt)}, Time: ${formatTime(order.createdAt)}` + NORMAL_SIZE + LF;
  receipt += LF; // Gap after date
  
  // Type - double height, bold
  receipt += DOUBLE_HEIGHT_ON + BOLD_ON + `Type: ${order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)}` + BOLD_OFF + NORMAL_SIZE + LF;
  
  // For advance orders, show scheduled pickup date/time
  if (order.pickupTime) {
    const pickup = formatPickupDateTime(order.pickupTime);
    receipt += DOUBLE_HEIGHT_ON + BOLD_ON + `Pickup: ${pickup.date} Time: ${pickup.time}` + BOLD_OFF + NORMAL_SIZE + LF;
  }
  
  if (order.tableNumber) {
    receipt += DOUBLE_HEIGHT_ON + `Table: ${order.tableNumber}` + NORMAL_SIZE + LF;
  }
  
  receipt += LF; // Gap before line
  receipt += LINE + LF;
  receipt += LF; // Gap after line
  
  // ===== ITEMS SECTION =====
  for (const item of order.items) {
    // Item name - double size (like header) for prominence
    receipt += DOUBLE_SIZE_ON + BOLD_ON + `${item.quantity}x ${item.name.toUpperCase()}` + BOLD_OFF + NORMAL_SIZE + LF;
    
    // Show size for non-pizza items (excluding combos)
    if (item.selectedSize && !item.pizzaCustomization && !(item as any).comboCustomization) {
      receipt += DOUBLE_HEIGHT_ON + `   ${item.selectedSize}` + NORMAL_SIZE + LF;
    }
    
    // Pizza customization details (for standalone pizzas) - double height
    if (item.pizzaCustomization && !(item as any).comboCustomization) {
      const details = formatPizzaDetailsForPrint(item.pizzaCustomization);
      for (const detail of details) {
        receipt += DOUBLE_HEIGHT_ON + `   ${detail}` + NORMAL_SIZE + LF;
      }
    }
    
    // Combo customization details - show each selection with full details
    if ((item as any).comboCustomization) {
      const combo = (item as any).comboCustomization;
      for (const selection of (combo.selections || [])) {
        // Print each combo item with item type indication - double height
        let selectionLine = `   - ${selection.itemName}`;
        if (selection.flavor) {
          selectionLine += ` (${selection.flavor})`;
        }
        receipt += DOUBLE_HEIGHT_ON + selectionLine + NORMAL_SIZE + LF;
        
        // If this combo selection has pizza customization, print the details
        if (selection.pizzaCustomization) {
          const pizzaDetails = formatPizzaDetailsForPrint(selection.pizzaCustomization);
          for (const detail of pizzaDetails) {
            receipt += DOUBLE_HEIGHT_ON + `      ${detail}` + NORMAL_SIZE + LF;
          }
        }
      }
    }
    
    // Wings/chicken customization - show flavor if selected (for standalone items)
    if (item.wingsCustomization?.flavor && !(item as any).comboCustomization) {
      receipt += DOUBLE_HEIGHT_ON + `   ${item.wingsCustomization.flavor}` + NORMAL_SIZE + LF;
    }
    
    // Generic sauce selection (for items with sauce groups like dipping sauces)
    if ((item as any).selectedSauces?.length > 0) {
      receipt += DOUBLE_HEIGHT_ON + `   ${(item as any).selectedSauces.join(', ')}` + NORMAL_SIZE + LF;
    }
    
    // Any custom notes on the item
    if ((item as any).itemNote) {
      receipt += DOUBLE_HEIGHT_ON + `   Note: ${(item as any).itemNote}` + NORMAL_SIZE + LF;
    }
    
    receipt += LF; // Gap between items
    receipt += LF; // Extra gap between items
  }
  
  // Notes
  if (order.notes) {
    receipt += LINE + LF;
    receipt += DOUBLE_HEIGHT_ON + BOLD_ON + 'ORDER NOTE:' + BOLD_OFF + NORMAL_SIZE + LF;
    receipt += DOUBLE_HEIGHT_ON + order.notes + NORMAL_SIZE + LF;
  }
  
  // ===== CUSTOMER SECTION (double height) =====
  if (order.customerName) {
    receipt += LINE + LF;
    receipt += LF; // Gap before customer
    receipt += ALIGN_CENTER;
    receipt += DOUBLE_HEIGHT_ON + BOLD_ON + `Customer: ${order.customerName}` + BOLD_OFF + NORMAL_SIZE + LF;
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
    pizzaCustomization?: any;
    wingsCustomization?: any;
    comboCustomization?: any;
    selectedSize?: string;
  }>;
}, location?: {
  name?: string;
  address?: string;
  phone?: string;
}): string => {
  const { INIT, BOLD_ON, BOLD_OFF, DOUBLE_HEIGHT_ON, DOUBLE_SIZE_ON, NORMAL_SIZE, ALIGN_CENTER, ALIGN_LEFT, LINE, CUT, FEED_LINES } = ESCPOS;
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

  // Helper to wrap text into lines of max width, with indent for subsequent lines
  const wrapText = (text: string, maxWidth: number, prefix: string = ''): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = prefix;
    
    for (const word of words) {
      if (currentLine.length === 0 || currentLine === prefix) {
        currentLine = prefix + word;
      } else if (currentLine.length + 1 + word.length <= maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = '  ' + word; // Indent continuation lines
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    return lines;
  };

  let receipt = INIT;
  
  // ===== HEADER =====
  receipt += ALIGN_CENTER;
  // Store name - single line
  receipt += DOUBLE_SIZE_ON + BOLD_ON + 'TOP IN TOWN PIZZA LTD' + BOLD_OFF + NORMAL_SIZE + LF;
  receipt += LF; // Light gap after store name
  
  // Address lines
  receipt += 'Unit 5, 3250 - 60 St NE' + LF;
  receipt += 'Calgary AB T1Y 3T5' + LF;
  receipt += '403 280 7272 EXT - 1' + LF;
  receipt += 'web: www.topintownpizza.ca' + LF;
  receipt += LF; // Gap before line
  receipt += LINE + LF;
  receipt += LF; // Gap after line
  
  // ===== ORDER INFO SECTION =====
  receipt += ALIGN_LEFT;
  
  // Order number - double height, bold
  receipt += DOUBLE_HEIGHT_ON + BOLD_ON + `Order No: ${order.id}` + BOLD_OFF + NORMAL_SIZE + LF;
  receipt += LF; // Gap after order no
  
  // Date and Time - double height
  receipt += DOUBLE_HEIGHT_ON + `Date: ${formatDateShort(order.createdAt)}` + NORMAL_SIZE + LF;
  receipt += DOUBLE_HEIGHT_ON + `Time: ${formatTime(order.createdAt)}` + NORMAL_SIZE + LF;
  receipt += LF; // Gap after date/time
  
  // Type - double height, bold
  receipt += DOUBLE_HEIGHT_ON + BOLD_ON + `Type: ${order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)}` + BOLD_OFF + NORMAL_SIZE + LF;
  receipt += LF; // Gap after type
  
  // Customer - double height
  if (order.customerName) {
    receipt += DOUBLE_HEIGHT_ON + `Customer: ${order.customerName}` + NORMAL_SIZE + LF;
  }
  if (order.customerPhone) {
    receipt += DOUBLE_HEIGHT_ON + `Phone: ${order.customerPhone}` + NORMAL_SIZE + LF;
  }
  
  receipt += LF; // Gap before line
  receipt += LINE + LF;
  receipt += LF; // Gap after line
  
  // ===== ITEMS SECTION =====
  for (const item of order.items) {
    const price = `$${item.totalPrice.toFixed(2)}`;
    const itemName = `${item.quantity}x ${item.name.toUpperCase()}`;
    
    // Item name on one line with price right-aligned
    receipt += DOUBLE_HEIGHT_ON + BOLD_ON + formatLine(itemName, price) + BOLD_OFF + NORMAL_SIZE + LF;
    
    // Pizza customization details (for standalone pizzas)
    if (item.pizzaCustomization && !item.comboCustomization) {
      const customDetails = formatPizzaDetailsForReceipt(item.pizzaCustomization, RECEIPT_WIDTH);
      for (const line of customDetails) {
        receipt += line + LF;
      }
    }
    
    // Show size for non-pizza items (excluding combos)
    if (item.selectedSize && !item.pizzaCustomization && !item.comboCustomization) {
      receipt += `  ${item.selectedSize}` + LF;
    }
    
    // Wings/chicken customization - show flavor if selected (for standalone items)
    if (item.wingsCustomization?.flavor && !item.comboCustomization) {
      receipt += `  ${item.wingsCustomization.flavor}` + LF;
    }
    
    // Combo customization details - show each selection with full details
    if (item.comboCustomization) {
      const combo = item.comboCustomization;
      for (const selection of (combo.selections || [])) {
        let selectionLine = `  - ${selection.itemName}`;
        if (selection.flavor) {
          selectionLine += ` (${selection.flavor})`;
        }
        receipt += selectionLine + LF;
        
        // If this combo selection has pizza customization, print the details
        if (selection.pizzaCustomization) {
          const pizzaDetails = formatPizzaDetailsForReceipt(selection.pizzaCustomization, RECEIPT_WIDTH);
          for (const line of pizzaDetails) {
            receipt += '  ' + line + LF;
          }
        }
      }
    }
    
    receipt += LF; // Gap between items
  }
  
  receipt += LINE + LF;
  
  // ===== TOTALS SECTION (label left, amount right on same line) =====
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
  
  receipt += LF; // Gap before footer
  receipt += LINE + LF;
  receipt += LF; // Gap after line
  
  // ===== FOOTER =====
  receipt += 'GST#742820897RT0001' + LF;
  receipt += 'Thanks You for Shopping at' + LF;
  receipt += 'Top In Town Pizza Ltd.' + LF;
  receipt += 'for more info please email us' + LF;
  receipt += 'at info@topintownpizza.ca' + LF;
  receipt += 'Order Information Complaint' + LF;
  receipt += 'Please Whatsapp : 4038007373' + LF;
  receipt += 'Phone : 4032807373' + LF;
  receipt += '        4032807374' + LF;
  
  receipt += FEED_LINES(3);
  receipt += CUT;
  
  return receipt;
};

// Helper to format pizza customization for receipt with proper line wrapping
const formatPizzaDetailsForReceipt = (customization: any, maxWidth: number): string[] => {
  const lines: string[] = [];
  
  // Size and Crust - left aligned on one line
  const sizeName = typeof customization.size === 'object' ? customization.size?.name : customization.size;
  const crustName = typeof customization.crust === 'object' ? customization.crust?.name : customization.crust;
  if (sizeName || crustName) {
    lines.push(`  ${sizeName || 'Standard'}, ${crustName || 'Regular'}`);
  }
  
  // Cheese - only show if NOT regular/normal
  if (customization.cheeseType) {
    if (customization.cheeseType.toLowerCase() === 'no cheese') {
      lines.push('  No Cheese');
    } else if (customization.cheeseType.toLowerCase() === 'dairy free') {
      lines.push('  Dairy Free Cheese');
    }
  }
  
  // Sauce - only show if changed from default
  if (customization.sauceName?.toLowerCase() === 'no sauce') {
    lines.push('  No Sauce');
  } else if (customization.sauceQuantity && customization.sauceQuantity !== 'normal' && customization.sauceQuantity !== 'regular') {
    lines.push(`  ${customization.sauceQuantity} ${customization.sauceName || 'Sauce'}`);
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
      lines.push(`  Spicy: ${spicyDisplayName(leftSpicy!)}`);
    } else {
      const parts: string[] = [];
      if (hasLeftSpicy) parts.push(`L:${spicyDisplayName(leftSpicy!)}`);
      if (hasRightSpicy) parts.push(`R:${spicyDisplayName(rightSpicy!)}`);
      lines.push(`  Spicy: ${parts.join(' ')}`);
    }
  }
  
  // Free Toppings (Add:) - wrap properly
  if (customization.freeToppings?.length > 0) {
    const addPrefix = 'Add: ';
    const toppings = customization.freeToppings.join(', ');
    const wrappedLines = wrapTextForReceipt(toppings, maxWidth - 2, addPrefix);
    for (const line of wrappedLines) {
      lines.push('  ' + line);
    }
  }
  
  // Extra Toppings (+) - wrap properly
  if (customization.extraToppings?.length > 0) {
    const extraList = customization.extraToppings.map((t: any) => {
      const sideInfo = t.side && t.side !== 'whole' ? ` (${t.side})` : '';
      return `${t.name}${sideInfo}`;
    });
    const addPrefix = 'Add: ';
    const toppings = extraList.join(', ');
    const wrappedLines = wrapTextForReceipt(toppings, maxWidth - 2, addPrefix);
    for (const line of wrappedLines) {
      lines.push('  ' + line);
    }
  }
  
  // Default Toppings Removed - wrap properly
  const removedToppings = customization.defaultToppings?.filter((t: any) => t.quantity === 'none');
  if (removedToppings?.length > 0) {
    const removePrefix = 'Remove: ';
    const toppings = removedToppings.map((t: any) => t.name).join(', ');
    const wrappedLines = wrapTextForReceipt(toppings, maxWidth - 2, removePrefix);
    for (const line of wrappedLines) {
      lines.push('  ' + line);
    }
  }
  
  // Default Toppings Modified (less/extra)
  const modifiedDefaults = customization.defaultToppings?.filter(
    (t: any) => t.quantity === 'less' || t.quantity === 'extra'
  );
  if (modifiedDefaults?.length > 0) {
    modifiedDefaults.forEach((t: any) => {
      const sideInfo = t.side && t.side !== 'whole' ? ` (${t.side})` : '';
      lines.push(`  ${t.quantity} ${t.name}${sideInfo}`);
    });
  }
  
  // Note - only show if present
  if (customization.note) {
    lines.push(`  Note: ${customization.note}`);
  }
  
  return lines;
};

// Helper to wrap text with a prefix on first line, indent continuation lines
const wrapTextForReceipt = (text: string, maxWidth: number, prefix: string): string[] => {
  const words = text.split(', ');
  const lines: string[] = [];
  let currentLine = prefix;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const separator = i === 0 ? '' : ', ';
    
    if (currentLine === prefix) {
      currentLine = prefix + word;
    } else if (currentLine.length + separator.length + word.length <= maxWidth) {
      currentLine += separator + word;
    } else {
      lines.push(currentLine);
      currentLine = '  ' + word; // Indent continuation lines
    }
  }
  if (currentLine.length > 0 && currentLine !== prefix) {
    lines.push(currentLine);
  }
  return lines;
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

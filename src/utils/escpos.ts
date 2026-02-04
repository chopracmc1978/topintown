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
  createdAt: Date;
  orderType: string;
  tableNumber?: string;
  pickupTime?: string;
  customerName?: string;
  notes?: string;
  items: Array<{
    quantity: number;
    name: string;
    totalPrice?: number;
    selectedSize?: string;
    pizzaCustomization?: any;
    wingsCustomization?: any;
    comboCustomization?: any;
  }>;
  subtotal?: number;
  tax?: number;
  total?: number;
  paymentStatus?: string;
}): string => {
  const { INIT, CUT, BOLD_ON, BOLD_OFF, DOUBLE_SIZE_ON, NORMAL_SIZE, ALIGN_CENTER, ALIGN_LEFT, ALIGN_RIGHT, LINE } = ESCPOS;
  
  let receipt = INIT;
  
  // Extra space on top (5 blank lines)
  receipt += LF + LF + LF + LF + LF;
  
  // Header - centered
  receipt += ALIGN_CENTER;
  receipt += BOLD_ON + 'KITCHEN ORDER' + BOLD_OFF + LF;
  receipt += LF;
  
  // Order info - label left, value right on same line using spaces
  const formatLabelValue = (label: string, value: string): string => {
    const totalWidth = 32;
    const labelWithColon = label + ' :';
    const spaces = totalWidth - labelWithColon.length - value.length;
    return labelWithColon + ' '.repeat(Math.max(1, spaces)) + value;
  };
  
  receipt += ALIGN_LEFT;
  receipt += BOLD_ON + formatLabelValue('Order No', order.id) + BOLD_OFF + LF;
  
  // Format date
  const date = new Date(order.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    weekday: 'short',
    year: 'numeric'
  });
  receipt += BOLD_ON + formatLabelValue('Date', dateStr) + BOLD_OFF + LF;
  
  // Format time
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  receipt += BOLD_ON + formatLabelValue('Time', timeStr) + BOLD_OFF + LF;
  
  // Order type
  const typeStr = order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1);
  receipt += BOLD_ON + formatLabelValue('Type', typeStr) + BOLD_OFF + LF;
  
  // Table number if present
  if (order.tableNumber) {
    receipt += BOLD_ON + formatLabelValue('Table', order.tableNumber) + BOLD_OFF + LF;
  }
  
  // Pickup time if present
  if (order.pickupTime) {
    const pickupDate = new Date(order.pickupTime);
    const pickupTimeStr = pickupDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    receipt += BOLD_ON + formatLabelValue('Pickup', pickupTimeStr) + BOLD_OFF + LF;
  }
  
  receipt += LINE + LF;
  
  // Items
  for (const item of order.items) {
    // Item name with quantity and price on same line
    const itemName = `${item.quantity}X ${item.name.toUpperCase()}`;
    const priceStr = item.totalPrice ? `$${item.totalPrice.toFixed(2)}` : '';
    const itemSpaces = 32 - itemName.length - priceStr.length;
    
    receipt += BOLD_ON + itemName + BOLD_OFF;
    if (priceStr) {
      receipt += ' '.repeat(Math.max(1, itemSpaces)) + priceStr;
    }
    receipt += LF;
    
    // Pizza customization details
    if (item.pizzaCustomization) {
      const details = formatPizzaDetailsForKitchen(item.pizzaCustomization, 32);
      for (const line of details) {
        receipt += line + LF;
      }
    }
    
    // Wings customization
    if (item.wingsCustomization?.flavor) {
      receipt += `Flavor: ${item.wingsCustomization.flavor}` + LF;
    }
    
    // Combo customization
    if (item.comboCustomization?.selections) {
      for (const selection of item.comboCustomization.selections) {
        receipt += `  - ${selection.itemName}` + LF;
        if (selection.pizzaCustomization) {
          const comboDetails = formatPizzaDetailsForKitchen(selection.pizzaCustomization, 32);
          for (const line of comboDetails) {
            receipt += '    ' + line + LF;
          }
        }
        if (selection.flavor) {
          receipt += `    Flavor: ${selection.flavor}` + LF;
        }
      }
    }
    
    // Size if no pizza customization
    if (item.selectedSize && !item.pizzaCustomization) {
      receipt += item.selectedSize + LF;
    }
    
    receipt += LF; // Gap between items
  }
  
  // Order notes
  if (order.notes) {
    receipt += 'NOTE: ' + order.notes + LF;
    receipt += LF;
  }
  
  receipt += LINE + LF;
  
  // Totals section (if provided)
  if (order.subtotal !== undefined) {
    const formatTotal = (label: string, amount: number): string => {
      const amountStr = `$${amount.toFixed(2)}`;
      const spaces = 32 - label.length - amountStr.length;
      return BOLD_ON + label + BOLD_OFF + ' '.repeat(Math.max(1, spaces)) + amountStr;
    };
    
    receipt += formatTotal('Subtotal :', order.subtotal) + LF;
    receipt += formatTotal('GST (5%) :', order.tax || 0) + LF;
    receipt += formatTotal('TOTAL :', order.total || 0) + LF;
    
    receipt += LF + LINE + LF;
    
    // Payment status
    receipt += ALIGN_CENTER;
    const paymentStatus = order.paymentStatus === 'paid' ? 'PAID' : 'PAYMENT DUE';
    receipt += BOLD_ON + paymentStatus + BOLD_OFF + LF;
  }
  
  // Customer name at end
  if (order.customerName) {
    receipt += LF;
    receipt += ALIGN_CENTER;
    receipt += 'Customer: ' + order.customerName + LF;
  }
  
  receipt += LF + LF + LF;
  receipt += CUT;
  
  return receipt;
};

// Helper to format pizza customization for kitchen ticket with proper wrapping
const formatPizzaDetailsForKitchen = (customization: any, maxWidth: number): string[] => {
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
  
  // Extra Toppings (+) - wrap properly with Add: prefix
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
  
  // Default Toppings Removed - wrap properly with Remove: prefix
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
  const { INIT, BOLD_ON, BOLD_OFF, DOUBLE_HEIGHT_ON, DOUBLE_SIZE_ON, NORMAL_SIZE, ALIGN_CENTER, ALIGN_LEFT, ALIGN_RIGHT, LINE, CUT, FEED_LINES } = ESCPOS;
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
  
  // ===== HEADER (centered) =====
  receipt += ALIGN_CENTER;
  // Store name - bold, large, single line
  receipt += DOUBLE_SIZE_ON + BOLD_ON + 'TOP IN TOWN PIZZA LTD' + BOLD_OFF + NORMAL_SIZE + LF;
  receipt += LF; // Light gap after store name
  
  // Address lines (centered, normal size)
  receipt += 'Unit 5, 3250 - 60 St NE' + LF;
  receipt += 'Calgary AB T1Y 3T5' + LF;
  receipt += '403 280 7373 Ext -1' + LF;
  receipt += 'www.topintownpizza.ca' + LF;
  
  receipt += LINE + LF;
  
  // ===== ORDER INFO SECTION (left aligned, label : value format) =====
  receipt += ALIGN_LEFT;
  
  // Order No - bold label with value right-aligned
  receipt += BOLD_ON + formatLine('Order No :', order.id) + BOLD_OFF + LF;
  
  // Date - format: Feb 4 Wed 2026
  receipt += formatLine('Date :', formatDateShort(order.createdAt)) + LF;
  
  // Time
  receipt += formatLine('Time :', formatTime(order.createdAt)) + LF;
  
  receipt += LINE + LF;
  receipt += LF; // Gap after line
  
  // ===== ITEMS SECTION =====
  for (const item of order.items) {
    const price = `$${item.totalPrice.toFixed(2)}`;
    const itemName = `${item.quantity}X ${item.name.toUpperCase()}`;
    
    // Item name on one line with price right-aligned (bold)
    receipt += BOLD_ON + formatLine(itemName, price) + BOLD_OFF + LF;
    
    // Pizza customization details (for standalone pizzas)
    if (item.pizzaCustomization && !item.comboCustomization) {
      const customDetails = formatPizzaDetailsForReceipt(item.pizzaCustomization, RECEIPT_WIDTH);
      for (const line of customDetails) {
        receipt += line + LF;
      }
    }
    
    // Show size for non-pizza items (excluding combos)
    if (item.selectedSize && !item.pizzaCustomization && !item.comboCustomization) {
      receipt += item.selectedSize + LF;
    }
    
    // Wings/chicken customization - show flavor if selected (for standalone items)
    if (item.wingsCustomization?.flavor && !item.comboCustomization) {
      receipt += item.wingsCustomization.flavor + LF;
    }
    
    // Combo customization details - show each selection with full details
    if (item.comboCustomization) {
      const combo = item.comboCustomization;
      for (const selection of (combo.selections || [])) {
        let selectionLine = `- ${selection.itemName}`;
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
  
  // ===== TOTALS SECTION (label left with colon, amount right on same line) =====
  const subtotal = order.subtotal || order.total * 0.95;
  const tax = order.tax || order.total * 0.05;
  
  receipt += BOLD_ON + 'Subtotal :' + BOLD_OFF + LF;
  receipt += ALIGN_RIGHT + `$${subtotal.toFixed(2)}` + LF;
  receipt += ALIGN_LEFT + BOLD_ON + 'GST (5%) :' + BOLD_OFF + LF;
  receipt += ALIGN_RIGHT + `$${tax.toFixed(2)}` + LF;
  receipt += ALIGN_LEFT + BOLD_ON + 'TOTAL :' + BOLD_OFF + LF;
  receipt += ALIGN_RIGHT + `$${order.total.toFixed(2)}` + LF;
  
  receipt += ALIGN_LEFT;
  receipt += LINE + LF;
  
  // ===== PAYMENT STATUS (centered, bold) =====
  receipt += ALIGN_CENTER;
  if (order.paymentStatus === 'paid') {
    receipt += BOLD_ON + `PAID - ${(order.paymentMethod || 'Card').toUpperCase()}` + BOLD_OFF + LF;
  } else {
    receipt += BOLD_ON + 'PAYMENT DUE' + BOLD_OFF + LF;
  }
  
  receipt += LF; // Gap before footer
  
  // ===== FOOTER (centered) =====
  receipt += 'GST # 7428200897 RT 0001' + LF;
  receipt += 'Thanks You for Shopping at ' + BOLD_ON + 'TOP IN TOWN PIZZA LTD.' + BOLD_OFF + LF;
  
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

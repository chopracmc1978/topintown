// ESC/POS command constants for thermal printers
export const ESC = '\x1B';
export const GS = '\x1D';
export const LF = '\x0A';

export const ESCPOS = {
  // Initialize printer
  // NOTE: Avoid forcing print-area width here; it can cause “half width” printing on 80mm printers.
  INIT: `${ESC}@${ESC}t\x00`, // Init + select character code table (PC437)
  
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

const getCharsPerLine = (paperWidthMm?: number): number => {
  // Typical ESC/POS character widths (Font A):
  // - 58mm paper: ~32 columns
  // - 80mm paper: ~48 columns
  return paperWidthMm === 80 ? 48 : 32;
};

const makeLine = (width: number): string => '-'.repeat(width);

// Build ESC/POS kitchen ticket
export const buildKitchenTicket = (order: {
  id: string;
  createdAt: Date;
  orderType: string;
  tableNumber?: string;
  pickupTime?: string;
  customerName?: string;
  customerPhone?: string;
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
}, options?: { paperWidthMm?: number }): string => {
  const { INIT, CUT, BOLD_ON, BOLD_OFF, DOUBLE_HEIGHT_ON, NORMAL_SIZE, ALIGN_CENTER, ALIGN_LEFT } = ESCPOS;
  const WIDTH = getCharsPerLine(options?.paperWidthMm);
  const LINE_STR = makeLine(WIDTH);
  
  let receipt = INIT;
  
  // Extra space on top (1 blank line)
  receipt += LF;
  
  // Header - centered
  receipt += ALIGN_CENTER;
 receipt += DOUBLE_HEIGHT_ON + BOLD_ON + 'KITCHEN ORDER' + BOLD_OFF + NORMAL_SIZE + LF;
  receipt += LF;

  const formatLine = (left: string, right: string): string => {
    const padding = WIDTH - left.length - right.length;
    if (padding < 1) return left + ' ' + right;
    return left + ' '.repeat(padding) + right;
  };

  // Order info: fixed value column (like your reference screenshot)
  const LABEL_WIDTH = 14; // values start at a consistent column
  const formatOrderInfo = (label: string, value: string): string => {
    const paddedLabel = label.padEnd(LABEL_WIDTH, ' ');
    return BOLD_ON + paddedLabel + BOLD_OFF + value;
  };

  const formatDateShort = (date: Date): string => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const year = date.getFullYear();
    return `${month} ${day} ${weekday} ${year}`;
  };
  
  receipt += ALIGN_LEFT;
  receipt += formatOrderInfo('Order No :', order.id) + LF;
  
  // Format date
  const date = new Date(order.createdAt);
  receipt += formatOrderInfo('Date :', formatDateShort(date)) + LF;
  
  // Format time
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  receipt += formatOrderInfo('Time :', timeStr) + LF;
  
  // Order type
  const typeStr = order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1);
  receipt += formatOrderInfo('Type :', typeStr) + LF;
  
  // Customer name
  if (order.customerName) {
    receipt += formatOrderInfo('Customer :', order.customerName) + LF;
  }
  
  // Customer phone
  if (order.customerPhone) {
    receipt += formatOrderInfo('Phone :', order.customerPhone) + LF;
  }
  
  // Table number if present
  if (order.tableNumber) {
    receipt += formatOrderInfo('Table :', order.tableNumber) + LF;
  }
  
  // Pickup time if present
  if (order.pickupTime) {
    const pickupDate = new Date(order.pickupTime);
    const pickupTimeStr = pickupDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    receipt += formatOrderInfo('Pickup :', pickupTimeStr) + LF;
  }
  
  receipt += LINE_STR + LF;
  
  // Items
  for (const item of order.items) {
    // Item name with quantity - bold, normal size, price right-aligned on first line
    const itemName = `${item.quantity} x ${item.name}`;
    const priceStr = item.totalPrice ? `$${item.totalPrice.toFixed(2)}` : '';
    if (priceStr) {
      // If name + price fits on one line, print on one line
      const totalLen = itemName.length + priceStr.length + 1;
      if (totalLen <= WIDTH) {
        receipt += BOLD_ON + formatLine(itemName, priceStr) + BOLD_OFF + LF;
      } else {
        // Name is too long — put price right-aligned on first line, name wraps to 2 lines
        const availableForName = WIDTH - priceStr.length - 1;
        const firstPart = itemName.substring(0, availableForName);
        const secondPart = itemName.substring(availableForName).trim();
        receipt += BOLD_ON + formatLine(firstPart, priceStr) + BOLD_OFF + LF;
        if (secondPart) {
          receipt += BOLD_ON + '  ' + secondPart + BOLD_OFF + LF;
        }
      }
    } else {
      receipt += BOLD_ON + itemName + BOLD_OFF + LF;
    }
    
    // Pizza customization details
    if (item.pizzaCustomization) {
      const details = formatPizzaDetailsForKitchen(item.pizzaCustomization, WIDTH);
      for (const line of details) {
        receipt += line + LF;
      }
    }
    
    // Wings customization
    if (item.wingsCustomization?.flavor) {
      receipt += `Flavor : ${item.wingsCustomization.flavor}` + LF;
    }
    
    // Combo customization
    if (item.comboCustomization?.selections) {
      for (const selection of item.comboCustomization.selections) {
        receipt += `- ${selection.itemName}` + LF;
        if (selection.pizzaCustomization) {
          const comboDetails = formatPizzaDetailsForKitchen(selection.pizzaCustomization, WIDTH);
          for (const line of comboDetails) {
            // keep a small indent for nested combo lines
            receipt += '  ' + line + LF;
          }
        }
        if (selection.flavor) {
          receipt += `  Flavor : ${selection.flavor}` + LF;
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
  
  receipt += LINE_STR + LF;
  
  // Totals section (match your reference kitchen ticket)
  if (order.total !== undefined) {
    const subtotal = order.subtotal ?? order.total * 0.95;
    const tax = order.tax ?? order.total * 0.05;
    receipt += BOLD_ON + formatLine('Subtotal :', `$${subtotal.toFixed(2)}`) + BOLD_OFF + LF;
    receipt += BOLD_ON + formatLine('GST (5%) :', `$${tax.toFixed(2)}`) + BOLD_OFF + LF;
    receipt += BOLD_ON + formatLine('TOTAL :', `$${order.total.toFixed(2)}`) + BOLD_OFF + LF;
    receipt += LINE_STR + LF;

    receipt += ALIGN_CENTER + LF;
    const paymentStatus = order.paymentStatus === 'paid' ? 'PAID' : 'PAYMENT DUE';
    receipt += BOLD_ON + paymentStatus + BOLD_OFF + LF;
  }
  
  // Customer info at end
  if (order.customerName || order.customerPhone) {
    receipt += LF;
    receipt += ALIGN_LEFT;
    if (order.customerName) {
      receipt += formatOrderInfo('Customer :', order.customerName) + LF;
    }
    if (order.customerPhone) {
      receipt += formatOrderInfo('Phone :', order.customerPhone) + LF;
    }
  }
  
  receipt += LF + LF + LF + LF + LF + LF + LF + LF;
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
    lines.push(`${sizeName || 'Standard'}, ${crustName || 'Regular'}`);
  }
  
  // Cheese - show if not default (regular Mozzarella)
  if (customization.cheeseType) {
    const ct = customization.cheeseType.toLowerCase();
    if (ct === 'no cheese' || ct === 'none') {
      lines.push('Cheese : None');
    } else if (ct === 'dairy free') {
      lines.push('Cheese : Dairy Free');
    } else {
      // Show quantity changes (less/extra)
      const cheeseQty = customization.cheeseSides?.[0]?.quantity || customization.cheeseQuantity;
      if (cheeseQty && cheeseQty !== 'regular' && cheeseQty !== 'normal') {
        lines.push(`Cheese : ${cheeseQty} ${customization.cheeseType}`);
      }
    }
  }
  
  // Sauce - only show if changed from default or "no sauce" or extra quantity
  if (customization.sauceName?.toLowerCase() === 'no sauce') {
    lines.push('No Sauce');
  } else if (customization.sauceName && (customization.isDefaultSauce === false || (customization.sauceQuantity && customization.sauceQuantity !== 'normal' && customization.sauceQuantity !== 'regular'))) {
    const qtyPrefix = customization.sauceQuantity && customization.sauceQuantity !== 'normal' && customization.sauceQuantity !== 'regular'
      ? `${customization.sauceQuantity} ` : '';
    lines.push(`Sauce : ${qtyPrefix}${customization.sauceName}`);
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
      lines.push(`Spicy : ${spicyDisplayName(leftSpicy!)}`);
    } else {
      const parts: string[] = [];
      if (hasLeftSpicy) parts.push(`L:${spicyDisplayName(leftSpicy!)}`);
      if (hasRightSpicy) parts.push(`R:${spicyDisplayName(rightSpicy!)}`);
      lines.push(`Spicy : ${parts.join(' ')}`);
    }
  }
  
  // Free Toppings (Add:) - wrap properly
  if (customization.freeToppings?.length > 0) {
    const addPrefix = 'Add : ';
    const toppings = customization.freeToppings.join(', ');
    const wrappedLines = wrapTextForReceipt(toppings, maxWidth, addPrefix);
    for (const line of wrappedLines) {
      lines.push(line);
    }
  }
  
  // Extra Toppings (+) - wrap properly with Add: prefix
  if (customization.extraToppings?.length > 0) {
    const extraList = customization.extraToppings.map((t: any) => {
      const sideInfo = t.side && t.side !== 'whole' ? ` (${t.side})` : '';
      return `${t.name}${sideInfo}`;
    });
    const addPrefix = 'Add : ';
    const toppings = extraList.join(', ');
    const wrappedLines = wrapTextForReceipt(toppings, maxWidth, addPrefix);
    for (const line of wrappedLines) {
      lines.push(line);
    }
  }
  
  // Default Toppings Removed - wrap properly with Remove: prefix
  const removedToppings = customization.defaultToppings?.filter((t: any) => t.quantity === 'none');
  if (removedToppings?.length > 0) {
    const removePrefix = 'Remove : ';
    const toppings = removedToppings.map((t: any) => t.name).join(', ');
    const wrappedLines = wrapTextForReceipt(toppings, maxWidth, removePrefix);
    for (const line of wrappedLines) {
      lines.push(line);
    }
  }
  
  // Default Toppings Modified (less/extra)
  const modifiedDefaults = customization.defaultToppings?.filter(
    (t: any) => t.quantity === 'less' || t.quantity === 'extra'
  );
  if (modifiedDefaults?.length > 0) {
    modifiedDefaults.forEach((t: any) => {
      const sideInfo = t.side && t.side !== 'whole' ? ` (${t.side})` : '';
      lines.push(`${t.quantity} ${t.name}${sideInfo}`);
    });
  }
  
  // Note - only show if present
  if (customization.note) {
    lines.push(`Note : ${customization.note}`);
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
}, options?: { paperWidthMm?: number }, rewardPoints?: {
  lastBalance: number;
  earned: number;
  used: number;
  balance: number;
}): string => {
  const { INIT, BOLD_ON, BOLD_OFF, DOUBLE_HEIGHT_ON, NORMAL_SIZE, ALIGN_CENTER, ALIGN_LEFT, CUT, FEED_LINES } = ESCPOS;
  const WIDTH = getCharsPerLine(options?.paperWidthMm);
  const LINE_STR = makeLine(WIDTH);
  
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
    const padding = WIDTH - left.length - right.length;
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
  // Intentionally do not force print-area width/spacing here.
  // Different 80mm printers interpret those commands differently and it can cause “half width” output.
  
  // ===== HEADER (centered) =====
  receipt += ALIGN_CENTER;
  // Store name - bold, large, single line
  receipt += DOUBLE_HEIGHT_ON + BOLD_ON + 'TOP IN TOWN PIZZA' + BOLD_OFF + NORMAL_SIZE + LF;
  receipt += LF; // Light gap after store name
  
  // Address lines (centered, normal size) - use location if provided
  if (location?.address) {
    // Strip postal code (e.g. "AB T1Y 3T5") from address for receipt
    const cleanAddr = location.address.replace(/,?\s*AB\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d/i, '').trim().replace(/,\s*$/, '');
    receipt += cleanAddr + LF;
  } else {
    receipt += '3250 60 ST NE, CALGARY' + LF;
  }
  if (location?.phone) {
    receipt += location.phone + LF;
  } else {
    receipt += '(403) 280-7373 ext 1' + LF;
  }
  
  receipt += LINE_STR + LF;
  
  // ===== ORDER INFO SECTION (bold label fixed width, value left-aligned at column 14) =====
  receipt += ALIGN_LEFT;
  
  // Helper to format label:value with bold label at fixed column (like reference image)
  // Label is padded to fixed width, value starts at same column for all rows
  const LABEL_WIDTH = 14; // Fixed column where values start
  const formatOrderInfo = (label: string, value: string): string => {
    const paddedLabel = label.padEnd(LABEL_WIDTH, ' ');
    return BOLD_ON + paddedLabel + BOLD_OFF + value;
  };
  
  // Order No - bold label at fixed column, value left-aligned after
  receipt += formatOrderInfo('Order No :', order.id) + LF;
  
  // Date - format: Feb 4 Wed 2026
  receipt += formatOrderInfo('Date :', formatDateShort(order.createdAt)) + LF;
  
  // Time
  receipt += formatOrderInfo('Time :', formatTime(order.createdAt)) + LF;
  
  // Order type
  const typeStr = order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1);
  receipt += formatOrderInfo('Type :', typeStr) + LF;
  
  // Customer phone
  if (order.customerPhone) {
    receipt += formatOrderInfo('Phone :', order.customerPhone) + LF;
  }
  
  // Customer name
  if (order.customerName) {
    receipt += formatOrderInfo('Customer :', order.customerName) + LF;
  }
  
  receipt += LINE_STR + LF;
  
  // ===== ITEMS SECTION =====
  for (const item of order.items) {
    const price = `$${item.totalPrice.toFixed(2)}`;
    const itemName = `${item.quantity}X ${item.name.toUpperCase()}`;
    
    // Item name on one line with price right-aligned (bold)
    receipt += BOLD_ON + formatLine(itemName, price) + BOLD_OFF + LF;
    
    // Pizza customization details (for standalone pizzas)
    if (item.pizzaCustomization && !item.comboCustomization) {
      const customDetails = formatPizzaDetailsForReceipt(item.pizzaCustomization, WIDTH);
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
          const pizzaDetails = formatPizzaDetailsForReceipt(selection.pizzaCustomization, WIDTH);
          for (const line of pizzaDetails) {
            receipt += '  ' + line + LF;
          }
        }
      }
    }
    
    receipt += LF; // Gap between items
  }
  
  receipt += LINE_STR + LF;
  
  // ===== TOTALS SECTION (label left, amount right ON SAME LINE like reference) =====
  const subtotal = order.subtotal || order.total * 0.95;
  const tax = order.tax || order.total * 0.05;
  
  receipt += ALIGN_LEFT;
  receipt += BOLD_ON + formatLine('Subtotal :', `$${subtotal.toFixed(2)}`) + BOLD_OFF + LF;
  receipt += BOLD_ON + formatLine('GST (5%) :', `$${tax.toFixed(2)}`) + BOLD_OFF + LF;
  receipt += BOLD_ON + formatLine('TOTAL :', `$${order.total.toFixed(2)}`) + BOLD_OFF + LF;
  
  receipt += LINE_STR + LF;
  
  // ===== PAYMENT STATUS (centered, bold) =====
  receipt += ALIGN_CENTER;
  if (order.paymentStatus === 'paid') {
    receipt += LF;
    receipt += BOLD_ON + `PAID - ${(order.paymentMethod || 'Card').toUpperCase()}` + BOLD_OFF + LF;
  } else {
    receipt += LF;
    receipt += BOLD_ON + 'PAYMENT DUE' + BOLD_OFF + LF;
  }
  
  receipt += LF; // Gap before footer
  
  // ===== REWARD POINTS (if available) =====
  if (rewardPoints) {
    receipt += LINE_STR + LF;
    receipt += ALIGN_CENTER;
    receipt += BOLD_ON + 'REWARD POINTS' + BOLD_OFF + LF;
    receipt += ALIGN_LEFT;
    receipt += formatLine('Last Bal :', `${rewardPoints.lastBalance} pts`) + LF;
    receipt += formatLine('Add :', `+${rewardPoints.earned} pts`) + LF;
    if (rewardPoints.used > 0) {
      receipt += formatLine('Used :', `-${rewardPoints.used} pts`) + LF;
    }
    receipt += BOLD_ON + formatLine('Balance :', `${rewardPoints.balance} pts`) + BOLD_OFF + LF;
  }
  
  receipt += LF; // Gap before footer
  
  // ===== FOOTER (centered) =====
  receipt += ALIGN_CENTER;
  receipt += 'GST # 7428200897 RT 0001' + LF;
  receipt += 'Thanks You for Shopping at ' + BOLD_ON + 'TOP IN TOWN PIZZA LTD.' + BOLD_OFF + LF;
  
  receipt += FEED_LINES(3);
  receipt += CUT;
  
  return receipt;
};

// Helper to format pizza customization for receipt - NO INDENT (left edge aligned like reference)
const formatPizzaDetailsForReceipt = (customization: any, maxWidth: number): string[] => {
  const lines: string[] = [];
  
  // Size and Crust - left aligned on one line (NO indent)
  const sizeName = typeof customization.size === 'object' ? customization.size?.name : customization.size;
  const crustName = typeof customization.crust === 'object' ? customization.crust?.name : customization.crust;
  if (sizeName || crustName) {
    lines.push(`${sizeName || 'Standard'}, ${crustName || 'Regular'}`);
  }
  
  // Cheese - show if not default (regular Mozzarella)
  if (customization.cheeseType) {
    const ct = customization.cheeseType.toLowerCase();
    if (ct === 'no cheese' || ct === 'none') {
      lines.push('Cheese : None');
    } else if (ct === 'dairy free') {
      lines.push('Cheese : Dairy Free');
    } else {
      const cheeseQty = customization.cheeseSides?.[0]?.quantity || customization.cheeseQuantity;
      if (cheeseQty && cheeseQty !== 'regular' && cheeseQty !== 'normal') {
        lines.push(`Cheese : ${cheeseQty} ${customization.cheeseType}`);
      }
    }
  }
  
  // Sauce - only show if changed from default or "no sauce" or extra quantity
  if (customization.sauceName?.toLowerCase() === 'no sauce') {
    lines.push('No Sauce');
  } else if (customization.sauceName && (customization.isDefaultSauce === false || (customization.sauceQuantity && customization.sauceQuantity !== 'normal' && customization.sauceQuantity !== 'regular'))) {
    const qtyPrefix = customization.sauceQuantity && customization.sauceQuantity !== 'normal' && customization.sauceQuantity !== 'regular'
      ? `${customization.sauceQuantity} ` : '';
    lines.push(`Sauce : ${qtyPrefix}${customization.sauceName}`);
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
      lines.push(`Spicy : ${spicyDisplayName(leftSpicy!)}`);
    } else {
      const parts: string[] = [];
      if (hasLeftSpicy) parts.push(`L:${spicyDisplayName(leftSpicy!)}`);
      if (hasRightSpicy) parts.push(`R:${spicyDisplayName(rightSpicy!)}`);
      lines.push(`Spicy : ${parts.join(' ')}`);
    }
  }
  
  // Free Toppings (Add:) - wrap properly, NO indent
  if (customization.freeToppings?.length > 0) {
    const addPrefix = 'Add : ';
    const toppings = customization.freeToppings.join(', ');
    const wrappedLines = wrapTextForReceipt(toppings, maxWidth, addPrefix);
    for (const line of wrappedLines) {
      lines.push(line);
    }
  }
  
  // Extra Toppings (+) - wrap properly, NO indent
  if (customization.extraToppings?.length > 0) {
    const extraList = customization.extraToppings.map((t: any) => {
      const sideInfo = t.side && t.side !== 'whole' ? ` (${t.side})` : '';
      return `${t.name}${sideInfo}`;
    });
    const addPrefix = 'Add : ';
    const toppings = extraList.join(', ');
    const wrappedLines = wrapTextForReceipt(toppings, maxWidth, addPrefix);
    for (const line of wrappedLines) {
      lines.push(line);
    }
  }
  
  // Default Toppings Removed - wrap properly, NO indent
  const removedToppings = customization.defaultToppings?.filter((t: any) => t.quantity === 'none');
  if (removedToppings?.length > 0) {
    const removePrefix = 'Remove : ';
    const toppings = removedToppings.map((t: any) => t.name).join(', ');
    const wrappedLines = wrapTextForReceipt(toppings, maxWidth, removePrefix);
    for (const line of wrappedLines) {
      lines.push(line);
    }
  }
  
  // Default Toppings Modified (less/extra)
  const modifiedDefaults = customization.defaultToppings?.filter(
    (t: any) => t.quantity === 'less' || t.quantity === 'extra'
  );
  if (modifiedDefaults?.length > 0) {
    modifiedDefaults.forEach((t: any) => {
      const sideInfo = t.side && t.side !== 'whole' ? ` (${t.side})` : '';
      lines.push(`${t.quantity} ${t.name}${sideInfo}`);
    });
  }
  
  // Note - only show if present
  if (customization.note) {
    lines.push(`Note : ${customization.note}`);
  }
  
  return lines;
};

// Helper to wrap text with a prefix on first line
// (Reference receipts use NO indent on continuation lines)
const wrapTextForReceipt = (text: string, maxWidth: number, prefix: string, continuationPrefix: string = ''): string[] => {
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
      currentLine = continuationPrefix + word;
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
  } else if (customization.sauceName && (!(customization as any).isDefaultSauce || (customization.sauceQuantity && customization.sauceQuantity !== 'normal' && customization.sauceQuantity !== 'regular'))) {
    const qtyPrefix = customization.sauceQuantity && customization.sauceQuantity !== 'normal' && customization.sauceQuantity !== 'regular'
      ? `${customization.sauceQuantity} ` : '';
    details.push(`Sauce: ${qtyPrefix}${customization.sauceName}`);
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
